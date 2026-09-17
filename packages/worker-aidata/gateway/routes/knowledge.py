"""Knowledge base REST API — MVP 版本

简化说明：
- 使用 PG ILIKE 搜索（不依赖 ES）
- 跳过 AI 审核（文章状态直接设为 community/published）
- 跳过文章切块（KBArticleChunk）
- 文件上传保存到 data/knowledge/uploads/
- Auth: X-API-Key（MVP 不区分 admin）
"""
import logging
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.session import get_db
from gateway.auth.dependencies import verify_auth
from gateway.models.knowledge import KBArticle, KBCategory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])

UPLOAD_DIR = Path("data/knowledge/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}


# ── Schemas ──

class ArticleCreate(BaseModel):
    title: str
    content: Optional[str] = None
    category_id: Optional[int] = None
    source_type: str = "markdown"
    status: Optional[str] = None


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None
    sort_order: int = 0


class FetchUrlRequest(BaseModel):
    url: str


# ── Helpers ──

def _article_dict(a: KBArticle) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "category_id": a.category_id,
        "source_type": a.source_type,
        "status": a.status,
        "author_id": a.author_id,
        "file_path": a.file_path,
        "ai_score": a.ai_score,
        "suggested_category_id": a.suggested_category_id,
        "ai_review_note": a.ai_review_note,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _article_dict_with_content(a: KBArticle) -> dict:
    d = _article_dict(a)
    d["content"] = a.content
    return d


# ── Category endpoints ──

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(KBCategory).order_by(KBCategory.sort_order, KBCategory.id).all()
    return [
        {"id": c.id, "name": c.name, "parent_id": c.parent_id, "sort_order": c.sort_order}
        for c in cats
    ]


@router.post("/categories", status_code=201)
def create_category(body: CategoryCreate, db: Session = Depends(get_db), _=Depends(verify_auth)):
    cat = KBCategory(name=body.name, parent_id=body.parent_id, sort_order=body.sort_order)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "parent_id": cat.parent_id, "sort_order": cat.sort_order}


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), _=Depends(verify_auth)):
    cat = db.get(KBCategory, category_id)
    if not cat:
        raise HTTPException(404, detail="Category not found")
    count = db.query(KBArticle).filter(KBArticle.category_id == category_id).count()
    if count:
        raise HTTPException(409, detail=f"Category has {count} article(s); move or delete them first")
    db.delete(cat)
    db.commit()
    return {"deleted": True, "id": category_id}


# ── Article endpoints ──

@router.get("/articles")
def list_articles(
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(KBArticle)

    if category_id is not None:
        query = query.filter(KBArticle.category_id == category_id)
    if status:
        query = query.filter(KBArticle.status == status)
    if q:
        query = query.filter(KBArticle.title.ilike(f"%{q}%"))

    return [_article_dict(a) for a in query.order_by(KBArticle.id.desc()).all()]


@router.get("/articles/{article_id}")
def get_article(article_id: int, db: Session = Depends(get_db)):
    a = db.get(KBArticle, article_id)
    if not a:
        raise HTTPException(404, detail="Article not found")
    return _article_dict_with_content(a)


@router.post("/articles", status_code=201)
def create_article(body: ArticleCreate, db: Session = Depends(get_db), user=Depends(verify_auth)):
    article = KBArticle(
        title=body.title,
        content=body.content,
        category_id=body.category_id,
        source_type=body.source_type,
        status=body.status or "community",
        author_id=user.get("id") if user else None,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return _article_dict(article)


@router.put("/articles/{article_id}")
def update_article(article_id: int, body: ArticleUpdate, db: Session = Depends(get_db), _=Depends(verify_auth)):
    a = db.get(KBArticle, article_id)
    if not a:
        raise HTTPException(404, detail="Article not found")

    if body.title is not None:
        a.title = body.title
    if body.content is not None:
        a.content = body.content
    if body.category_id is not None:
        a.category_id = body.category_id
    if body.status is not None:
        a.status = body.status

    db.commit()
    db.refresh(a)
    return _article_dict(a)


@router.delete("/articles/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db), _=Depends(verify_auth)):
    a = db.get(KBArticle, article_id)
    if not a:
        raise HTTPException(404, detail="Article not found")
    db.delete(a)
    db.commit()
    return {"deleted": True, "id": article_id}


# ── Upload endpoint ──

@router.post("/upload", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(verify_auth),
):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, detail=f"File type '{suffix}' not allowed. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    article_title = title or Path(file.filename or "untitled").stem
    article = KBArticle(
        title=article_title,
        category_id=category_id,
        source_type=suffix.lstrip("."),
        status="community",
        author_id=user.get("id") if user else None,
    )
    db.add(article)
    db.commit()
    db.refresh(article)

    dest = UPLOAD_DIR / f"{article.id}{suffix}"
    raw = await file.read()
    dest.write_bytes(raw)
    article.file_path = str(dest)

    # For .md and .txt, read content directly
    if suffix in (".md", ".txt"):
        article.content = raw.decode("utf-8", errors="replace")

    db.commit()
    return _article_dict(article)


# ── URL fetch endpoint ──

@router.post("/fetch-url")
async def fetch_url(body: FetchUrlRequest, _=Depends(verify_auth)):
    """Fetch article content from a URL."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(body.url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            html = resp.text

        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        title = re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else body.url
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        return {"title": title[:200], "content": text[:5000]}
    except Exception as e:
        raise HTTPException(400, detail=f"URL fetch failed: {e}")


# ── Publish / reject ──

@router.post("/articles/{article_id}/publish")
def publish_article(article_id: int, db: Session = Depends(get_db), _=Depends(verify_auth)):
    a = db.get(KBArticle, article_id)
    if not a:
        raise HTTPException(404, detail="Article not found")
    a.status = "published"
    db.commit()
    db.refresh(a)
    return _article_dict(a)


@router.post("/articles/{article_id}/reject")
def reject_article(article_id: int, db: Session = Depends(get_db), _=Depends(verify_auth)):
    a = db.get(KBArticle, article_id)
    if not a:
        raise HTTPException(404, detail="Article not found")
    a.status = "rejected"
    db.commit()
    db.refresh(a)
    return _article_dict(a)


# ── Search endpoint ──

@router.get("/search")
def search_articles(q: str, top_k: int = 10, db: Session = Depends(get_db)):
    if not q.strip():
        raise HTTPException(400, detail="Search query 'q' must not be empty")

    results = (
        db.query(KBArticle)
        .filter(
            or_(
                KBArticle.title.ilike(f"%{q}%"),
                KBArticle.content.ilike(f"%{q}%"),
            )
        )
        .filter(KBArticle.status.in_(["published", "community"]))
        .order_by(KBArticle.id.desc())
        .limit(top_k)
        .all()
    )

    return {
        "query": q,
        "results": [
            {
                "article_id": a.id,
                "article_title": a.title,
                "text": (a.content or "")[:200],
                "score": 1.0,
            }
            for a in results
        ],
    }

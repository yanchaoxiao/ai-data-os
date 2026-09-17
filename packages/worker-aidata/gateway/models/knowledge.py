"""知识库 SQLAlchemy 模型

MVP 版本：KBCategory + KBArticle（跳过 KBArticleChunk/ES 集成）
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database.base import Base


class KBCategory(Base):
    """知识分类表（树形）"""
    __tablename__ = "kb_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("kb_categories.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, default=0)

    articles = relationship("KBArticle", back_populates="category", foreign_keys="KBArticle.category_id")


class KBArticle(Base):
    """知识文章表"""
    __tablename__ = "kb_articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    category_id = Column(Integer, ForeignKey("kb_categories.id"), nullable=True)
    content = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    source_type = Column(String(20), nullable=False, default="markdown")
    status = Column(String(20), nullable=False, default="pending")
    author_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    ai_score = Column(Integer, nullable=True)
    suggested_category_id = Column(Integer, nullable=True)
    ai_review_note = Column(Text, nullable=True)

    category = relationship("KBCategory", back_populates="articles", foreign_keys=[category_id])

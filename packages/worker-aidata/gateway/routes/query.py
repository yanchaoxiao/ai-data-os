"""AI 问答路由 — /api/v1/query

接收用户自然语言问题，调用 LLM 生成回答。
MVP 阶段：直接 LLM 问答，后续接入 Semantic Compiler + Fusion Engine。
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config.settings import get_settings
from gateway.services.llm import get_llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["query"])

settings = get_settings()


# ── 请求/响应模型 ──

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="用户自然语言问题")
    user_id: Optional[str] = Field(None, description="用户 ID")
    context: Optional[dict] = Field(None, description="附加上下文")


class QueryResponse(BaseModel):
    answer: str = Field(..., description="AI 回答内容（Markdown）")
    type: str = Field("chat", description="回答类型: chat/sql/knowledge/attribution")
    confidence: float = Field(0.8, description="置信度 0-1")
    caveat: Optional[str] = Field(None, description="附加说明/免责声明")
    cache_hit: bool = Field(False, description="是否命中缓存")
    metadata: Optional[dict] = Field(None, description="附加元数据")


# ── 路由 ──

@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    """处理用户自然语言查询

    MVP 阶段直接调用 LLM，后续会接入：
    - Semantic Compiler: 自然语言 → SQL
    - Fusion Engine: 多源数据融合
    - 语义缓存: 相似问题命中缓存
    """
    query_id = str(uuid.uuid4())[:8]
    logger.info(f"[query:{query_id}] user_id={req.user_id}, query={req.query[:80]}")

    llm = get_llm_service()

    # 检查 LLM 是否可用
    if not llm.available:
        logger.warning(f"[query:{query_id}] LLM API Key 未配置")
        return QueryResponse(
            answer=(
                "⚠️ **LLM 服务未配置**\n\n"
                "当前 `LLM_API_KEY` 为空，无法调用 AI 模型。\n\n"
                "请在 `packages/worker-aidata/.env` 中设置：\n"
                "```\n"
                "LLM_API_KEY=sk-your-deepseek-key\n"
                "```\n\n"
                "获取 API Key: https://platform.deepseek.com/api_keys"
            ),
            type="error",
            confidence=0.0,
            caveat="LLM 服务未配置",
            cache_hit=False,
            metadata={"query_id": query_id, "error": "llm_not_configured"},
        )

    # 调用 LLM
    try:
        result = await llm.chat(
            user_message=req.query,
            conversation_history=None,  # MVP: 无对话历史，后续从 DB 加载
            temperature=0.3,
            max_tokens=2048,
        )

        return QueryResponse(
            answer=result["content"],
            type="chat",
            confidence=0.85,
            cache_hit=False,
            metadata={
                "query_id": query_id,
                "model": result["model"],
                "usage": result["usage"],
                "latency_ms": result["latency_ms"],
            },
        )
    except RuntimeError as e:
        logger.error(f"[query:{query_id}] LLM call failed: {e}")
        return QueryResponse(
            answer=f"⚠️ **请求失败**\n\n{str(e)}\n\n请稍后重试，或检查后端日志。",
            type="error",
            confidence=0.0,
            caveat=str(e),
            cache_hit=False,
            metadata={"query_id": query_id, "error": str(e)},
        )
    except Exception as e:
        logger.exception(f"[query:{query_id}] unexpected error")
        raise HTTPException(status_code=500, detail=f"内部错误: {e}")

"""LLM 服务 — 调用 DeepSeek（OpenAI 兼容接口）

MVP 版本：直接通过 httpx 调用 DeepSeek Chat Completions API。
不依赖 openai SDK，减少安装依赖。
"""
import logging
import time
from typing import Optional

import httpx

from config.settings import get_settings

logger = logging.getLogger(__name__)

# 系统提示词 — 定义 AI 助手角色
SYSTEM_PROMPT = """你是 ai-xyc 平台的 AI 数据助手。你可以帮助用户：
1. 回答业务数据和指标相关的问题
2. 解释数据趋势和波动原因
3. 提供数据分析和洞察建议

请用简洁、专业的中文回答。如果问题涉及你无法获取的实时数据，请诚实说明，
并建议用户通过具体的数据查询工具获取。

回答时使用 Markdown 格式，便于阅读。"""


class LLMService:
    """DeepSeek LLM 服务封装"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.llm_api_key
        self.base_url = settings.llm_base_url.rstrip("/")
        self.model = settings.llm_model
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def available(self) -> bool:
        """是否配置了 API Key"""
        return bool(self.api_key)

    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=5.0),
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def chat(
        self,
        user_message: str,
        conversation_history: Optional[list[dict]] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> dict:
        """调用 LLM 生成回答

        Args:
            user_message: 用户问题
            conversation_history: 对话历史 [{"role": "user"/"assistant", "content": "..."}]
            temperature: 温度参数
            max_tokens: 最大生成 token 数

        Returns:
            {"content": str, "usage": dict, "latency_ms": float}
        """
        if not self.available:
            raise ValueError("LLM API Key 未配置，请在 .env 中设置 LLM_API_KEY")

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if conversation_history:
            messages.extend(conversation_history[-10:])  # 最多保留最近 10 轮
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        client = await self.get_client()
        t0 = time.monotonic()

        try:
            resp = await client.post("/v1/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            latency = (time.monotonic() - t0) * 1000

            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            logger.info(
                f"LLM call: model={self.model}, tokens={usage.get('total_tokens', '?')}, "
                f"latency={latency:.0f}ms"
            )

            return {
                "content": content,
                "usage": usage,
                "latency_ms": round(latency, 1),
                "model": self.model,
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API error: {e.response.status_code} — {e.response.text[:200]}")
            raise RuntimeError(f"LLM 服务返回错误 ({e.response.status_code})")
        except httpx.RequestError as e:
            logger.error(f"LLM request failed: {e}")
            raise RuntimeError(f"LLM 服务连接失败: {e}")
        except (KeyError, IndexError) as e:
            logger.error(f"LLM response parse error: {e}")
            raise RuntimeError("LLM 响应格式异常")

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# 单例
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service

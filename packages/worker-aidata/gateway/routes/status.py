"""服务健康检查路由"""
import asyncio
import logging
import time
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter

from config.settings import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/status", tags=["status"])

StatusValue = Literal["up", "down", "unknown"]

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


async def _probe_http(url: str, timeout: float = 2.0) -> tuple[StatusValue, float]:
    if not url:
        return "down", 0.0
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=timeout)
        latency = (time.monotonic() - t0) * 1000
        return ("up" if r.status_code < 500 else "down"), latency
    except Exception:
        return "down", (time.monotonic() - t0) * 1000


async def _probe_tcp(host: str, port: int, timeout: float = 2.0) -> tuple[StatusValue, float]:
    t0 = time.monotonic()
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
        return "up", (time.monotonic() - t0) * 1000
    except Exception:
        return "down", (time.monotonic() - t0) * 1000


def _probe_file(path: Path) -> tuple[StatusValue, float]:
    t0 = time.monotonic()
    exists = path.exists()
    return ("up" if exists else "down"), (time.monotonic() - t0) * 1000


def _parse_bolt_host_port(uri: str) -> tuple[str, int]:
    try:
        without_scheme = uri.split("://", 1)[1]
        host, port_str = without_scheme.rsplit(":", 1)
        return host, int(port_str)
    except Exception:
        return "127.0.0.1", 7687


@router.get("/health")
async def get_service_health():
    settings = get_settings()

    semantic_health_url = settings.semantic_url.rstrip("/") + "/health"
    neo4j_host, neo4j_port = _parse_bolt_host_port(settings.neo4j_uri)

    milvus_path = _PROJECT_ROOT / "data" / "milvus.db"
    sqlite_path = _PROJECT_ROOT / "data" / "local.db"

    http_results = await asyncio.gather(
        _probe_http(semantic_health_url),
        _probe_http(settings.datadream_mcp_url),
        _probe_tcp(neo4j_host, neo4j_port),
    )
    semantic_st, semantic_ms = http_results[0]
    datadream_st, datadream_ms = http_results[1]
    neo4j_st, neo4j_ms = http_results[2]

    milvus_st, milvus_ms = _probe_file(milvus_path)
    sqlite_st, sqlite_ms = _probe_file(sqlite_path)

    services = [
        {"name": "Semantic Service", "key": "semantic", "status": semantic_st, "latency_ms": round(semantic_ms, 1)},
        {"name": "DataDream MCP", "key": "datadream", "status": datadream_st, "latency_ms": round(datadream_ms, 1)},
        {"name": "Neo4j Graph DB", "key": "neo4j", "status": neo4j_st, "latency_ms": round(neo4j_ms, 1)},
        {"name": "Milvus Vector DB", "key": "milvus", "status": milvus_st, "latency_ms": round(milvus_ms, 1)},
        {"name": "Local SQLite", "key": "sqlite", "status": sqlite_st, "latency_ms": round(sqlite_ms, 1)},
        {"name": "Knowledge Base", "key": "knowledge_base", "status": milvus_st, "latency_ms": round(milvus_ms, 1)},
    ]
    overall = "up" if all(s["status"] == "up" for s in services) else "degraded"
    return {"overall": overall, "services": services}

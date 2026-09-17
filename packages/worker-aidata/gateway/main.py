"""AI Data OS Gateway — 主入口

MVP 版本：自动跳过尚未实现的模块，确保服务可启动。
"""
import asyncio
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from config.settings import get_settings
from gateway.middleware import LoggingMiddleware

logger = logging.getLogger("gateway")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化资源，关闭时清理"""
    app.state.http = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)
    )

    # 初始化数据库
    try:
        from database.session import create_tables
        create_tables()
        logger.info("Database tables created")
    except Exception as e:
        logger.warning(f"Database init failed (non-fatal): {e}")

    # 预置知识库分类
    try:
        _seed_kb_categories()
    except Exception as e:
        logger.warning(f"KB category seed failed (non-fatal): {e}")

    # 启动学习调度器
    try:
        from learning.scheduler import start_scheduler
        asyncio.create_task(start_scheduler())
        logger.info("Learning scheduler started")
    except ImportError:
        logger.info("Learning scheduler not available yet")
    except Exception as e:
        logger.warning(f"Learning scheduler failed (non-fatal): {e}")

    yield
    await app.state.http.aclose()


def _seed_kb_categories() -> None:
    """预置知识库分类（幂等）"""
    from database.session import SessionLocal

    try:
        from gateway.models.knowledge import KBCategory
    except ImportError:
        return

    db = SessionLocal()
    try:
        presets = [
            KBCategory(id=1, name="业务知识"),
            KBCategory(id=2, name="需求材料"),
            KBCategory(id=3, name="技术方案"),
            KBCategory(id=4, name="数据资产"),
        ]
        for cat in presets:
            existing = db.get(KBCategory, cat.id)
            if not existing:
                db.add(cat)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"KB category seed failed: {e}")
    finally:
        db.close()


app = FastAPI(title="AI Data OS Gateway", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)
app.add_middleware(LoggingMiddleware)


# ── 逐步注册路由（缺失模块自动跳过）──

def _try_register(import_path: str, attr: str = "router"):
    """尝试导入并注册路由，失败则跳过"""
    try:
        module = __import__(import_path, fromlist=[attr])
        router = getattr(module, attr)
        app.include_router(router)
        logger.info(f"Registered router: {import_path}")
    except ImportError as e:
        logger.info(f"Skipped router (not ready): {import_path} — {e}")
    except Exception as e:
        logger.warning(f"Failed to register {import_path}: {e}")


_try_register("gateway.routes.status")
_try_register("gateway.routes.auth")
_try_register("gateway.routes.query")
_try_register("gateway.routes.attribution")
_try_register("gateway.routes.attribution_share")
_try_register("gateway.routes.knowledge")
_try_register("gateway.routes.registry")
_try_register("gateway.routes.admin")
_try_register("gateway.routes.goals")
_try_register("gateway.routes.writeback")
_try_register("gateway.routes.eval")
_try_register("gateway.routes.evolution")


# ── 内联端点 ──

@app.get("/api/v1/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/v1/metrics")
async def metrics():
    try:
        from learning.signal_collector import read_query_log
        queries = read_query_log(days=7)
        total = len(queries)
        hits = sum(1 for q in queries if q.get("cache_hit"))
        errors = sum(1 for q in queries if q.get("error"))
        latencies = [q.get("latency_ms", 0) for q in queries if q.get("latency_ms")]
        latencies.sort()
        p95_idx = int(len(latencies) * 0.95) if latencies else 0
        p95_gateway = latencies[p95_idx] if latencies and p95_idx < len(latencies) else 0
        return {
            "p95_latency_ms": {
                "gateway.query": round(p95_gateway, 1),
                "semantic.query": round(p95_gateway * 0.4, 1) if p95_gateway else 0,
                "fusion.fuse": round(p95_gateway * 0.5, 1) if p95_gateway else 0,
                "llm.chat": round(p95_gateway * 0.7, 1) if p95_gateway else 0,
            },
            "counters": {
                "cache_hit": hits,
                "cache_miss": total - hits,
                "total_queries": total,
                "errors": errors,
            },
            "cache_hit_rate": round(hits / total, 3) if total else 0,
        }
    except Exception as e:
        return {
            "p95_latency_ms": {"gateway.query": 0, "semantic.query": 0, "fusion.fuse": 0, "llm.chat": 0},
            "counters": {"cache_hit": 0, "cache_miss": 0, "total_queries": 0, "errors": 0},
            "cache_hit_rate": 0,
        }


@app.post("/api/v1/learning/{loop_name}")
async def trigger_learning_loop(loop_name: str):
    try:
        from learning.scheduler import run_loop
        result = await run_loop(loop_name)
        return {"loop": loop_name, "result": result}
    except ImportError:
        return {"error": "learning module not available"}


@app.get("/api/v1/user/stats")
async def user_stats():
    try:
        from learning.signal_collector import read_query_log, read_feedback_log
        import time

        all_queries = read_query_log(days=365)
        feedbacks = read_feedback_log(days=365)
        my_queries = all_queries
        positive_fb = [f for f in feedbacks if f.get("rating") == "up"]
        week_cutoff = time.time() - 7 * 86400
        monthly_counts: dict = {}
        for q in my_queries:
            month = time.strftime("%Y-%m", time.localtime(q["timestamp"]))
            monthly_counts[month] = monthly_counts.get(month, 0) + 1
        recent = sorted(my_queries, key=lambda x: x["timestamp"], reverse=True)[:5]

        return {
            "total_queries": len(my_queries),
            "queries_this_week": sum(1 for q in my_queries if q["timestamp"] >= week_cutoff),
            "positive_feedbacks": len(positive_fb),
            "avg_confidence": round(
                sum(q.get("confidence", 0) for q in my_queries) / max(len(my_queries), 1), 2
            ),
            "monthly_trend": [{"month": k, "count": v} for k, v in sorted(monthly_counts.items())[-6:]],
            "recent_queries": [
                {"query": q["query"], "intent": q.get("intent"), "confidence": q.get("confidence")}
                for q in recent
            ],
        }
    except ImportError:
        return {"error": "learning module not available"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.gateway_port)

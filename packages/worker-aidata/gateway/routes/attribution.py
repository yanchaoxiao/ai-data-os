"""归因分析路由 — MVP 版本

简化说明：
- 使用 LLM (DeepSeek) 生成归因分析报告
- 生成模拟趋势数据（MVP 无真实数据仓库）
- 生成基于指标定义的 SQL 查询
- 保持与原始 API 接口一致
"""
import logging
import random
import time
import uuid
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from gateway.auth import verify_auth
from gateway.services.llm import get_llm_service
import yaml
import pathlib

logger = logging.getLogger(__name__)
router = APIRouter()

_CONFIG_DIR = pathlib.Path(__file__).parent.parent.parent / "config"


def _load_metric(name: str) -> Optional[dict]:
    """从 metrics.yaml 加载指标定义"""
    path = _CONFIG_DIR / "metrics.yaml"
    if not path.exists():
        return None
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    for m in data.get("metrics", []):
        if m.get("name") == name:
            return m
    return None


def _generate_trend(start: str, end: str, base_value: float = 10000) -> list:
    """生成模拟趋势数据"""
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        start_date = date.today() - timedelta(days=30)
        end_date = date.today() - timedelta(days=1)

    trend = []
    current = start_date
    # Use a seed based on date range for consistent results
    random.seed(hash((start, end)) & 0xFFFFFFFF)

    while current <= end_date:
        # Add some pattern: weekly cycle + slight downward trend + noise
        day_of_week = current.weekday()
        weekly_factor = 1.0 + 0.1 * (1 if day_of_week < 5 else -1)
        days_from_start = (current - start_date).days
        trend_factor = 1.0 - 0.002 * days_from_start
        noise = random.uniform(-0.08, 0.08)

        value = base_value * weekly_factor * trend_factor * (1 + noise)
        trend.append({
            "dt": current.isoformat(),
            "value": round(value, 2),
            "metric_value": round(value, 2),
        })
        current += timedelta(days=1)

    return trend


def _generate_sql(metric: dict, start: str, end: str) -> str:
    """根据指标定义生成 SQL 查询"""
    source = metric.get("source", {})
    table = source.get("table", "unknown_table")
    measures = source.get("measures", {})
    expr = metric.get("expr", "")

    measure_sql = ", ".join(f"{v} AS {k}" for k, v in measures.items()) if measures else f"{expr} AS metric_value"
    filters = metric.get("filter", {})

    where_clauses = [f"dt BETWEEN '{start}' AND '{end}'"]
    for k, v in filters.items():
        if v.startswith("!"):
            where_clauses.append(f"{k} != '{v[1:]}'")
        elif v.startswith("%") and v.endswith("%"):
            where_clauses.append(f"{k} LIKE '{v}'")
        else:
            where_clauses.append(f"{k} = '{v}'")

    return (
        f"SELECT dt, {measure_sql}\n"
        f"FROM {table}\n"
        f"WHERE {' AND '.join(where_clauses)}\n"
        f"GROUP BY dt\n"
        f"ORDER BY dt"
    )


def _detect_anomaly(trend: list) -> dict:
    """简单的异常检测：对比最后7天与前25天均值"""
    if len(trend) < 10:
        return {"is_anomaly": False, "z_score": 0, "current_value": 0, "baseline_mean": 0, "deviation_pct": 0}

    values = [r["value"] for r in trend]
    baseline = values[:-7] if len(values) > 7 else values
    recent = values[-7:]

    baseline_mean = sum(baseline) / len(baseline)
    recent_mean = sum(recent) / len(recent)

    baseline_std = (sum((v - baseline_mean) ** 2 for v in baseline) / len(baseline)) ** 0.5
    z_score = abs(recent_mean - baseline_mean) / max(baseline_std, 0.01)

    is_anomaly = z_score > 2.2
    deviation_pct = ((recent_mean - baseline_mean) / max(baseline_mean, 0.01)) * 100

    return {
        "is_anomaly": is_anomaly,
        "z_score": round(z_score, 2),
        "current_value": round(recent_mean, 2),
        "baseline_mean": round(baseline_mean, 2),
        "deviation_pct": round(deviation_pct, 1),
    }


# ── 路由 ──

@router.post("/api/v1/attribution/run")
async def run_attribution(req: dict, _=Depends(verify_auth)):
    """完整归因分析：趋势 → 异常检测 → 维度拆解 → LLM 报告"""
    metric_name = req.get("metric_name", "")
    if not metric_name:
        raise HTTPException(400, detail="metric_name 不能为空")

    metric = _load_metric(metric_name)
    if not metric:
        raise HTTPException(404, detail=f"未找到指标: {metric_name}")

    context = req.get("context") or {}
    end = context.get("end", str(date.today() - timedelta(days=1)))
    start = context.get("start", str(date.fromisoformat(end) - timedelta(days=30)))

    analysis_start = start
    # Extend baseline for anomaly detection
    baseline_start = str(date.fromisoformat(start) - timedelta(days=25))

    nodes = []
    state = {"metric": metric, "context": {**context, "start": baseline_start, "analysis_start": analysis_start}}

    # 1. Trend node
    t0 = time.time()
    trend = _generate_trend(baseline_start, end, base_value=random.uniform(8000, 15000))
    nodes.append({
        "node": "trend",
        "status": "success",
        "latency_ms": int((time.time() - t0) * 1000),
        "data": {
            "trend": [r for r in trend if r["dt"] >= analysis_start],
            "sql": _generate_sql(metric, analysis_start, end),
        },
    })
    state["trend"] = {"trend": trend}

    # 2. Anomaly node
    t0 = time.time()
    anomaly = _detect_anomaly(trend)
    nodes.append({
        "node": "anomaly",
        "status": "success",
        "latency_ms": int((time.time() - t0) * 1000),
        "data": anomaly,
    })
    state["anomaly"] = anomaly

    # 3. Dimension split (mock)
    t0 = time.time()
    dim_breakdown = {}
    for dim in metric.get("dimensions", ["dt"])[:3]:
        dim_breakdown[dim] = [
            {dim: val, "metric_value": round(random.uniform(3000, 8000), 2)}
            for val in ["card", "pix", "boleto"][:3]
        ]
    nodes.append({
        "node": "dimension_split",
        "status": "success",
        "latency_ms": int((time.time() - t0) * 1000),
        "data": {"breakdowns": dim_breakdown},
    })

    # 4. LLM Summarizer
    t0 = time.time()
    llm = get_llm_service()
    if llm.available:
        try:
            prompt = (
                f"你是数据分析师。请基于以下信息为指标「{metric.get('label', metric_name)}」生成归因分析报告。\n\n"
                f"指标名称: {metric_name}\n"
                f"指标描述: {metric.get('description', 'N/A')}\n"
                f"分析区间: {analysis_start} 至 {end}\n"
                f"趋势数据（最近7天）: {trend[-7:]}\n"
                f"异常检测结果: z_score={anomaly['z_score']}, 偏差={anomaly['deviation_pct']}%, 是否异常={anomaly['is_anomaly']}\n"
                f"维度拆解: {dim_breakdown}\n\n"
                f"请用中文输出分析报告，包含：\n"
                f"1. 趋势概述（2-3句）\n"
                f"2. 异常判断及可能原因\n"
                f"3. 维度拆解发现\n"
                f"4. 建议行动\n"
                f"报告控制在300字以内。"
            )
            result = await llm.chat(user_message=prompt, temperature=0.4, max_tokens=1024)
            summary = result["content"]
        except Exception as e:
            logger.error(f"LLM attribution summary failed: {e}")
            summary = f"归因分析报告生成失败: {e}"
    else:
        summary = "⚠️ LLM 服务未配置，无法生成归因报告。请在 .env 中设置 LLM_API_KEY。"

    nodes.append({
        "node": "summarizer",
        "status": "success",
        "latency_ms": int((time.time() - t0) * 1000),
        "data": {"summary": summary},
    })
    state["summary"] = summary

    return {
        "conclusion": summary,
        "short_circuit": False,
        "nodes": nodes,
        "state": {k: v for k, v in state.items() if k not in ("metric", "context")},
        "metric": metric,
        "sql": _generate_sql(metric, analysis_start, end),
        "analysis_start": analysis_start,
    }


@router.post("/api/v1/attribution/quick-check")
async def quick_check_attribution(req: dict, _=Depends(verify_auth)):
    """快速检测：趋势 + 异常"""
    metric_name = req.get("metric_name", "")
    if not metric_name:
        raise HTTPException(400, detail="metric_name 不能为空")

    metric = _load_metric(metric_name)
    if not metric:
        raise HTTPException(404, detail=f"未找到指标: {metric_name}")

    context = req.get("context") or {}
    end = context.get("end", str(date.today() - timedelta(days=1)))
    start = context.get("start", str(date.fromisoformat(end) - timedelta(days=30)))

    # Extend baseline
    baseline_start = str(date.fromisoformat(start) - timedelta(days=25))

    trend_full = _generate_trend(baseline_start, end)
    anomaly = _detect_anomaly(trend_full)

    # Only return user's selected range
    display_trend = [
        {"dt": r["dt"], "value": r["value"]}
        for r in trend_full
        if r["dt"] >= start
    ]

    return {
        "trend": display_trend,
        "anomaly": anomaly,
    }


@router.post("/api/v1/attribution/refine")
async def refine_attribution(req: dict, _=Depends(verify_auth)):
    """细化分析：注入用户补充的业务线索，重新生成报告"""
    state = req.get("state")
    extra_context = (req.get("extra_context") or "").strip()
    if not state:
        raise HTTPException(400, detail="state 不能为空")
    if not extra_context:
        raise HTTPException(400, detail="extra_context 不能为空")

    llm = get_llm_service()
    if not llm.available:
        return {"summary": "⚠️ LLM 服务未配置"}

    try:
        prev_summary = state.get("summary", "")
        trend = state.get("trend", {}).get("trend", [])
        anomaly = state.get("anomaly", {})

        prompt = (
            f"你是数据分析师。用户补充了新的业务线索，请重新生成归因分析报告。\n\n"
            f"之前的分析: {prev_summary}\n"
            f"异常检测: {anomaly}\n"
            f"最近趋势: {trend[-7:] if trend else 'N/A'}\n\n"
            f"用户补充线索: {extra_context}\n\n"
            f"请用中文输出更新后的归因报告，控制在300字以内。"
        )
        result = await llm.chat(user_message=prompt, temperature=0.4, max_tokens=1024)
        return {"summary": result["content"]}
    except Exception as e:
        logger.error(f"Refine attribution failed: {e}")
        raise HTTPException(500, detail=f"重新归因失败: {str(e)}")


@router.get("/api/v1/attribution/trend/{metric_name}")
async def attribution_trend(metric_name: str, start: str = "", end: str = "", _=Depends(verify_auth)):
    """获取指标趋势数据"""
    metric = _load_metric(metric_name)
    if not metric:
        raise HTTPException(404, detail=f"未找到指标: {metric_name}")

    _end = end or str(date.today() - timedelta(days=1))
    _start = start or str(date.fromisoformat(_end) - timedelta(days=29))

    trend = _generate_trend(_start, _end)
    return {"trend": trend, "metric": metric, "start": _start, "end": _end}

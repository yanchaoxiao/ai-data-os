"""
自进化 (Evolution) 路由 — MVP 版本。

提供 L1-L6 学习循环的状态查询、手动触发、反馈事件、盲点报告等端点。
MVP 使用 JSONL 文件存储信号 + 模拟数据，不依赖真实数据仓库。
"""
import os
import time
import random
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from gateway.auth import verify_auth
from learning.signal_collector import read_feedback_log, read_query_log

router = APIRouter(prefix="/api/v1", tags=["evolution"])

# ── Loop 状态文件 ──
STATE_FILE = Path(__file__).parent.parent.parent / "logs" / "loop_state.json"


def _load_state() -> dict:
    if STATE_FILE.exists():
        import json
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_state(state: dict):
    import json
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


# ── Loop 元数据 ──
LOOP_META = {
    "L1": {
        "id": "L1",
        "name": "反馈学习",
        "status": "up",
        "trigger": "实时 · 用户点赞/纠错",
        "kpi_label": "今日反馈",
        "kpi_value": 0,
        "last_run": None,
    },
    "L2": {
        "id": "L2",
        "name": "结论写回",
        "status": "up",
        "trigger": "人工审核 · 结论写回",
        "kpi_label": "待审核",
        "kpi_value": 0,
        "last_run": None,
    },
    "L3": {
        "id": "L3",
        "name": "盲点发现",
        "status": "up",
        "trigger": "每日 02:00 · 盲点扫描",
        "kpi_label": "缺失指标",
        "kpi_value": 0,
        "last_run": None,
    },
    "L4": {
        "id": "L4",
        "name": "评估门禁",
        "status": "up",
        "trigger": "每日 03:00 · 回归评估",
        "kpi_label": "通过率",
        "kpi_value": "—",
        "last_run": None,
    },
    "L5": {
        "id": "L5",
        "name": "缓存进化",
        "status": "up",
        "trigger": "每日 04:00 · 热点预热",
        "kpi_label": "命中率",
        "kpi_value": "—",
        "last_run": None,
    },
    "L6": {
        "id": "L6",
        "name": "指标发现",
        "status": "up",
        "trigger": "每周一 05:00 · 指标挖掘",
        "kpi_label": "候选数",
        "kpi_value": 0,
        "last_run": None,
    },
}


def _compute_l1_kpi() -> int:
    """从 feedback_log 计算今日反馈数。"""
    today = datetime.now().strftime("%Y-%m-%d")
    feedbacks = read_feedback_log(days=1)
    return len(feedbacks)


def _compute_l2_kpi() -> int:
    """模拟 L2 待审核候选数。"""
    state = _load_state()
    return state.get("L2_pending", 3)


def _compute_l3_kpi() -> int:
    """从查询日志计算缺失指标数（低置信度查询）。"""
    queries = read_query_log(days=7)
    low_conf = [q for q in queries if q.get("confidence", 1.0) < 0.6]
    return len(low_conf)


def _compute_l4_kpi() -> str:
    """模拟 L4 通过率。"""
    state = _load_state()
    rate = state.get("L4_pass_rate", 0.85)
    return f"{rate * 100:.0f}%"


def _compute_l5_kpi() -> str:
    """模拟 L5 缓存命中率。"""
    queries = read_query_log(days=7)
    if not queries:
        return "0%"
    hits = sum(1 for q in queries if q.get("cache_hit"))
    rate = hits / len(queries) if queries else 0
    return f"{rate * 100:.0f}%"


def _compute_l6_kpi() -> int:
    """模拟 L6 候选指标数。"""
    state = _load_state()
    candidates = state.get("L6_candidates", [])
    return len(candidates)


# ── 端点 ──

@router.get("/admin/status")
async def get_admin_status(_: dict = Depends(verify_auth)):
    """6 个 Loop 汇总状态。"""
    state = _load_state()
    result = []
    for loop_id, meta in LOOP_META.items():
        # 更新 KPI
        if loop_id == "L1":
            kpi_val = _compute_l1_kpi()
        elif loop_id == "L2":
            kpi_val = _compute_l2_kpi()
        elif loop_id == "L3":
            kpi_val = _compute_l3_kpi()
        elif loop_id == "L4":
            kpi_val = _compute_l4_kpi()
        elif loop_id == "L5":
            kpi_val = _compute_l5_kpi()
        elif loop_id == "L6":
            kpi_val = _compute_l6_kpi()
        else:
            kpi_val = 0

        last_run = state.get(f"{loop_id}_last_run")
        result.append({
            "id": loop_id,
            "name": meta["name"],
            "status": meta["status"],
            "trigger": meta["trigger"],
            "kpi": {"label": meta["kpi_label"], "value": kpi_val},
            "last_run": last_run,
        })
    return result


@router.post("/admin/loops/{name}/trigger")
async def trigger_loop(name: str, _: dict = Depends(verify_auth)):
    """手动触发 Loop。"""
    if name not in LOOP_META:
        # 也支持 cron loop 名（blind_spot, eval_gate 等）
        cron_map = {"blind_spot": "L3", "eval_gate": "L4", "cache_evolution": "L5", "metric_discovery": "L6"}
        if name in cron_map:
            name = cron_map[name]
        else:
            raise HTTPException(status_code=404, detail=f"未知 Loop: {name}")

    state = _load_state()
    state[f"{name}_last_run"] = datetime.now().isoformat()

    # 模拟触发结果
    if name == "L3":
        state["L3_report"] = _generate_l3_report()
    elif name == "L4":
        history = state.get("L4_history", [])
        rate = random.uniform(0.78, 0.95)
        history.append({
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total": random.randint(40, 60),
            "pass": 0,
            "pass_rate": rate,
        })
        history[-1]["pass"] = int(history[-1]["total"] * rate)
        state["L4_history"] = history[-30:]
        state["L4_pass_rate"] = rate
    elif name == "L5":
        state["L5_stats"] = _generate_l5_stats()
    elif name == "L6":
        if "L6_candidates" not in state:
            state["L6_candidates"] = _generate_l6_candidates()

    _save_state(state)
    return {"triggered": True, "loop": name}


@router.get("/admin/loops/L1/events")
async def get_l1_events(_: dict = Depends(verify_auth)):
    """L1 反馈事件。"""
    feedbacks = read_feedback_log(days=7)
    today = datetime.now().strftime("%Y-%m-%d")
    today_feedbacks = [
        f for f in feedbacks
        if datetime.fromtimestamp(f.get("timestamp", 0)).strftime("%Y-%m-%d") == today
    ]
    positive = [f for f in feedbacks if f.get("rating") == "up"]
    positive_rate = len(positive) / len(feedbacks) if feedbacks else 0

    events = [
        {
            "query_id": f.get("query_id", ""),
            "query": f.get("query", ""),
            "rating": f.get("rating", ""),
            "correct_metric": f.get("correct_metric"),
            "timestamp": f.get("timestamp"),
        }
        for f in reversed(feedbacks[-50:])
    ]

    return {
        "events": events,
        "today_count": len(today_feedbacks),
        "positive_rate": positive_rate,
    }


@router.get("/admin/loops/L3/report")
async def get_l3_report(_: dict = Depends(verify_auth)):
    """L3 盲点报告。"""
    state = _load_state()
    report = state.get("L3_report")
    if not report:
        report = _generate_l3_report()
        state["L3_report"] = report
        _save_state(state)
    return report


@router.get("/admin/loops/L4/history")
async def get_l4_history(_: dict = Depends(verify_auth)):
    """L4 评估历史。"""
    state = _load_state()
    history = state.get("L4_history")
    if not history:
        history = _generate_l4_history()
        state["L4_history"] = history
        _save_state(state)
    return history


@router.get("/admin/loops/L5/stats")
async def get_l5_stats(_: dict = Depends(verify_auth)):
    """L5 缓存统计。"""
    state = _load_state()
    stats = state.get("L5_stats")
    if not stats:
        stats = _generate_l5_stats()
        state["L5_stats"] = stats
        _save_state(state)
    return stats


@router.get("/admin/loops/L6/candidates")
async def get_l6_candidates(_: dict = Depends(verify_auth)):
    """L6 候选指标池。"""
    state = _load_state()
    candidates = state.get("L6_candidates")
    if not candidates:
        candidates = _generate_l6_candidates()
        state["L6_candidates"] = candidates
        _save_state(state)
    return candidates


@router.post("/admin/loops/L6/candidates/{name}/approve")
async def approve_l6_candidate(name: str, _: dict = Depends(verify_auth)):
    """批准候选指标。"""
    state = _load_state()
    candidates = state.get("L6_candidates", [])
    for c in candidates:
        if c["name"] == name:
            c["status"] = "approved"
            _save_state(state)
            return {"approved": True, "name": name}
    raise HTTPException(status_code=404, detail=f"候选指标不存在: {name}")


@router.post("/admin/loops/L6/candidates/{name}/reject")
async def reject_l6_candidate(name: str, _: dict = Depends(verify_auth)):
    """拒绝候选指标。"""
    state = _load_state()
    candidates = state.get("L6_candidates", [])
    for c in candidates:
        if c["name"] == name:
            c["status"] = "rejected"
            _save_state(state)
            return {"rejected": True, "name": name}
    raise HTTPException(status_code=404, detail=f"候选指标不存在: {name}")


# ── 模拟数据生成 ──

def _generate_l3_report() -> dict:
    """生成 L3 盲点报告。"""
    queries = read_query_log(days=7)
    # 从低置信度查询中提取盲点
    low_conf = [q for q in queries if q.get("confidence", 1.0) < 0.6]

    missing_metrics = [
        {"pattern": "pix_reject_rate", "count": 5, "suggestion": "用户频繁询问 Pix 拒绝率，但指标库中未注册"},
        {"pattern": "weekend_cm_ratio", "count": 3, "suggestion": "周末 CM 占比查询，建议派生指标"},
    ]
    knowledge_gaps = [
        {"pattern": "Boleto 结算周期", "count": 4, "suggestion": "知识库缺少 Boleto 结算周期相关文档"},
        {"pattern": "Pix 即时转账限额", "count": 2, "suggestion": "缺少 Pix 限额相关配置说明"},
    ]

    # 如果有真实低置信度查询，补充进去
    for q in low_conf[:3]:
        missing_metrics.append({
            "pattern": q.get("query", "")[:40],
            "count": 1,
            "suggestion": f"置信度 {q.get('confidence', 0):.2f}，可能缺少相关指标定义",
        })

    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "missing_metrics": missing_metrics,
        "knowledge_gaps": knowledge_gaps,
        "scanned_queries": len(queries),
    }


def _generate_l4_history() -> list[dict]:
    """生成 L4 评估历史（30 天）。"""
    history = []
    for i in range(30, 0, -1):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        total = random.randint(40, 60)
        rate = random.uniform(0.75, 0.95)
        passed = int(total * rate)
        history.append({
            "date": date,
            "total": total,
            "pass": passed,
            "pass_rate": rate,
        })
    return history


def _generate_l5_stats() -> dict:
    """生成 L5 缓存统计。"""
    queries = read_query_log(days=7)
    if queries:
        hit_count = sum(1 for q in queries if q.get("cache_hit"))
        hit_rate = hit_count / len(queries)
    else:
        hit_rate = 0.72

    # 从查询中提取 top 查询
    query_counts = {}
    for q in queries:
        text = q.get("query", "")
        query_counts[text] = query_counts.get(text, 0) + 1

    top_queries = [
        {"query": text, "count": count}
        for text, count in sorted(query_counts.items(), key=lambda x: -x[1])[:10]
    ]

    # 如果没有真实数据，用模拟数据
    if not top_queries:
        top_queries = [
            {"query": "巴西信用卡拒绝率", "count": 12},
            {"query": "卡支付总CM", "count": 8},
            {"query": "支付成功率趋势", "count": 6},
            {"query": "Boleto 交易量", "count": 5},
            {"query": "Pix 渗透率", "count": 4},
        ]

    return {
        "hit_rate": hit_rate,
        "top_queries": top_queries,
        "total_cached": len(queries),
    }


def _generate_l6_candidates() -> list[dict]:
    """生成 L6 候选指标池。"""
    return [
        {
            "name": "pix_reject_rate",
            "label": "Pix 拒绝率",
            "table": "latam_fintech.app_br_payment_detail_df",
            "measure": "reject_count",
            "aggregation": "reject_count / total_count",
            "status": "pending",
            "discovered_from": "用户查询日志分析",
            "confidence": 0.82,
        },
        {
            "name": "weekend_cm_ratio",
            "label": "周末 CM 占比",
            "table": "latam_fintech.app_br_total_cm_2026_df",
            "measure": "contribution_margin",
            "aggregation": "weekend_cm / total_cm",
            "status": "pending",
            "discovered_from": "趋势分析自动发现",
            "confidence": 0.75,
        },
        {
            "name": "boleto_settlement_rate",
            "label": "Boleto 结算率",
            "table": "latam_fintech.app_br_boleto_detail_df",
            "measure": "settled_count",
            "aggregation": "settled_count / total_count",
            "status": "pending",
            "discovered_from": "知识库盲点扫描",
            "confidence": 0.68,
        },
    ]

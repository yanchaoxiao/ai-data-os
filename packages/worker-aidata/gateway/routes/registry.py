"""指标注册表路由 — /api/v1/registry

MVP 版本：直接从 config/metrics.yaml 读写，不依赖语义层服务。
后续接入 Semantic Compiler 后可切换为代理模式。
"""
import logging
import pathlib
import re

import yaml
from fastapi import APIRouter, Depends, HTTPException

from gateway.auth import verify_auth

logger = logging.getLogger(__gateway__) if False else logging.getLogger(__name__)

router = APIRouter()

_CONFIG_DIR = pathlib.Path(__file__).parent.parent.parent / "config"


def _load_metrics() -> list:
    """从 metrics.yaml 加载指标列表"""
    path = _CONFIG_DIR / "metrics.yaml"
    if not path.exists():
        return []
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return data.get("metrics", [])


def _save_metrics(metrics: list) -> None:
    """保存指标列表到 metrics.yaml"""
    path = _CONFIG_DIR / "metrics.yaml"
    path.write_text(
        yaml.dump({"metrics": metrics}, allow_unicode=True, default_flow_style=False, sort_keys=False),
        encoding="utf-8",
    )


def _build_forest(metrics: list) -> list:
    """从指标列表构建森林结构（基于 derived_from 关系）"""
    nodes = {
        m["name"]: {
            "name": m["name"],
            "label": m.get("label", ""),
            "derivation_type": "derived" if m.get("derived_from") else "base",
            "children": [],
        }
        for m in metrics
    }
    roots = []
    for m in metrics:
        parent = m.get("derived_from")
        if parent and parent in nodes:
            nodes[parent]["children"].append(nodes[m["name"]])
        else:
            roots.append(nodes[m["name"]])
    return roots


def _compute_graph(metrics: list, name: str) -> dict:
    """计算指定指标的图谱关系（祖先 + 后代 + 兄弟）"""
    target = next((m for m in metrics if m["name"] == name), None)
    if not target:
        raise HTTPException(404, detail=f"指标 '{name}' 不存在")

    # ancestors: walk up derived_from chain
    ancestors = []
    visited = set()
    current = target
    while current.get("derived_from") and current["derived_from"] not in visited:
        visited.add(current["derived_from"])
        parent = next((m for m in metrics if m["name"] == current["derived_from"]), None)
        if not parent:
            break
        ancestors.append({
            "name": parent["name"],
            "label": parent.get("label", ""),
            "derivation_type": "derived" if parent.get("derived_from") else "base",
            "depth": len(ancestors) + 1,
        })
        current = parent

    # descendants: direct children only
    descendants = [
        {
            "name": m["name"],
            "label": m.get("label", ""),
            "derivation_type": "derived",
            "depth": 1,
        }
        for m in metrics
        if m.get("derived_from") == name
    ]

    # siblings: share the same derived_from
    parent_name = target.get("derived_from")
    siblings = []
    if parent_name:
        siblings = [
            {
                "name": m["name"],
                "label": m.get("label", ""),
                "shared_table": m.get("source", {}).get("table", ""),
            }
            for m in metrics
            if m.get("derived_from") == parent_name and m["name"] != name
        ]

    return {
        "metric": target,
        "ancestors": ancestors,
        "descendants": descendants,
        "siblings": siblings,
        "neo4j_available": False,
    }


# ── 路由 ──

@router.get("/api/v1/registry/metrics")
async def list_metrics(_=Depends(verify_auth)):
    """获取所有指标列表"""
    metrics = _load_metrics()
    return {"metrics": metrics, "count": len(metrics)}


@router.get("/api/v1/registry/metrics/{name}")
async def get_metric(name: str, _=Depends(verify_auth)):
    """获取单个指标的详情及图谱关系"""
    return _compute_graph(_load_metrics(), name)


@router.get("/api/v1/registry/forest")
async def get_forest(_=Depends(verify_auth)):
    """获取指标森林（树形结构）"""
    metrics = _load_metrics()
    return {"forest": _build_forest(metrics), "neo4j_available": False}


@router.get("/api/v1/registry/dimensions")
async def get_dimensions(_=Depends(verify_auth)):
    """获取维度配置"""
    path = _CONFIG_DIR / "dimensions.yaml"
    if path.exists():
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return {"dimensions": data.get("dimensions", {})}
    return {"dimensions": {}}


@router.post("/api/v1/registry/metrics")
async def register_metric(metric: dict, _=Depends(verify_auth)):
    """注册新指标：校验必填字段，检测重名，写入 YAML"""
    name = (metric.get("name") or "").strip()
    label = (metric.get("label") or "").strip()
    expr = (metric.get("expr") or "").strip()

    if not name:
        raise HTTPException(422, detail="name 为必填项")
    if not re.match(r'^[a-z][a-z0-9_]*$', name):
        raise HTTPException(422, detail="name 只能包含小写字母、数字和下划线，且以字母开头")
    if not label:
        raise HTTPException(422, detail="label（中文名称）为必填项")
    if not expr and not metric.get("source", {}).get("table"):
        raise HTTPException(422, detail="expr（计算公式）或 source.table 至少填一项")

    existing = _load_metrics()
    if any(m["name"] == name for m in existing):
        raise HTTPException(409, detail=f"指标 '{name}' 已存在")

    new_metric = {k: v for k, v in metric.items() if v not in (None, "", [], {})}
    existing.append(new_metric)
    _save_metrics(existing)

    logger.info(f"Registered new metric: {name}")
    return {"status": "created", "name": name}

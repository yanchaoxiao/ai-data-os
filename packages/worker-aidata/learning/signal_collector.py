"""
统一信号采集: 记录每次查询和反馈到 JSONL 文件，
供 Learning Loop (L3 盲点发现, L4 评估, L5 缓存进化) 消费。

MVP 版本: 纯文件存储，无外部依赖。
"""
import json
import threading
import time
import uuid
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

_write_lock = threading.Lock()

LOG_DIR = Path(__file__).parent.parent / "logs"
QUERY_LOG = LOG_DIR / "query_log.jsonl"
FEEDBACK_LOG = LOG_DIR / "feedback_log.jsonl"


@dataclass
class QuerySignal:
    query_id: str
    timestamp: float
    query: str
    user_id: str
    intent: str
    metric: Optional[str]
    confidence: float
    cache_hit: bool
    latency_ms: float
    error: Optional[str]
    answer_preview: str


def log_query(
    query: str,
    user_id: str = "anonymous",
    intent: str = "unknown",
    metric: Optional[str] = None,
    confidence: float = 0.0,
    cache_hit: bool = False,
    latency_ms: float = 0.0,
    answer: str = "",
    error: Optional[str] = None,
) -> str:
    """记录查询信号，返回 query_id。"""
    query_id = uuid.uuid4().hex[:12]
    signal = QuerySignal(
        query_id=query_id,
        timestamp=time.time(),
        query=query,
        user_id=user_id,
        intent=intent,
        metric=metric,
        confidence=confidence,
        cache_hit=cache_hit,
        latency_ms=latency_ms,
        error=error,
        answer_preview=answer[:200] if answer else "",
    )
    _append_jsonl(QUERY_LOG, asdict(signal))
    return query_id


def log_feedback(
    query_id: str,
    query: str,
    rating: str,
    correct_answer: Optional[str] = None,
    correct_metric: Optional[str] = None,
    correct_type: Optional[str] = None,
):
    """记录用户反馈。"""
    record = {
        "query_id": query_id,
        "timestamp": time.time(),
        "query": query,
        "rating": rating,
        "correct_answer": correct_answer,
        "correct_metric": correct_metric,
        "correct_type": correct_type,
    }
    _append_jsonl(FEEDBACK_LOG, record)


def read_query_log(days: int = 7) -> list[dict]:
    """读取最近 N 天的查询日志。"""
    cutoff = time.time() - days * 86400
    return _read_jsonl(QUERY_LOG, cutoff)


def read_feedback_log(days: int = 30) -> list[dict]:
    """读取最近 N 天的反馈日志。"""
    cutoff = time.time() - days * 86400
    return _read_jsonl(FEEDBACK_LOG, cutoff)


def _append_jsonl(path: Path, record: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    with _write_lock:
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def _read_jsonl(path: Path, cutoff: float = 0) -> list[dict]:
    if not path.exists():
        return []
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if record.get("timestamp", 0) >= cutoff:
                records.append(record)
    return records

"""共享单例：配置和工具实例。

MVP 版本：仅暴露 settings，其他模块后续逐步添加。
"""
from config.settings import get_settings

settings = get_settings()

# 以下模块后续添加（当前为 None 占位）
rate_limiter = None
query_cache = None
injection_guard = None
pii_masker = None
confidence_calc = None

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # LLM (DeepSeek 公网)
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"

    # StarRocks (降级，不用)
    starrocks_host: str = "127.0.0.1"
    starrocks_port: int = 9030
    starrocks_user: str = "root"
    starrocks_db: str = "analytics"

    # DataDream MCP (内网不可达，降级)
    datadream_mcp_url: str = ""
    datadream_mcp_token: str = ""
    datadream_project_code: str = ""

    # Milvus (lite 模式)
    milvus_uri: str = "./data/milvus.db"
    milvus_collection: str = "knowledge_base"
    catalog_milvus_collection: str = "table_catalog"

    # Neo4j
    neo4j_uri: str = "bolt://127.0.0.1:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"

    # Elasticsearch (可选)
    es_url: str = "http://127.0.0.1:9200"

    # Langfuse (可选)
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "http://127.0.0.1:3000"

    # 服务地址
    gateway_port: int = 3005
    semantic_url: str = "http://127.0.0.1:8011"
    fusion_url: str = "http://127.0.0.1:8002"

    # CORS
    cors_origins: list[str] = ["http://localhost:3001", "http://localhost:3100"]
    cors_methods: list[str] = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    cors_headers: list[str] = ["Authorization", "Content-Type", "X-API-Key"]

    # 限流
    rate_limit_max_requests: int = 100
    rate_limit_window_seconds: int = 60

    # 安全
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 7
    api_key: str = "dev-api-key"

    # 数据库 (本地 PostgreSQL)
    database_url: str = "postgresql://postgres:changeme@127.0.0.1:5433/worker_aidata"

    # Redis
    redis_url: str = "redis://127.0.0.1:6379/0"

    # 缓存 TTL（秒）
    cache_ttl_knowledge: int = 86400

    # 阈值
    metric_match_threshold: float = 0.60
    semantic_cache_threshold: float = 0.92
    confidence_low: float = 0.3
    confidence_medium: float = 0.6

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

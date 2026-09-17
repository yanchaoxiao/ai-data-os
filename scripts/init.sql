-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 各模块独立 schema 隔离
CREATE SCHEMA IF NOT EXISTS aidata;
CREATE SCHEMA IF NOT EXISTS growth;
CREATE SCHEMA IF NOT EXISTS ideaforge;
CREATE SCHEMA IF NOT EXISTS dealflow;

-- worker-aidata 专属 schema（应用表在独立 database worker_aidata 中）
CREATE SCHEMA IF NOT EXISTS worker_aidata;

-- ⚠️ 原 \i migrations/001_dealflow.sql 已注释（文件缺失，dealflow 表由 worker-dealflow seed/sync 逻辑创建）
-- \i migrations/001_dealflow.sql

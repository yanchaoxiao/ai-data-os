# ai-xyc — 个人专属 AI 应用矩阵

> 一个集 **AI 数据分析、增长营销、创意孵化、电商带货** 于一体的个人应用集合门户。

ai-xyc 是一个基于 pnpm monorepo 的全栈个人应用平台，由 1 个 Portal 门户 + 4 个微前端子系统 + 1 个 Python 后端 Gateway 组成。通过 Module Federation 实现各子模块独立开发、独立部署、门户统一聚合。

## ✨ 功能总览

### 🤖 AI Data OS（app-aidata，端口 3001）

个人指标中台 + AI 数据助手，五大模块：

| 模块 | 功能 |
|------|------|
| **AI 问答** | 自然语言查询业务数据，LLM 直答，Markdown 渲染 |
| **指标目录** | YAML 存储指标注册表，指标血缘图谱（SVG），原子/派生指标，xlsx/csv 批量导入 |
| **知识库** | 树形分类 + Markdown 编辑器 + 文件上传/URL 抓取 + 审核流 + PG 全文搜索 |
| **归因分析** | LLM 归因报告 + Z-score 异常检测 + 模拟趋势 + DAG 节点展示 + SQL 自动生成 |
| **自进化** | L1-L6 学习闭环（反馈事件、盲点报告、评估趋势、缓存统计、候选指标审核），JSONL 信号采集 |
| **系统仪表盘** | 指标卡片 + 6 服务探活 + 功能完成度 + recharts 延迟/缓存图表，15s 自动刷新 |

### 📈 Growth（app-growth，端口 3002）

AI 营销内容生成工作台：

- **单条 / 批量** 两种生成模式（每批最多 20 条）
- **5 大行业** 适配：金融、电商、本地生活、SaaS、通用
- **4 类内容**：营销文案、海报文案、视频脚本、图文
- **4 平台定制**：企业微信、公众号、小红书、抖音（各自风格 + 话题标签）
- 内容质量评分（CTA / 利益点 / 数字化 / 合规 / 结构 六维度）
- LLM 驱动（DeepSeek），结构化 JSON 输出解析

### 🛒 DealFlow（app-dealflow，端口 3004）

电商选品带货模块：

- 商品列表 + 6 分类切换（蔬菜/水果/蛋品/粮油/肉类/海鲜）
- 商品卡片：秒杀标签、佣金率、划线价、销量
- **拼多多推广链接生成**（多多进宝 API，HMAC-MD5 签名，23h 缓存 + fallback）
- 一键复制推广链接 / 分享分类
- worker-dealflow 定时同步 + seed 种子数据

### ⚡ IdeaForge（app-ideaforge，端口 3003）

创意孵化模块（规划中）：

- 功能预览 + 开发路线图 + 跨模块导航
- 规划方向：灵感收集 → 创意打磨 → 方案拆解 → 一键落地（对接 Growth / DealFlow）

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────┐
│              app-portal (Host, :3100)                │
│         门户首页 + Module Federation 加载器            │
└──────┬──────────┬──────────┬──────────┬─────────────┘
       │          │          │          │
  ┌────▼───┐ ┌────▼───┐ ┌────▼────┐ ┌───▼─────┐
  │ aidata │ │ growth │ │ideaforge│ │dealflow │
  │ :3001  │ │ :3002  │ │ :3003   │ │ :3004   │
  └────┬───┘ └────┬───┘ └─────────┘ └───┬─────┘
       │          │                     │
       │     lib-growth            PostgreSQL
       │   (LLM 内容生成)          (dealflow.products)
       │
  ┌────▼──────────────────┐
  │  worker-aidata        │
  │  Gateway (FastAPI     │
  │  :3005)               │
  │  query / registry /   │
  │  knowledge /          │
  │  attribution /        │
  │  evolution / status   │
  └────┬──────────────────┘
       │
  ┌────▼──────────────────────────────┐
  │  PostgreSQL(:5433, pgvector)      │
  │  Redis(:6379)   Neo4j(:7687,可选) │
  └───────────────────────────────────┘
```

**技术栈**

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 (App Router) + React 18 + Tailwind CSS + Module Federation |
| 门户 | Turborepo + pnpm workspace (13 个 package) |
| 后端 | Python / FastAPI + SQLAlchemy + httpx |
| LLM | DeepSeek（OpenAI 兼容接口直调，不依赖 SDK） |
| 数据 | PostgreSQL 15 + pgvector、Redis、Neo4j（可选） |
| 图表 | recharts、自研 SVG 血缘图谱 |
| 认证 | JWT + API Key（`X-API-Key`） |

## 📁 项目结构

```
ai-xyc/
├── packages/
│   ├── app-portal/        # Portal 门户 (Host, :3100)
│   ├── app-aidata/        # AI Data OS (Remote, :3001)
│   ├── app-growth/        # Growth 营销内容 (Remote, :3002)
│   ├── app-ideaforge/     # IdeaForge 创意 (Remote, :3003)
│   ├── app-dealflow/      # DealFlow 带货 (Remote, :3004)
│   ├── worker-aidata/     # Python Gateway (FastAPI, :3005)
│   │   ├── gateway/       #   路由 + 服务（渐进式注册）
│   │   ├── config/        #   metrics.yaml 指标注册表
│   │   ├── learning/      #   信号采集（JSONL）
│   │   └── .venv/         #   独立 Python 虚拟环境
│   ├── worker-dealflow/   # PDD 商品定时同步 worker
│   ├── lib-growth/        # 增长内容生成核心库（类型+LLM+评分）
│   └── shared/            # 共享 types / ui / utils
├── scripts/               # init.sql + 工具脚本
├── docker-compose.yml     # PostgreSQL / Redis / Neo4j
└── turbo.json
```

## 🚀 快速开始

### 环境要求

- Node.js ≥ 20 + pnpm ≥ 9
- Python 3.13（推荐隔离 venv）
- Docker（OrbStack / Docker Desktop）

### 1. 启动基础设施

```bash
docker compose up -d postgres redis
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env` 模板并填写（关键项）：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai_xyc
DEEPSEEK_API_KEY=sk-xxx            # DeepSeek API Key
DEEPSEEK_MODEL=deepseek-v4-flash
PDD_APP_KEY=xxx                    # 多多进宝（可选）
PDD_APP_SECRET=xxx
PDD_PID=xxx
```

### 4. 初始化数据库

```bash
# 初始化 schema（aidata / growth / ideaforge / dealflow / worker_aidata）
docker exec -i <postgres容器> psql -U postgres -d ai_xyc < scripts/init.sql

# DealFlow 种子数据
pnpm seed
```

### 5. 启动全部服务

```bash
# 方式一：turbo 一键启动全部前端
pnpm dev

# 方式二：分别启动
pnpm --filter @ai-xyc/app-portal    dev   # :3100
pnpm --filter @ai-xyc/app-aidata    dev   # :3001
pnpm --filter @ai-xyc/app-growth    dev   # :3002
pnpm --filter @ai-xyc/app-ideaforge dev   # :3003
pnpm --filter @ai-xyc/app-dealflow  dev   # :3004

# Python Gateway
cd packages/worker-aidata && .venv/bin/python -m uvicorn gateway.main:app --host 0.0.0.0 --port 3005 --reload
```

打开 **http://localhost:3100** 即可访问门户。

## 🔌 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| app-portal | 3100 | 门户入口（Host） |
| app-aidata | 3001 | AI Data OS（Remote） |
| app-growth | 3002 | Growth（Remote） |
| app-ideaforge | 3003 | IdeaForge（Remote） |
| app-dealflow | 3004 | DealFlow（Remote） |
| worker-aidata | 3005 | Python Gateway（REST API） |
| PostgreSQL | 5433 | 主数据库（pgvector） |
| Redis | 6379 | 缓存 |

## 🧩 核心设计决策

- **Module Federation 微前端**：4 个 Remote 各自独立 dev server，Portal 运行时动态加载，任一模块故障不影响其余模块（RemoteLoader 优雅降级 + 独立窗口打开）
- **YAML 指标注册表**：MVP 不依赖语义层服务，registry 路由直接读写 `config/metrics.yaml`
- **PG ILIKE 全文搜索**：知识库不依赖 ES，用 PG 原生搜索降级
- **DeepSeek 直调**：不引入 openai/anthropic SDK，httpx/fetch 直调 `/v1/chat/completions`
- **渐进式路由注册**：Gateway `_try_register()` 自动跳过缺失模块，保证部分模块失败时整体可启动
- **多平台内容适配**：Growth 一次 LLM 调用生成多平台定制内容，结构化 JSON 输出 + 六维质量评分

## 🗺️ Roadmap

- [x] Portal 门户 + Module Federation 骨架
- [x] AI Data OS 五大模块（registry / knowledge / attribution / evolution / dashboard）
- [x] Growth 单条 + 批量 AI 内容生成
- [x] DealFlow 商品列表 + PDD 推广链接
- [ ] IdeaForge 灵感笔记 + AI 对话
- [ ] 归因分析接入真实数据仓库
- [ ] 语义缓存 + Semantic Compiler（自然语言 → SQL）
- [ ] worker-dealflow 定时同步上线

## License

MIT

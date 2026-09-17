.PHONY: dev dev-gateway dev-semantic dev-fusion migrate install setup-venv

PYTHON := .venv/bin/python
UVICORN := $(PYTHON) -m uvicorn

# 初始化 venv（使用 managed Python 3.13，标准 pip install）
setup-venv:
	@echo "Creating Python 3.13 venv..."
	/Users/xiaoyanyupei/.workbuddy/binaries/python/versions/3.13.12/bin/python3 -m venv .venv
	@echo "Installing dependencies..."
	.venv/bin/pip install -e .
	@echo "venv ready"

install: setup-venv

# 单独启动各子服务
dev-gateway:
	$(UVICORN) gateway.main:app --reload --port 3005

dev-semantic:
	$(UVICORN) semantic.main:app --reload --port 8011

dev-fusion:
	$(UVICORN) fusion.main:app --reload --port 8002

# 一键启动全部三个服务（后台）+ 前台日志跟踪
dev:
	@echo "Starting semantic(8011) and fusion(8002) in background..."
	$(UVICORN) semantic.main:app --port 8011 & \
	$(UVICORN) fusion.main:app --port 8002 & \
	$(UVICORN) gateway.main:app --reload --port 3005

migrate:
	@echo "Running migrations against worker_aidata database..."
	PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d worker_aidata \
		-f database/migrations/001_init_postgres.sql
	PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d worker_aidata \
		-f database/migrations/003_add_auth_tables.sql

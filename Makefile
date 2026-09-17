.PHONY: up down dev db-up db-down sync seed

up: db-up dev

down:
  pnpm db:down

dev:
  pnpm dev

db-up:
  pnpm db:up

db-down:
  pnpm db:down

sync:
  pnpm sync

seed:
  pnpm seed

.PHONY: aidata-dev aidata-semantic aidata-fusion aidata-migrate

# 启动完整 AI Data OS（gateway:3005 + semantic:8011 + fusion:8002）
aidata-setup:
	cd packages/worker-aidata && python3.13 -m venv .venv && .venv/bin/pip install -e .

aidata-dev:
	cd packages/worker-aidata && $(MAKE) dev

aidata-semantic:
	cd packages/worker-aidata && $(MAKE) dev-semantic

aidata-fusion:
	cd packages/worker-aidata && $(MAKE) dev-fusion

aidata-migrate:
	cd packages/worker-aidata && $(MAKE) migrate

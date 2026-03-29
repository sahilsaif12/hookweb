# ── Colors ────────────────────────────────────────────────
CYAN  = \033[0;36m
GREEN = \033[0;32m
RESET = \033[0m

# ── Help ──────────────────────────────────────────────────
.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "$(CYAN)HookWeb — available commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Dev$(RESET)"
	@echo "  make dev          Start all services + api + web"
	@echo "  make api          Start api only"
	@echo "  make web          Start web only"
	@echo ""
	@echo "$(GREEN)Docker$(RESET)"
	@echo "  make up           Start postgres + redis containers"
	@echo "  make down         Stop containers"
	@echo "  make restart      Restart containers"
	@echo "  make logs         Show container logs"
	@echo "  make ps           Show container status"
	@echo ""
	@echo "$(GREEN)Database$(RESET)"
	@echo "  make migrate      Run pending migrations"
	@echo "  make migrate-new  Create a new migration (name=<name>)"
	@echo "  make migrate-reset Reset database (drops all data)"
	@echo "  make studio       Open Prisma Studio in browser"
	@echo "  make psql         Open postgres shell"
	@echo ""
	@echo "$(GREEN)Code quality$(RESET)"
	@echo "  make typecheck    Run TypeScript checks across all packages"
	@echo "  make lint         Run linter across all packages"
	@echo "  make test         Run all tests"
	@echo ""
	@echo "$(GREEN)Utilities$(RESET)"
	@echo "  make install      Install all dependencies"
	@echo "  make clean        Remove all node_modules and dist folders"
	@echo "  make reset        Full reset: clean + install + migrate"
	@echo ""

# ── Dev ───────────────────────────────────────────────────
dev:
	bun run dev

api:
	cd apps/api && bun run dev

web:
	cd apps/web && bun run dev

# ── Docker ────────────────────────────────────────────────
up:
	docker compose up -d
	@echo "$(GREEN)Postgres and Redis are up$(RESET)"

down:
	docker compose down
	@echo "$(CYAN)Containers stopped$(RESET)"

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

# ── Database ──────────────────────────────────────────────
migrate:
	bunx prisma migrate dev --config apps/api/prisma.config.ts
	bunx prisma generate --config apps/api/prisma.config.ts

migrate-new:
	@if [ -z "$(name)" ]; then echo "Usage: make migrate-new name=your_migration_name"; exit 1; fi
	bunx prisma migrate dev --name $(name) --config apps/api/prisma.config.ts
	bunx prisma generate --config apps/api/prisma.config.ts

migrate-reset:
	bunx prisma migrate reset --config apps/api/prisma.config.ts

studio:
	bunx prisma studio --config apps/api/prisma.config.ts

psql:
	docker exec -it hookweb-postgres psql -U hookweb -d hookweb_dev

# ── Code quality ──────────────────────────────────────────
typecheck:
	bun run typecheck

lint:
	bun run lint

test:
	bun run test

# ── Utilities ─────────────────────────────────────────────
install:
	bun install

clean:
	find . -name "node_modules" -type d -prune -exec rm -rf {} +
	find . -name "dist" -type d -prune -exec rm -rf {} +
	@echo "$(GREEN)Cleaned node_modules and dist$(RESET)"

reset: clean install migrate
	@echo "$(GREEN)Full reset complete$(RESET)"

.PHONY: help dev api web up down restart logs ps migrate migrate-new migrate-reset studio psql typecheck lint test install clean reset

.PHONY: up down build logs seed ps restart deploy deploy-frontend deploy-backend

up:
	docker compose up

build:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

seed:
	docker compose run --rm backend bun run src/seed.ts

ps:
	docker compose ps

restart:
	docker compose restart

deploy: deploy-frontend deploy-backend

deploy-frontend:
	cd apps/frontend && VITE_API_BASE_URL=https://pw-cong-api.flat-rain-9a50.workers.dev/api bun run build && bunx wrangler pages deploy dist --project-name pw-cong-frontend

deploy-backend:
	cd apps/backend && bunx wrangler deploy

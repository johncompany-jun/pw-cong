.PHONY: up down build logs seed ps restart

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

# ─────────────────────────────────────────
# Triple Trouble Trivia – Makefile
# ─────────────────────────────────────────

NAME = trivia

all: build up

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

stop:
	docker compose stop

restart: down up

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-nginx:
	docker compose logs -f nginx

logs-mysql:
	docker compose logs -f mysql

clean: down
	docker compose down -v --rmi local --remove-orphans

fclean: clean
	docker system prune -af --volumes

re: fclean all

.PHONY: all build up down stop restart logs logs-backend logs-nginx logs-mysql clean fclean re

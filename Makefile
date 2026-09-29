# Orquestación del monorepo "Sistema turístico de La Paz (Turismo Melgarejo)".
#
#   compose project : turismo-melgarejo
#   Docker Hub      : raisiar/proyecto-de-sistemas-{db,backend,frontend,proxy}
#
# Convención de versionado (IMPORTANTE, sincronizada con docker-compose.yml):
#   - db y proxy: infraestructura estable -> tag `latest`.
#   - backend: semver (BACKEND_TAG); frontend: semver (FRONTEND_TAG). El tag
#     por defecto del compose controla qué versión publicada usa cada servicio.
#   - Al tocar código, bumpear la tag correspondiente AQUÍ y en docker-compose.yml.

COMPOSE ?= docker compose
DOCKER  ?= docker
REPO    := raisiar/proyecto-de-sistemas

BACKEND_CTR  := turismo-melgarejo_backend
BACKEND_TAG  ?= 1.0.6
FRONTEND_TAG ?= 1.0.5

BACKEND_IMG  := $(REPO)-backend:$(BACKEND_TAG)
FRONTEND_IMG := $(REPO)-frontend:$(FRONTEND_TAG)
DB_IMG       := $(REPO)-db:latest
PROXY_IMG    := $(REPO)-proxy:latest

.PHONY: help build build-backend build-frontend build-db build-proxy push \
        test test-backend test-frontend lint migrate seed up down ps logs

help: ## Muestra los objetivos disponibles
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

## -------- Construcción --------
build: build-backend build-frontend build-db build-proxy ## Construye las 4 imágenes

build-backend: ## backend:$(BACKEND_TAG)
	$(DOCKER) build -t $(BACKEND_IMG) -f backend/Dockerfile backend

build-frontend: ## frontend:$(FRONTEND_TAG) (Dockerfile.dev, igual que compose)
	$(DOCKER) build -t $(FRONTEND_IMG) -f frontend/Dockerfile.dev frontend

build-db: ## db:latest (PostGIS + pgvector)
	$(DOCKER) build -t $(DB_IMG) -f database/Dockerfile database

build-proxy: ## proxy:latest (nginx)
	$(DOCKER) build -t $(PROXY_IMG) -f proxy/Dockerfile proxy

## -------- Publicación --------
push: build ## Construye y publica las 4 imágenes en Docker Hub
	$(DOCKER) push $(BACKEND_IMG)
	$(DOCKER) push $(FRONTEND_IMG)
	$(DOCKER) push $(DB_IMG)
	$(DOCKER) push $(PROXY_IMG)

## -------- Tests --------
test: test-backend test-frontend ## Corre ambas suites

test-backend: ## Tests Django en el contenedor backend
	$(DOCKER) exec $(BACKEND_CTR) python manage.py test

test-frontend: ## Tests Vitest (frontend) en contenedor node efímero
	$(DOCKER) run --rm -v "$$(pwd)/frontend:/app" -w /app node:22-alpine \
		sh -c "test -d node_modules || npm ci; npx vitest run"

## -------- Calidad --------
lint: ## ruff + black + makemigrations --check / eslint + tests (backend y frontend)
	$(DOCKER) run --rm -v "$$(pwd)/backend:/app" -w /app backend:$(BACKEND_TAG) sh -c \
		"ruff check backend && black --check backend && python manage.py makemigrations --check --dry-run"
	$(DOCKER) run --rm -v "$$(pwd)/frontend:/app" -w /app node:22-alpine \
		sh -c "test -d node_modules || npm ci; npx eslint . ; npx vitest run"

## -------- BD --------
migrate: ## Aplica migraciones a la BD local
	$(DOCKER) exec $(BACKEND_CTR) python manage.py migrate

seed: ## Carga los datos semilla
	$(DOCKER) exec $(BACKEND_CTR) python manage.py seed

## -------- Stack --------
up: ## Levanta el stack en segundo plano
	$(COMPOSE) up -d

down: ## Detiene el stack (conserva volúmenes)
	$(COMPOSE) down

ps: ## Estado del stack
	$(COMPOSE) ps

logs: ## Logs del stack
	$(COMPOSE) logs -f --tail=100

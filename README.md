# Turismo Melgarejo — Proyecto de Sistemas 3

Sistema web de guía turística de La Paz (Bolivia). Contiene un backend Django + DRF con datos geoespaciales (PostGIS/pgvector), un frontend React + Three.js, y un proxy Nginx. Todo contenerizado con Docker Compose.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/)
- Git

No necesitas Python ni Node en tu máquina: todo corre dentro de contenedores.

## Estructura

```
backend/            Django + DRF + GeoDjango (PostGIS)
frontend/           React + Vite + Tailwind + Three.js
proxy/              Nginx reverse proxy
database/           init SQL (extensiones + schema) y scripts backup/restore
docs/               Documentación técnica y diagramas
docker-compose.yml          Entorno de desarrollo (recarga en vivo)
docker-compose.prod.yml     Entorno de producción (imágenes + Gunicorn)
```

## Documentación y diagramas

La documentación de arquitectura (diagramas Mermaid) vive en `docs/`:

- `docs/architecture/` — diagramas de arquitectura (vista general, frontend,
  backend, motor de recomendación, base de datos, infraestructura, CI/CD)
- `docs/database/der.md` — diseño del modelo de datos relacional y geoespacial
- `docs/integracion-ci-cd.md` — configuración de GitHub, Docker Hub y Railway

Todos los diagramas son archivos `.md` independientes compatibles con GitHub,
VS Code y cualquier visor que soporte Mermaid.

## Puesta en marcha (desarrollo)

1. Copiar el entorno de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Editar `.env` y especialmente `POSTGRES_PASSWORD` y `DJANGO_SECRET_KEY`.

3. Levantar la pila:
   ```bash
   docker compose up --build
   ```
   - Proxy (SPA): http://localhost
   - Backend health: http://localhost/api/health/
   - Proxy health: http://localhost/healthz

4. Detener:
   ```bash
   docker compose down
   ```
   Para borrar también los volúmenes (base de datos): `docker compose down -v`

### Entorno de producción

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Ejecutar pruebas / lint dentro de contenedores

```bash
# Backend (tests Django)
docker compose run --rm backend python manage.py test

# Backend (linters)
docker compose run --rm backend ruff check .
docker compose run --rm backend black --check .

# Frontend (lint y tests Vitest)
docker compose run --rm frontend pnpm lint
docker compose run --rm frontend pnpm test
```

## Base de datos

- PostgreSQL + PostGIS + pgvector (imagen `postgis/postgis:17-3.5`).
- Datos persistentes en el volumen `postgres_data`.
- El schema se aplica automáticamente en el primer arranque (carpeta `database/init`).
- Respaldos:
  ```bash
  ./database/backup.sh
  ./database/restore.sh backups/backup_YYYYMMDD_HHMMSS.dump
  ```

## Variables de entorno

Ver `.env.example`. Las claves principales:

| Variable | Descripción |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Credenciales de la BD |
| `DJANGO_SECRET_KEY` | Secreto de Django (¡cambiar en producción!) |
| `DJANGO_DEBUG` | `1` en desarrollo, `0` en producción |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos, separados por coma |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos, separados por coma |
| `IMAGE_TAG` | Etiqueta de imágenes en producción |

## CI/CD y Git

- Los flujos de GitHub Actions validan y prueban el backend y el frontend en cada push/PR.
- Dependabot mantiene dependencias al día.
- CodeQL, gitleaks y Trivy aportan seguridad.
- Al crear un tag `v*.*.*` se publican imágenes a Docker Hub (**requiere los secretos `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN`**).

## Licencia

MIT — ver `LICENSE`.

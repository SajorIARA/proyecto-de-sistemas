# Diagrama de Despliegue — Sistema Turístico La Paz

> Local: 8 servicios (`docker-compose.yml`) con runserver + Vite dev.
> Producción: 7 servicios (`docker-compose.prod.yml`, sin Flower) con
> gunicorn + frontend estático. Solo el puerto 80 se publica.

```mermaid
flowchart TB
    subgraph Internet
        User[Navegador del Turista]
        CloudExt[Cloudinary<br/>imágenes + video]
    end

    subgraph Local["Docker Compose local — 8 servicios"]
        subgraph NginxLocal["proxy :80 (único puerto publicado)"]
            NginxL[Nginx<br/>FRONTEND_PORT=3000 BACKEND_PORT=8000]
        end

        subgraph BackendLocal["backend (runserver :8000)"]
            Runserver[Django + DRF<br/>migrate + runserver]
        end

        subgraph FrontendLocal["frontend (:3000 interno)"]
            ViteDev[Vite dev<br/>pnpm dev · hot reload]
        end

        subgraph DataLocal["datos + async"]
            PgLocal[(PostgreSQL + PostGIS + pgvector :5432<br/>postgres_data)]
            RedisLocal[(Redis :6379<br/>broker + results)]
            WorkerLocal[Celery worker ×2]
            BeatLocal[Celery beat]
            FlowerLocal[Flower :5555]
            StagingLocal[(staging_data<br/>temporales de subida)]
        end
    end

    subgraph Prod["Docker Compose prod — 7 servicios (sin Flower)"]
        subgraph NginxProd["proxy :80"]
            NginxP[Nginx<br/>FRONTEND_PORT=80 BACKEND_PORT=8000<br/>SERVE_DOCS=0]
        end

        subgraph BackendProd["backend"]
            Gunicorn[Gunicorn :8000<br/>collectstatic + migrate]
            Django[Django + DRF<br/>DEBUG=0]
        end

        subgraph FrontendProd["frontend"]
            NginxStatic[Nginx estático<br/>dist/ + CSP + cache 1y /assets]
        end

        subgraph DataProd["datos + async"]
            PgProd[(PostgreSQL :5432)]
            RedisProd[(Redis :6379)]
            WorkerProd[Celery worker ×2]
            BeatProd[Celery beat]
            StagingProd[(staging_data)]
        end
    end

    subgraph External["Servicios Externos"]
        DockerHub[Docker Hub — raisiar/<br/>backend · frontend · proxy · db]
        Railway[Railway — Staging/Producción]
        GitHub[GitHub Actions — 11 workflows]
    end

    subgraph CI["Pipeline CI/CD"]
        Checkout[Código + PR a dev]
        Lint[Ruff + Black + MyPy + ESLint]
        Tests[Django 248 + Vitest 168<br/>makemigrations --check]
        Build[Docker Build --no-cache]
        Security[Trivy + CodeQL + Gitleaks<br/>pip-audit + pnpm audit]
        E2E[Smoke E2E<br/>curl / + /api/health/]
        Push[Docker Hub Push]
        Deploy[Railway Deploy]
    end

    User -->|HTTP :80| NginxL
    NginxL -->|/ proxy_pass| ViteDev
    NginxL -->|/api/ proxy_pass| Runserver
    Runserver --> PgLocal
    Runserver --> RedisLocal
    RedisLocal --> WorkerLocal
    BeatLocal --> RedisLocal
    FlowerLocal --> RedisLocal
    Runserver --> StagingLocal
    WorkerLocal --> StagingLocal
    WorkerLocal -->|upload| CloudExt
    ViteDev -->|f_auto,q_auto| CloudExt

    User -->|HTTP :80| NginxP
    NginxP -->|/ proxy_pass| NginxStatic
    NginxP -->|/api/ proxy_pass| Gunicorn
    Gunicorn --> Django
    Django --> PgProd
    Django --> RedisProd
    RedisProd --> WorkerProd
    BeatProd --> RedisProd
    Django --> StagingProd
    WorkerProd --> StagingProd
    WorkerProd -->|upload| CloudExt

    GitHub --> Checkout
    Checkout --> Lint
    Checkout --> Tests
    Lint --> Build
    Tests --> Build
    Build --> Security
    Security --> E2E
    E2E --> Push
    Push --> DockerHub
    DockerHub --> Railway
    Railway --> Prod
```

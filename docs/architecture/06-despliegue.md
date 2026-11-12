# Diagrama de Despliegue — Sistema Turístico La Paz

> Local: 8 servicios (`docker-compose.yml`) con runserver + Vite dev.
> Producción en VPS: 7 servicios (`docker-compose.prod.yml`, sin Flower) con
> gunicorn + frontend estático. Solo el puerto 80 se publica.
> Producción en Railway (PaaS): 8 servicios con imágenes GHCR, TLS en el
> edge y Ollama privado. Ver §PaaS al final.

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
        GHCR[GHCR — ghcr.io/sajoriara/<br/>backend · frontend · proxy · db]
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
        Push[GHCR Push]
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
    Push --> GHCR
    GHCR --> Railway
    Railway --> Prod
```

## PaaS: Railway

> Topología del despliegue público. Solo `proxy` tiene dominio; el resto usa
> la red privada `<servicio>.railway.internal` (IPv6 o dual-stack).

```mermaid
flowchart TB
    User[Navegador del Turista] -->|HTTPS 443| Edge[Edge de Railway<br/>TLS terminado]

    subgraph Railway["Proyecto Railway — un entorno"]
        Edge -->|HTTP · $PORT| Proxy[proxy<br/>Nginx · /healthz]

        Proxy -->|/api/*| Backend[backend<br/>Gunicorn :8000]
        Proxy -->|/*| Frontend[frontend<br/>Nginx :80]

        Backend --> DB[(PostgreSQL + PostGIS + pgvector<br/>:5432 · volumen)]
        Backend --> Redis[(Redis :6379)]
        Backend --> Ollama[Ollama :11434<br/>embeddinggemma + qwen3]
        Backend -->|encola| Redis

        Worker[worker · Celery] --> Redis
        Worker --> DB
        Worker --> Ollama

        Beat[beat · Celery Beat] --> Redis
        Beat --> DB
    end

    Backend -->|upload| Cloudinary[Cloudinary]
    Worker -->|upload| Cloudinary
    Frontend -->|f_auto,q_auto| Cloudinary

    GHCR[GHCR público<br/>backend · frontend · proxy] -->|docker pull| Railway
```

Notas de despliegue:

- **TLS:** lo termina Railway. No hay certbot ni puerto 443 en Nginx.
- **Proxy:** escucha en `$PORT`, resuelve `frontend`/`backend` en tiempo de
  petición con `resolver [fd12::10]` y reenvía `X-Forwarded-For`.
- **Backend/frontend:** escuchan en dual-stack (`[::]`) para ser alcanzables
  por la red privada.
- **Django:** `DJANGO_NUM_PROXIES=2` (edge + proxy),
  `DJANGO_SECURE_SSL_REDIRECT=0` y `SERVE_DOCS=0`.
- **Migraciones:** pre-deploy command del servicio `backend`
  (`python manage.py migrate --noinput`), no en build.
- **Ollama:** servicio privado con volumen `/root/.ollama`; los modelos se
  descargan una vez y sobreviven a los redespliegues.
- **Imágenes:** `ghcr.io/sajoriara/proyecto-de-sistemas-*`; la base de datos
  usa el template PostGIS + pgvector, no la imagen `db`.

Guía operativa completa: [`deploy/railway/README.md`](../../deploy/railway/README.md).

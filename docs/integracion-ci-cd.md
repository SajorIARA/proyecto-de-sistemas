# Integración continua, release y despliegue

Este documento describe la configuración completa de Git/GitHub, GHCR y Railway,
y cómo conectarla con los secrets de GitHub Actions.

## 1. Ramas del proyecto

| Rama | Uso | Protegida |
|---|---|---|
| `main` | Producción (deploy estable) | Sí: requiere CI + 1 review |
| `dev` | Desarrollo de integración | Sí: requiere CI |
| `Qa` | Control de calidad / staging | Sí: requiere CI |
| `feature/*` | Trabajo por funcionalidad | No |

## 2. Reglas de protección de ramas (ya aplicadas)

Vía GitHub UI (Settings → Branches) o con la API. Se configuró en `main`, `dev` y `Qa`:

- **Requerir ramas actualizadas** (strict) antes de hacer merge.
- **Checks de estado obligatorios**: `Backend checks`, `Frontend checks`,
  `Docker and Compose checks`, `Container smoke tests`.
- **Requerir 1 aprobación** de revisión de PR (solo `main`).
- **Impedir push forzado** y **eliminación de ramas**.
- **Applicar a los admins** (enforce admins).

### Comandos equivalentes (gh)

```bash
gh api -X PUT repos/SajorIARA/proyecto-de-sistemas/branches/main/protection \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Backend checks", "Frontend checks",
                 "Docker and Compose checks", "Container smoke tests"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

## 3. Secret scanning / push protection

Secret scanning y *push protection* se habilitan en la **UI de GitHub**:
**Settings → Code security and analysis** y activar *Secret scanning* y
*Push protection*. No existe endpoint REST para activarlo automáticamente.

Gitleaks (incluido en `security.yml`) hace un escaneo adicional en CI.

## 4. Paquetes en GitHub Container Registry (GHCR)

Las cuatro imágenes se publican como paquetes **públicos** en GHCR:

- `ghcr.io/sajoriara/proyecto-de-sistemas-backend`
- `ghcr.io/sajoriara/proyecto-de-sistemas-frontend`
- `ghcr.io/sajoriara/proyecto-de-sistemas-proxy`
- `ghcr.io/sajoriara/proyecto-de-sistemas-db`

El workflow `release.yml` usa el `GITHUB_TOKEN` del propio repositorio con el
permiso `packages: write`; no hace falta crear un token de Docker Hub.

### Visibilidad pública

GitHub crea los paquetes como privados por defecto. Después del primer
release, abre cada paquete en **GitHub → Packages → Package settings →
Danger Zone → Change visibility** y selecciona **Public**. Sin este paso,
Railway Hobby no puede descargar las imágenes.

## 5. Secrets requeridos en GitHub

### Secrets del repositorio (Settings → Secrets and variables → Actions)

| Nombre | Uso | Dónde se crea |
|---|---|---|
| `RAILWAY_TOKEN` | Token del CLI de Railway | Repo secret o por entorno |

`GITHUB_TOKEN` lo inyecta GitHub Actions automáticamente; el workflow
`release.yml` lo usa para publicar en GHCR con `packages: write`.

### Variables del repositorio (Settings → Secrets and variables → Actions → Variables)

| Nombre | Uso |
|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | Nombre del cloud de Cloudinary, horneado en la imagen del frontend por `release.yml`. No es secreto; si está vacío, el frontend pinta placeholders. |

### Secrets por entorno (Settings → Environments)

| Entorno | Uso |
|---|---|
| `RAILWAY_TOKEN` en `staging` | Deploy a entorno de staging |
| `RAILWAY_TOKEN` en `production` | Deploy a producción |

### Como se configuran (gh)

```bash
cd repos/proyecto-de-sistemas

# Railway (por entorno)
gh secret set RAILWAY_TOKEN --env staging --body "token_railway_staging"
gh secret set RAILWAY_TOKEN --env production --body "token_railway_production"
```

No se configuran secretos de Docker Hub: GHCR usa `GITHUB_TOKEN`.

## 6. Versionado de imágenes (SemVer)

El workflow `release.yml` publica imágenes en GHCR al crear un tag
`v*.*.*` o al lanzarlo manualmente con una versión semver (`workflow_dispatch`
→ `version`). Rechaza cualquier valor que no sea `X.Y.Z`.

- Tag `v1.2.3` produce `1.2.3`, `1.2`, `1`, `latest` y `<sha12>`.

### Flujo para abrir una release

```bash
git tag -a v1.2.3 -m "release 1.2.3"
git push origin v1.2.3
```

El workflow más reciente que toque Dockerfiles usa tags por SHA, de modo que
`safe rollout` (rollback) puede elegir cualquier imagen anterior por su SHA.

## 7. Despliegue a Railway

La topología, la matriz de servicios, las variables por servicio, el orden
de creación y las pruebas de humo están en
[`deploy/railway/README.md`](../deploy/railway/README.md).

El workflow `deploy.yml` es **manual** y admite dos estrategias:

| Estrategia | Qué hace | Cuándo usarla |
|---|---|---|
| `image` (por defecto) | `railway redeploy` de `backend`, `worker`, `beat`, `frontend` y `proxy` | Los servicios ya apuntan a imágenes de GHCR y solo quieres aplicar variables o relanzar el tag configurado |
| `source` | `railway up --service ... --ci` para backend y frontend | Respaldo: Railway construye desde el repositorio |

No hay despliegue automático por push: publicar una imagen (workflow
`Release`) y desplegarla son decisiones separadas. En el camino recomendado,
el origen *Docker Image* y el tag se configuran en Railway; el workflow
`image` solo relanza los servicios.

Variables mínimas del backend/worker/beat:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`,
  `POSTGRES_PORT`.
- `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`,
  `CORS_ALLOWED_ORIGINS`, `DJANGO_NUM_PROXIES=2`,
  `DJANGO_SECURE_SSL_REDIRECT=0`, `SERVE_DOCS=0`.
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`.
- `OLLAMA_BASE_URL`, `OLLAMA_EMBED_MODEL`, `OLLAMA_LLM_MODEL`,
  `EMBEDDING_DIM=768`, `RAG_TOP_K`, `RAG_UMBRAL`, `RAG_MAX_PREGUNTA`.
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`.
- El frontend necesita `VITE_CLOUDINARY_CLOUD_NAME` (build-arg de Vite).

El proxy usa `PORT` (inyectado por Railway), `FRONTEND_HOST`,
`FRONTEND_PORT`, `BACKEND_HOST`, `BACKEND_PORT` y
`NGINX_RESOLVER=[fd12::10]`.

### Rollback

- Cada release publica tags por versión y por **SHA de imagen**; apunta la
  configuración de Railway a un tag anterior para revertir.
- Railway permite re-deploy de una versión anterior desde el panel
  (Deployments → Re-deploy).
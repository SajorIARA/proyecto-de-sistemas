# Integración continua, release y despliegue

Este documento describe la configuración de Git/GitHub, GHCR, Supabase y
Railway, y cómo conectarla con los secrets de GitHub Actions.

## 1. Ramas del proyecto

| Rama | Uso | Protegida |
|---|---|---|
| `main` | Producción (deploy estable) | Sí: requiere CI + 1 review |
| `dev` | Desarrollo de integración | Sí: requiere CI |
| `Qa` | Control de calidad / staging | Sí: requiere CI |
| `feature/*` | Trabajo por funcionalidad | No |

## 2. Reglas de protección de ramas (ya aplicadas)

Vía GitHub UI (Settings → Branches) o con la API. Se configuró en `main`, `dev`
y `Qa`:

- **Requerir ramas actualizadas** (strict) antes de hacer merge.
- **Checks de estado obligatorios**: `Backend checks`, `Frontend checks`,
  `Docker and Compose checks`, `Container smoke tests`.
- **Requerir 1 aprobación** de revisión de PR (solo `main`).
- **Impedir push forzado** y **eliminación de ramas**.
- **Aplicar a los admins** (enforce admins).

### Comandos equivalentes (gh)

```bash
gh api -X PUT repos/SajoriARA/proyecto-de-sistemas/branches/main/protection \
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

## 4. Imágenes en GHCR (recomendado)

El workflow `release.yml` publica en GHCR usando el `GITHUB_TOKEN` del
repositorio con el permiso `packages: write`. No requiere secretos de Docker
Hub.

| Imagen | Uso |
|---|---|
| `ghcr.io/sajoriara/proyecto-de-sistemas-backend` | `backend`, `worker`, `beat` |
| `ghcr.io/sajoriara/proyecto-de-sistemas-frontend` | `frontend` |
| `ghcr.io/sajoriara/proyecto-de-sistemas-proxy` | `proxy` |
| `ghcr.io/sajoriara/proyecto-de-sistemas-db` | Solo VPS/local; **no** con Supabase |

### Visibilidad pública

En repositorios públicos los paquetes publicados con `GITHUB_TOKEN` suelen
heredar acceso de lectura público, así que Railway puede descargarlos sin
credenciales. **Verifícalo siempre** con un token anónimo:

```bash
repo=sajoriara/proyecto-de-sistemas-backend
token=$(curl -s "https://ghcr.io/token?scope=repository:$repo:pull&service=ghcr.io" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s -H "Authorization: Bearer $token" "https://ghcr.io/v2/$repo/tags/list"
# 200 + tags → público | 403 → privado
```

Si responde `403`, abre **GitHub → Packages → Package settings → Danger
Zone → Change visibility → Public** o activa *Inherit access from
repository*.

Un `404` en el manifiesto justo después del release suele ser replicación
transitoria de GHCR: espera 1–2 minutos y reintenta.

### Alternativa: Docker Hub

El workflow admite `registry=dockerhub` y publica en `raisiar/...`. Requiere
los secretos `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN`. Las imágenes de Docker
Hub ya son públicas.

## 5. Secrets y variables de GitHub

### Secrets del repositorio

| Nombre | Uso | Cuándo |
|---|---|---|
| `DOCKERHUB_USERNAME` | Usuario de Docker Hub | Solo si se publica con `registry=dockerhub` |
| `DOCKERHUB_TOKEN` | Token de Docker Hub | Solo si se publica con `registry=dockerhub` |

`GITHUB_TOKEN` lo inyecta GitHub Actions automáticamente y no hay que crearlo.

### Variables del repositorio

| Nombre | Uso |
|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | Nombre del cloud de Cloudinary, horneado en la imagen del frontend. No es secreto; si está vacío, el frontend pinta placeholders. |

### Secrets por entorno

Crea los entornos `staging` y `production` en **Settings → Environments**.

| Entorno | Secret | Valor |
|---|---|---|
| `staging` | `RAILWAY_TOKEN` | Token del proyecto Railway de staging |
| `production` | `RAILWAY_TOKEN` | Token del proyecto Railway de producción |

En `production`, activa **Required reviewers** para que el deploy requiera
aprobación manual.

### Variables por entorno (opcionales)

Si los servicios de Railway no se llaman `backend`, `worker`, `beat`,
`frontend` y `proxy`, define en cada entorno:

```text
RAILWAY_SERVICE_BACKEND
RAILWAY_SERVICE_WORKER
RAILWAY_SERVICE_BEAT
RAILWAY_SERVICE_FRONTEND
RAILWAY_SERVICE_PROXY
```

### Cómo se configuran (gh)

```bash
# Tokens de Railway (uno por proyecto/entorno)
gh secret set RAILWAY_TOKEN --env staging --body "<token_railway_staging>"
gh secret set RAILWAY_TOKEN --env production --body "<token_railway_production>"

# Solo si usas Docker Hub
gh secret set DOCKERHUB_USERNAME --body "<usuario>"
gh secret set DOCKERHUB_TOKEN --body "<token>"

# Cloudinary para el build del frontend
gh variable set VITE_CLOUDINARY_CLOUD_NAME --body "<cloud>"
```

No se configuran secretos de la base de datos en GitHub: `DATABASE_URL` vive
en las variables de Railway.

## 6. Versionado de imágenes (SemVer)

El workflow `release.yml` publica imágenes al crear un tag `v*.*.*` o al
lanzarlo manualmente con una versión semver (`workflow_dispatch → version`).
Rechaza cualquier valor que no sea `X.Y.Z`.

- Tag `v1.2.3` produce `1.2.3`, `1.2`, `1`, `latest` y `<sha12>`.
- Un `workflow_dispatch` manual no crea el tag de Git; solo publica imágenes
  desde la rama indicada.

### Flujo para abrir una release

```bash
# Desde la rama que se quiere publicar
gh workflow run release.yml --ref dev -f version=1.1.0 -f registry=ghcr

# O con un tag de Git
git tag -a v1.1.0 -m "release 1.1.0"
git push origin v1.1.0
```

El workflow más reciente que toque Dockerfiles usa tags por SHA, de modo que
el rollback puede elegir cualquier imagen anterior por su SHA.

## 7. Despliegue a Supabase + Railway

La topología, la matriz de servicios, las variables por servicio, el orden de
creación y las pruebas de humo están en:

- [`deploy/supabase/README.md`](../deploy/supabase/README.md) — base de datos.
- [`deploy/railway/README.md`](../deploy/railway/README.md) — aplicación.

### Entornos

| GitHub Environment | Rama esperada | Proyecto Railway | Proyecto Supabase |
|---|---|---|---|
| `staging` | `Qa` | `turismo-staging` | `turismo-staging` |
| `production` | `main` | `turismo-production` | `turismo-production` |

Cada entorno tiene su propio `RAILWAY_TOKEN`, su propia base y sus propios
secretos. No compartas `DATABASE_URL` ni `DJANGO_SECRET_KEY` entre entornos.

### Workflow de despliegue

`deploy.yml` es **manual** y admite dos estrategias:

| Estrategia | Qué hace | Cuándo usarla |
|---|---|---|
| `image` (por defecto) | `railway redeploy` de `backend`, `worker`, `beat`, `frontend` y `proxy` | Los servicios ya apuntan a una imagen publicada y solo quieres aplicar variables o relanzar el tag |
| `source` | `railway up --service ... --ci` para backend y frontend | Respaldo: Railway construye desde el repositorio |

No hay despliegue automático por push: publicar una imagen (workflow
`Release`) y desplegarla son decisiones separadas. En el camino recomendado,
el origen *Docker Image* y el tag se configuran en Railway; el workflow
`image` solo relanza los servicios.

### Variables mínimas del backend/worker/beat

- `DATABASE_URL` del **Session Pooler** de Supabase, con `?sslmode=require`.
- `DB_CONN_MAX_AGE=600`, `DB_SSL_REQUIRE=1`.
- `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`,
  `CORS_ALLOWED_ORIGINS`, `DJANGO_NUM_PROXIES=2`,
  `DJANGO_SECURE_SSL_REDIRECT=0`, `SERVE_DOCS=0`.
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`.
- `OLLAMA_BASE_URL`, `OLLAMA_EMBED_MODEL`, `OLLAMA_LLM_MODEL`,
  `EMBEDDING_DIM=768`, `RAG_TOP_K`, `RAG_UMBRAL`, `RAG_MAX_PREGUNTA`.
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`.
- Scraper: `SCRAPER_ALLOWED_DOMAINS` y límites.

El frontend necesita `VITE_CLOUDINARY_CLOUD_NAME` (build-arg de Vite). El
proxy usa `PORT` (inyectado por Railway), `FRONTEND_HOST`, `FRONTEND_PORT`,
`BACKEND_HOST`, `BACKEND_PORT` y `NGINX_RESOLVER=[fd12::10]`.

### Secuencia recomendada

1. Publica una imagen desde `dev` o `Qa`:
   ```bash
   gh workflow run release.yml --ref dev -f version=1.1.0 -f registry=ghcr
   ```
2. Si usas GHCR, marca los paquetes como públicos.
3. Configura los servicios de Railway con el tag `1.1.0`.
4. Despliega staging:
   ```bash
   gh workflow run deploy.yml -f environment=staging -f strategy=image
   ```
5. Ejecuta las pruebas de humo.
6. Promueve **la misma imagen** a producción: cambia el tag a `1.1.0` en los
   servicios de producción y ejecuta:
   ```bash
   gh workflow run deploy.yml -f environment=production -f strategy=image
   ```

No reconstruyas entre staging y producción: promueve el mismo artefacto.

## 8. Rollback

- Cada release publica tags por versión y por **SHA de imagen**; apunta la
  configuración de Railway a un tag anterior para revertir.
- Railway permite re-deploy de una versión anterior desde el panel
  (Deployments → Re-deploy).
- Si una migración es incompatible, restaura el dump previo en Supabase antes
  de volver a la imagen anterior.

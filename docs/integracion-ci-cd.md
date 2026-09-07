# Integración continua, release y despliegue

Este documento describe la configuración completa de Git/GitHub, Docker Hub y Railway,
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

## 4. Repositorios en Docker Hub

Ya existen los tres repositorios públicos:

- `raisiar/proyecto-de-sistemas-backend`
- `raisiar/proyecto-de-sistemas-frontend`
- `raisiar/proyecto-de-sistemas-proxy`

### Crear un Docker Hub Access Token

1. Entra a https://hub.docker.com/settings/security
2. **New Access Token** → nombre descriptivo (p. ej. `github-actions`),
   permiso *Read, Write* (solo escritura a repos ya creados) o *Read, Write, Delete*.
3. Copia el token **ahora** (no se vuelve a mostrar).

## 5. Secrets requeridos en GitHub

### Secrets del repositorio (Settings → Secrets and variables → Actions)

| Nombre | Uso | Dónde se crea |
|---|---|---|
| `DOCKERHUB_USERNAME` | Usuario de Docker Hub (`raisiar`) | Repo secrets |
| `DOCKERHUB_TOKEN` | Access token de Docker Hub | Repo secrets |
| `RAILWAY_TOKEN` | Token del CLI de Railway | Repo secret o por entorno |

### Secrets por entorno (Settings → Environments)

| Entorno | Uso |
|---|---|
| `RAILWAY_TOKEN` en `staging` | Deploy a entorno de staging |
| `RAILWAY_TOKEN` en `production` | Deploy a producción |

### Como se configuran (gh)

```bash
cd repos/proyecto-de-sistemas

# Docker Hub (repo)
echo "tu_usuario"            | gh secret set DOCKERHUB_USERNAME
echo "tu_access_token"       | gh secret set DOCKERHUB_TOKEN

# Railway (por entorno)
gh secret set RAILWAY_TOKEN --env staging --body "token_railway_staging"
gh secret set RAILWAY_TOKEN --env production --body "token_railway_production"
```

## 6. Versionado de imágenes (SemVer)

El workflow `release.yml` publica imágenes al crear un tag `v*.*.*`:

- Tag `v1.2.3` produce `1.2.3`, `1.2`, `1`, `latest` y `<sha12>`.

### Flujo para abrir una release

```bash
git tag -a v1.2.3 -m "release 1.2.3"
git push origin v1.2.3
```

El workflow más reciente que toque Dockerfiles usa tags por SHA, de modo que
`safe rollout` (rollback) puede elegir cualquier imagen anterior por su SHA.

## 7. Despliegue a Railway

El workflow `deploy.yml` define dos entornos:

| Entorno | Rama | Trigger |
|---|---|---|
| `production` | `main` | push a `main` |
| `staging` | `dev` | push a `dev` |

Cada servicio de gestión del sistema (backend, frontend) se publica dentro de
Railway con CLI (`npx @railway/cli up --service ... --ci`). Se requiere:

1. Crear proyectos/servicios en Railway (`baraja`), o usar la CLI.
2. Configurar `RAILWAY_TOKEN` (Settings → Account → Tokens).
3. Las variables de entorno para el backend en Railway deben incluir
   `POSTGRES_*`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`.

### Rollback

- Deploy instalado por **SHA de imagen**: un tupla de rollback apunta la
  configuración de Railway a una imagen (o tag) previa.
- Railway permite re-deploy de una versión anterior desde el panel
  (Deployments → Re-deploy).

`release.yml` emite tags por SHA para facilitar ese rollback.
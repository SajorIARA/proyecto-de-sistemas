# Supabase — PostgreSQL para staging y producción

> **Arquitectura:** la base de datos vive en Supabase y el resto de la
> aplicación en Railway. Se usan **dos proyectos Supabase independientes**
> (`turismo-staging` y `turismo-production`), uno por entorno.
>
> **No se despliega la imagen `db`** del repositorio: Supabase ya provee
> PostgreSQL, PostGIS y pgvector. La imagen `database/` queda para Docker
> Compose local y para un VPS.

## 1. Crear los proyectos

En <https://supabase.com/dashboard>:

| Entorno | Nombre sugerido | Plan | Región |
|---|---|---|---|
| Staging | `turismo-staging` | Free o Pro | la más cercana a Railway |
| Producción | `turismo-production` | **Pro** | la misma que staging |

Recomendaciones:

- Usa la **misma región** en ambos proyectos y la más cercana a la región de
  Railway (por ejemplo, Supabase `us-east-1` + Railway `us-east4`).
- Guarda la contraseña de la base en un gestor de secretos. No la pegues en
  el repositorio ni en un chat.
- No reutilices el proyecto de producción para staging.
- En Free, el proyecto se pausa tras varios días sin actividad. Para
  producción usa Pro.

## 2. Habilitar extensiones

**Dashboard → Database → Extensions**. Habilita:

- `postgis` — tipos y funciones geoespaciales (`PointField`,
  `ST_DistanceSphere`, índices GiST).
- `vector` — pgvector para los embeddings de 768 dimensiones y el índice HNSW.
- `pgcrypto` — funciones criptográficas usadas por las migraciones.

Las migraciones de Django ejecutan `CREATE EXTENSION IF NOT EXISTS ...`; si la
extensión ya existe, la sentencia no hace nada. Por eso conviene habilitarlas
**antes** del primer `migrate`: el rol de aplicación no es superusuario y no
puede instalar extensiones arbitrarias.

Si el dashboard no permite habilitarlas, prueba en el **SQL Editor**:

```sql
create extension if not exists postgis  with schema extensions;
create extension if not exists vector   with schema extensions;
create extension if not exists pgcrypto with schema extensions;
```

### Verificación

```sql
select extname, extversion, n.nspname
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where extname in ('postgis', 'vector', 'pgcrypto')
order by extname;

show search_path;

select postgis_version();
select '[1,2,3]'::vector;
```

`search_path` debe incluir `extensions`, por ejemplo:

```text
"$user", public, extensions
```

Si no lo incluye:

```sql
alter role postgres set search_path = "$user", public, extensions;
```

Cierra y vuelve a abrir la conexión (o el pooler) después de cambiarlo.

## 3. Cadena de conexión

Supabase ofrece tres formas de conexión. Para Django en Railway usa
**Session Pooler**.

| Modo | Host / puerto | Uso |
|---|---|---|
| Direct connection | `db.<ref>.supabase.co:5432` | Solo IPv6. No sirve desde Railway sin el add-on IPv4. |
| **Session Pooler** | `<host>.pooler.supabase.com:5432` | **Recomendado** para Django, migraciones y Celery. IPv4 + SSL. |
| Transaction Pooler | `<host>.pooler.supabase.com:6543` | No recomendado con `conn_max_age`, migraciones ni cursores. |

Copia la cadena exacta desde **Dashboard → Connect → Session pooler**. El
usuario del pooler tiene el formato `postgres.<PROJECT_REF>` y el host cambia
según la región (`aws-0-...` o `aws-1-...`).

```dotenv
DATABASE_URL=postgresql://postgres.<PROJECT_REF>:<PASSWORD_URLENCODED>@<HOST>.pooler.supabase.com:5432/postgres?sslmode=require
```

- Codifica la contraseña si contiene `@`, `:`, `/`, `#` o `%`.
- `sslmode=require` es obligatorio en Supabase. El backend además aplica
  `DB_SSL_REQUIRE=1` cuando `DJANGO_DEBUG=0`.
- La base se llama `postgres`; no cambies el path salvo que hayas creado otra.

## 4. Seguridad de la Data API

Supabase expone las tablas del esquema `public` mediante PostgREST y las claves
`anon` / `authenticated`. **Django no usa esa API**: la autenticación es JWT
propia y los medios van a Cloudinary.

Opciones, de más segura a menos:

1. **Desactivar la Data API** en **Project Settings → API → Data API**.
2. Si la necesitas, retira `public` de los esquemas expuestos.
3. Si mantienes la API, activa RLS en todas las tablas y define políticas.
   Django conecta como propietario de las tablas y no se ve afectado por RLS,
   pero `anon` sí.

Revocación adicional (ejecutar en el SQL Editor):

```sql
revoke all on schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
```

Esto no afecta a Django, que conecta como `postgres`. Vuelve a ejecutarlo si
creas tablas nuevas con otro rol.

> No uses `SUPABASE_SERVICE_ROLE_KEY` en el backend: no hace falta. Si algún día
> se usa, debe vivir solo en el servidor y nunca en el frontend.

## 5. Límites y backups

### Conexiones

Cuenta las conexiones por entorno:

- `backend`: Gunicorn con 2 workers × 2 threads ≈ hasta 4 conexiones.
- `worker`: `--concurrency=2` ≈ 2 conexiones.
- `beat`: 1 conexión.
- Migraciones/pre-deploy: 1 conexión temporal.

Son ~7-8 conexiones por entorno. Mantén `DB_CONN_MAX_AGE=600` y no escales
workers sin revisar el límite del plan. Si ves `too many connections`, baja
`DB_CONN_MAX_AGE` o reduce workers.

### Backups

- **Free:** sin backups automáticos.
- **Pro:** backups diarios; PITR opcional.
- Añade siempre un dump lógico propio:

```bash
# Desde tu máquina, con DATABASE_URL del Session Pooler
pg_dump -Fc "$DATABASE_URL" > backup-$(date +%F).dump
```

Guarda los dumps fuera de Supabase (S3, disco cifrado, etc.) y prueba la
restauración al menos una vez.

### Restauración

Lo más seguro es restaurar en un proyecto limpio con las extensiones ya
habilitadas:

```bash
pg_restore --clean --if-exists --no-owner --no-acl \
  -d "$DATABASE_URL" backup-$(date +%F).dump
```

Si el dump viene de Docker Compose y usa otro propietario, `--no-owner
--no-acl` evita errores. Revisa después que PostGIS y pgvector sigan
instalados y que `search_path` incluya `extensions`.

## 6. Migraciones y datos iniciales

El `backend` de Railway ejecuta como **pre-deploy command**:

```bash
python manage.py migrate --noinput
```

Después, desde `railway ssh --service backend`:

```bash
python manage.py seed          # datos de referencia + admin/turista demo
python manage.py scrape_fuentes
python manage.py vectorizar_fragmentos
```

- `seed` es idempotente y usa `SEED_ADMIN_PASSWORD` para el admin. Define esa
  variable solo en el entorno; no la commitees.
- En staging usa `seed_ficticio_conocimiento` y evita copiar datos reales de
  producción.
- `vectorizar_fragmentos` necesita Ollama accesible.

## 7. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `password authentication failed` | Contraseña mal codificada o usuario sin `.<REF>` | Usa la cadena del Session Pooler y codifica la contraseña. |
| `tenant/user ... not found` | Host o usuario de otro proyecto | Copia de nuevo la cadena desde el dashboard. |
| `could not translate host name` / timeout | Usaste la conexión directa IPv6 | Cambia al Session Pooler (`...pooler.supabase.com:5432`). |
| `permission denied to create extension "postgis"` | Extensión no habilitada y rol sin privilegios | Habilítala en Database → Extensions antes de migrar. |
| `type "geometry" does not exist` | `search_path` sin `extensions` | `alter role postgres set search_path = "$user", public, extensions;` |
| `SSL connection is required` | `DB_SSL_REQUIRE=0` o URL sin SSL | Usa `?sslmode=require` y `DB_SSL_REQUIRE=1`. |
| `too many connections` | Workers o `conn_max_age` altos | Reduce workers o `DB_CONN_MAX_AGE`. |
| `prepared statement ... already exists` | Transaction Pooler (6543) | Usa Session Pooler (5432). |
| El proyecto no responde tras días | Free pausó el proyecto | Reactívalo en el dashboard o usa Pro. |

## 8. Referencias

- [Conexiones y pooler](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Extensiones](https://supabase.com/docs/guides/database/extensions)
- [PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)
- [pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Backups](https://supabase.com/docs/guides/platform/backups)
- [Data API y RLS](https://supabase.com/docs/guides/api)

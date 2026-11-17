# PROYECTO DE SISTEMAS III
# Manual Técnico — Turismo Melgarejo

**Versión:** 3.0  
**Corte documental:** 12 de noviembre de 2026  
**Referencias principales:** `main`, `dev` y `Qa`  
**Criterio de evidencia:** una capacidad se considera integrada cuando existe en la rama documentada; se considera operativa solo tras una prueba de ejecución y healthcheck registrados.

## 1. Control documental y estado del repositorio

Este documento consolida código, contrato HTTP, arquitectura, datos, frontend, calidad y operación. No presupone que una rama o una imagen esté desplegada.

| Rama | Commit de referencia | Papel | Estado documental |
|---|---|---|---|
| `main` | `1bf9bd12bcaa` | Referencia estable / destino final | Está por detrás de la integración actual. |
| `dev` | `8196d5428953` | Integración de funcionalidades | Incluye la UI de recomendaciones y asistente local. |
| `Qa` | `edfb3e4f7fc2` | Validación previa a promoción | Integra `dev` y ajusta el contrato OpenAPI a 81 operaciones. |

El flujo de promoción es:

```text
cambios aprobados → dev → Qa → main
```

El PR de promoción `Qa → main` estaba abierto y con integración pendiente de resolver al corte documental. No hacer push directo ni usar `--force` sobre ramas protegidas.

**[DIAGRAMA PENDIENTE: Promoción de cambios entre main, dev y Qa — RESALTAR EN AMARILLO]**

## 2. Arquitectura lógica

El sistema es una aplicación web desacoplada. La SPA React consume una API REST Django a través de Nginx. Django coordina identidad, catálogo, geodatos, recomendaciones, conocimiento documental y procesos asíncronos. PostgreSQL usa PostGIS y pgvector; Redis actúa como broker y backend de resultados; Celery ejecuta tareas; Ollama se reserva para procesamiento local de modelos cuando se habilita la composición de IA.

| Capa | Componentes | Responsabilidad |
|---|---|---|
| Presentación | React, TypeScript, Vite, React Router, Axios, Leaflet | Navegación, formularios, catálogo, mapa, sesión y paneles privados. |
| Borde HTTP | Nginx proxy | Única entrada pública, enrutamiento, headers, límite básico y healthcheck. |
| Aplicación | Django, DRF, SimpleJWT, drf-spectacular | API, validación, permisos, OpenAPI, reglas de negocio. |
| Asíncrono | Redis, Celery worker, Beat, Flower opcional | Colas, medios, scraping, vectorización y tareas programadas. |
| Datos | PostgreSQL, PostGIS, pgvector | Datos relacionales, geoconsultas e información vectorial. |
| Inferencia | Ollama | Embeddings y generación local; nunca debe exponerse públicamente. |

**[DIAGRAMA PENDIENTE: Componentes, redes, puertos y límites de confianza — RESALTAR EN AMARILLO]**

### 2.1 Flujo HTTP

```text
Navegador → Nginx proxy
             ├─ /      → frontend estático
             └─ /api/  → Django REST Framework
                            ├─ PostgreSQL/PostGIS/pgvector
                            ├─ Redis/Celery
                            └─ Ollama cuando se habilita IA
```

Solo el proxy se publica. Base de datos, Redis, worker, beat y Ollama quedan en red interna. Nginx reenvía `Host`, `X-Forwarded-For`, `X-Forwarded-Proto` y `X-Forwarded-Host`; `DJANGO_NUM_PROXIES` debe igualar la topología real.

### 2.2 Puertos y healthchecks

| Servicio | Puerto | Exposición | Comprobación |
|---|---:|---|---|
| proxy | 80 o `$PORT` | Público | `GET /healthz`. |
| frontend | 3000 desarrollo / 80 final | Interno | `GET /`. |
| backend | 8000 | Interno | `GET /api/health/`. |
| PostgreSQL | 5432 | Interno | `pg_isready`. |
| Redis | 6379 | Interno | `redis-cli ping`. |
| Ollama | 11434 | Interno | `GET /api/tags`. |

## 3. Estructura de código

| Ruta | Responsabilidad |
|---|---|
| `backend/config/` | Settings, URL raíz, excepciones, Celery, OpenAPI y healthcheck. |
| `backend/usuarios/` | Usuario UUID, roles, JWT, throttling de auth y permisos. |
| `backend/turismo/` | Atractivos, categorías, horarios, tarifas, fotos, GIS y administración. |
| `backend/recomendaciones/` | Preferencias, historial, scoring, filtros PostGIS y Top-K. |
| `backend/conocimiento/` | Fuentes, fragmentos, scraping, embeddings y tareas documentales. |
| `frontend/src/app/` | Layout y mapa de rutas. |
| `frontend/src/features/` | Autenticación, cuenta, preferencias, turismo y recomendaciones. |
| `frontend/src/api/` | Cliente Axios e interceptores. |
| `database/` | Imagen local de PostgreSQL/PostGIS/pgvector y scripts de backup. |
| `proxy/` | Nginx, template parametrizable y healthcheck. |
| `.github/workflows/` | Calidad, pruebas, seguridad, imágenes y automatización. |

## 4. Backend Django y seguridad

### 4.1 Configuración

| Grupo | Variables | Regla |
|---|---|---|
| Django | `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | Secret obligatorio fuera de debug; hosts explícitos. |
| HTTP | `CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `DJANGO_NUM_PROXIES` | Nunca abrir CORS indiscriminadamente en producción. |
| Datos | `POSTGRES_*`, `DATABASE_URL` | `DATABASE_URL` fija explícitamente el engine PostGIS y SSL; tiene prioridad sobre `POSTGRES_*`. |
| Celery | `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `STAGING_DIR` | Staging compartido entre API y worker para medios. |
| IA | `OLLAMA_*`, `EMBEDDING_DIM` | Ollama privado; dimensión alineada con modelo y VectorField. |
| Scraping | `SCRAPER_ALLOWED_DOMAINS` y límites | Allowlist vacía bloquea descargas. |
| Frontend | `VITE_*` | Se compilan en el navegador; jamás secretos. |

Django usa JSON, paginación de 20 elementos, JWT Bearer y permisos cerrados por defecto. Los endpoints públicos declaran `AllowAny`. Los serializers validan reglas antes de la base de datos y el handler central traduce errores esperados a respuestas HTTP controladas.

### 4.2 Identidad y JWT

`Usuario` usa UUID, email como `USERNAME_FIELD`, hash de contraseña de Django y roles `ADMIN` / `TOURIST`. Las relaciones usuario-rol usan una tabla intermedia con unicidad. Un usuario inactivo no tiene permisos efectivos.

| Operación | Comportamiento |
|---|---|
| Registro | Crea usuario, asigna TOURIST y retorna tokens. |
| Login | Credenciales válidas devuelven access/refresh y datos del usuario. |
| Refresh | Renueva access con refresh válido. |
| Logout | Verifica pertenencia del refresh y lo incluye en blacklist. |
| Cambio de contraseña | Verifica contraseña actual, valida la nueva e invalida refresh existentes. |

Configuración actual: access 30 minutos, refresh 7 días, rotación y blacklist. El cliente solo debe enviar `Authorization: Bearer <access>`.

**[DIAGRAMA PENDIENTE: Registro, login, refresh, logout y control de permisos JWT — RESALTAR EN AMARILLO]**

### 4.3 Códigos de error

| Código | Uso |
|---:|---|
| 200/201/204 | Lectura, creación o éxito sin cuerpo. |
| 400 | Payload, parámetros o regla de negocio inválidos. |
| 401 | Credenciales inválidas, token ausente o expirado. |
| 403 | Autenticado sin permiso/rol. |
| 404 | Recurso inexistente. |
| 409 | Conflicto de integridad o recurso protegido. |
| 429 | Throttle superado. |
| 502/503 | Dependencia de inferencia o medios devuelve salida inválida/no disponible. |

## 5. Contrato OpenAPI, Swagger y ReDoc

La referencia consolidada de API corresponde a `Qa`: **39 rutas y 81 operaciones**. Esta diferencia importa: no se deben copiar conteos de otra rama sin regenerar el contrato.

| Recurso | Ruta | Uso |
|---|---|---|
| Especificación | `GET /api/schema/` | OpenAPI consumible por herramientas. |
| Swagger UI | `GET /api/docs/` | Exploración y pruebas manuales. |
| ReDoc | `GET /api/redoc/` | Lectura navegable del contrato. |

Estas rutas dependen de `SERVE_DOCS=1`. Generar y validar el contrato:

```bash
python backend/manage.py spectacular --validate --file schema.yaml
python backend/manage.py test tests.test_openapi
```

`backend/tests/test_openapi.py` valida rutas, operación única, permisos y el número de operaciones. Cualquier cambio de URL, método, serializer o permiso debe actualizar contrato y prueba juntos.

**[DIAGRAMA PENDIENTE: View + serializer + router → OpenAPI → Swagger/ReDoc → QA/cliente — RESALTAR EN AMARILLO]**

## 6. Catálogo turístico y GIS

### 6.1 Entidades

| Entidad | Datos y relaciones | Reglas/índices |
|---|---|---|
| `Categoria` | Nombre, descripción, activo | Nombre único. |
| `Atractivo` | UUID, texto, Point, Polygon, duración, categorías, fotos | SRID 4326; duración positiva o nula; GiST en ubicación/área. |
| `AtractivoCategoria` | M:N atractivo-categoría | Único por par. |
| `Horario` | Día, apertura/cierre, vigencia | Día 1–7, horarios/fechas coherentes. |
| `TipoTarifa` | Código, nombre, descripción | Código único. |
| `Tarifa` | Monto, moneda, vigencia | Monto no negativo; índices por atractivo/tipo. |
| `Foto` | Referencia de medio, estado y orden | No guarda binarios; orden no negativo. |

`DELETE` administrativo de atractivo aplica baja lógica (`activo=false`), preservando datos relacionados.

### 6.2 Búsqueda geográfica

El catálogo público lista atractivos activos. El endpoint de cercanía recibe `lat`, `lon` y radio en metros, valida rangos geográficos, transforma a UTM 19S y calcula distancias. Las facetas producen categorías y agregados de precio.

**[DIAGRAMA PENDIENTE: Consulta de catálogo, filtros, PostGIS y respuesta paginada — RESALTAR EN AMARILLO]**

## 7. Motor de recomendaciones

El motor es reproducible y explicable. Separa filtros duros en PostGIS de scoring puro en Python.

### 7.1 Entrada y persistencia

La API recibe presupuesto, tiempo, punto de partida dentro del área permitida de La Paz, radio, top-k, preferencias opcionales y macrodistrito. Si no se proporcionan preferencias, usa las persistidas del usuario autenticado. La consulta se registra en `ConsultaRecomendacion` con UUID, parámetros y punto geográfico.

### 7.2 Filtros duros

1. Solo atractivos activos.
2. Tarifa mínima vigente en BOB menor o igual al presupuesto. Sin tarifa BOB se usa costo `0.00`.
3. `ST_DistanceSphere` menor o igual al radio configurado.
4. Categorías activas precargadas para evitar N+1.

### 7.3 Fórmula de ranking

```text
puntaje_base = 0.40 × afinidad_categoria
              + 0.25 × proximidad
              + 0.20 × holgura_presupuesto
              + 0.15 × holgura_tiempo
puntaje_final = puntaje_base × factor_penalizacion
```

| Variable | Definición |
|---|---|
| Afinidad | Interés de categorías coincidentes dividido entre interés total. |
| Proximidad | `1 - distancia/radio`, acotada a `[0,1]`. |
| Holgura presupuesto | `1 - costo/presupuesto`, acotada a `[0,1]`. |
| Holgura tiempo | `1 - duración/tiempo`, acotada a `[0,1]`. |
| Penalización | Producto de 0.30 por exceso de presupuesto o tiempo. |

Una duración nula equivale a 120 minutos. El orden de desempate es puntaje descendente, distancia ascendente e ID ascendente. La respuesta incluye componentes del puntaje, motivos, viabilidad, costo, duración, distancia y categorías.

**[DIAGRAMA PENDIENTE: Validación → filtros PostGIS → scoring → desempate → Top-K y persistencia — RESALTAR EN AMARILLO]**

### 7.4 Interfaz de recomendaciones

En `dev` y `Qa`, `/mi-cuenta/recomendaciones` permite ajustar presupuesto, duración, radio, top-k y origen, visualizar tarjetas del ranking y usar un asistente local determinista basado en el contexto del ranking. Este asistente de interfaz no se debe confundir con una API RAG pública integrada en las tres ramas principales.

## 8. Preferencias y consultas históricas

`UsuarioPreferencia` asocia usuario, categoría y `nivel_interes` entre 0 y 1. La relación es única por usuario/categoría. La ruta `/api/preferences/` fuerza la identidad desde JWT; el cliente no puede elegir otro usuario en el body.

`ConsultaRecomendacion` conserva presupuesto, tiempo, punto de partida, macrodistrito y timestamp. Tiene restricciones de presupuesto no negativo, tiempo positivo e índice GiST para el punto.

## 9. Conocimiento documental y procesamiento IA

En las tres ramas principales se documentan fuentes y fragmentos, scraping controlado, embeddings y almacenamiento vectorial. `FuenteDocumental` mantiene URL, hash, estado y error; `FragmentoDocumental` almacena texto, orden, embedding nullable, modelo, dimensión y fecha de actualización. Hay un índice HNSW para vectores cuando la migración correspondiente está aplicada.

El scraping se protege con allowlist, user agent, timeout, máximo de bytes, límites de redirección e intervalo mínimo. El pipeline esperado es fuente autorizada → descarga/normalización → chunking → fragmento sin embedding → vectorización → búsqueda semántica.

La consulta HTTP generativa RAG no forma parte del contrato consolidado de `main`, `dev` ni `Qa`; no debe documentarse como endpoint disponible en estas ramas. Antes de agregarla a una rama principal se debe incluir ruta, serializers, throttle, pruebas OpenAPI, pruebas de recuperación y evidencia de modelo disponible.

**[DIAGRAMA PENDIENTE: Fuente autorizada → scraping → fragmentos → embeddings → índice vectorial — RESALTAR EN AMARILLO]**

## 10. Frontend

### 10.1 Rutas

| Ruta | Vista | Acceso |
|---|---|---|
| `/` | Portada | Público. |
| `/destinos` | Catálogo/filtros | Público. |
| `/destinos/:id` | Detalle, mapa, galerías, horarios y tarifas | Público. |
| `/login`, `/registro` | Sesión | Público. |
| `/mi-cuenta` | Perfil y contraseña | JWT. |
| `/mi-cuenta/preferencias` | Preferencias | JWT. |
| `/mi-cuenta/recomendaciones` | Top-K y asistente local | JWT en dev/Qa. |
| `/mi-cuenta/usuarios` | Gestión de usuarios | JWT + ADMIN. |
| `/mi-cuenta/destinos` y subrutas | Gestión de destinos | JWT + ADMIN. |

### 10.2 Sesión HTTP

`api/http.ts` agrega Bearer access a cada petición. Ante un 401, coordina un solo refresh concurrente, actualiza access y reintenta; si falla, borra tokens/usuario y redirige al login. Los tokens se almacenan en `localStorage`, por lo que el frontend debe minimizar XSS, aplicar CSP y no confiar en roles manipulables del navegador. La autorización definitiva es backend.

### 10.3 Módulos

| Módulo | Función |
|---|---|
| `features/auth` | Registro, login, validación, contexto. |
| `features/turismo` | API, filtros, catálogo, detalle, mapas, galería, CRUD administrativo. |
| `features/preferencias` | Categorías, sliders, punto de partida y validación. |
| `features/recomendaciones` | Perfil Top-K, resultados y asistente contextual local. |
| `features/cuenta` | Perfil, contraseña, usuarios y roles. |
| `components` | Layout, guards, cabeceras, footer y selector de ubicación. |

**[DIAGRAMA PENDIENTE: Router React, guards, Axios, refresh y API — RESALTAR EN AMARILLO]**

## 11. Celery, Redis y medios

Redis funciona como broker y backend de resultados. Worker ejecuta tareas; Beat programa la purga de staging; Flower es opcional y no debe ser público.

Flujo de subida asíncrona:

1. ADMIN envía archivo multipart.
2. Backend valida tipo, tamaño, UUID y orden.
3. Archivo temporal se guarda en `STAGING_DIR` y la foto queda `pending`.
4. Worker procesa/publica el medio; estado cambia a `processing`, `completed` o `failed`.
5. Cliente consulta el endpoint de estado.

Las credenciales de proveedor de medios son secretos. Si faltan, la API debe devolver indisponibilidad y no simular éxito.

**[DIAGRAMA PENDIENTE: Multipart → staging → Redis/Celery → proveedor de medios → estado — RESALTAR EN AMARILLO]**

## 12. Contenedores y operación genérica

El repositorio define Compose local, una composición de producción genérica y overlay de Ollama. Hay imágenes separadas para backend, frontend, proxy y base local. Un despliegue seguro sigue estas reglas:

1. Publicar solo Nginx proxy.
2. Mantener servicios de aplicación y datos en red privada.
3. Terminar TLS en el borde y reenviar headers de proxy correctamente.
4. Resolver upstreams dinámicamente; no fijar IPs.
5. Aceptar IPv4/IPv6 cuando la red interna lo requiera.
6. Ejecutar migraciones una sola vez y antes de tráfico de aplicación.
7. Mantener almacenamiento persistente para datos y, si aplica, modelos.
8. Verificar healthchecks y pruebas de humo antes de promover una imagen.

Un rollback de contenedor no revierte migraciones. Crear backup lógico antes de migraciones de alto impacto y documentar procedimiento de restauración.

## 13. Calidad, CI/CD y seguridad

| Área | Verificación |
|---|---|
| Python | Ruff, Black, Mypy, `manage.py check`, migraciones y tests. |
| API | OpenAPI validado, rutas, operaciones, permisos y serializers. |
| Frontend | TypeScript, ESLint, Vitest y componentes. |
| Contenedores | Builds, Nginx, Compose y smoke tests. |
| Seguridad | Dependencias, análisis estático, imágenes y secretos. |

```bash
ruff check backend
black --check backend
mypy backend/config --ignore-missing-imports
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
python backend/manage.py test
```

## 14. Diagnóstico

| Síntoma | Causa probable | Acción |
|---|---|---|
| 502 del proxy | Upstream/host/puerto/resolver | Revisar logs, listeners, DNS interno y variables. |
| `DisallowedHost` | Host no autorizado | Corregir `DJANGO_ALLOWED_HOSTS`. |
| CSRF fallido | Origen no confiable | Corregir `DJANGO_CSRF_TRUSTED_ORIGINS`. |
| 401 continuos | Access/refresh inválido | Revisar refresh, interceptor y sesión. |
| 403 ADMIN | Rol/ownership insuficiente | Verificar permisos backend y usuario-rol. |
| Fallo GIS | PostGIS, engine o SRID incorrecto | Revisar extensión, engine GIS, migración y geometría. |
| Worker detenido | Redis/tarea/staging | Revisar broker, logs y directorio compartido. |
| Fallo OpenAPI | URL/método/prueba divergentes | Regenerar schema y corregir contrato intencionalmente. |

## 15. Mantenimiento documental

Actualizar este manual en el mismo PR que cambie modelos, restricciones, serializers, rutas, permisos, contratos OpenAPI, variables, arquitectura o tareas. No incluir tokens, contraseñas, secretos, dumps, URLs con credenciales ni datos personales reales.

## 16. Anexo A — Catálogo exhaustivo OpenAPI de Qa
Este anexo reemplaza listados representativos: enumera las **81 operaciones** generadas desde la especificación de `Qa`. La ruta `/api/conocimiento/consultar/` no aparece porque no forma parte del contrato de las tres ramas principales documentadas.
| Método | Ruta | Acceso | Implementación | Request/response principal |
|---|---|---|---|---|
| `GET` | `/api/` | Público | `backend/config/urls.py` | Salida: 200 |
| `POST` | `/api/auth/login/` | Público | `backend/usuarios/views.py` | Entrada: TokenObtainPair. Salida: 200 |
| `POST` | `/api/auth/logout/` | JWT | `backend/usuarios/views.py` | Entrada: Logout. Salida: 204 |
| `POST` | `/api/auth/password/change/` | JWT | `backend/usuarios/views.py` | Entrada: PasswordChange. Salida: 200 |
| `POST` | `/api/auth/register/` | Público | `backend/usuarios/views.py` | Entrada: Register. Salida: 201 |
| `POST` | `/api/auth/token/refresh/` | Público | `backend/usuarios/views.py` | Entrada: TokenRefresh. Salida: 200 |
| `GET` | `/api/auth/usuarios/` | JWT + ADMIN | `backend/usuarios/views.py` | Salida: 200: PaginatedUsuarioListList |
| `GET` | `/api/conocimiento/fragmentos/` | Público | `backend/conocimiento/views.py` | Salida: 200: PaginatedFragmentoDocumentalList |
| `POST` | `/api/conocimiento/fragmentos/` | JWT | `backend/conocimiento/views.py` | Entrada: FragmentoDocumental. Salida: 201: FragmentoDocumental |
| `GET` | `/api/conocimiento/fragmentos/{id_fragmento}/` | Público | `backend/conocimiento/views.py` | Salida: 200: FragmentoDocumental |
| `PUT` | `/api/conocimiento/fragmentos/{id_fragmento}/` | JWT | `backend/conocimiento/views.py` | Entrada: FragmentoDocumental. Salida: 200: FragmentoDocumental |
| `PATCH` | `/api/conocimiento/fragmentos/{id_fragmento}/` | JWT | `backend/conocimiento/views.py` | Entrada: PatchedFragmentoDocumental. Salida: 200: FragmentoDocumental |
| `DELETE` | `/api/conocimiento/fragmentos/{id_fragmento}/` | JWT | `backend/conocimiento/views.py` | Salida: 204 |
| `GET` | `/api/conocimiento/fuentes/` | Público | `backend/conocimiento/views.py` | Salida: 200: PaginatedFuenteDocumentalList |
| `POST` | `/api/conocimiento/fuentes/` | JWT | `backend/conocimiento/views.py` | Entrada: FuenteDocumental. Salida: 201: FuenteDocumental |
| `GET` | `/api/conocimiento/fuentes/{id_fuente}/` | Público | `backend/conocimiento/views.py` | Salida: 200: FuenteDocumental |
| `PUT` | `/api/conocimiento/fuentes/{id_fuente}/` | JWT | `backend/conocimiento/views.py` | Entrada: FuenteDocumental. Salida: 200: FuenteDocumental |
| `PATCH` | `/api/conocimiento/fuentes/{id_fuente}/` | JWT | `backend/conocimiento/views.py` | Entrada: PatchedFuenteDocumental. Salida: 200: FuenteDocumental |
| `DELETE` | `/api/conocimiento/fuentes/{id_fuente}/` | JWT | `backend/conocimiento/views.py` | Salida: 204 |
| `GET` | `/api/health/` | Público | `backend/config/urls.py` | Salida: 200 |
| `GET` | `/api/preferences/` | JWT | `backend/recomendaciones/views.py` | Salida: 200: PaginatedMiPreferenciaList |
| `POST` | `/api/preferences/` | JWT | `backend/recomendaciones/views.py` | Entrada: MiPreferencia. Salida: 201: MiPreferencia |
| `GET` | `/api/preferences/{id}/` | JWT | `backend/recomendaciones/views.py` | Salida: 200: MiPreferencia |
| `PATCH` | `/api/preferences/{id}/` | JWT | `backend/recomendaciones/views.py` | Entrada: PatchedMiPreferencia. Salida: 200: MiPreferencia |
| `DELETE` | `/api/preferences/{id}/` | JWT | `backend/recomendaciones/views.py` | Salida: 204 |
| `GET` | `/api/recomendaciones/consultas/` | JWT | `backend/recomendaciones/views.py` | Salida: 200: PaginatedConsultaRecomendacionList |
| `POST` | `/api/recomendaciones/consultas/` | JWT | `backend/recomendaciones/views.py` | Entrada: ConsultaRecomendacion. Salida: 201: ConsultaRecomendacion |
| `GET` | `/api/recomendaciones/consultas/{id}/` | JWT | `backend/recomendaciones/views.py` | Salida: 200: ConsultaRecomendacion |
| `PATCH` | `/api/recomendaciones/consultas/{id}/` | JWT | `backend/recomendaciones/views.py` | Entrada: PatchedConsultaRecomendacion. Salida: 200: ConsultaRecomendacion |
| `DELETE` | `/api/recomendaciones/consultas/{id}/` | JWT | `backend/recomendaciones/views.py` | Salida: 204 |
| `GET` | `/api/recomendaciones/preferencias/` | JWT | `backend/recomendaciones/views.py` | Salida: 200: PaginatedUsuarioPreferenciaList |
| `POST` | `/api/recomendaciones/preferencias/` | JWT | `backend/recomendaciones/views.py` | Entrada: UsuarioPreferencia. Salida: 201: UsuarioPreferencia |
| `GET` | `/api/recomendaciones/preferencias/{id}/` | JWT | `backend/recomendaciones/views.py` | Salida: 200: UsuarioPreferencia |
| `PUT` | `/api/recomendaciones/preferencias/{id}/` | JWT | `backend/recomendaciones/views.py` | Entrada: UsuarioPreferencia. Salida: 200: UsuarioPreferencia |
| `PATCH` | `/api/recomendaciones/preferencias/{id}/` | JWT | `backend/recomendaciones/views.py` | Entrada: PatchedUsuarioPreferencia. Salida: 200: UsuarioPreferencia |
| `DELETE` | `/api/recomendaciones/preferencias/{id}/` | JWT | `backend/recomendaciones/views.py` | Salida: 204 |
| `POST` | `/api/recomendaciones/recomendar/` | JWT | `backend/recomendaciones/views.py` | Entrada: RecomendacionRequest. Salida: 200: RecomendacionResponse |
| `POST` | `/api/recommendations/` | JWT | `backend/recomendaciones/views.py` | Entrada: RecomendacionRequest. Salida: 200: RecomendacionResponse |
| `GET` | `/api/turismo/admin/atractivos/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Salida: 200: PaginatedAtractivoAdminList |
| `POST` | `/api/turismo/admin/atractivos/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Entrada: AtractivoAdmin. Salida: 201: AtractivoAdmin |
| `GET` | `/api/turismo/admin/atractivos/{id_atractivo}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Salida: 200: AtractivoAdmin |
| `PUT` | `/api/turismo/admin/atractivos/{id_atractivo}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Entrada: AtractivoAdmin. Salida: 200: AtractivoAdmin |
| `PATCH` | `/api/turismo/admin/atractivos/{id_atractivo}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Entrada: PatchedAtractivoAdmin. Salida: 200: AtractivoAdmin |
| `DELETE` | `/api/turismo/admin/atractivos/{id_atractivo}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Salida: 204 |
| `GET` | `/api/turismo/admin/fotos/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Salida: 200: PaginatedFotoList |
| `POST` | `/api/turismo/admin/fotos/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Entrada: Foto. Salida: 201: Foto |
| `GET` | `/api/turismo/admin/fotos/{id_foto}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Salida: 200: Foto |
| `PUT` | `/api/turismo/admin/fotos/{id_foto}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Entrada: Foto. Salida: 200: Foto |
| `PATCH` | `/api/turismo/admin/fotos/{id_foto}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Entrada: PatchedFoto. Salida: 200: Foto |
| `DELETE` | `/api/turismo/admin/fotos/{id_foto}/` | JWT + ADMIN | `backend/turismo/views_admin.py` | Salida: 204 |
| `GET` | `/api/turismo/admin/fotos/{id}/estado/` | JWT + ADMIN | `backend/turismo/views_medios.py` | Salida: 200 |
| `POST` | `/api/turismo/admin/fotos/firma/` | JWT + ADMIN | `backend/turismo/views_medios.py` | Entrada: FirmaFoto. Salida: 200 |
| `POST` | `/api/turismo/admin/fotos/subir/` | JWT + ADMIN | `backend/turismo/views_medios.py` | Entrada: SubirFoto. Salida: 202 |
| `GET` | `/api/turismo/atractivos/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: PaginatedAtractivoList |
| `GET` | `/api/turismo/atractivos/{id}/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: Atractivo |
| `GET` | `/api/turismo/atractivos/cercanos/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: Atractivo |
| `GET` | `/api/turismo/atractivos/facetas/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200 |
| `GET` | `/api/turismo/categorias/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: PaginatedCategoriaList |
| `POST` | `/api/turismo/categorias/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: Categoria. Salida: 201: Categoria |
| `GET` | `/api/turismo/categorias/{id_categoria}/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: Categoria |
| `PUT` | `/api/turismo/categorias/{id_categoria}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: Categoria. Salida: 200: Categoria |
| `PATCH` | `/api/turismo/categorias/{id_categoria}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: PatchedCategoria. Salida: 200: Categoria |
| `DELETE` | `/api/turismo/categorias/{id_categoria}/` | JWT | `backend/turismo/views_catalogo.py` | Salida: 204 |
| `GET` | `/api/turismo/horarios/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: PaginatedHorarioList |
| `POST` | `/api/turismo/horarios/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: Horario. Salida: 201: Horario |
| `GET` | `/api/turismo/horarios/{id_horario}/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: Horario |
| `PUT` | `/api/turismo/horarios/{id_horario}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: Horario. Salida: 200: Horario |
| `PATCH` | `/api/turismo/horarios/{id_horario}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: PatchedHorario. Salida: 200: Horario |
| `DELETE` | `/api/turismo/horarios/{id_horario}/` | JWT | `backend/turismo/views_catalogo.py` | Salida: 204 |
| `GET` | `/api/turismo/tarifas/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: PaginatedTarifaList |
| `POST` | `/api/turismo/tarifas/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: Tarifa. Salida: 201: Tarifa |
| `GET` | `/api/turismo/tarifas/{id_tarifa}/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: Tarifa |
| `PUT` | `/api/turismo/tarifas/{id_tarifa}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: Tarifa. Salida: 200: Tarifa |
| `PATCH` | `/api/turismo/tarifas/{id_tarifa}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: PatchedTarifa. Salida: 200: Tarifa |
| `DELETE` | `/api/turismo/tarifas/{id_tarifa}/` | JWT | `backend/turismo/views_catalogo.py` | Salida: 204 |
| `GET` | `/api/turismo/tipos-tarifa/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: PaginatedTipoTarifaList |
| `POST` | `/api/turismo/tipos-tarifa/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: TipoTarifa. Salida: 201: TipoTarifa |
| `GET` | `/api/turismo/tipos-tarifa/{id_tipo_tarifa}/` | Público | `backend/turismo/views_catalogo.py` | Salida: 200: TipoTarifa |
| `PUT` | `/api/turismo/tipos-tarifa/{id_tipo_tarifa}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: TipoTarifa. Salida: 200: TipoTarifa |
| `PATCH` | `/api/turismo/tipos-tarifa/{id_tipo_tarifa}/` | JWT | `backend/turismo/views_catalogo.py` | Entrada: PatchedTipoTarifa. Salida: 200: TipoTarifa |
| `DELETE` | `/api/turismo/tipos-tarifa/{id_tipo_tarifa}/` | JWT | `backend/turismo/views_catalogo.py` | Salida: 204 |

## 17. Anexo B — Especificación consumible
El archivo [`openapi.yaml`](openapi.yaml) contiene la especificación completa usada para este manual. Puede importarse en Swagger UI, Postman, Insomnia o generadores de cliente. Regenerar desde la rama objetivo: 

```bash
python backend/manage.py spectacular --validate --file "docs/manual tecnico/openapi.yaml"
```
## 18. Anexo C — Mapa de pruebas
| Subsistema | Ubicaciones de prueba / evidencia |
|---|---|
| Autenticación y hardening | `backend/usuarios/tests/`, `backend/tests/`. |
| Turismo, filtros y fotos | `backend/turismo/tests/`. |
| Recomendaciones y scoring | `backend/recomendaciones/tests/`. |
| Conocimiento, scraping y embeddings | `backend/conocimiento/tests/`. |
| OpenAPI | `backend/tests/test_openapi.py`. |
| Frontend | Archivos `*.test.tsx`, `*.test.ts` dentro de `frontend/src/`. |
| Integración/infraestructura | Workflows, Compose y smoke tests de `.github/workflows/`. |


## 19. Inventario técnico versionado

El repositorio es un monorepo. La siguiente matriz identifica el propósito de cada activo; no sustituye la lectura del código cuando se modifica su comportamiento.

| Área | Activos versionados | Función |
|---|---|---|
| Raíz | `README.md`, `Makefile`, `.env.example`, `.gitignore`, `.trivyignore` | Instrucciones, automatización local, ejemplo de configuración y exclusiones de seguridad. |
| Backend | `backend/config`, `usuarios`, `turismo`, `recomendaciones`, `conocimiento`, `requirements*.txt`, `Dockerfile` | API, dominio, modelos, migraciones, tareas, tests y empaquetado Python. |
| Frontend | `frontend/src`, `public`, `package.json`, `pnpm-lock.yaml`, `Dockerfile*`, `nginx.conf`, `security-headers.conf` | SPA, pruebas, build reproducible y servicio estático. |
| Datos | `database/Dockerfile`, `backup.sh`, `restore.sh` | Base PostgreSQL con extensiones espaciales/vectoriales y continuidad operativa. |
| Borde | `proxy/Dockerfile`, `nginx.conf.template` | Terminación de la red pública, proxy interno, headers, límites y healthcheck. |
| Orquestación | `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.ollama.yml` | Entorno local, composición de operación e overlay de IA. |
| Automatización | `.github/workflows/*.yml`, `.github/dependabot.yml` | CI, análisis, builds, release, despliegue manual y actualización de dependencias. |
| Documentación | `docs/architecture/`, `docs/database/`, `docs/integracion-ci-cd.md`, este manual | Evidencia de arquitectura, modelo de datos y operación. |

La composición actual define los servicios `db`, `backend`, `frontend`, `proxy`, `redis`, `worker`, `beat` y `flower` (local); la composición de operación omite `flower` y usa servidor WSGI. El overlay de IA agrega el servicio de inferencia aislado. Solo el proxy publica un puerto al host.

### 19.1 Ramas, cambios y trazabilidad

Las tres ramas principales contienen los once workflows bajo `.github/workflows/`. Para cada cambio técnico se exige PR, checks aplicables y actualización conjunta de: implementación, pruebas, contrato OpenAPI si afecta HTTP, configuración si agrega variables y este manual si cambia el comportamiento técnico.

| Recurso | Regla operativa |
|---|---|
| `main` | Solo promoción aprobada; referencia estable. |
| `dev` | Integración de desarrollo; destino de actualizaciones automáticas de dependencias. |
| `Qa` | Validación previa a la promoción; contrato OpenAPI de referencia de este manual. |
| Tags SemVer | Activan el flujo de release cuando su forma es `vX.Y.Z`. |
| Pull request | Dispara validaciones generales y, según paths, validaciones especializadas. |

**[DIAGRAMA PENDIENTE: Inventario del repositorio, relaciones entre carpetas y flujos de cambio — RESALTAR EN AMARILLO]**

## 20. CI: catálogo exhaustivo de pipelines

Todos los workflows usan permisos mínimos declarados. Las credenciales no se imprimen en logs ni se documentan con valores. Un resultado verde evidencia únicamente los checks descritos; no certifica por sí mismo seguridad integral ni despliegue correcto.

### 20.1 Matriz de ejecución

| Workflow / archivo | Disparador | Jobs | Evidencia / condición de salida |
|---|---|---|---|
| **CI Principal** `ci.yml` | Push y PR contra `main`, `dev`, `Qa` | backend, frontend, docker, smoke | Checks Django, suite backend, migraciones, lint/test frontend, Compose, build y rutas a través de proxy. |
| **Backend** `backend.yml` | Cambios en `backend/**` o su workflow, push/PR | quality | Ruff, Black, Mypy de configuración, Django check, migraciones, cobertura backend >= 90 %. |
| **Frontend** `frontend.yml` | Cambios en `frontend/**` o su workflow, push/PR | quality | Instalación bloqueada por lockfile, lint y pruebas Vitest. |
| **Docker** `docker.yml` | Cambios de Dockerfiles, Compose, proxy, backend, frontend o database, push/PR | build-and-validate, db-backup-restore | Validación Compose, build de imágenes, sintaxis Nginx y roundtrip de backup/restauración PostGIS. |
| **E2E and smoke** `e2e.yml` | Manual o PR con cambios de backend/frontend/proxy/Compose | smoke | Stack levantado, frontend y API accesibles por proxy. |
| **Higiene** `hygiene.yml` | Todo push y PR | shellcheck, actionlint, workflows-yaml | ShellCheck, validación semántica de Actions y parseo YAML. |
| **Recommender** `recommender.yml` | Manual o PR con cambios backend/workflow | recommender | Check Django, migraciones y pruebas del subsistema de recomendaciones. |
| **Security** `security.yml` | Push a ramas principales, PR y lunes 03:30 UTC | dependencies, secrets, images | Auditoría Python/Node, detección de secretos y escaneo de cuatro imágenes por vulnerabilidades altas/críticas. |
| **CodeQL** `codeql.yml` | Push/PR a ramas principales y lunes 04:00 UTC | analyze (Python, JavaScript/TypeScript) | Análisis estático y envío de hallazgos de seguridad. |
| **Release** `release.yml` | Tag SemVer o ejecución manual | images | Validación SemVer, build multi-etapa y publicación de imágenes con tags trazables. |
| **Deploy** `deploy.yml` | Solo ejecución manual | deploy | Despliegue controlado por entorno, serializado por destino y con verificación posterior obligatoria. |

> `CI Principal` y los workflows especializados se solapan intencionalmente: el primero protege la integración transversal; los otros dan diagnóstico, cobertura o controles más estrictos por área.

### 20.2 CI Principal

`ci.yml` usa tres jobs independientes y un smoke final dependiente de los tres anteriores:

1. **Backend checks.** Arranca PostgreSQL con extensiones GIS/vectoriales, instala librerías geoespaciales y Python 3.11, instala `requirements-dev.txt`, ejecuta `manage.py check`, toda la suite y `makemigrations --check --dry-run`.
2. **Frontend checks.** Instala Node 22 y pnpm 10.34.5, usa `pnpm install --frozen-lockfile`, ejecuta lint y pruebas.
3. **Docker and Compose checks.** Valida interpolación/configuración de Compose y construye el stack sin caché.
4. **Container smoke tests.** Solo corre si los tres anteriores pasan; vuelve a construir, espera healthchecks, prueba `/` y `/api/` por el proxy, conserva logs cuando falla y siempre desmonta volúmenes efímeros.

El servicio de base de datos de CI usa credenciales ficticias de ejecución y healthcheck `pg_isready`; no son credenciales operativas ni se deben reutilizar fuera del pipeline.

### 20.3 Calidad especializada y límites de cobertura

| Control | Comando o mecanismo | Alcance | Límite conocido |
|---|---|---|---|
| Estilo Python | `ruff check backend`, `black --check backend` | Backend completo. | No sustituye revisión funcional. |
| Tipado | `mypy backend/config --ignore-missing-imports` | Configuración Django. | No cubre todo el backend. |
| Cobertura | `coverage ... manage.py test`, mínimo 90 % | Código Python bajo backend. | Porcentaje no equivale a casos críticos completos. |
| Estilo/test SPA | `pnpm lint`, `pnpm test` | Frontend. | No ejecuta navegación real en navegador completo. |
| Migraciones | `makemigrations --check --dry-run` | Consistencia modelo/migración. | No prueba rollback ni datos de producción. |
| Smoke | HTTP por proxy | Disponibilidad mínima. | No verifica flujos de negocio autenticados. |
| Backup/restore | Dump custom y `pg_restore` sobre tabla de sonda | Recuperabilidad básica con PostGIS. | No valida RPO/RTO ni un volumen real de producción. |

### 20.4 Seguridad automatizada

`security.yml` emplea concurrencia por workflow/ref y cancela la ejecución previa de la misma referencia. Sus controles son:

| Job | Herramienta | Configuración relevante | Resultado esperado |
|---|---|---|---|
| Dependencias | `pip-audit`, `pnpm audit` | Python runtime/dev; Node con umbral `critical`. | Fallar ante vulnerabilidad según umbral. |
| Secretos | Gitleaks | Checkout con historial completo. | Detectar material sensible presente o histórico. |
| Imágenes | Trivy | Backend, frontend, proxy y DB; OS+libraries; `HIGH,CRITICAL`; falla ante hallazgos no ignorados. | Impedir imágenes con hallazgos de severidad configurada. |
| SAST | CodeQL | Python y JavaScript/TypeScript; push, PR y schedule semanal. | Publicar alertas de análisis estático. |

`.trivyignore` contiene excepciones justificadas de vulnerabilidades heredadas de una imagen base; cualquier nueva excepción debe incluir CVE, origen, compensación y fecha de revisión. No usar exclusiones genéricas ni silenciar hallazgos sin justificación.

### 20.5 Higiene de automatización y actualización de dependencias

`hygiene.yml` revisa scripts shell con severidad warning, descarga una versión fijada de Actionlint y valida la sintaxis YAML de los workflows. `dependabot.yml` abre actualizaciones mensuales agrupadas para Python, Node y Docker hacia `dev`; limita PRs pendientes y evita versiones preliminares de Django 6.

**[DIAGRAMA PENDIENTE: Pull request → checks por paths → CI principal/especializado → revisión → promoción — RESALTAR EN AMARILLO]**

## 21. CD: release, promoción, despliegue y reversión

### 21.1 Separación de responsabilidades

El proyecto separa explícitamente cuatro decisiones:

1. **Validar:** CI ejecuta controles sobre commit o PR.
2. **Promover código:** los cambios viajan de `dev` a `Qa` y finalmente `main` mediante PR.
3. **Publicar artefactos:** un tag SemVer o una ejecución manual de Release construye imágenes inmutables por SHA y versionadas.
4. **Desplegar:** es una acción manual, por entorno, independiente de publicar una imagen.

La separación impide que un push o un tag por sí solo cambie un entorno operativo.

### 21.2 Release de artefactos

El workflow `release.yml` valida que el valor sea `X.Y.Z` (admite prefijo `v` en tags) antes de construir. Para cada imagen de backend, frontend, proxy y base de datos publica etiquetas: versión completa, mayor/menor, mayor, `latest` y SHA corto. Para rollback y auditoría se debe seleccionar siempre una etiqueta por SHA o una versión completa, nunca `latest`.

La construcción usa imágenes multi-etapa. El frontend ejecuta chequeo TypeScript antes de generar el bundle y solo recibe variables públicas de build; cualquier `VITE_*` queda embebida y es visible al usuario final.

### 21.3 Despliegue manual seguro

`deploy.yml` exige seleccionar un entorno y una estrategia. Serializa ejecuciones por entorno, no cancela un despliegue que ya inició, consulta un secreto de credencial inyectado por el entorno y falla antes de actuar si no existe. Tras el despliegue, el operador debe comprobar:

```bash
curl --fail --silent --show-error https://<dominio>/healthz
curl --fail --silent --show-error https://<dominio>/api/health/
```

Procedimiento mínimo de promoción:

1. Confirmar que la versión procede de un commit aprobado y que CI está verde.
2. Seleccionar un tag inmutable por SHA o versión completa.
3. Crear respaldo lógico verificable de la base de datos antes de migraciones de impacto.
4. Ejecutar migraciones una única vez; no permitir que réplicas compitan por el esquema.
5. Aplicar el despliegue manual al entorno seleccionado.
6. Verificar proxy, API, autenticación, tarea asíncrona y ruta crítica del catálogo.
7. Registrar versión, fecha, operador, resultado de smoke y cualquier migración aplicada.

### 21.4 Rollback y recuperación

| Situación | Acción |
|---|---|
| Fallo de aplicación sin migración destructiva | Volver a la imagen anterior identificada por SHA; repetir healthchecks. |
| Fallo posterior a migración compatible | Revertir aplicación y mantener esquema si la versión previa es compatible. |
| Migración no compatible o pérdida de datos | Detener escrituras, restaurar backup comprobado y ejecutar el procedimiento de recuperación aprobado. |
| Falla de worker o broker | Aislar la tarea, revisar mensajes/reintentos y validar consistencia de staging antes de reanudar. |
| Falla de inferencia | Mantener API base disponible; devolver error controlado de dependencia y no fabricar respuestas. |

Un rollback de contenedor **no** revierte la base de datos. El restore se ejecuta con `database/restore.sh <archivo.dump>` sobre una instancia controlada; los dumps se generan con formato custom mediante `database/backup.sh` y no se versionan.

**[DIAGRAMA PENDIENTE: Ciclo de release, selección de artefacto inmutable, migración, smoke, rollback y backup — RESALTAR EN AMARILLO]**

## 22. Seguridad técnica: controles implementados

### 22.1 Modelo de controles por capa

| Capa | Control implementado | Evidencia |
|---|---|---|
| Repositorio | `.gitignore` excluye entornos, artefactos, caches, backups, IDE y vault local; escaneo de secretos en CI. | `.gitignore`, `security.yml`. |
| Supply chain | Lockfile frontend, dependencias Python fijadas, Dependabot, auditoría y escaneo de imágenes. | `pnpm-lock.yaml`, requirements, Dependabot, Security. |
| CI | Permisos explícitos mínimos, acciones sensibles fijadas por commit en workflows de seguridad/release/despliegue, checks y concurrencia. | Workflows. |
| Red | Solo proxy expuesto; servicios en redes internas separadas para borde, aplicación y datos. | Compose y Nginx. |
| Transporte | Soporte de proxy confiable, redirect HTTPS configurable, HSTS, no-sniff, frame policy y referrer policy. | Settings y Nginx. |
| Navegador | CSP para SPA, restricción de `frame-ancestors`, `base-uri`, `form-action`, permisos de geolocalización acotados. | `frontend/security-headers.conf`, Nginx. |
| API | JWT Bearer, permisos cerrados por defecto, roles, ownership, validación de serializers, paginación y throttles. | `settings.py`, permisos y views. |
| Credenciales | Contraseñas con hash Django, validadores de longitud/comunes/similitud/numéricas, refresh rotativo y blacklist. | Usuarios y `SIMPLE_JWT`. |
| Datos | Constraints, claves/índices, PostGIS, VectorField, error handler que no filtra SQL. | Models, migrations, `exceptions.py`. |
| Datos externos | Scraper fail-closed, allowlist, límites de bytes/redirecciones/tiempo e intervalo. | `settings.py`, scraping. |
| IA | Servicio interno, timeouts, reintentos, validación de dimensión y límites de pregunta/top-k/umbral. | Settings, cliente y RAG. |
| Medios | Validación previa, staging compartido, procesamiento asíncrono y error seguro sin credenciales. | Turismo, Celery y settings. |
| Operación | Healthchecks, logs a stdout, rotación local de logs de contenedor, backup/restore probado en CI. | Compose, Docker y workflows. |

### 22.2 Autenticación, autorización y abuso

La API es stateless: no incorpora middleware de sesión ni sitio administrativo web. DRF resuelve usuarios con JWT y niega por defecto; cada vista pública declara explícitamente `AllowAny`. Las rutas administrativas exigen rol ADMIN y las rutas del usuario aplican ownership desde el token, no desde un identificador elegible por el cliente.

Los límites actuales incluyen throttles anónimo, usuario y autenticación, más límites específicos de IA donde la ruta exista. El proxy añade rate limit por dirección y tamaño máximo de cuerpo de 10 MiB. Estos controles reducen abuso, pero no sustituyen una protección perimetral distribuida ni monitoreo de ataques.

### 22.3 Configuración, secretos y datos sensibles

| Categoría | Gestión obligatoria | Prohibiciones |
|---|---|---|
| Clave de aplicación y base de datos | Secretos del entorno; rotación planificada; distinto por entorno. | Versionar valores, imprimirlos, reutilizarlos en ejemplos o pruebas operativas. |
| Servicios de medios / inferencia | Secretos del entorno y conectividad privada. | Exponer claves en frontend, logs o imágenes. |
| Variables públicas de SPA | Solo valores destinados a navegador y revisados. | Colocar secretos en prefijo `VITE_*`. |
| Tokens de automatización | Secretos con mínimo privilegio y alcance por entorno. | Ejecutar deploy con tokens personales persistentes o mostrarlos en comandos. |
| Backups | Cifrado/retención/acceso controlado fuera de Git. | Subir dumps, datos personales o extractos de producción. |

`DJANGO_SECRET_KEY` es obligatorio con debug deshabilitado. `CORS_ALLOW_ALL_ORIGINS` solo se activa con debug; para otros entornos se debe declarar una lista explícita. La documentación OpenAPI se puede desactivar con `SERVE_DOCS=0` para no ampliar superficie pública.

### 22.4 Gestión de vulnerabilidades y respuesta

1. Triage de alertas de dependencias, secretos, imágenes y SAST con responsable y fecha.
2. Corregir, actualizar lockfile/requirements y validar CI antes de promover.
3. Si se acepta un riesgo temporal, registrarlo con severidad, alcance, compensación y expiración; actualizar `.trivyignore` solo para CVE concreto y justificado.
4. Ante exposición de secreto: revocar/rotar, investigar historial y logs, invalidar artefactos afectados y documentar el incidente sin publicar el secreto.
5. Ante vulnerabilidad explotable: limitar acceso, aplicar mitigación, desplegar versión corregida, validar healthchecks y cerrar con evidencia.

**[DIAGRAMA PENDIENTE: Defensa en profundidad desde navegador/proxy hasta API, datos, CI y secretos — RESALTAR EN AMARILLO]**

## 23. Configuración, redes y servicios operativos

### 23.1 Variables por clasificación

| Grupo | Variables representativas | Consumidores | Consideración técnica |
|---|---|---|---|
| Base de datos | `POSTGRES_*`, `DATABASE_URL`, `DB_SSL_REQUIRE` | Backend, worker, beat, Supabase | Motor PostGIS, extensiones (`postgis`, `vector`, `pgcrypto`) y Session Pooler con SSL. |
| Django | `DJANGO_*`, `GUNICORN_*`, `SERVE_DOCS` | Backend | Host/orígenes/proxies coherentes con borde. |
| CORS/CSRF | `CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS` | Backend | Lista explícita por entorno. |
| Celery | `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `STAGING_DIR` | API, worker, beat | Staging compartido entre productor y consumidor. |
| Conocimiento/IA | `SCRAPER_*`, `OLLAMA_*`, `EMBEDDING_DIM`, `RAG_*` | Backend/worker | Allowlist obligatoria y modelo/dimensión compatibles. |
| Medios | Variables de cloud y credenciales de firma | Backend/worker/frontend público solo si aplica | Separar secretos de identificadores públicos. |
| Proxy | `PORT`, hosts, puertos y resolver interno | Proxy | Resolver dinámico; no IPs hardcodeadas de upstream. |
| Build SPA | `VITE_API_URL` y variables públicas | Build frontend | Quedan visibles en bundle final. |

El archivo `.env.example` es una plantilla local, no una fuente de configuración de operación. Nunca debe copiarse con valores reales al repositorio.

### 23.2 Red y persistencia

| Red/volumen | Participantes | Finalidad |
|---|---|---|
| `turismo-network` | Proxy y frontend | Entrada a SPA. |
| `app-network` | Proxy, frontend, backend, Redis, workers | Comunicación de aplicación. |
| `datos-network` | DB, backend, worker, beat | Aislamiento de datos. |
| `postgres_data` | DB | Persistencia PostgreSQL. |
| `redis_data` | Redis | Persistencia append-only del broker. |
| `staging_data` | Backend y worker | Transferencia temporal de medios. |

Los healthchecks distinguen disponibilidad de DB, Redis, backend, frontend y proxy. El healthcheck no mide latencia, uso de disco, colas pendientes ni validez de datos: estos requieren observabilidad adicional del entorno.

## 24. Base de datos, migraciones y continuidad

PostgreSQL incorpora PostGIS y pgvector. Las migraciones crean el esquema, extensiones, restricciones e índices; no se deben editar migraciones ya aplicadas en un entorno compartido.

En staging y producción la base es un proyecto **Supabase** independiente por entorno. Django conecta por el **Session Pooler** (IPv4, puerto 5432, SSL) con `DATABASE_URL`; las extensiones `postgis`, `vector` y `pgcrypto` se habilitan antes de la primera migración. La conexión directa `db.<ref>.supabase.co` es solo IPv6 y no se usa desde Railway. Ver [`deploy/supabase/README.md`](../../deploy/supabase/README.md).

| Dominio | Migraciones versionadas | Responsabilidad |
|---|---|---|
| Usuarios | 3 | Usuario UUID, roles y cambios de modelo. |
| Turismo | 7 | Catálogo, recomendaciones históricas transferidas, fotos, slug y URL. |
| Recomendaciones | 1 | Modelos trasladados a su aplicación. |
| Conocimiento | 3 | Modelos, scraping y embedding de 768 dimensiones. |

Procedimiento de migración: generar migración revisable, ejecutar check de consistencia, probar sobre datos representativos, incluir plan de rollback/datos, crear backup antes de producción y aplicar una vez antes de escalar réplicas. El pipeline verifica únicamente que no falten migraciones.

Los scripts de respaldo usan `pg_dump --format=custom --no-owner --no-acl`; restore usa `pg_restore --clean --if-exists --no-owner --no-acl`. Probar periódicamente restauración completa en instancia aislada y registrar tiempo, versión, checksum y resultado.

## 25. Pruebas, observabilidad y operación diaria

### 25.1 Inventario de pruebas

| Área | Evidencia versionada |
|---|---|
| Núcleo backend | `backend/tests/`: CRUD, OpenAPI, Celery y regresión. |
| Usuarios | Auth, RBAC, hardening y modelos. |
| Turismo | API, filtros, cercanía, validación, modelos, seed, administración, fotos y asincronía. |
| Recomendaciones | Scoring, servicios, API, permisos, preferencias, validaciones y modelos. |
| Conocimiento | Modelos, scraping, embeddings, cliente de inferencia, RAG y evaluación ficticia. |
| Frontend | 29 archivos de prueba de componentes, rutas, HTTP, autenticación, turismo, preferencias y cuenta. |
| Infraestructura | Compose/build/smoke, Nginx, backup/restore y scanners en workflows. |

Comandos administrativos disponibles: `seed`, `scrape_fuentes`, `vectorizar_fragmentos`, `seed_ficticio_conocimiento` y `evaluar_rag_ficticio`. Ejecutarlos solo con entorno y permisos adecuados; scraping/vectorización pueden producir carga y modificar datos.

### 25.2 Logs y señales mínimas

| Señal | Fuente | Acción ante anomalía |
|---|---|---|
| Disponibilidad | `/healthz`, `/api/health/`, healthchecks | Revisar proxy/upstream/red antes de reiniciar. |
| Errores HTTP | Logs Nginx/Django | Correlacionar ruta, código, despliegue y dependencia. |
| Excepciones | Logger `django` / `django.request` | No exponer trazas al cliente; analizar con acceso restringido. |
| Tareas | Logs Celery/Beat/Flower interno | Comprobar broker, reintentos, staging y estado de tarea. |
| Base de datos | `pg_isready`, logs y backups | Validar espacio, conexiones, extensiones y restauración. |
| Seguridad | Alertas Security/CodeQL/Gitleaks/Trivy | Aplicar procedimiento de vulnerabilidades. |

La configuración actual escribe logs estructurados simples a stdout con fecha, nivel, logger y mensaje. No hay en el repositorio una plataforma centralizada de métricas, tracing, alertas o retención: su implementación es una responsabilidad pendiente del entorno operativo.

## 26. Brechas, decisiones pendientes y riesgo conocido

Los siguientes puntos son hallazgos de documentación y revisión del código; no deben confundirse con incidentes confirmados.

| Severidad | Ubicación | Hallazgo / impacto | Acción recomendada |
|---|---|---|---|
| Resuelto | `backend/config/settings.py` | `DATABASE_URL` ahora fija `django.contrib.gis.db.backends.postgis`, `conn_health_checks`, `DB_CONN_MAX_AGE` y SSL. Sin el engine explícito, un proveedor externo producía PostgreSQL estándar e impedía los campos GIS. | Mantener el engine explícito y probar con una URL real de staging. |
| Media | `.github/workflows/ci.yml`, `backend.yml`, `recommender.yml` | Servicios de DB de CI usan una etiqueta mutable. La reproducción puede variar con el tiempo. | Fijar digest o versión inmutable y revisar actualización controlada. |
| Media | `docker-compose.prod.yml:34` | Migraciones se ejecutan al iniciar backend; escalar simultáneamente puede causar competencia de esquema. | Separar migración en job único previo al rollout. |
| Media | `frontend/src/lib/tokenStorage.ts` y navegador | Tokens en `localStorage` son accesibles ante XSS. Hay CSP, pero la mitigación no elimina el riesgo. | Mantener CSP estricta, revisar dependencias/sinks y evaluar estrategia de sesión según amenaza. |
| Media | Workflows no uniformemente fijados por SHA | Algunos actions están versionados por etiqueta mayor. | Fijar por commit todos los actions y revisar actualizaciones. |
| Media | Observabilidad | No hay configuración versionada de métricas/tracing/alertas centralizadas. | Definir SLO, métricas, dashboards, alertas y retención antes de operación crítica. |
| Baja | Documento/operación | Backups se prueban con sonda, no con un ejercicio completo de recuperación medido. | Ejecutar y registrar simulacros periódicos de restore. |

## 27. Checklist técnico de aceptación

Un cambio se considera documentado y listo para promoción solo si aplica los controles que correspondan:

- [ ] Alcance, rama de destino y trazabilidad del PR definidos.
- [ ] Modelos, constraints, migraciones y plan de datos revisados.
- [ ] Serializers, permisos, ownership, throttles y manejo de errores revisados.
- [ ] Contrato OpenAPI regenerado y prueba de contrato actualizada si cambia HTTP.
- [ ] Pruebas unitarias, integración y frontend pertinentes en verde.
- [ ] CI principal y workflows especializados aplicables en verde.
- [ ] Dependencias, secretos, SAST e imágenes revisados.
- [ ] Variables nuevas clasificadas como secretas o públicas; `.env.example` actualizado sin valores reales.
- [ ] Dockerfiles, Compose, healthchecks, redes y persistencia revisados cuando aplica.
- [ ] Backup/restore y estrategia de rollback revisados para cambios de datos.
- [ ] Runbook, observabilidad y este manual actualizados.
- [ ] Promoción y despliegue manual registrados con versión inmutable y evidencia de smoke.

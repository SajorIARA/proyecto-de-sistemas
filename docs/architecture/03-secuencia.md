# Diagrama de Secuencia — Login JWT

```mermaid
sequenceDiagram
    actor Turista
    participant Frontend as SPA React
    participant API as Django REST API
    participant DB as PostgreSQL

    Turista->>Frontend: Ingresa email + password
    Frontend->>API: POST /api/auth/login/ {email, password}
    API->>DB: SELECT usuario WHERE email = ?
    DB-->>API: Usuario encontrado
    API->>API: check_password(password)
    alt Credenciales válidas
        API->>API: Generar access (30min) + refresh (7d)
        API-->>Frontend: 200 OK {access, refresh, user}
        Frontend->>Frontend: Guardar tokens en localStorage
        Frontend-->>Turista: Redirigir al catálogo
    else Credenciales inválidas
        API-->>Frontend: 401 Unauthorized
        Frontend-->>Turista: Mostrar error
    end
```

# Diagrama de Secuencia — Registro con Rol TOURIST

```mermaid
sequenceDiagram
    actor Turista
    participant Frontend as SPA React
    participant API as Django REST API
    participant DB as PostgreSQL

    Turista->>Frontend: Completa formulario de registro
    Frontend->>API: POST /api/auth/register/ {nombre, email, password, password_confirm}
    API->>API: Validar campos + coincidencia de passwords
    API->>DB: SELECT WHERE email = ?
    alt Email duplicado
        API-->>Frontend: 400 Bad Request
    else Email nuevo
        API->>DB: INSERT usuario (password hasheado con PBKDF2)
        API->>DB: SELECT rol WHERE codigo = 'TOURIST'
        API->>DB: INSERT usuario_rol
        API->>API: Generar tokens JWT
        API-->>Frontend: 201 Created {tokens, user}
        Frontend-->>Turista: Redirigir al catálogo
    end
```

# Diagrama de Secuencia — Renovación automática del token

```mermaid
sequenceDiagram
    participant Frontend as SPA React (axios)
    participant API as Django REST API
    participant DB as PostgreSQL

    Frontend->>API: GET /api/... con Bearer access expirado
    API-->>Frontend: 401 Unauthorized
    Frontend->>Frontend: Interceptor: un solo refresh en vuelo
    Frontend->>API: POST /api/auth/token/refresh/ {refresh}
    alt Refresh válido
        API->>DB: Rotar refresh + blacklist anterior
        API-->>Frontend: 200 OK {access, refresh}
        Frontend->>Frontend: Actualizar localStorage
        Frontend->>API: Reintentar petición original
        API-->>Frontend: 200 OK
    else Refresh inválido o expirado
        API-->>Frontend: 401 Unauthorized
        Frontend->>Frontend: Limpiar storage
        Frontend-->>Frontend: Redirigir a /login?session=expired
    end
```

# Diagrama de Secuencia — Logout con blacklist

```mermaid
sequenceDiagram
    actor Turista
    participant Frontend as SPA React
    participant API as Django REST API
    participant DB as PostgreSQL

    Turista->>Frontend: Cerrar sesión
    Frontend->>API: POST /api/auth/logout/ {refresh}
    API->>DB: INSERT token blacklisted
    API-->>Frontend: 200 OK
    Frontend->>Frontend: Limpiar localStorage
    Frontend-->>Turista: Volver al inicio
```

# Diagrama de Secuencia — Catálogo con filtros y facetas

```mermaid
sequenceDiagram
    actor Turista
    participant Frontend as SPA React (React Query)
    participant Proxy as Nginx :80
    participant API as Django REST API
    participant DB as PostgreSQL

    Turista->>Frontend: Abrir /destinos
    Frontend->>Proxy: GET /api/turismo/atractivos/facetas/
    Proxy->>API: proxy_pass backend
    API->>DB: COUNT activos + categorías + rango BOB
    DB-->>API: Facetas
    API-->>Frontend: 200 OK {categorias[], precios_bob}
    Frontend->>Frontend: Pintar panel de filtros
    Turista->>Frontend: Escribir q + elegir categoría
    Frontend->>Proxy: GET /api/turismo/atractivos/?q=museo&categoria=Cultura
    Proxy->>API: proxy_pass backend
    API->>DB: SELECT con filtros (page 20)
    DB-->>API: Página de atractivos
    API-->>Frontend: 200 OK {count, results[]}
    Frontend-->>Turista: Mostrar cards con fotos Cloudinary
```

# Diagrama de Secuencia — Atractivos cercanos

```mermaid
sequenceDiagram
    actor Turista
    participant Frontend as SPA React (Leaflet)
    participant API as Django REST API
    participant DB as PostgreSQL + PostGIS

    Turista->>Frontend: Compartir ubicación
    Frontend->>API: GET /api/turismo/atractivos/cercanos/?lat=&lon=&radio=
    API->>API: Validar rangos (radio máx 50000 m)
    API->>DB: Distance UTM 19S + D(m=radio) ordenado
    DB-->>API: Atractivos con distancia_m
    API-->>Frontend: 200 OK {results[] + distancia_m}
    Frontend-->>Turista: Pintar pines en el mapa
```

# Diagrama de Secuencia — Subida directa firmada (imágenes)

```mermaid
sequenceDiagram
    actor Admin as Administrador
    participant Frontend as SPA React
    participant API as Django REST API
    participant Cloud as Cloudinary
    participant DB as PostgreSQL

    Admin->>Frontend: Elegir imagen ≤10MB
    Frontend->>API: POST /api/turismo/admin/fotos/firma/ {atractivo, formato, bytes}
    API->>API: Firmar params (secret nunca sale)
    API-->>Frontend: 200 OK {signature, timestamp, folder}
    Frontend->>Cloud: Upload directo con firma
    Cloud-->>Frontend: 200 OK {public_id, secure_url}
    Frontend->>API: POST /api/turismo/admin/fotos/ {public_id, url, ...}
    API->>DB: INSERT foto estado=completed
    DB-->>API: Foto creada
    API-->>Frontend: 201 Created
```

# Diagrama de Secuencia — Subida async con Celery (pesados/video)

```mermaid
sequenceDiagram
    actor Admin as Administrador
    participant Frontend as SPA React
    participant API as Django REST API
    participant Redis as Redis
    participant Worker as Celery Worker
    participant Cloud as Cloudinary
    participant DB as PostgreSQL

    Admin->>Frontend: Elegir archivo (video ≤100MB)
    Frontend->>API: POST /api/turismo/admin/fotos/subir/ (multipart)
    API->>API: Guardar temporal en staging compartido
    API->>DB: INSERT foto estado=pending
    API->>Redis: Encolar subir_foto_task.delay()
    API-->>Frontend: 202 Accepted {id_foto, estado}
    Worker->>Redis: Consumir tarea
    Worker->>Worker: pending → processing
    Worker->>Cloud: upload (folder atractivos/uuid-slug)
    Cloud-->>Worker: {public_id, secure_url, width, height}
    Worker->>DB: UPDATE foto completed + dims
    Worker->>Worker: Borrar temporal (finally)
    Frontend->>API: GET /api/turismo/admin/fotos/ID/estado/ (polling)
    API-->>Frontend: 200 OK {estado: completed, url}
```

# Diagrama de Secuencia — Baja lógica de atractivo

```mermaid
sequenceDiagram
    actor Admin as Administrador
    participant Frontend as SPA React
    participant API as Django REST API
    participant DB as PostgreSQL

    Admin->>Frontend: Eliminar destino
    Frontend->>API: DELETE /api/turismo/admin/atractivos/UUID/
    API->>API: IsAdmin + perform_destroy
    API->>DB: UPDATE atractivo SET activo=false
    DB-->>API: OK (horarios, tarifas y fotos intactos)
    API-->>Frontend: 204 No Content
    Frontend-->>Admin: Quitar de la lista
```

# Diagrama de Secuencia — Solicitud de Recomendación (diseño objetivo Sprint 3)

> Hoy solo se persiste la consulta (`POST /api/recomendaciones/consultas/`
> y `/api/preferences/`). El ranking con PostGIS + pgvector y el
> asistente RAG son Sprint 3 (issues #26–#29). Este diagrama es el
> contrato a implementar, no el comportamiento actual.

```mermaid
sequenceDiagram
    actor Turista
    participant Frontend as SPA React
    participant API as Django REST API
    participant Recomendador as Motor de Recomendación (Sprint 3)
    participant DB as PostgreSQL + PostGIS + pgvector

    Turista->>Frontend: Envía preferencias y ubicación
    Frontend->>API: POST /api/recomendaciones/consultas/
    API->>DB: INSERT consulta_recomendacion
    DB-->>API: Consulta persistida
    API->>Recomendador: Solicitar ranking
    Recomendador->>DB: ST_DWithin (filtro espacial)
    DB-->>Recomendador: Candidatos geográficos
    Recomendador->>DB: pgvector cosine similarity
    DB-->>Recomendador: Puntajes de similitud
    Recomendador->>Recomendador: Calcular penalización costo/tiempo
    Recomendador->>Recomendador: Normalizar + Rankear
    Recomendador-->>API: Top N atractivos rankeados
    API-->>Frontend: 200 OK {recomendaciones}
    Frontend-->>Turista: Mostrar mapa con resultados
```

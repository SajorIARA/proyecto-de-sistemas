# Arquitectura del Backend

Diagrama interno del backend (Django + Django REST Framework + GeoDjango).

```mermaid
flowchart TB
    subgraph Clientes["CLIENTES"]
        spa["Frontend Web<br/>(SPA)"]
    end

    subgraph API["BACKEND API — Django"]
        direction TB
        urlconf["Router / URLConf"]
        middlewares["Middleware<br/>CORS / Seguridad / Sesiones"]
        auth["Auth<br/>JWT / RBAC"]
        dest["Destinations<br/>CRUD / Categorías"]
        prefs["Preferences<br/>Perfil del usuario"]
        reco["Recommendation Engine"]
        orm["Django ORM (GeoDjango)"]
        serializers["Serializers DRF"]
    end

    subgraph Persistencia["BASE DE DATOS"]
        postgis["PostgreSQL + PostGIS"]
    end

    spa -- "REST / JSON / JWT" --> urlconf
    urlconf --> middlewares
    middlewares --> auth
    middlewares --> dest
    middlewares --> prefs
    middlewares --> reco
    auth --> orm
    dest --> orm
    prefs --> orm
    reco --> orm
    orm --> serializers
    serializers -- "PostGIS queries" --> postgis
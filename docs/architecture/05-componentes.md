# Diagrama de Componentes — Sistema Turístico La Paz

> Estado real: SPA React con Leaflet + axios con interceptor de refresh y
> React Query; backend Django + DRF en 4 apps con RBAC por roles; medios
> en Cloudinary (directo + Celery async); docs OpenAPI con drf-spectacular.
> El motor de recomendación y el asistente RAG son Sprint 3.

```mermaid
flowchart TB
    subgraph Cliente
        Browser[Navegador Web]
    end

    subgraph Frontend["Frontend — React 19 + Vite + Tailwind + Leaflet"]
        SPA[SPA React + React Router]
        AuthUI[Módulo Auth<br/>login · registro · sesión]
        Cuenta[Módulo Cuenta<br/>perfil · password · admin usuarios]
        Catalogo[Módulo Catálogo<br/>filtros · detalle · mapa Leaflet]
        AdminTurismo[Módulo Admin Turismo<br/>destinos · fotos]
        Preferencias[Módulo Preferencias]
        Sistema[Módulo Sistema<br/>BackendStatus]
        HTTPClient[Axios + interceptor refresh<br/>Bearer + reintento 401]
        TokenStore[tokenStorage<br/>localStorage]
        RQ[React Query<br/>cache + debounce]
    end

    subgraph Proxy["Proxy — Nginx :80"]
        Nginx[Nginx Reverse Proxy<br/>rate-limit api 10r/s]
    end

    subgraph Backend["Backend — Django + DRF (4 apps)"]
        URLConf[URLConf<br/>/api/auth /turismo /conocimiento<br/>/recomendaciones /preferences /health]
        AuthJWT[Auth JWT — SimpleJWT<br/>access 30min · refresh 7d rotado]
        RBAC[RBAC — HasRole · IsAdmin<br/>IsTurista · IsAdminOrReadOnly<br/>OwnerOrAdmin]
        Throttle[Throttles<br/>anon 100/h · user 1000/h · auth 30/min]
        ViewsUsuarios[usuarios — login · register<br/>refresh · logout · password · admin]
        ViewsTurismo[turismo — catálogo · cercanos<br/>facetas · admin · firma · subir · estado]
        ViewsConocimiento[conocimiento — fuentes · fragmentos]
        ViewsReco[recomendaciones — preferencias<br/>consultas · mis-preferencias]
        Serializers[Serializers DRF<br/>UbicacionField · PuntoPartidaField]
        DocsAPI[OpenAPI — drf-spectacular<br/>/schema /docs /redoc]
        TasksCelery[tasks — subir_foto_task<br/>purgar_staging]
        BeatSched[Beat — DatabaseScheduler<br/>purga staging cada hora]
        SeedCommand[Seed Command<br/>roles + usuarios demo + catálogo]
    end

    subgraph Async["Async — Redis + Celery"]
        RedisB[(Redis :6379<br/>broker + result backend)]
        Worker[Celery Worker ×2<br/>upload Cloudinary]
        Beat[Celery Beat]
        Flower[Flower :5555<br/>monitoreo · solo local]
    end

    subgraph Database["Base de Datos — PostgreSQL + PostGIS + pgvector"]
        PostGIS[PostGIS — ubicacion · area<br/>punto_partida · GiST]
        pgvector[pgvector — embedding 1536<br/>HNSW cosine]
        Tables[(13 tablas: usuario · rol · usuario_rol<br/>atractivo · foto · categoria · atractivo_categoria<br/>horario · tipo_tarifa · tarifa<br/>fuente_documental · fragmento_documental<br/>usuario_preferencia · consulta_recomendacion)]
    end

    subgraph Media["Medios — Cloudinary"]
        CloudAPI[Cloudinary API<br/>signed upload + transformaciones]
    end

    subgraph MotorRecomendacion["Motor de Recomendación — Sprint 3"]
        Futuro[Ranking + RAG<br/>placeholder recommender.yml]
    end

    Browser --> SPA
    SPA --> AuthUI
    SPA --> Cuenta
    SPA --> Catalogo
    SPA --> AdminTurismo
    SPA --> Preferencias
    SPA --> Sistema
    AuthUI --> RQ
    Catalogo --> RQ
    AdminTurismo --> RQ
    Preferencias --> RQ
    RQ --> HTTPClient
    HTTPClient --> TokenStore
    HTTPClient -->|REST + JSON + JWT| Nginx
    Nginx -->|/api/ proxy_pass| URLConf
    URLConf --> Throttle
    Throttle --> AuthJWT
    AuthJWT --> RBAC
    RBAC --> ViewsUsuarios
    RBAC --> ViewsTurismo
    RBAC --> ViewsConocimiento
    RBAC --> ViewsReco
    ViewsTurismo --> Serializers
    ViewsConocimiento --> Serializers
    ViewsReco --> Serializers
    ViewsTurismo --> TasksCelery
    TasksCelery -->|delay| RedisB
    RedisB --> Worker
    Beat --> RedisB
    BeatSched --> Beat
    Worker --> CloudAPI
    Worker --> PostGIS
    Flower --> RedisB
    Serializers --> PostGIS
    PostGIS --> Tables
    pgvector --> Tables
    SeedCommand --> Tables
    AdminTurismo -->|firma directa| CloudAPI
    Catalogo -->|f_auto,q_auto,w_720| CloudAPI
    DocsAPI --> URLConf
    ViewsReco -.->|Sprint 3| Futuro
    Futuro -.-> PostGIS
    Futuro -.-> pgvector
```

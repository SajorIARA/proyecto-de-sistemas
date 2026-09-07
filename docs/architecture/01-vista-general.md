# Arquitectura General del Sistema

Diagrama de visión global de la aplicación "Sistema Web Informativo para la Guía Personalizada de Destinos Turísticos en La Paz".

```mermaid
flowchart TB
    subgraph Usuario["USUARIO / TURISTA"]
        device["Navegador Desktop / Tablet / Smartphone"]
    end

    subgraph Frontend["FRONTEND WEB"]
        direction TB
        react[React + Vite + TailwindCSS]
        auth_ui["Auth UI<br/>Login / Registro"]
        catalogo["Catálogo<br/>Destinos / Búsqueda"]
        preferencias["Preferencias<br/>Presupuesto / Tiempo / GPS / Categorías / Perfil"]
        recos["Recomendaciones / Detalle / Mapa"]
    end

    subgraph Backend["BACKEND API"]
        direction TB
        drf["Django + Django REST Framework"]
        auth["Auth<br/>JWT / RBAC"]
        dest["Destinations<br/>CRUD / Categories"]
        prefs["Preferences<br/>Profile / Constraints"]
        engine["RECOMMENDATION ENGINE<br/>Hard Filters → Distance → Preference Similarity →<br/>Cost/Time Penalties → Normalization → Ranking"]
    end

    subgraph Database["DATABASE"]
        direction TB
        postgis["PostgreSQL + PostGIS"]
        tablas["Users / Profiles / Preferences / Categories<br/>Destinations / Coordinates / Costs<br/>Visit Times / Tags / Geographic Data"]
        indices["GIST / SP-GIST / Spatial Queries"]
    end

    device -- "HTTPS" --> Frontend
    Frontend -- "REST / JSON / JWT" --> Backend
    Backend -- "Django ORM / PostGIS" --> Database
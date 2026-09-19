# Arquitectura de Datos

Diagrama de capas y componentes de la base de datos (PostgreSQL + PostGIS).

```mermaid
flowchart TB
    subgraph App["Aplicación"]
        orm["Django ORM"]
    end

    subgraph DB["POSTGRESQL + POSTGIS"]
        direction TB

        subgraph CapaDatos["Entidades de negocio"]
            users["Users"]
            profiles["Profiles"]
            preferences["Preferences"]
            categories["Categories"]
            destinations["Destinations"]
            costs["Costs"]
            visit_times["Visit Times"]
            tags["Tags"]
        end

        subgraph CapaGeo["Datos geográficos"]
            geom["Coordenadas<br/>(EPSG:4326)"]
        end

        subgraph CapaIndex["Índices espaciales"]
            gist["GIST / SP-GIST"]
            spatial["Spatial Queries"]
        end
    end

    orm -- "INSERT / SELECT" --> categories
    orm --> destinations
    orm --> users
    orm --> preferences
    users --> profiles
    profiles --> preferences
    categories --> destinations
    destinations --> costs
    destinations --> visit_times
    destinations --> tags
    destinations --> geom
    geom --> gist
    gist --> spatial
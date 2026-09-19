# Infraestructura y Despliegue

Diagrama de la infraestructura contenerizada y el flujo de despliegue.

```mermaid
flowchart TB
    subgraph Internet["INTERNET"]
        user["Usuario / Turista"]
    end

    subgraph Stack["STACK DOCKER"]
        proxy["Nginx Reverse Proxy<br/>(puerto 80)"]

        subgraph FrontendService["Servicio Frontend"]
            spa["React SPA<br/>(build estático / Nginx)"]
        end

        subgraph BackendService["Servicio Backend"]
            api["Django + DRF<br/>(Gunicorn :8000)"]
        end

        subgraph DbService["Servicio Base de Datos"]
            db["PostgreSQL + PostGIS<br/>(:5432)"]
            vol["Volumen persistente<br/>postgres_data"]
        end

        proxy -- "/ → frontend" --> spa
        proxy -- "/api/ → backend" --> api
        api -- "Django ORM" --> db
        db --> vol
    end

    subgraph CI["CI/CD GitHub Actions"]
        ci["Checks + Tests + Build"]
        dockerhub["Docker Hub<br/>imágenes backend / frontend / proxy / db"]
        push["Push automático de imágenes"]
    end

    subgraph Deploy["Railway"]
        staging["Entorno staging (rama dev)"]
        production["Entorno production (rama main)"]
    end

    user -- "HTTPS" --> proxy
    ci -- "build & test" --> push --> dockerhub
    dockerhub -- "deploy" --> staging
    dockerhub -- "deploy" --> production
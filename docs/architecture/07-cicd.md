# Flujo de Integración Continua y Despliegue

Para una versión interactiva, abre [el diagrama HTML](./interactiva/flujo-ci-cd.workflow.html) en el navegador.

Diagrama del flujo completo de CI/CD: desde el commit hasta la publicación y despliegue.

```mermaid
flowchart LR
    subgraph Git["GITHUB"]
        main["main (producción)"]
        dev["dev"]
        feature["feature/*"]
    end

    subgraph CI["CI / GitHub Actions"]
        checks["Checks obligatorios<br/>Backend + Frontend + Docker + Smoke"]
        lint["Lint / Tests"]
        build["Build imágenes"]
        scan["Security<br/>CodeQL / Gitleaks / Trivy"]
    end

    subgraph Release["RELEASE"]
        tags["Tag v*.*.*"]
        semver["SemVer 1.2.3 / 1.2 / 1 / latest / SHA"]
    end

    subgraph Registry["DOCKER HUB"]
        images["backend / frontend / proxy"]
    end

    subgraph Env["RAILWAY"]
        staging["staging (dev)"]
        production["production (main)"]
    end

    feature -->|"PR + checks"| dev
    dev -->|"merge + push"| checks
    checks --> lint
    checks --> build
    checks --> scan
    dev --> release
    lint --> release
    tags --> semver
    semver -->|"push"| images
    images -->|"deploy"| staging
    images -->|"deploy"| production
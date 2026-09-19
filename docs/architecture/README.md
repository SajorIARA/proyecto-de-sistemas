# Diagramas de Arquitectura

La documentación se ofrece en dos formatos:

1. **Mermaid** (`.md`) — se renderiza en GitHub, VS Code y otros visores.
2. **HTML interactivos** (`.html`) — autocontenidos, generados con el skill Archify:
   navegables, con vista oscura/clara, traza animada y exportación de imagen.

| #  | Archivo | Contenido |
|---:|---------|-----------|
| 01 | [01-vista-general.md](./01-vista-general.md) | Visión global usuario → frontend → backend → BD |
| 02 | [02-frontend.md](./02-frontend.md) | Capas internas del frontend React |
| 03 | [03-backend.md](./03-backend.md) | Módulos y capas del backend Django |
| 04 | [04-motor-recomendacion.md](./04-motor-recomendacion.md) | Pipeline del motor de recomendación |
| 05 | [05-base-de-datos.md](./05-base-de-datos.md) | Entidades y componentes geoespaciales |
| 06 | [06-infraestructura.md](./06-infraestructura.md) | Docker, Nginx, CI/CD y Railway |
| 07 | [07-cicd.md](./07-cicd.md) | Flujo completo de integración y despliegue |

## Diagramas interactivos (HTML)

Los HTML son autocontenidos: ábrelos directamente en el navegador.

| Diagrama | Archivo |
|----------|---------|
| Visión general del sistema | [vista-general.architecture.html](./interactiva/vista-general.architecture.html) |
| CI/CD — del commit al despliegue | [flujo-ci-cd.workflow.html](./interactiva/flujo-ci-cd.workflow.html) |
| Petición de recomendaciones | [peticion-recomendaciones.sequence.html](./interactiva/peticion-recomendaciones.sequence.html) |
| Motor de recomendación (dataflow) | [motor-recomendacion.dataflow.html](./interactiva/motor-recomendacion.dataflow.html) |
| Ciclo de despliegue (lifecycle) | [ciclo-despliegue.lifecycle.html](./interactiva/ciclo-despliegue.lifecycle.html) |

Las fuentes JSON (spec del diagrama) viven en [interactiva/](./interactiva/) y son
la entrada editable del CLI de Archify (`archify.mjs validate|deliver`)
para regenerar los HTML. El skill queda local en `.opencode/skills/archify/`,
no versionado.

> Los diagramas Mermaid se renderizan en GitHub, VS Code (con la extensión
> *Markdown Preview Mermaid Support*) y otros visores con soporte Mermaid.
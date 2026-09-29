# Documentación de Arquitectura — Sistema Turístico La Paz

## Diagramas Mermaid (Markdown)

| # | Diagrama | Archivo | Descripción |
|---|----------|---------|-------------|
| 1 | **Casos de Uso** | [01-casos-de-uso.md](01-casos-de-uso.md) | Funciones del sistema y actores que las utilizan |
| 2 | **Clases** | [02-clases.md](02-clases.md) | Estructura: clases, atributos, métodos y relaciones |
| 3 | **Secuencia** | [03-secuencia.md](03-secuencia.md) | Comunicación entre componentes para Login, Registro y Recomendación |
| 4 | **Actividades** | [04-actividades.md](04-actividades.md) | Flujo de procesos: Registro/Login y Motor de Recomendación |
| 5 | **Componentes** | [05-componentes.md](05-componentes.md) | Módulos del software y sus dependencias |
| 6 | **Despliegue** | [06-despliegue.md](06-despliegue.md) | Infraestructura: Docker, Nginx, CI/CD, Railway |

## Diagrama de Base de Datos

| Archivo | Descripción |
|---------|-------------|
| [../database/der.md](../database/der.md) | Modelo de Entidad Relación completo con constraints e índices espaciales |

## Diagramas Interactivos (HTML)

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| [interactiva/peticion-recomendaciones.sequence.html](interactiva/peticion-recomendaciones.sequence.html) | Sequence | Secuencia de solicitud de recomendación |
| [interactiva/flujo-ci-cd.workflow.html](interactiva/flujo-ci-cd.workflow.html) | Workflow | Flujo de CI/CD del commit al despliegue |

> **Nota:** Para regenerar los diagramas interactivos con Archify se requiere Node.js.
> Ejecutar: `node .opencode/skills/archify/bin/archify.mjs deliver <type> <input.json> <output.html> --quality showcase`

## Cómo ver los diagramas Mermaid

Los diagramas Mermaid se renderizan automáticamente en:
- GitHub (vista previa de archivos `.md`)
- VS Code con extensión [Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
- [Mermaid Live Editor](https://mermaid.live/)

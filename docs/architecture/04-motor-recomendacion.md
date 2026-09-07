# Motor de Recomendación

Pipeline del motor de recomendación: desde las preferencias del usuario hasta el ranking final de destinos.

```mermaid
flowchart LR
    A[Preferencias del usuario<br/>Presupuesto / Tiempo / GPS / Categorías] --> B[Hard Filters<br/>Filtros rígidos<br/>excluye destinos incompatibles]
    B --> C[Distance<br/>Cálculo de distancia<br/>geoespacial]
    C --> D[Preference Similarity<br/>Similitud de preferencias]
    D --> E[Cost / Time Penalties<br/>Penalizaciones por<br/>costo y tiempo]
    E --> F[Normalization<br/>Normalización de puntajes]
    F --> G[Ranking<br/>Ordenamiento final]
    G --> H[Lista de recomendaciones]

    subgraph Geo["PostGIS (backend)"]
        B
        C
    end

    subgraph Calc["Lógica de ranking (Django)"]
        D
        E
        F
        G
    end
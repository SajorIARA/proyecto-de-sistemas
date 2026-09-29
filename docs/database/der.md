# Diagrama de Base de Datos — Modelo de Entidad Relación

```mermaid
erDiagram
    USUARIO {
        uuid id_usuario PK
        varchar email UK
        varchar password
        varchar nombre
        boolean activo
        timestamp fecha_creacion
        timestamp fecha_actualizacion
    }

    ROL {
        smallint id_rol PK
        varchar codigo UK
        varchar nombre
        varchar descripcion
    }

    USUARIO_ROL {
        bigint id PK
        uuid id_usuario FK
        smallint id_rol FK
        timestamp fecha_asignacion
    }

    CATEGORIA {
        bigint id_categoria PK
        varchar nombre UK
        text descripcion
        boolean activo
    }

    ATRACTIVO {
        uuid id_atractivo PK
        varchar nombre
        text descripcion
        varchar direccion
        integer duracion_minutos
        geometry(Point, 4326) ubicacion
        geometry(Polygon, 4326) area
        varchar fuente_origen
        boolean activo
        timestamp fecha_creacion
        timestamp fecha_actualizacion
    }

    ATRACTIVO_CATEGORIA {
        bigint id PK
        uuid id_atractivo FK
        bigint id_categoria FK
    }

    HORARIO {
        bigint id_horario PK
        uuid id_atractivo FK
        smallint dia_semana
        time hora_apertura
        time hora_cierre
        boolean cerrado
        date vigente_desde
        date vigente_hasta
    }

    TIPO_TARIFA {
        smallint id_tipo_tarifa PK
        varchar codigo UK
        varchar nombre
        varchar descripcion
    }

    TARIFA {
        bigint id_tarifa PK
        uuid id_atractivo FK
        smallint id_tipo_tarifa FK
        decimal monto
        varchar moneda
        date vigente_desde
        date vigente_hasta
        varchar observacion
    }

    FUENTE_DOCUMENTAL {
        uuid id_fuente PK
        uuid id_atractivo FK
        varchar titulo
        text url
        varchar tipo
        timestamp fecha_actualizacion
        timestamp fecha_creacion
    }

    FRAGMENTO_DOCUMENTAL {
        bigint id_fragmento PK
        uuid id_fuente FK
        integer numero_fragmento
        text contenido
        vector(1536) embedding
        timestamp fecha_creacion
    }

    USUARIO_PREFERENCIA {
        bigint id PK
        uuid id_usuario FK
        bigint id_categoria FK
        decimal nivel_interes
        timestamp fecha_registro
    }

    CONSULTA_RECOMENDACION {
        uuid id_consulta PK
        uuid id_usuario FK
        decimal presupuesto_bob
        decimal tiempo_horas
        geometry(Point, 4326) punto_partida
        varchar macrodistrito
        timestamp fecha_consulta
    }

    USUARIO ||--o{ USUARIO_ROL : "tiene"
    ROL ||--o{ USUARIO_ROL : "asignado_a"
    USUARIO ||--o{ USUARIO_PREFERENCIA : "posee"
    USUARIO ||--o{ CONSULTA_RECOMENDACION : "realiza"
    CATEGORIA ||--o{ ATRACTIVO_CATEGORIA : "clasifica"
    ATRACTIVO ||--o{ ATRACTIVO_CATEGORIA : "clasificado_en"
    ATRACTIVO ||--o{ HORARIO : "tiene"
    ATRACTIVO ||--o{ TARIFA : "tiene"
    ATRACTIVO ||--o{ FUENTE_DOCUMENTAL : "documentado_por"
    TIPO_TARIFA ||--o{ TARIFA : "define"
    FUENTE_DOCUMENTAL ||--o{ FRAGMENTO_DOCUMENTAL : "contiene"
    CATEGORIA ||--o{ USUARIO_PREFERENCIA : "preferida_en"

    %% Constraints
    %% USUARIO_ROL: UNIQUE(usuario, rol) → pk_usuario_rol
    %% ATRACTIVO_CATEGORIA: UNIQUE(atractivo, categoria) → pk_atractivo_categoria
    %% HORARIO: CHECK(dia_semana BETWEEN 1 AND 7)
    %% HORARIO: CHECK(cerrado OR (hora_apertura < hora_cierre))
    %% TARIFA: CHECK(monto >= 0)
    %% FRAGMENTO_DOCUMENTAL: UNIQUE(fuente, numero_fragmento)
    %% USUARIO_PREFERENCIA: UNIQUE(usuario, categoria), CHECK(nivel_interes BETWEEN 0 AND 1)
    %% CONSULTA_RECOMENDACION: CHECK(presupuesto_bob >= 0), CHECK(tiempo_horas > 0)

    %% Spatial Indices
    %% ATRACTIVO: GiST(ubicacion), GiST(area)
    %% FRAGMENTO_DOCUMENTAL: HNSW(embedding, cosine_ops)
    %% CONSULTA_RECOMENDACION: GiST(punto_partida)
```

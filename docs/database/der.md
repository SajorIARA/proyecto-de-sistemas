# Diseño del Modelo de Datos Relacional y Geoespacial

## Sistema Web Informativo para la Guía Personalizada de Destinos Turísticos en La Paz

### Issue relacionado

**#5 - Diseñar Modelo de Datos Relacional y Geoespacial**

---

## 1. Objetivo

Diseñar el modelo de datos conceptual y físico del sistema turístico, definiendo las entidades, relaciones, llaves primarias, llaves foráneas e índices necesarios para soportar:

- Usuarios.
- Roles y control de acceso.
- Catálogo de atractivos turísticos.
- Categorías.
- Horarios.
- Tarifas.
- Coordenadas geográficas.
- Geometrías espaciales mediante PostGIS.
- Fuentes documentales para RAG.
- Fragmentos documentales y embeddings mediante pgvector.

El modelo se diseña sobre PostgreSQL y contempla el uso de PostGIS para consultas geoespaciales y pgvector para búsquedas por similitud vectorial.

---

## 2. Tecnologías de persistencia

| Componente | Tecnología |
|---|---|
| Motor de base de datos | PostgreSQL |
| Datos geoespaciales | PostGIS |
| Almacenamiento vectorial | pgvector |
| Identificadores principales | UUID / BIGSERIAL |
| Coordenadas geográficas | EPSG:4326 - WGS84 |
| Índices espaciales | GiST |
| Índice vectorial propuesto | HNSW |
| Métrica vectorial propuesta | Distancia coseno |
| Moneda principal | BOB |

> **Nota de implementación**: el esquema físico lo gestiona Django mediante
> migraciones (`backend/turismo/migrations/`), que crean extensiones
> (PostGIS, pgvector), tablas, restricciones e índices al ejecutar
> `manage.py migrate`. No se aplica SQL de arranque en el volúmen de BD.

---

## 3. Diagrama Entidad-Relación Conceptual

```mermaid
erDiagram

    USUARIO ||--o{ USUARIO_ROL : posee
    ROL ||--o{ USUARIO_ROL : asigna

    ATRACTIVO ||--o{ ATRACTIVO_CATEGORIA : pertenece
    CATEGORIA ||--o{ ATRACTIVO_CATEGORIA : clasifica

    ATRACTIVO ||--o{ HORARIO : tiene

    ATRACTIVO ||--o{ TARIFA : posee
    TIPO_TARIFA ||--o{ TARIFA : define

    ATRACTIVO ||--o{ FUENTE_DOCUMENTAL : documenta
    FUENTE_DOCUMENTAL ||--o{ FRAGMENTO_DOCUMENTAL : contiene

    USUARIO {
        uuid id_usuario PK
        varchar email UK
        varchar password_hash
        varchar nombre
        boolean activo
        timestamptz fecha_creacion
        timestamptz fecha_actualizacion
    }

    ROL {
        smallint id_rol PK
        varchar codigo UK
        varchar nombre
        varchar descripcion
    }

    USUARIO_ROL {
        uuid id_usuario PK,FK
        smallint id_rol PK,FK
        timestamptz fecha_asignacion
    }

    ATRACTIVO {
        uuid id_atractivo PK
        varchar nombre
        text descripcion
        varchar direccion
        integer duracion_minutos
        geometry ubicacion
        geometry area
        boolean activo
        timestamptz fecha_creacion
        timestamptz fecha_actualizacion
    }

    CATEGORIA {
        bigint id_categoria PK
        varchar nombre UK
        text descripcion
        boolean activo
    }

    ATRACTIVO_CATEGORIA {
        uuid id_atractivo PK,FK
        bigint id_categoria PK,FK
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
        numeric monto
        char moneda
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
        timestamptz fecha_actualizacion
        timestamptz fecha_creacion
    }

    FRAGMENTO_DOCUMENTAL {
        bigint id_fragmento PK
        uuid id_fuente FK
        integer numero_fragmento
        text contenido
        vector embedding
        timestamptz fecha_creacion
    }
```

---

## 4. Relaciones y cardinalidades

| Entidad origen | Relación | Entidad destino | Cardinalidad |
|---|---|---|---|
| Usuario | posee | Rol | N:M |
| Atractivo | pertenece | Categoría | N:M |
| Atractivo | tiene | Horario | 1:N |
| Atractivo | posee | Tarifa | 1:N |
| Tipo de tarifa | clasifica | Tarifa | 1:N |
| Atractivo | posee | Fuente documental | 1:N |
| Fuente documental | contiene | Fragmento documental | 1:N |

---

## 5. Criterios de normalización

El modelo se diseña siguiendo los principios de normalización hasta Tercera Forma Normal (3FN).

### Primera Forma Normal (1FN)

Cada atributo contiene valores atómicos. No se almacenan listas de categorías, horarios o tarifas dentro de una sola columna.

### Segunda Forma Normal (2FN)

Las tablas asociativas `usuario_rol` y `atractivo_categoria` utilizan claves primarias compuestas y sus atributos dependen de la totalidad de dichas claves.

> En el modelo físico de Django estas tablas usan un `id` sintético como
> clave primaria más una restricción `UNIQUE (fk_origen, fk_destino)`, porque
> el ORM de Django no soporta claves primarias compuestas. La unicidad
> funcional es idéntica.

### Tercera Forma Normal (3FN)

La información relacionada con roles, categorías y tipos de tarifa se encuentra separada en entidades independientes, evitando redundancia y dependencias transitivas.

---

## 6. Diseño geoespacial

La ubicación principal de cada atractivo turístico se representa mediante:

```sql
GEOMETRY(Point, 4326)
```

Cuando un atractivo requiera representar un área geográfica se podrá utilizar:

```sql
GEOMETRY(Polygon, 4326)
```

Se adopta el sistema de referencia:

```text
EPSG:4326 - WGS84
```

PostGIS representa un punto utilizando el orden:

```text
POINT(longitud latitud)
```

Ejemplo:

```text
POINT(-68.1193 -16.4897)
```

Los campos espaciales utilizarán índices GiST para optimizar consultas por distancia, radio, intersección y pertenencia geográfica.

---

## 7. Embeddings y búsqueda vectorial

Los embeddings serán almacenados mediante la extensión `pgvector`.

Tipo propuesto:

```sql
VECTOR(1536)
```

La dimensión `1536` es una propuesta inicial y deberá confirmarse de acuerdo con el modelo de embeddings seleccionado por el equipo.

Para búsquedas semánticas se propone utilizar distancia coseno mediante:

```sql
vector_cosine_ops
```

y un índice vectorial HNSW.

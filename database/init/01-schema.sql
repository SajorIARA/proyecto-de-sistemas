-- ============================================================
-- 01-schema.sql
-- Aplica el modelo físico del "Sistema Turístico La Paz"
-- sobre la base recién creada (solo en primer arranque).
--
-- Incluye: PostGIS, pgvector, usuarios, categorías,
-- atractivos, horarios, tarifas y fuentes documentales (RAG).
-- ============================================================

-- ============================================================
-- 1. EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 2. USUARIOS Y CONTROL DE ACCESO (RBAC)
-- ============================================================

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_usuario_email
        UNIQUE (email)
);


CREATE TABLE IF NOT EXISTS rol (
    id_rol SMALLSERIAL PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(255),

    CONSTRAINT uq_rol_codigo
        UNIQUE (codigo)
);


CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario UUID NOT NULL,
    id_rol SMALLINT NOT NULL,

    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_usuario_rol
        PRIMARY KEY (id_usuario, id_rol),

    CONSTRAINT fk_usuario_rol_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE,

    CONSTRAINT fk_usuario_rol_rol
        FOREIGN KEY (id_rol)
        REFERENCES rol(id_rol)
        ON DELETE RESTRICT
);


-- ============================================================
-- 3. CATÁLOGO DE CATEGORÍAS
-- ============================================================

CREATE TABLE IF NOT EXISTS categoria (
    id_categoria BIGSERIAL PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_categoria_nombre
        UNIQUE (nombre)
);


-- ============================================================
-- 4. ATRACTIVOS TURÍSTICOS
-- ============================================================

CREATE TABLE IF NOT EXISTS atractivo (
    id_atractivo UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    direccion VARCHAR(300),

    -- Duración estimada de la visita
    duracion_minutos INTEGER,

    -- Punto geográfico principal del atractivo
    ubicacion GEOMETRY(Point, 4326) NOT NULL,

    -- Área geográfica opcional
    area GEOMETRY(Polygon, 4326),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_atractivo_duracion
        CHECK (
            duracion_minutos IS NULL
            OR duracion_minutos > 0
        )
);


-- ============================================================
-- 5. RELACIÓN ATRACTIVO - CATEGORÍA
-- ============================================================

CREATE TABLE IF NOT EXISTS atractivo_categoria (
    id_atractivo UUID NOT NULL,
    id_categoria BIGINT NOT NULL,

    CONSTRAINT pk_atractivo_categoria
        PRIMARY KEY (id_atractivo, id_categoria),

    CONSTRAINT fk_atractivo_categoria_atractivo
        FOREIGN KEY (id_atractivo)
        REFERENCES atractivo(id_atractivo)
        ON DELETE CASCADE,

    CONSTRAINT fk_atractivo_categoria_categoria
        FOREIGN KEY (id_categoria)
        REFERENCES categoria(id_categoria)
        ON DELETE RESTRICT
);


-- ============================================================
-- 6. HORARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS horario (
    id_horario BIGSERIAL PRIMARY KEY,

    id_atractivo UUID NOT NULL,

    -- ISO simplificado:
    -- 1 = lunes ... 7 = domingo
    dia_semana SMALLINT NOT NULL,

    hora_apertura TIME,
    hora_cierre TIME,

    cerrado BOOLEAN NOT NULL DEFAULT FALSE,

    vigente_desde DATE,
    vigente_hasta DATE,

    CONSTRAINT fk_horario_atractivo
        FOREIGN KEY (id_atractivo)
        REFERENCES atractivo(id_atractivo)
        ON DELETE CASCADE,

    CONSTRAINT ck_horario_dia
        CHECK (
            dia_semana BETWEEN 1 AND 7
        ),

    CONSTRAINT ck_horario_horas
        CHECK (
            cerrado = TRUE
            OR (
                hora_apertura IS NOT NULL
                AND hora_cierre IS NOT NULL
                AND hora_apertura < hora_cierre
            )
        ),

    CONSTRAINT ck_horario_vigencia
        CHECK (
            vigente_hasta IS NULL
            OR vigente_desde IS NULL
            OR vigente_hasta >= vigente_desde
        )
);


-- ============================================================
-- 7. TIPOS DE TARIFA
-- ============================================================

CREATE TABLE IF NOT EXISTS tipo_tarifa (
    id_tipo_tarifa SMALLSERIAL PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),

    CONSTRAINT uq_tipo_tarifa_codigo
        UNIQUE (codigo)
);


-- ============================================================
-- 8. TARIFAS
-- ============================================================

CREATE TABLE IF NOT EXISTS tarifa (
    id_tarifa BIGSERIAL PRIMARY KEY,

    id_atractivo UUID NOT NULL,
    id_tipo_tarifa SMALLINT NOT NULL,

    monto NUMERIC(10,2) NOT NULL,

    -- Código ISO 4217.
    -- La moneda principal del proyecto es BOB.
    moneda CHAR(3) NOT NULL DEFAULT 'BOB',

    vigente_desde DATE,
    vigente_hasta DATE,

    observacion VARCHAR(300),

    CONSTRAINT fk_tarifa_atractivo
        FOREIGN KEY (id_atractivo)
        REFERENCES atractivo(id_atractivo)
        ON DELETE CASCADE,

    CONSTRAINT fk_tarifa_tipo
        FOREIGN KEY (id_tipo_tarifa)
        REFERENCES tipo_tarifa(id_tipo_tarifa)
        ON DELETE RESTRICT,

    CONSTRAINT ck_tarifa_monto
        CHECK (
            monto >= 0
        ),

    CONSTRAINT ck_tarifa_vigencia
        CHECK (
            vigente_hasta IS NULL
            OR vigente_desde IS NULL
            OR vigente_hasta >= vigente_desde
        )
);


-- ============================================================
-- 9. FUENTES DOCUMENTALES PARA RAG
-- ============================================================

CREATE TABLE IF NOT EXISTS fuente_documental (
    id_fuente UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    id_atractivo UUID,

    titulo VARCHAR(250) NOT NULL,
    url TEXT,
    tipo VARCHAR(50),

    fecha_actualizacion TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_fuente_atractivo
        FOREIGN KEY (id_atractivo)
        REFERENCES atractivo(id_atractivo)
        ON DELETE SET NULL
);


-- ============================================================
-- 10. FRAGMENTOS DOCUMENTALES Y EMBEDDINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS fragmento_documental (
    id_fragmento BIGSERIAL PRIMARY KEY,

    id_fuente UUID NOT NULL,

    numero_fragmento INTEGER NOT NULL,

    contenido TEXT NOT NULL,

    -- Dimensión propuesta.
    -- Debe confirmarse según el modelo de embeddings elegido.
    embedding VECTOR(1536) NOT NULL,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_fragmento_fuente
        FOREIGN KEY (id_fuente)
        REFERENCES fuente_documental(id_fuente)
        ON DELETE CASCADE,

    CONSTRAINT uq_fragmento_fuente_numero
        UNIQUE (id_fuente, numero_fragmento),

    CONSTRAINT ck_fragmento_numero
        CHECK (
            numero_fragmento >= 0
        )
);


-- ============================================================
-- 11. ÍNDICES RELACIONALES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_usuario_rol_rol
    ON usuario_rol (id_rol);

CREATE INDEX IF NOT EXISTS idx_atractivo_categoria_categoria
    ON atractivo_categoria (id_categoria);

CREATE INDEX IF NOT EXISTS idx_horario_atractivo_dia
    ON horario (id_atractivo, dia_semana);

CREATE INDEX IF NOT EXISTS idx_tarifa_atractivo
    ON tarifa (id_atractivo);

CREATE INDEX IF NOT EXISTS idx_tarifa_atractivo_monto
    ON tarifa (id_atractivo, monto);

CREATE INDEX IF NOT EXISTS idx_tarifa_tipo
    ON tarifa (id_tipo_tarifa);

CREATE INDEX IF NOT EXISTS idx_fuente_documental_atractivo
    ON fuente_documental (id_atractivo);


-- ============================================================
-- 12. ÍNDICES GEOESPACIALES POSTGIS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_atractivo_ubicacion_gist
    ON atractivo
    USING GIST (ubicacion);

CREATE INDEX IF NOT EXISTS idx_atractivo_area_gist
    ON atractivo
    USING GIST (area);


-- ============================================================
-- 13. ÍNDICE VECTORIAL PGVECTOR
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_fragmento_embedding_hnsw
    ON fragmento_documental
    USING HNSW (embedding vector_cosine_ops);


-- ============================================================
-- 14. DATOS BASE DE REFERENCIA
-- ============================================================

INSERT INTO rol (codigo, nombre, descripcion)
VALUES
    ('ADMIN', 'Administrador', 'Usuario con permisos administrativos'),
    ('TOURIST', 'Turista', 'Usuario visitante de la plataforma')
ON CONFLICT (codigo) DO NOTHING;


INSERT INTO tipo_tarifa (codigo, nombre)
VALUES
    ('GENERAL', 'General'),
    ('NINO', 'Niño'),
    ('ESTUDIANTE', 'Estudiante'),
    ('ADULTO_MAYOR', 'Adulto mayor')
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
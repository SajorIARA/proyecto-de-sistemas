# syntax=docker/dockerfile:1
# Imagen PostgreSQL + PostGIS + pgvector
# Basada en postgres:17 (Debian bookworm, con soporte de seguridad hasta 2028)
# con PostGIS y pgvector desde el repositorio APT de PGDG.
FROM postgres:17-bookworm

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        postgresql-17-postgis-3 \
        postgresql-17-pgvector \
    && rm -rf /var/lib/apt/lists/*

# El esquema (extensiones, tablas, índices) lo crean las migraciones de
# Django con `manage.py migrate` en el primer arranque del backend.
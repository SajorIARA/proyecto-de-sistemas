#!/usr/bin/env bash
#
# restore.sh - Restaura un respaldo de la base de datos PostgreSQL
#
# Uso:
#   ./restore.sh backups/backup_YYYYMMDD_HHMMSS.dump
#
# Requiere que el contenedor de base de datos esté corriendo.
# El dump debe haber sido generado con backup.sh (formato custom).
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-turismo-melgarejo_db}"
DUMP_FILE="${1:?Uso: ./restore.sh <archivo.dump>}"

if [ ! -f "$DUMP_FILE" ]; then
    echo "ERROR: no existe el archivo $DUMP_FILE"
    exit 1
fi

echo "==> Restaurando $DUMP_FILE ..."
# psql envía las extensiones/spatial_ref_sys a la base.
# En bases nuevas con el esquema ya aplicado por docker-init, esto es seguro.
docker exec -i "$DB_CONTAINER" pg_restore \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    -U "${POSTGRES_USER:-cobol}" \
    -d "${POSTGRES_DB:-turismo-melgarejo}" \
    < "$DUMP_FILE"

echo "==> Restauración completada."
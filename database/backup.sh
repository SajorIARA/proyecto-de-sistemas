#!/usr/bin/env bash
#
# backup.sh - Respaldo de la base de datos PostgreSQL (con PostGIS)
#
# Uso:
#   ./backup.sh                    -> volcado comprimido en ./backups/
#   ./backup.sh salida.dump        -> volcado personalizado con nombre elegido
#
# Requiere que el contenedor de base de datos esté corriendo.
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-turismo-melgarejo_db}"
BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)/backups"
OUTPUT="${1:-}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

if [ -z "$OUTPUT" ]; then
    OUTPUT="$BACKUP_DIR/backup_${TIMESTAMP}.dump"
fi

# PostGIS no se puede restaurar con pg_restore --clean de forma trivial;
# usamos formato custom y restauramos sobre una base que ya tiene postgis.
echo "==> Generando respaldo..."
docker exec "$DB_CONTAINER" pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    -U "${POSTGRES_USER:-cobol}" \
    "${POSTGRES_DB:-turismo-melgarejo}" \
    > "$OUTPUT"

echo "==> Respaldo guardado en: $OUTPUT"
echo "==> Uso para restaurar: ./restore.sh $OUTPUT"
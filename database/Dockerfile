# PostGIS y pgvector ya vienen en la imagen base versionada. Solo se refrescan
# los paquetes del sistema para incorporar parches de seguridad publicados
# después de construir la base; la lógica de la BD no se toca.
ARG BASE_IMAGE=raisiar/proyecto-de-sistemas-db:latest
FROM ${BASE_IMAGE}

USER root
# `gosu` solo se usa en el entrypoint cuando PostgreSQL arranca como root;
# esta imagen corre como `postgres`, así que retirarlo elimina los CVEs del
# stdlib de Go embebido sin suprimirlos en .trivyignore.
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
    && rm -f /usr/local/bin/gosu \
    && rm -rf /var/lib/apt/lists/*
USER postgres

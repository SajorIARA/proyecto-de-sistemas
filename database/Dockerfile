# PostGIS y pgvector ya vienen en la imagen base versionada. Solo se refrescan
# los paquetes del sistema para incorporar parches de seguridad publicados
# después de construir la base; la lógica de la BD no se toca.
ARG BASE_IMAGE=raisiar/proyecto-de-sistemas-db:latest
FROM ${BASE_IMAGE}

USER root
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
USER postgres

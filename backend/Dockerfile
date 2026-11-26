# La base ya contiene Python, GDAL, GEOS, PROJ y las dependencias instaladas:
# no se ejecuta pip. Solo se refrescan los paquetes del sistema para incorporar
# parches de seguridad publicados después de construir la base.
ARG BASE_IMAGE=ghcr.io/sajoriara/proyecto-de-sistemas-backend:1.0.10
FROM ${BASE_IMAGE}

USER root
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=appuser:appuser . .
RUN mkdir -p /app/staticfiles /app/logs /app/staging \
    && chown -R appuser:appuser /app
USER appuser

CMD ["sh", "-c", "python manage.py collectstatic --noinput 2>/dev/null; gunicorn config.wsgi:application --bind [::]:$PORT --workers ${GUNICORN_WORKERS:-2} --threads ${GUNICORN_THREADS:-2} --timeout ${GUNICORN_TIMEOUT:-60} --access-logfile - --error-logfile - --capture-output"]

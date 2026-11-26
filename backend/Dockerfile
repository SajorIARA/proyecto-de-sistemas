# Build offline-first: la base ya contiene Python, GDAL, GEOS, PROJ y las
# dependencias instaladas. No se ejecutan apt ni pip durante cada build.
ARG BASE_IMAGE=ghcr.io/sajoriara/proyecto-de-sistemas-backend:1.0.10
FROM ${BASE_IMAGE}

USER root
WORKDIR /app
COPY --chown=appuser:appuser . .
RUN mkdir -p /app/staticfiles /app/logs /app/staging \
    && chown -R appuser:appuser /app
USER appuser

CMD ["sh", "-c", "python manage.py collectstatic --noinput 2>/dev/null; gunicorn config.wsgi:application --bind [::]:$PORT --workers ${GUNICORN_WORKERS:-2} --threads ${GUNICORN_THREADS:-2} --timeout ${GUNICORN_TIMEOUT:-60} --access-logfile - --error-logfile - --capture-output"]

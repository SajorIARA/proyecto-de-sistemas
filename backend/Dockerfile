# syntax=docker/dockerfile:1

# ============================================================
# STAGE 1: dependencies
# ============================================================
FROM python:3.11-slim AS deps

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    proj-bin \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN rm -rf /usr/local/lib/python3.11/site-packages/setuptools-*.dist-info \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --upgrade pip setuptools wheel

# ============================================================
# STAGE 2: runtime (producción)
# ============================================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    gdal-bin \
    libgdal36 \
    libgeos-c1t64 \
    libproj25 \
    && rm -rf /var/lib/apt/lists/*

# Copiar solo las dependencias instaladas (no sources de build)
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY . .

RUN useradd --create-home --system appuser \
    && mkdir -p /app/staticfiles /app/logs \
    && chown -R appuser:appuser /app

USER appuser

# Gunicorn (WSGI) con timeouts y workers
CMD ["sh", "-c", "python manage.py collectstatic --noinput 2>/dev/null; gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers ${GUNICORN_WORKERS:-2} --threads ${GUNICORN_THREADS:-2} --timeout ${GUNICORN_TIMEOUT:-60} --access-logfile - --error-logfile - --capture-output"]

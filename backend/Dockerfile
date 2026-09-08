FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN rm -rf /usr/local/lib/python3.11/site-packages/setuptools-*.dist-info \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --upgrade pip setuptools wheel jaraco.context

COPY . .

# Mantiene el contenedor vivo para poder ejecutar comandos interactivos
CMD ["tail", "-f", "/dev/null"]
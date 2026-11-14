# syntax=docker/dockerfile:1
FROM nginx:alpine

RUN apk upgrade --no-cache \
    && apk add --no-cache wget

# Template principal: el entrypoint oficial de nginx ejecuta envsubst
# y lo convierte en /etc/nginx/nginx.conf (NGINX_ENVSUBST_OUTPUT_DIR).
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

# Valores por defecto para Docker Compose. Railway inyecta PORT y permite
# sobrescribir hosts, puertos y resolver por variable de entorno.
ENV PORT=80
ENV FRONTEND_HOST=frontend
ENV FRONTEND_PORT=3000
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=8000
ENV NGINX_RESOLVER=127.0.0.11

EXPOSE 80

# wget (busybox) disponible para el healthcheck. Usa $PORT para que también
# funcione cuando Railway asigna un puerto distinto de 80.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["nginx", "-g", "daemon off;"]
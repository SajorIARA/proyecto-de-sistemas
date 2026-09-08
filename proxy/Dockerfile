# syntax=docker/dockerfile:1
FROM nginx:alpine

RUN apk upgrade --no-cache \
    && apk add --no-cache wget

# Template principal: el entrypoint oficial de nginx ejecuta envsubst
# y lo convierte en /etc/nginx/nginx.conf (NGINX_ENVSUBST_OUTPUT_DIR).
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

EXPOSE 80

# wget (busybox) disponible para el healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
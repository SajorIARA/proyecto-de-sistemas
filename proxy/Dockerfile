ARG BASE_IMAGE=ghcr.io/sajoriara/proyecto-de-sistemas-proxy:1.0.10
FROM ${BASE_IMAGE}

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

ENV PORT=80
ENV FRONTEND_HOST=frontend
ENV FRONTEND_PORT=3000
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=8000
ENV NGINX_RESOLVER=127.0.0.11

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["nginx", "-g", "daemon off;"]

# syntax=docker/dockerfile:1

# ============================================================
# STAGE 1: build
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app

RUN apk upgrade --no-cache

COPY package.json pnpm-lock.yaml ./

# pnpm standalone desde GitHub releases (sin npm ni corepack):
# el build no depende de registry.npmjs.org.
RUN wget -qO /usr/local/bin/pnpm "https://github.com/pnpm/pnpm/releases/download/v10.34.5/pnpm-linuxstatic-x64" \
	&& chmod +x /usr/local/bin/pnpm \
	&& pnpm install --frozen-lockfile \
	&& rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Nombre del cloud de Cloudinary, horneado en el bundle estático. Railway
# y el workflow de release lo inyectan como build-arg; vacío = placeholders.
ARG VITE_CLOUDINARY_CLOUD_NAME=
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME

RUN ./node_modules/.bin/vite build

# ============================================================
# STAGE 2: runtime (Nginx sirve el SPA)
# ============================================================
FROM nginx:alpine AS runtime

RUN apk upgrade --no-cache

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

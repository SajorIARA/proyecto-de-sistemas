# syntax=docker/dockerfile:1

# ============================================================
# STAGE 1: build
# ============================================================
FROM node:26-alpine AS build

WORKDIR /app

RUN apk upgrade --no-cache

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
	&& corepack prepare pnpm@10.34.5 --activate \
	&& pnpm install --frozen-lockfile \
	&& rm -rf /usr/local/lib/node_modules/npm /root/.cache/node/corepack \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/pnpm /usr/local/bin/pnpx

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

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

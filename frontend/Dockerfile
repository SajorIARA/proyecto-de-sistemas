FROM node:22-alpine

WORKDIR /app

RUN apk upgrade --no-cache

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
	&& corepack prepare pnpm@10.34.5 --activate \
	&& pnpm install --frozen-lockfile \
	&& rm -rf /usr/local/lib/node_modules/npm /root/.cache/node/corepack \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/pnpm /usr/local/bin/pnpx

COPY . .

EXPOSE 3000

CMD ["node"]
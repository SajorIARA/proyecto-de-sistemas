FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
	&& corepack prepare pnpm@9.15.5 --activate \
	&& pnpm install --frozen-lockfile \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY . .

EXPOSE 3000

CMD ["node"]
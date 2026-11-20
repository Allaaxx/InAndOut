# API container: Fastify + Socket.io + Prisma
FROM node:22-alpine AS deps

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package.json tsconfig.json ./
COPY prisma ./prisma/
COPY --from=deps /app/node_modules ./node_modules
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "/usr/local/bin/api-entrypoint.sh"]

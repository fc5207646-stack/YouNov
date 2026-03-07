ARG NODE_IMAGE=docker.io/library/node:20-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY api/package.json api/package-lock.json* ./
# 需要包含 prisma CLI（默认在 devDependencies）以便容器内可执行 migrate/seed
RUN npm ci

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY api/ ./

# Prisma client 需要 generate（生产里一般在 CI 执行；这里兜底）
RUN npx prisma generate

EXPOSE 8080
CMD ["node", "src/index.js"]


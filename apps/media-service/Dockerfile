# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY packages/common-guards/package.json ./packages/common-guards/package.json
COPY packages/proto/package.json ./packages/proto/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY apps/user-service/package.json ./apps/user-service/package.json
COPY apps/auth-service/package.json ./apps/auth-service/package.json
COPY apps/api-gateway/package.json ./apps/api-gateway/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/menu-service/package.json ./apps/menu-service/package.json
COPY apps/restaurant-service/package.json ./apps/restaurant-service/package.json
COPY apps/media-service/package.json ./apps/media-service/package.json

RUN npm install --legacy-peer-deps

COPY apps/media-service ./apps/media-service
COPY tsconfig.base.json ./

RUN npm run build --workspace=apps/media-service

# ── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/media-service/dist ./apps/media-service/dist

EXPOSE 3011

CMD ["node", "apps/media-service/dist/main"]

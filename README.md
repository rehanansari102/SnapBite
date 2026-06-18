# SnapBite 🍔

A full-stack food delivery platform built with a **production-grade microservices architecture** — similar to Uber Eats or DoorDash.

> This is a learning project designed to go from zero to a fully working multi-service platform. Each phase builds on the last, introducing real-world backend engineering patterns.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, Server Actions, TypeScript) |
| Backend | NestJS (TypeScript) — one service per domain |
| Auth DB | PostgreSQL + TypeORM |
| Document DBs | MongoDB + Mongoose |
| Cache / Sessions | Redis (ioredis) |
| API Gateway | NestJS reverse proxy + JWT guard |
| Service-to-service | gRPC (auth verification) + REST |
| Email | Brevo (`@getbrevo/brevo`) |
| File storage | AWS S3 (presigned URLs) |
| Containerisation | Docker + Docker Compose |
| Monorepo | pnpm workspaces |

---

## Architecture

```
Browser (Next.js :3010)
        ↓ HTTP
API Gateway :3000  (NestJS — routing, JWT guard)
    ├── /api/auth/*        → Auth Service        :3001  (PostgreSQL + Redis)
    ├── /api/users/*       → User Service        :3002  (MongoDB + Redis)
    ├── /api/restaurants/* → Restaurant Service  :3003  (MongoDB + Redis)
    ├── /api/menus/*       → Menu Service        :3004  (MongoDB + Redis)
    ├── /api/orders/*      → Order Service       :3005  (MongoDB)
    ├── /api/payments/*    → Payment Service     :3006  (PostgreSQL)
    ├── /api/delivery/*    → Delivery Service    :3007  (MongoDB)
    └── /api/media/*       → Media Service       :3008  (S3)

Internal event bus: Redis Pub/Sub
Real-time:          NestJS WebSocket Gateway
```

---

## Project Structure

```
SnapBite/
├── apps/
│   ├── api-gateway/        # Single entry point, JWT guard, reverse proxy
│   ├── auth-service/       # Register, login, refresh, forgot/reset password, email verification
│   ├── user-service/       # User profiles and addresses (MongoDB)
│   ├── restaurant-service/ # Restaurant management, geospatial search
│   ├── menu-service/       # Menu items grouped by category
│   ├── media-service/      # S3 presigned URL generation
│   └── frontend/           # Next.js 15 App Router UI
├── packages/
│   ├── common-guards/      # Shared JWT guards
│   ├── logger/             # Correlation ID middleware + structured logging
│   ├── proto/              # gRPC .proto definitions
│   └── shared-types/       # Shared TypeScript event types
├── docker-compose.yml
└── pnpm-workspace.yaml
```

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [pnpm](https://pnpm.io/) (for local development without Docker)
- Node.js 20+

### Run with Docker (recommended)

```bash
# Clone the repo
git clone https://github.com/your-username/SnapBite.git
cd SnapBite

# Copy and fill in env files
cp apps/auth-service/.env.example apps/auth-service/.env

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3010 |
| API Gateway | http://localhost:3000 |
| Auth Service | http://localhost:3001 |
| User Service | http://localhost:3002 |

### Environment Variables

Each service has its own `.env` file. Key variables for `apps/auth-service/.env`:

```env
PORT=3001
GRPC_PORT=50051
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/snapbite_auth
REDIS_URL=redis://localhost:6379

JWT_SECRET=change-me-in-production
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

BREVO_API_KEY=your-brevo-api-key
BREVO_FROM_EMAIL=your-verified-sender@example.com
APP_URL=http://localhost:3010
```

---

## Features

### ✅ Phase 1 — Authentication & Foundation
- Register / Login / Logout
- JWT access + refresh token rotation
- Redis-backed token blacklist
- Forgot password & reset password via email (Brevo)
- Email verification on register
- httpOnly cookie management in Next.js
- Protected routes with middleware

### 🔨 Phase 2 — Restaurants & Menus *(in progress)*
- Restaurant creation and management (owner dashboard)
- Geospatial nearby search (MongoDB 2dsphere)
- Opening hours schedule
- Menu items grouped by category
- Image uploads via S3 presigned URLs

### Planned
- Phase 3: Orders + cart (Redis)
- Phase 4: Payments (Stripe)
- Phase 5: Real-time order tracking (WebSockets)
- Phase 6: Delivery management
- Phase 7: Reviews & ratings
- Phase 8: Admin dashboard
- Phase 9: Notifications (email + push)
- Phase 10: Kubernetes deployment

---

## Development

### Run a single service locally

```bash
# Install dependencies
pnpm install

# Run auth-service in watch mode
pnpm --filter @snapbite/auth-service run start:dev
```

### Run tests

```bash
pnpm --filter @snapbite/auth-service run test
```

---

## License

MIT

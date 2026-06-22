# SnapBite — Project Roadmap

## Architecture

```
Browser (Next.js :3010)
    ↓  HTTP
API Gateway :3000  (NestJS — routing, JWT guard, rate limiting)
    ├── /api/auth/*        → Auth Service        :3001  (PostgreSQL + Redis)
    ├── /api/users/*       → User Service        :3002  (MongoDB + Redis)
    ├── /api/restaurants/* → Restaurant Service  :3003  (MongoDB + Redis)
    ├── /api/menus/*       → Menu Service        :3004  (MongoDB + Redis)
    ├── /api/media/*       → Media Service       :3011  (S3 / R2)
    ├── /api/orders/*      → Order Service       :3005  (MongoDB)
    ├── /api/payments/*    → Payment Service     :3006  (PostgreSQL)    ← not built
    ├── /api/delivery/*    → Delivery Service    :3007  (MongoDB)       ← not built
    ├── /api/notifications → Notification Svc    :3008  (MongoDB)       ← not built
    └── /api/reviews/*     → Review Service      :3009  (MongoDB)       ← not built

Internal event bus: Redis Pub/Sub (→ Kafka in production)
Real-time:          WebSocket Gateway (NestJS @WebSocketGateway)       ✅ built
```

---

## Database ERD

### PostgreSQL — `snapbite_auth` (Auth Service)

```
┌─────────────────────────────────────────┐
│ users                                   │
├─────────────────────────────────────────┤
│ id               UUID  PK               │
│ email            VARCHAR  UNIQUE        │
│ passwordHash     VARCHAR                │
│ role             ENUM  customer |       │
│                        restaurant_owner │
│                        driver | admin   │
│ isActive         BOOLEAN  default true  │
│ isEmailVerified  BOOLEAN  default false │
│ emailVerificationToken   VARCHAR?       │
│ emailVerificationExpires TIMESTAMPTZ?   │
│ passwordResetToken       VARCHAR?       │
│ passwordResetExpires     TIMESTAMPTZ?   │
│ createdAt        TIMESTAMPTZ            │
│ updatedAt        TIMESTAMPTZ            │
└────────────────────┬────────────────────┘
                     │ 1
                     │
                     │ N
┌────────────────────▼────────────────────┐
│ refresh_tokens                          │
├─────────────────────────────────────────┤
│ id          UUID  PK                    │
│ userId      UUID  FK → users.id         │
│ tokenHash   VARCHAR                     │
│ expiresAt   TIMESTAMPTZ                 │
│ revoked     BOOLEAN  default false      │
│ createdAt   TIMESTAMPTZ                 │
└─────────────────────────────────────────┘
```

---

### MongoDB Collections

```
── snapbite_users ──────────────────────────────────────────────

user_profiles
├── userId          String  (= auth users.id)  unique index
├── email           String
├── firstName       String?
├── lastName        String?
├── phone           String?
├── avatarUrl       String?
├── savedRestaurantIds  String[]
└── addresses[]
    ├── id          String  (uuid)
    ├── label       String  e.g. "Home"
    ├── street      String
    ├── city        String
    ├── country     String
    ├── lat         Number
    ├── lng         Number
    └── isDefault   Boolean

── snapbite_restaurants ────────────────────────────────────────

restaurants
├── _id             ObjectId  PK
├── ownerId         String  (= auth users.id)  index
├── name            String
├── description     String?
├── cuisineTypes    String[]
├── address
│   ├── street      String
│   ├── city        String
│   └── country     String
├── location  (GeoJSON Point — 2dsphere index)
│   ├── type        "Point"
│   └── coordinates [lng, lat]
├── imageUrl        String?
├── isOpen          Boolean  default true
├── isActive        Boolean  default true
├── isApproved      Boolean  default false
├── minimumOrder    Number   default 0
├── deliveryFee     Number   default 0
├── rating          Number   default 0
├── reviewCount     Number   default 0
├── openingHours[]
│   ├── day         Number  0=Sun … 6=Sat
│   ├── open        String  HH:MM
│   ├── close       String  HH:MM
│   └── isClosed    Boolean
└── timestamps (createdAt, updatedAt)

── snapbite_menus ──────────────────────────────────────────────

menu_items
├── _id             ObjectId  PK
├── restaurantId    String  (= restaurants._id)  index
├── name            String
├── description     String?
├── price           Number  min 0
├── category        String
├── imageUrl        String?
├── isAvailable     Boolean  default true
└── timestamps (createdAt, updatedAt)

── snapbite_orders ─────────────────────────────────────────────

orders
├── _id             ObjectId  PK
├── customerId      String  (= auth users.id)  index
├── restaurantId    String  (= restaurants._id)  index
├── restaurantName  String
├── status          Enum  PENDING | CONFIRMED | PREPARING |
│                         READY | PICKED_UP | DELIVERED | CANCELLED
├── subtotal        Number
├── deliveryFee     Number
├── total           Number
├── notes           String?
├── cancelReason    String?
├── items[]
│   ├── menuItemId  String  (= menu_items._id)
│   ├── name        String
│   ├── price       Number
│   ├── quantity    Number
│   └── imageUrl    String?
├── deliveryAddress
│   ├── street      String
│   ├── city        String
│   ├── country     String
│   ├── lat         Number?
│   └── lng         Number?
└── timestamps (createdAt, updatedAt)
```

---

### Redis Key Schema

```
cart:{userId}                → JSON Cart  (TTL 24h)
user:profile:{userId}        → JSON UserProfile  (TTL 300s)
restaurant:detail:{id}       → JSON Restaurant  (TTL 600s)
restaurant:nearby:{lat}:{lng}:{radius}  → JSON Restaurant[]  (TTL 120s)
menu:{restaurantId}          → JSON MenuItem[]  (TTL 600s)
blacklist:{jti}              → "1"  (TTL = token expiry)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router, Server Actions, TypeScript) |
| Backend | NestJS (TypeScript) — one app per service |
| Auth DB | PostgreSQL + TypeORM |
| Document DBs | MongoDB + Mongoose |
| Cache / Sessions | Redis (ioredis) |
| API Gateway | NestJS reverse proxy + JWT guard |
| Email | Brevo (@getbrevo/brevo) |
| File storage | AWS S3 / Cloudflare R2 (presigned URLs) |
| Payments | Stripe (payment intents, server-side confirmation) |
| Real-time | Socket.IO WebSocket gateway (HS256 JWT auth) |
| Containerisation | Docker + Docker Compose |
| Monorepo | pnpm workspaces |
| CI | GitHub Actions (8 parallel jobs — type check + unit tests) |

---

## Completed Features

### Infrastructure
- [x] Docker Compose — PostgreSQL, MongoDB (replica set), Redis, dev UIs (Mongo Express, Redis Commander)
- [x] pnpm monorepo with shared packages (`common-guards`, `logger`, `proto`, `shared-types`)
- [x] Multi-stage Dockerfiles for all services (Node 20-alpine, optimised production images)
- [x] Database-per-service isolation (PostgreSQL for auth, MongoDB for everything else)

### Auth Service (`:3001`)
- [x] Register with email + password (bcrypt, salt 12)
- [x] Login — returns JWT access token (15 min) + refresh token (7 days) as httpOnly cookies
- [x] Logout — refresh token blacklisted in Redis
- [x] Silent token refresh (`POST /auth/refresh`)
- [x] Forgot password — sends reset link via Brevo
- [x] Reset password — token-based, invalidates old tokens
- [x] Email verification on register — blocks ordering until verified
- [x] Resend verification email
- [x] Role-based users: `customer`, `restaurant_owner`, `driver`, `admin`
- [x] Redis token blacklist for invalidated access tokens

### User Service (`:3002`)
- [x] Get own profile (`GET /users/me`)
- [x] Update profile — firstName, lastName, phone, avatarUrl (`PATCH /users/me`)
- [x] Add delivery address (`POST /users/me/addresses`)
- [x] Delete address (`DELETE /users/me/addresses/:id`)
- [x] Default address selection
- [x] Redis cache-aside pattern (300s TTL)

### Restaurant Service (`:3003`)
- [x] Create restaurant (owner only)
- [x] Update restaurant details
- [x] Get owner's restaurants (`GET /restaurants/my`)
- [x] Get restaurant by ID
- [x] Geospatial nearby search (`GET /restaurants/nearby?lat=&lng=&radius=`) — MongoDB 2dsphere
- [x] Open/closed toggle (`PATCH /restaurants/:id/toggle`)
- [x] Weekly opening hours management (`PUT /restaurants/:id/hours`)
- [x] Restaurant approval workflow (admin approves before going live)
- [x] Minimum order amount + delivery fee per restaurant
- [x] Redis caching (600s detail TTL, 120s nearby TTL)

### Menu Service (`:3004`)
- [x] Add menu item to restaurant
- [x] Get full menu grouped by category
- [x] Update menu item
- [x] Delete menu item
- [x] Availability toggle per item (`PATCH /:restaurantId/items/:itemId/toggle`)
- [x] Redis caching (600s TTL)

### Media Service (`:3011`)
- [x] Generate S3 presigned upload URL (`POST /media/presigned-url`)
- [x] Delete file from S3 (`DELETE /media/*key`)
- [x] Folder-based organisation (avatars/, restaurants/, menus/)
- [x] Cloudflare R2 integration via AWS S3 SDK

### API Gateway (`:3000`)
- [x] JWT validation on all protected routes
- [x] Dynamic reverse proxy routing to all backend services
- [x] Public routes: `/api/auth/*`, `GET /api/restaurants`, `GET /api/menus`
- [x] Rate limiting (60 req / 60s)
- [x] Request timeout (10s)
- [x] Token extraction from Authorization header or httpOnly cookies
- [x] User context injection into proxied request headers

### Frontend (`:3010`)
- [x] Login page
- [x] Register page
- [x] Forgot password page
- [x] Reset password page (`?token=`)
- [x] Email verification page (`?token=`)
- [x] Protected dashboard layout with middleware route guard
- [x] Auto-redirect authenticated users away from auth pages
- [x] Silent token refresh in Next.js middleware
- [x] Profile page — edit name, phone, avatar upload with presigned URLs
- [x] Restaurant management pages — create, list, manage restaurant + menu items
- [x] Server actions for auth, profile, restaurant operations
- [x] httpOnly cookie management

---

## Pending Features

### Phase 3 — Orders ✅ (complete)
**Order Service (`:3005`, MongoDB)**
- [x] Cart in Redis — add/remove/update items, live price calculation
  - `GET /orders/cart`
  - `POST /orders/cart/items`
  - `PATCH /orders/cart/items/:menuItemId`
  - `DELETE /orders/cart/items/:menuItemId`
  - `DELETE /orders/cart`
- [x] Place order from cart — computes subtotal + delivery fee, clears cart
  - `POST /orders`
- [x] Order history for customer — `GET /orders`
- [x] Restaurant orders view — `GET /orders/restaurant/:restaurantId`
- [x] Order detail — `GET /orders/:id`
- [x] Order status updates with role-based state machine — `PATCH /orders/:id/status`
- [x] Order lifecycle: `PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED` (+ `CANCELLED`)
- [ ] Redis Pub/Sub events: `order.placed`, `order.confirmed`, `order.ready`, `order.delivered`, `order.cancelled`

**Frontend**
- [x] Cart page with quantity controls, item removal, clear cart (`/cart`)
- [x] Checkout page — saved address selection or manual entry, order summary, notes (`/checkout`)
- [x] Order history page with status badges and date (`/orders`)
- [x] Order detail page — progress tracker, items, address, cancel flow (`/orders/:id`)
- [x] Restaurant owner incoming orders dashboard — restaurant picker, active/all filter, advance status (`/dashboard/orders`)
- [x] Reorder button on order history

---

### Phase 4 — Payments ✅ (core complete)
> Implemented directly in Order Service rather than as a separate Payment Service.

**Order Service — Payment features**
- [x] Stripe payment intent created at order placement for CARD orders
- [x] Confirm payment with server-side Stripe verification — `POST /orders/:id/confirm-payment`
  - Verifies customer ownership, stored paymentIntentId, and Stripe metadata before updating status
- [x] COD (cash on delivery) flow — no Stripe, marked UNPAID until delivery
- [x] `paymentStatus` field: `UNPAID | PAID | FAILED | REFUNDED`
- [ ] Refund on cancellation — `POST /payments/refund/:id`
- [ ] Payment captured only after `order.confirmed` event
- [ ] Full refund if restaurant cancels within 5 min

**Security hardening (order-service)**
- [x] Ownership verification — fetches restaurant-service to confirm ownerId before any mutation
- [x] Sensitive field sanitization — `ownerEmail` and `stripeClientSecret` stripped from all responses
- [x] Payment confirmation verifies customer identity + stored paymentIntentId + Stripe metadata match

**Frontend**
- [x] Stripe Elements embedded in checkout page
- [x] Restaurant owner earnings dashboard — revenue, card vs COD split, 14-day bar chart, top sellers (`/dashboard/earnings`)
- [ ] Receipt / invoice view

**Real-time (WebSocket)**
- [x] `OrderGateway` — Socket.IO gateway with HS256 JWT auth (no `jsonwebtoken` dep)
- [x] Restaurant owner notification bell — live new order alerts via `restaurant:{id}` rooms
- [x] CORS locked to `CORS_ORIGIN` env var (no wildcard)
- [x] Token delivery via `getWsToken()` server action (bypasses HttpOnly cookie cross-port issue)
- [ ] `order:{orderId}:status` — order status push → customer
- [ ] `delivery:{orderId}:location` — driver GPS → customer map

**Email**
- [x] New order email to restaurant owner via Brevo on every placed order

---

### Phase 4.5 — Promotions & Coupons ❌
**Promotion Service (PostgreSQL)**
- [ ] Admin creates promo code — `POST /promotions`
- [ ] Validate + return discount — `GET /promotions/:code`
- [ ] Mark code as used (idempotent per user) — `POST /promotions/:code/use`
- [ ] Types: flat discount, percentage, free delivery, restaurant-specific
- [ ] Expiry date + per-code usage limit

**Frontend**
- [ ] Promo code input on checkout
- [ ] Owner creates restaurant-specific codes (`/dashboard/promotions`)

---

### Phase 5 — Delivery & Real-time Tracking ❌
**Delivery Service (`:3007`, MongoDB)**
- [ ] Driver registration and profile
- [ ] Driver online/offline toggle
- [ ] Assign driver to order (event-triggered from order.ready)
- [ ] Driver accepts/rejects job
- [ ] Driver location updates (GPS polling)
- [ ] Delivery status + driver location endpoint

**WebSocket Gateway**
- [ ] `order:{orderId}:status` — order status → customer
- [ ] `delivery:{orderId}:location` — driver GPS → customer map
- [ ] `restaurant:new-order` — new order alert → owner dashboard

**Frontend**
- [ ] Live map on order tracking page (Leaflet / Google Maps)
- [ ] Estimated arrival countdown
- [ ] Driver portal: `/driver/dashboard`, `/driver/delivery/:id`, `/driver/earnings`

---

### Phase 6 — Notifications ❌
**Notification Service (MongoDB)**
- [ ] Subscribe to Redis Pub/Sub events from order/payment/delivery services
- [ ] Send email via Brevo on order lifecycle events
- [ ] Send push notifications via Firebase FCM
- [ ] Store in-app notifications in MongoDB
- [ ] `POST /notifications/send` — internal direct-send endpoint

**Events handled:**
- `order.placed` → email customer "Order received"
- `order.confirmed` → email + push "Restaurant confirmed"
- `order.ready` → push "Driver picking up"
- `order.delivered` → email "Leave a review"
- `order.cancelled` → email + push with refund info
- `payment.failed` → email customer

**Frontend**
- [ ] Notification bell icon with unread count
- [ ] Notification history page

---

### Phase 7 — Reviews & Ratings ❌
**Review Service (MongoDB)**
- [ ] Customer submits review after delivery — `POST /reviews`
- [ ] Public reviews for a restaurant — `GET /reviews/:restaurantId`
- [ ] One review per order enforced
- [ ] Rating aggregation updates `restaurant.rating` + `restaurant.reviewCount`

**Frontend**
- [ ] Review prompt on order completion
- [ ] Star ratings + photos on restaurant page

---

### Phase 8 — Search & Discovery ❌
**Search Service**
- [ ] Full-text search across restaurants and menu items
- [ ] Filters: cuisine, rating, price range, open now
- [ ] Autocomplete endpoint
- [ ] Elasticsearch or MongoDB Atlas Search

**Frontend**
- [ ] Global search bar in header
- [ ] Search results page (`/search?q=...`)

---

### Phase 9 — Admin Panel ❌
**Frontend (`/admin`, role-gated)**
- [ ] Approve / reject restaurant applications
- [ ] User management — ban, role change
- [ ] Platform analytics — orders/day, revenue, active restaurants
- [ ] Promo code management
- [ ] Service health monitor
- [ ] Dispute resolution (refund disputes)

---

### Phase 10 — Production Readiness 🔄
**CI / Testing (complete)**
- [x] GitHub Actions CI — 8 parallel jobs on every push to `dev` and every PR to `main`
  - Order Service: unit tests (jwt.util, order.service, payment.service) + type check
  - Auth Service: unit tests (register/login/verifyEmail/forgotPassword/resetPassword/logout/verifyToken) + type check
  - Menu Service: unit tests (CRUD + cache invalidation) + type check
  - User Service: unit tests (profile upsert + address management) + type check
  - Media Service: unit tests (presigned URL + delete) + type check
  - Restaurant Service: type check
  - API Gateway: type check
  - Frontend: type check
- [x] Branch protection — `main` requires all 8 checks to pass before merge
- [x] `dev` branch workflow — work on dev, PR to main, CI gates the merge

**Remaining**
- [ ] Replace TypeORM `synchronize: true` with proper migration files
- [ ] Replace Redis Pub/Sub with Kafka for reliable event delivery
- [ ] CD pipeline — build Docker image → push to registry → deploy on merge to main
- [ ] Kubernetes manifests or AWS ECS task definitions
- [ ] AWS Secrets Manager instead of `.env` files
- [ ] CDN for media files (CloudFront in front of S3)
- [ ] Distributed tracing (OpenTelemetry + Jaeger)
- [ ] Per-user rate limiting (not just per-IP)
- [ ] Integration tests (real MongoDB + Redis in CI via Docker services)
- [ ] E2E tests (Playwright — login → browse → checkout → pay)

---

### Seed Data ✅
- [x] Seed script — creates owner + customer users, 3 restaurants, menu items (`scripts/seed.ts`)

---

## Infrastructure Reference

| Concern | Dev | Production |
|---|---|---|
| Message bus | Redis Pub/Sub | Kafka |
| File storage | Cloudflare R2 / S3 | AWS S3 + CloudFront |
| Search | MongoDB text index | Elasticsearch |
| Caching | Redis | Redis Cluster |
| DB migrations | TypeORM synchronize | TypeORM migrations |
| Container orchestration | docker-compose | Kubernetes / ECS |
| Secrets | .env files | AWS Secrets Manager |

## Port Reference

| Service | Port |
|---|---|
| Frontend | 3010 |
| API Gateway | 3000 |
| Auth Service | 3001 |
| User Service | 3002 |
| Restaurant Service | 3003 |
| Menu Service | 3004 |
| Order Service | 3005 |
| Payment Service | 3006 |
| Delivery Service | 3007 |
| Media Service | 3011 |
| PostgreSQL | 5432 |
| MongoDB | 27018 |
| Redis | 6379 |
| Redis Commander (UI) | 8081 |
| Mongo Express (UI) | 8082 |

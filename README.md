# ITAM System — Backend

Inventory & Asset Management system backend built with [NestJS](https://nestjs.com/), [Prisma](https://www.prisma.io/), and [MongoDB](https://www.mongodb.com/).

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript
- **Framework**: NestJS 11
- **Database**: MongoDB 7.0 (replica set required for transactions) via Prisma ORM
- **Auth**: Passport.js (JWT access + refresh token rotation with bcryptjs)
- **API**: RESTful with Swagger/OpenAPI docs
- **Security**: Helmet, CORS, rate limiting (30 req/60s global via `@nestjs/throttler`)

## Prerequisites

- Node.js >= 20
- Docker (for MongoDB replica set)
- npm

## Setup

### 1. Environment

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `mongodb://localhost:27017/itam_db` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | — | Access token signing key (required) |
| `JWT_REFRESH_SECRET` | — | Refresh token signing key (required) |
| `CORS_ORIGIN` | — | Allowed origin (e.g. `http://localhost:3001`) |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |

### 2. Start MongoDB (replica set)

```bash
docker run -d --name itam-mongo -p 27017:27017 mongo:7.0 --replSet rs0 --bind_ip_all
# Then initiate the replica set:
docker exec -it itam-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Or use the Docker Compose setup in `../start-app/docker-compose.dev.yml`.

### 3. Install & run

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed          # Seeds roles, permissions, users, categories, settings
npm run start:dev     # Development with hot-reload
```

The server starts at `http://localhost:3000`.

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Watch mode |
| `npm run build` | Production build |
| `npm run start:prod` | Run production build |
| `npm run seed` | Seed database |
| `npm run lint` | ESLint |
| `npm test` | Jest unit tests |

## API Documentation

Swagger UI: `http://localhost:3000/api` (available in dev mode).

## Architecture

### Module structure

```
src/
├── auth/           — Authentication (login, register, refresh, password mgmt)
├── users/          — User CRUD
├── roles/          — Role CRUD + permission assignment
├── permissions/    — Permission CRUD
├── categories/     — Asset category CRUD
├── assets/         — Asset CRUD
├── assignments/    — Asset assignment / return / transfer
├── activity-logs/  — Audit trail (logged via AuthService & interceptor)
├── dashboard/      — Aggregated metrics
├── reports/        — Reports (stub — V1)
├── settings/       — Application settings (key-value store, bulk upsert, export/import)
├── common/         — Shared: guards, decorators, interceptors, filters, config
└── app.module.ts   — Root module
```

### Key patterns

- **Soft deletes**: All entities use `deletedAt: DateTime?` — queries filter `deletedAt: null` by default
- **Response wrapping**: All responses are wrapped in `{ success, data, timestamp }` by `ResponseTransformInterceptor`
- **Pagination**: Paginated endpoints return `{ data: T[], meta: { page, limit, total, totalPages } }`
- **Validation**: `forbidNonWhitelisted: true` on all endpoints — unknown query params return 400
- **Permissions**: Fine-grained CRUD permissions checked via `@Permissions()` decorator + `PermissionsGuard`
- **Rate limiting**: 30 requests per 60 seconds globally

### Auth flow

1. `POST /auth/login` → returns `{ accessToken, refreshToken, user }`
2. Access token is sent as `Authorization: Bearer <token>`
3. When access token expires, `POST /auth/refresh` with `{ refreshToken }` returns a new token pair
4. `POST /auth/logout` revokes the refresh token

## Environment Variables (Required)

| Variable | Required | Notes |
|---|---|---|
| `JWT_ACCESS_SECRET` | Yes | Should be a long random string |
| `JWT_REFRESH_SECRET` | Yes | Should be a long random string (different from access secret) |
| `CORS_ORIGIN` | Yes | Frontend URL; **no fallback to `*`** |
| `DATABASE_URL` | Yes | Must point to a MongoDB replica set |

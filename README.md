# 🐾 Nanny — Pet Care Platform

A full-stack web app that connects pet owners with verified pet sitters in Almaty, Kazakhstan. Owners find sitters, book, chat in real time, track pet updates, and shop; sitters manage services and bookings; admins moderate the platform.

**Stack:** Next.js 14 · React 18 · TailwindCSS (frontend) · Node.js · Express · PostgreSQL · Socket.io (backend) · JWT + bcrypt (auth) · Docker

## Table of Contents

- [Features](#features)
- [User Roles](#user-roles)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Accounts](#demo-accounts)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Testing](#testing)
- [Documentation](#documentation)
- [Team Workflow (Git)](#team-workflow-git)
- [Security](#security)

## Features

- **Auth** — registration, login, password reset by email, JWT sessions
- **Pets** — profiles with photo uploads
- **Sitter search** — filters, sitter profiles, reviews and ratings, map view
- **Bookings** — create, confirm, cancel, complete; calendar of bookings; time notifications
- **Real-time chat** — Socket.io, JWT-authenticated
- **Pet updates** — sitters post updates (with photos) during a booking
- **Shop** — products, cart, orders, demo payment provider, email confirmations
- **Trust & safety** — sitter verification, safety center, support requests, fraud checks
- **Notifications and alerts** — in-app, email (SMTP), optional SMS (Twilio)
- **AI assistant and recommendations** — optional, via OpenAI
- **Admin panel** — stats, users, sitter verification, review moderation, bookings
- **Security** — Helmet, rate limiting, Zod validation

## User Roles

| Role | Permissions |
| --- | --- |
| **Guest** | Browse the landing page, sitter list, and sitter profiles |
| **Owner** | Register pets, search and book sitters, chat, review, shop |
| **Sitter** | Manage own profile, services and prices, bookings, pet updates |
| **Admin** | Verify sitters, block users, moderate reviews, manage the shop |

## Project Structure

```
nanny/
├── backend/
│   ├── db/
│   │   ├── schema.sql          # PostgreSQL schema
│   │   ├── seed.sql            # Sample data
│   │   └── migrations/         # Incremental SQL changes (date-prefixed)
│   ├── src/
│   │   ├── config/             # DB connection pool
│   │   ├── controllers/        # Request handlers (auth, pets, sitters, bookings, ...)
│   │   ├── routes/             # Express routers
│   │   ├── middleware/         # auth, validation, rate limit, error handler
│   │   ├── services/           # email, payment, notifications, OpenAI, alerts
│   │   ├── sockets/chat.js     # Socket.io chat
│   │   ├── validation/         # Zod schemas
│   │   ├── utils/              # jwt, fraud checks
│   │   └── server.js           # Entry point
│   ├── scripts/                # seed-activity.js
│   ├── uploads/                # User-uploaded files (not for commit)
│   ├── .env.example · .env.docker.example
│   └── Dockerfile
├── frontend/
│   ├── pages/                  # Next.js pages (landing, auth, dashboard, pets, sitters,
│   │                           #   bookings, chat, calendar, map, shop, safety, support, admin)
│   ├── components/             # Shared UI
│   ├── lib/                    # API client, session helpers
│   ├── styles/                 # Tailwind + theme
│   ├── __tests__/              # Jest + Testing Library
│   ├── e2e/                    # Playwright
│   ├── .env.local.example
│   └── Dockerfile
├── docs/diagrams/              # ER and class diagrams (PNG + PlantUML)
├── docker-compose.yml          # db + backend + frontend + pgAdmin
├── SECURITY.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (recommended) **or** a local PostgreSQL 13+
- Git

### Option A — Everything in Docker (recommended)

```bash
git clone https://github.com/armanqyzy/nanny.git
cd nanny
cp backend/.env.docker.example backend/.env
docker compose up --build
```

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:4000> |
| PostgreSQL | `localhost:55432` |
| pgAdmin | <http://localhost:5050> |

The database is initialized automatically from `backend/db/schema.sql` and `seed.sql` on first start. If ports `3000` or `4000` are busy, stop your local `npm run dev` processes first.

Useful commands:

```bash
docker compose down             # stop
docker compose down -v          # stop and wipe the database
docker compose logs -f backend  # follow backend logs
```

### Option B — Run locally

1. **Database.** Start only PostgreSQL in Docker:

   ```bash
   cd backend
   npm run db:docker:up
   ```

   Or use your own PostgreSQL and run `npm run db:init` (needs `DATABASE_URL` and `psql`).

2. **Backend:**

   ```bash
   cd backend
   cp .env.docker.example .env    # or .env.example for a local Postgres on :5432
   npm install
   npm run dev                    # http://localhost:4000
   ```

3. **Frontend:**

   ```bash
   cd frontend
   cp .env.local.example .env.local
   npm install
   npm run dev                    # http://localhost:3000
   ```

## Demo Accounts

After the database is seeded (`backend/db/seed.sql`), you can log in with these **development-only** accounts. All of them use the password `password123`:

| Role | Email |
| --- | --- |
| Admin | `admin@nanny.kz` |
| Owner | `anara@nanny.kz`, `zarina@nanny.kz` |
| Sitter | `anna@nanny.kz`, `timur@nanny.kz` |

> These are sample credentials for local development only. Never seed them into a public or production database; change or delete them before deploying.

## Environment Variables

Backend (`backend/.env`):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret — use a long random string |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `PORT` | API port (default `4000`) |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `FRONTEND_URL` | Used in email links (password reset, etc.) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional email delivery |
| `PAYMENT_PROVIDER` | Payment provider (`demo` by default) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Optional SMS |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional AI features |

Frontend (`frontend/.env.local`): see `.env.local.example`.

> **Never commit `.env` files, API keys, or SMTP/Twilio credentials.** Only the `*.example` files belong in git.

## Database

Core tables: `users`, `pets`, `sitters`, `sitter_services`, `bookings`, `messages`, `reviews`, `products`, `orders`, `order_items`, plus tables for notifications, pet updates, favorites, support, and trust features added through migrations.

- Full schema: `backend/db/schema.sql`
- Sample data: `backend/db/seed.sql`
- Incremental changes: `backend/db/migrations/` — add a new date-prefixed file (`YYYY-MM-DD-description.sql`) for every schema change and never edit one that is already merged.
- Diagrams: `docs/diagrams/`

## Testing

```bash
cd frontend
npm test              # Jest unit tests
npm run test:e2e      # Playwright end-to-end tests
```

## Documentation

- ER diagram: `docs/diagrams/Nanny_ER_Diagram.png`
- Class diagram: `docs/diagrams/Nanny_Class_Diagram.png`
- Security policy: [SECURITY.md](SECURITY.md)

## Team Workflow (Git)

1. Get the latest code:

   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a branch for each task — don't commit directly to `main`:

   ```bash
   git checkout -b feature/short-description
   ```

   Prefixes: `feature/`, `fix/`, `docs/`, `test/`.

3. Commit small, clear changes:

   ```bash
   git add <files>
   git commit -m "Add sitter availability filter"
   ```

4. Sync with `main` and run the tests before pushing:

   ```bash
   git pull origin main
   cd frontend && npm test
   ```

5. Push and open a Pull Request into `main`:

   ```bash
   git push -u origin feature/short-description
   ```

6. A teammate reviews the PR, then it is merged.

Don't commit `.env` files, `node_modules/`, `.next/`, `backend/uploads/`, or `.DS_Store`. Resolve merge conflicts locally before pushing.

## Security

Found a vulnerability? Follow [SECURITY.md](SECURITY.md) and don't open a public issue.

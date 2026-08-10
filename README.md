# Helpdesk

AI-Powered Ticket Management System for handling customer support emails. Tickets have statuses (`open`, `resolved`, `closed`) and categories (`general question`, `technical question`, `refund request`). Two user roles: Admin and Agent.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, TanStack Router/Query/Table, Tailwind CSS v4, shadcn/ui |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 |
| Database | PostgreSQL 17 |
| Cache/Queue | Redis 7 + ARQ |
| Email | Resend (inbound webhook + outbound API) |
| AI | OpenAI-compatible API (DeepSeek, GPT-4o, Claude) |
| Monitoring | Sentry (frontend + backend) |

## Prerequisites

- [Python 3.12+](https://www.python.org/downloads/)
- [Bun](https://bun.sh/) (JavaScript runtime & package manager)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL + Redis)

## Quick Start

### 1. Clone & configure

```bash
git clone <repo-url>
cd helpdesk
cp .env.example .env
```

Edit `.env` and set the required variables. Generate a secure `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2. Start infrastructure

```bash
docker compose up -d db redis
```

### 3. Backend

```bash
cd backend
pip install -e .
alembic upgrade head
fastapi dev app/main.py          # http://localhost:8000
```

> **Windows note:** Set `$env:PYTHONIOENCODING='utf-8'` before running FastAPI to avoid an emoji encoding crash in the CLI output.

### 4. Frontend

```bash
cd frontend
bun install
bun run dev                      # http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend on port 8000.

### 5. Seed the admin account

```bash
$env:ADMIN_EMAIL='admin@helpdesk.com'
$env:ADMIN_PASSWORD='your-secure-password'
python seed.py
```

Log in at `http://localhost:5173` with the credentials above.

## Docker (Full Stack)

```bash
docker compose up -d             # backend + frontend + db + redis + worker
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:8000`.

## Environment Variables

See `.env.example` for the complete reference. Required variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `REDIS_URL` | Redis connection string (`redis://...`) |
| `SECRET_KEY` | Session token signing key (64+ chars, generate with `secrets.token_urlsafe(64)`) |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `http://localhost:5173`) |

Optional variables enable email (Resend), AI features (OpenAI/DeepSeek/Claude), Sentry monitoring, and webhook validation. All optional variables have safe defaults — the app runs without them but email sending and AI features will be disabled.

## Project Structure

```
helpdesk/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan, static file serving
│   │   ├── core/                # config, database, security, dependencies, CSRF, rate limiter
│   │   ├── models/              # SQLAlchemy models (User, Session, Ticket, etc.)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers (auth, users, tickets, webhooks, dashboard)
│   │   ├── services/            # Business logic (email, AI classification, auto-resolve, cleanup)
│   │   └── worker.py            # ARQ background worker settings
│   ├── tests/                   # Pytest backend tests (conftest, setup_db, test_*.py)
│   ├── alembic/                 # Database migrations
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root: QueryClient + AuthProvider + Router
│   │   ├── main.tsx             # React entrypoint + Sentry init
│   │   ├── router.tsx           # TanStack Router flat route tree
│   │   ├── api/client.ts        # Axios instance (baseURL /api, withCredentials)
│   │   ├── components/          # Shared UI (Navbar, TicketDetail, etc.) + shadcn/ui primitives
│   │   ├── contexts/            # AuthContext, ThemeContext
│   │   ├── lib/                 # Utilities (cn, roles enum)
│   │   └── routes/              # Page components + __tests__/
│   ├── e2e/                     # Playwright E2E tests (full-stack integration only)
│   └── package.json
├── docker-compose.yml
├── Dockerfile                   # Multi-stage: builds frontend + backend for production
├── railway.toml                 # Railway deployment config
├── start.sh                     # Production entrypoint (migrations + server)
├── seed.py                      # Creates admin + AI agent users
├── .env.example                 # Environment variable reference
└── AGENTS.md                    # Project conventions for AI coding agents
```

## Commands

### Backend

```bash
cd backend

# Development server
fastapi dev app/main.py

# Production server
fastapi run app/main.py

# Run migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Run backend tests
pytest

# Run specific test file
pytest tests/test_webhooks.py -v
```

### Frontend

```bash
cd frontend

# Development server
bun run dev

# Production build
bun run build

# TypeScript typecheck
bunx --bun tsc -b --noEmit

# Lint
bun run lint

# Component tests (Vitest + React Testing Library)
bun run test

# Component tests in watch mode
bun run test:watch

# E2E tests (Playwright — requires running backend + DB)
bun run test:e2e
```

## Database Migrations

When you create or modify a SQLAlchemy model, generate and apply a migration:

```bash
cd backend
alembic revision --autogenerate -m "add tickets table"
alembic upgrade head

# Also apply to the test database
$env:DATABASE_URL='postgresql+asyncpg://helpdesk:helpdesk@localhost:5432/helpdesk_test'
alembic upgrade head
```

## Testing

Three test layers cover the application:

| Layer | Tool | Location | When to use |
|-------|------|----------|-------------|
| **Component** | Vitest + React Testing Library | `frontend/src/**/__tests__/` | Default for all UI behavior: rendering, loading, error, empty states, auth gating |
| **Backend** | Pytest + httpx | `backend/tests/` | API endpoint logic, business rules, auth checks |
| **E2E** | Playwright | `frontend/e2e/` | Full-stack flows that need a real DB + API + browser (use sparingly) |

E2E tests require the test database to be provisioned first:

```bash
cd frontend
bun run test:e2e:setup
bun run test:e2e
```

## Deployment

### Railway

1. Push the repo to GitHub and connect it in Railway
2. Add **PostgreSQL** and **Redis** plugins (Railway auto-injects `DATABASE_URL` and `REDIS_URL`)
3. Set required environment variables on the service:
   - `SECRET_KEY`
   - `CORS_ORIGINS` (your Railway domain, e.g. `https://your-app.up.railway.app`)
   - `ENVIRONMENT=production`
4. Optionally add a second **worker** service (same repo) with start command:
   ```
   arq app.worker.WorkerSettings
   ```

The root `Dockerfile` builds the frontend and backend into a single image. `start.sh` runs migrations before starting the server, and the backend serves the built frontend assets in production.

## API Overview

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/auth/login` | — | Login with email + password |
| `POST /api/auth/logout` | Session | Logout current session |
| `GET /api/auth/me` | Session | Get current user |
| `GET /api/users` | Admin | List all users |
| `POST /api/users` | Admin | Create a new agent |
| `GET /api/tickets` | Session | List tickets (filterable) |
| `POST /api/tickets` | Public (webhook) | Create ticket from inbound email |
| `PATCH /api/tickets/:id` | Session | Update ticket status/category |
| `POST /api/tickets/:id/reply` | Session | Add reply to ticket |
| `GET /api/dashboard/stats` | Session | Dashboard summary stats |
| `POST /api/webhooks/resend` | Resend sig | Receive inbound emails |
| `GET /api/health` | — | Health check |

## Key Conventions

- **Auth**: Database-backed sessions via `session` cookie (httponly, samesite=lax). CSRF protection via double-submit cookie pattern.
- **Roles**: Use the `UserRole` enum (`src/lib/roles.ts` in frontend, `models/enums.py` in backend) — never bare string literals.
- **API client**: All frontend API calls go through the Axios instance at `src/api/client.ts` (`baseURL /api`, `withCredentials`).
- **Forms**: react-hook-form + zod resolver for validation.
- **UI components**: shadcn/ui primitives (built on `@base-ui/react`) in `src/components/ui/`. Import from `@/components/ui/...`.
- **Path alias**: `@` maps to `./src` in frontend.
- **No default exports** in new code — use named exports.

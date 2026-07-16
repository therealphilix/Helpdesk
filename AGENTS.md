# AGENTS.md — Project Memory

## Project

AI-Powered Ticket Management System for handling student support emails. Tickets have statuses (`open`, `resolved`, `closed`) and categories (`general question`, `technical question`, `refund request`). Two user roles: Admin and Agent.

Full scope: `project-scope.md` | Tech stack: `tech-stack.md` | Plan: `implementation-plan.md`

## Environment

- **OS**: Windows (PowerShell 5.1)
- **Package manager**: Bun (frontend), pip (backend)
- **Python**: 3.12+
- **Node**: via Bun runtime

## Tech Stack & Context7 Library IDs

**When adding ANY new library, package, or framework to the project, you MUST first fetch its up-to-date documentation from Context7** using `context7_resolve-library-id` + `context7_query-docs`. Always review current API patterns, best practices, and breaking changes before writing code. Do not rely on training data or assumptions about library APIs.

When writing code, fetch up-to-date documentation from Context7 using these library IDs:

| Library | Context7 ID |
|---------|-------------|
| FastAPI | `/fastapi/fastapi` |
| Vite | `/vitejs/vite` |
| Bun | `/oven-sh/bun` |
| SQLAlchemy | `/websites/docs_sqlalchemy_org` |
| Alembic | `/websites/alembic_sqlalchemy_org` |
| TanStack Router | `/websites/tanstack_com_router` |
| TanStack Query | `/websites/tanstack_com_query` |
| TanStack Table | `/websites/tanstack_com_table` |
| Tailwind CSS | `/websites/tailwindcss_com` |
| Celery | `/celery/celery` |
| Pydantic | `/websites/docs_pydantic_dev` |
| Resend | `/websites/resend_com` |
| Playwright | `/microsoft/playwright` |
| Vitest | `/vitest-dev/vitest` |
| React Testing Library | `/testing-library/react-testing-library` |
| Testing Library DOM | `/testing-library/testing-library-docs` |
| Testing Library Jest DOM | `/testing-library/jest-dom` |
| Testing Library User Event | `/testing-library/user-event` |

## Project Structure

```
helpdesk/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint, CORS, lifespan
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings (DATABASE_URL, SECRET_KEY, etc.)
│   │   │   ├── database.py      # async engine, sessionmaker, Base, get_db
│   │   │   ├── dependencies.py  # get_current_user, get_current_admin
│   │   │   └── security.py      # hash_password, verify_password, session tokens
│   │   ├── models/
│   │   │   ├── enums.py         # UserRole (ADMIN, AGENT)
│   │   │   ├── user.py          # User model (id, email, password_hash, name, role, is_active)
│   │   │   └── session.py       # Session model (token, user_id, expires_at)
│   │   ├── schemas/
│   │   │   └── user.py          # UserOut, UserCreate, LoginRequest
│   │   ├── routers/
│   │   │   └── auth.py          # POST /login, POST /logout, GET /me
│   │   └── services/            # Business logic (currently empty)
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py            # Pytest fixtures: test engine, AsyncClient, seed helpers
│   │   └── setup_db.py            # Provision test DB: create tables, seed admin + agent users
│   ├── alembic/                 # DB migrations (users + sessions tables)
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # QueryClient + AuthProvider + AuthGate + RouterProvider
│   │   ├── main.tsx             # React entrypoint
│   │   ├── index.css            # Tailwind v4 CSS with shadcn theme tokens
│   │   ├── router.tsx           # TanStack Router: createRootRoute + createRoute flat tree
│   │   ├── api/
│   │   │   └── client.ts        # Axios instance (baseURL /api, withCredentials)
│   │   ├── assets/              # Static images/icons
│   │   ├── components/
│   │   │   ├── Navbar.tsx       # Top nav: brand, admin Users link, user email, Sign Out button
│   │   │   └── ui/              # shadcn/ui components (built on @base-ui/react primitives)
│   │   │       ├── button.tsx   # Variants: default, outline, secondary, ghost, destructive, link
│   │   │       ├── input.tsx    # Wraps @base-ui/react input
│   │   │       ├── card.tsx     # Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
│   │   │       ├── label.tsx    # Form label (native <label> with Tailwind)
│   │   │       └── alert.tsx    # Alert, AlertTitle, AlertDescription (variants: default, destructive)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # AuthProvider, useAuth hook (user, loading, login, logout)
│   │   ├── lib/
│   │   │   └── utils.ts         # cn() utility (clsx + tailwind-merge)
│   │   └── routes/
│   │       ├── HomePage.tsx     # Authenticated dashboard with welcome Card
│   │       ├── LoginPage.tsx    # Login form with react-hook-form + zod, shadcn Card/Input/Label/Alert/Button
│   │       └── UsersPage.tsx    # Admin-only page: checks user.role, redirects non-admin to /
│   │       └── __tests__/
│   │           └── UsersPage.test.tsx  # Component tests (Vitest + RTL)
│   ├── vite.config.ts           # React + Tailwind v4 plugin, @ path alias, /api proxy → :8000
│   ├── vitest.config.ts         # Vitest config: jsdom, react plugin, @ alias, e2e exclusion
│   ├── package.json
│   ├── tsconfig.json            # Path alias @/* = ./src/*
│   ├── playwright.config.ts     # Playwright E2E config: chromium, webServer, auth setup
│   ├── e2e/
│   │   ├── auth.setup.ts        # Playwright auth setup: logs in as admin, saves storageState
│   │   ├── global-setup.ts      # Runs test DB provisioning before test suite
│   │   └── global-teardown.ts   # Teardown placeholder
│   └── Dockerfile
├── docker-compose.yml           # PostgreSQL 17, Redis 7, backend, frontend
├── .env                         # Secrets (gitignored): DATABASE_URL, SECRET_KEY, API keys
├── .env.test                    # Test environment (committed): separate helpdesk_test DB
├── seed.py                      # Create admin user from ADMIN_EMAIL/ADMIN_PASSWORD env vars
└── README.md
```

## Commands

### Backend (port 8000)

```powershell
cd backend
pip install -e .
$env:PYTHONIOENCODING='utf-8'   # required on Windows (emoji bug)
fastapi dev app/main.py
```

### Frontend (port 5173, proxies /api → :8000)

```powershell
cd frontend
bun install
bun run dev
```

### Seed Database

```powershell
$env:PYTHONIOENCODING='utf-8'
$env:ADMIN_EMAIL='admin@helpdesk.com'
$env:ADMIN_PASSWORD='yourpassword'
python seed.py
```

### Docker

```powershell
docker compose up -d db redis     # infra only
docker compose up -d              # full stack
```

### Typecheck / Lint

```powershell
cd frontend && bunx --bun tsc -b --noEmit
cd frontend && bun run lint       # oxlint
```

### Component Tests (Vitest + React Testing Library)

```powershell
cd frontend && bun run test        # single run
cd frontend && bun run test:watch  # watch mode
```

Tests live in `src/routes/__tests__/` and follow the query priority: `getByRole` > `getByLabelText` > `getByText` > `querySelector([data-slot=...])` (for elements without ARIA roles).

### E2E Tests

Use the **e2e-tester** subagent (`.kilo/agent/e2e-tester.md`) to write Playwright tests. It knows the app's page structure, selectors, test credentials, and Playwright patterns. Invoke it via the Task tool:

```
Task(subagent_type="general", prompt="Write Playwright E2E tests for <feature> using the e2e-tester agent conventions")
```

Tests live in `frontend/e2e/`. The agent handles auth state, storageState overrides, form interactions, and typecheck verification automatically.

## Conventions

- **Python**: async SQLAlchemy 2.0 (Mapped, mapped_column), type hints everywhere, FastAPI dependency injection for DB sessions and auth, bcrypt for password hashing
- **TypeScript**: strict mode, no default exports in new code (use named exports), React 19 + TypeScript 6
- **Auth**: database-backed sessions via cookies (httponly, samesite=lax), cookie name `session`, `/auth/me` restores session on mount
- **API**: RESTful, all routes prefixed with `/api/`, auth routes at `/api/auth/*`
- **CORS**: origins from `CORS_ORIGINS` config, credentials enabled
- **Environment**: secrets in `.env`, never committed
- **UI Components**: shadcn/ui components MUST be used instead of raw Tailwind divs. Components live in `frontend/src/components/ui/` and are built on `@base-ui/react` primitives (not Radix). Use `@/components/ui/...` imports. Never recreate a component with `<div>` + Tailwind if a shadcn equivalent exists.
- **Routing**: TanStack Router with flat tree defined in `router.tsx` — `createRootRoute()` + `createRoute({ getParentRoute, path, component })`. Route components in `src/routes/`.
- **Forms**: react-hook-form with zod resolver, validation schemas defined with `z.object()`
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"`, no config file), theme tokens defined as CSS custom properties in `index.css`, `@tailwindcss/vite` plugin, `@` path alias → `./src`
- **Data fetching**: Axios client at `src/api/client.ts`, TanStack Query via `QueryClientProvider` in App.tsx
- **Testing**: backend pytest tests and frontend Playwright E2E tests MUST be written for every new feature. Use the e2e-tester subagent for Playwright tests. Component tests use Vitest + React Testing Library with the query priority: `getByRole` > `getByLabelText` > `getByText` > test IDs as last resort. Tests live in `backend/tests/`, `frontend/e2e/`, and `frontend/src/**/__tests__/` respectively.

## Current Implementation State

### Phase 1 (scaffolding) — **Complete**
- Backend: FastAPI project structure, Dockerfile, Docker Compose (PostgreSQL 17, Redis 7)
- Frontend: Vite + React + TypeScript + Tailwind v4 + shadcn/ui

### Phase 2 (core backend) — **Complete**
- [x] Auth system: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- [x] Seed script: admin user creation from env vars
- [ ] User management endpoints (admin only)
- [ ] Ticket CRUD endpoints
- [ ] Knowledge base CRUD

### Frontend Foundation — **Partially Implemented**
- [x] Login page with form validation
- [x] Auth context + protected routes (redirect to /login if unauthenticated)
- [x] TanStack Query client + Axios API client
- [x] shadcn components: Button, Input, Card, Label, Alert
- [x] User management endpoints: GET /api/users (admin only)
- [x] Users page at /users with table, skeletons, badges (admin-only, frontend + backend role check)
- [x] Playwright E2E + pytest backend test infrastructure with separate test DB
- [ ] Layout shell (full sidebar + content area)
- [ ] Ticket pages, admin panel, knowledge base

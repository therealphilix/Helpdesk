# AGENTS.md — Project Memory

## Project

AI-Powered Ticket Management System for handling student support emails. Tickets have statuses (`open`, `resolved`, `closed`) and categories (`general question`, `technical question`, `refund request`). Two user roles: Admin and Agent.

Full scope: `project-scope.md` | Tech stack: `tech-stack.md` | Plan: `implementation-plan.md`

## Environment

- **OS**: Windows (PowerShell 5.1)
- **Package manager**: Bun (frontend), pip (backend)
- **Python**: 3.12+

## Tech Stack & Context7 Library IDs

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

## Project Structure

```
helpdesk/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint
│   │   ├── core/              # config, database, security, deps
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routers/           # API route handlers
│   │   └── services/          # Business logic
│   ├── alembic/               # DB migrations
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css          # Tailwind import
│   ├── vite.config.ts         # Tailwind plugin + /api → localhost:8000 proxy
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml         # PostgreSQL 17, Redis 7, backend, frontend
├── .env                       # SECRET_KEY, API keys
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

### Docker

```powershell
docker compose up -d db redis     # infra only
docker compose up -d              # full stack
```

### Typecheck / Lint

```powershell
cd frontend && bunx --bun tsc -b --noEmit
cd frontend && bun run lint       # oxlint
cd backend && python -m pytest    # (when tests exist)
```

## Conventions

- **Python**: async SQLAlchemy, type hints everywhere, FastAPI dependency injection for DB sessions and auth
- **TypeScript**: strict mode, no default exports in new code (use named exports)
- **Auth**: database-backed sessions via cookies (httponly, samesite=lax)
- **API**: RESTful, all routes prefixed with `/api/`
- **CORS**: origins from `CORS_ORIGINS` config, credentials enabled
- **Environment**: secrets in `.env`, never committed

## Current Phase

Phase 1 (scaffolding) — **complete**. Working on Phase 2 (core backend).

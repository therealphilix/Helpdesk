# Implementation Plan

## Phase 1 — Project Scaffolding & Foundation

- [ ] Initialize backend project: FastAPI app structure, config, logging, Dockerfile
- [ ] Initialize frontend project: Vite + React + TypeScript
- [ ] Docker Compose: PostgreSQL 


## Phase 2 — Core Backend

- [ ] Auth system: registration, login, logout, session middleware
- [ ] Seed script: create initial admin user on first deploy
- [ ] User management endpoints (admin only): list agents, create agent, deactivate agent
- [ ] Ticket CRUD endpoints: list, create, read, update status/category
- [ ] Ticket filtering & sorting: by status, category, date
- [ ] Knowledge base CRUD: create, read, update, delete articles (admin/agent)

## Phase 3 — Email Integration

- [ ] Resend inbound webhook: receive email → parse headers/body/attachments → create ticket
- [ ] Resend outbound: send reply from agent or AI
- [ ] Email threading: track replies to the same ticket by sender address or subject

## Phase 4 — Frontend Foundation

- [ ] Login / logout pages
- [ ] Auth context + protected routes (TanStack Router auth guards)
- [ ] Layout shell: sidebar nav, header, main content area
- [ ] TanStack Query client setup + API client layer

## Phase 5 — Core Frontend

- [ ] Ticket list page: TanStack Table with sorting, filtering by status/category, search
- [ ] Ticket detail page: full thread, metadata (status, category, assignee), reply form
- [ ] Agent dashboard: summary stats (open/resolved/closed counts), recent tickets
- [ ] Admin panel: user management page (create/deactivate agents)
- [ ] Knowledge base page: article list, article editor (admin/agent)

## Phase 6 — AI Integration

- [ ] AI classification pipeline: classify ticket category on creation (Celery task)
- [ ] AI summary pipeline: generate ticket summary for dashboard/lists (Celery task)
- [ ] AI-suggested reply: query relevant KB articles → generate draft reply → present to agent for approval
- [ ] Agent workflow: review AI suggestion → edit/approve → send
- [ ] KB article embedding & semantic search (optional enhancement)

## Phase 7 — Polish & Deploy

- [ ] Error handling & validation across frontend + backend
- [ ] Loading & empty states for all pages
- [ ] Responsive design pass
- [ ] Rate limiting on auth + API endpoints
- [ ] Production Docker Compose config (Nginx reverse proxy, env vars, secrets)
- [ ] README with setup instructions

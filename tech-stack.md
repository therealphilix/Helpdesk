# Tech Stack

## Frontend

- **Framework**: React + TypeScript
- **Build**: Vite
- **Routing**: TanStack Router
- **Data fetching**: TanStack Query
- **State management**: TanStack Store / React context
- **Tables**: TanStack Table
- **UI**: Tailwind CSS + shadcn/ui

## Backend

- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy (async)
- **Migrations**: Alembic
- **Database**: PostgreSQL
- **Auth**: database-backed sessions (fastapi-sessions or custom middleware)
- **Background tasks**: Celery + Redis

## Email

- **Provider**: Resend
- **Inbound**: Resend inbound webhook (parse incoming email → create ticket)
- **Outbound**: Resend API (send AI-generated replies, agent replies)

## AI / LLM

- **Provider**: OpenAI (GPT-4o) or Anthropic (Claude)
- **Capabilities**:
  - Ticket classification (category assignment)
  - Response generation from knowledge base
  - Ticket summarization

## DevOps

- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions (optional)

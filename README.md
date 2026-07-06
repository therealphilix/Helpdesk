# Helpdesk

## Getting Started

```bash
# Start PostgreSQL + Redis
docker compose up -d db redis

# Backend
cd backend
pip install -e .
fastapi dev app/main.py

# Frontend
cd frontend
bun install
bun run dev
```

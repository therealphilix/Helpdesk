FROM oven/bun:1-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/bun.lockb ./
RUN bun install --frozen-lockfile
COPY frontend/ .
RUN bun run build

FROM python:3.12-slim
WORKDIR /app

COPY backend/pyproject.toml .
RUN pip install --no-cache-dir .
COPY backend/ .

COPY --from=frontend-builder /app/dist ./frontend-dist

COPY start.sh .
RUN chmod +x start.sh

EXPOSE 8000
CMD ["./start.sh"]

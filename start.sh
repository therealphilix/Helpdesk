#!/bin/bash
set -e

cd /app

echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."
exec fastapi run app/main.py --host 0.0.0.0 --port "${PORT:-8000}"

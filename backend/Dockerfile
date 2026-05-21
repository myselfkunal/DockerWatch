FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[prod]"

COPY alembic.ini .
COPY src/app/db/migrations ./migrations

COPY src ./src

ENV PYTHONPATH=/app/src

CMD alembic upgrade head && \
    uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --no-access-log
FROM python:3.11-slim

WORKDIR /app


# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*


# Install Python deps
COPY pyproject.toml .
RUN pip install --no-cache-dir -e ".[prod]"


# Copy alembic files
COPY alembic.ini .
COPY migrations ./migrations


# Copy source
COPY src ./src


# Run migrations then start server
CMD alembic upgrade head && \
    uvicorn src.app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --no-access-log
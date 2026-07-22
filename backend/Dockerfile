FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir "fastapi>=0.115" "uvicorn[standard]>=0.32" "sqlalchemy[asyncio]>=2.0" "asyncpg>=0.30" "alembic>=1.14" "pydantic>=2.0" "pydantic-settings>=2.0" "redis[hiredis]>=5.0" "python-jose[cryptography]>=3.3" "bcrypt>=4.0" "httpx>=0.28" "cryptography>=44.0" "slowapi>=0.1"

RUN adduser --disabled-password --gecos '' appuser

COPY . .
RUN chown -R appuser:appuser /app

USER appuser

ENV PYTHONPATH=/app

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["bash", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

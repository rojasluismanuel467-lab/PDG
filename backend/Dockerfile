# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# System dependencies required to compile psycopg and other C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy only the project metadata first to leverage layer caching
COPY pyproject.toml ./

# Install project dependencies into an isolated prefix
RUN pip install --upgrade pip \
 && pip install --prefix=/install . --no-cache-dir

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Runtime system libraries needed by psycopg (binary) and reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from the builder stage
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy application source, alembic migrations, and config
COPY app/       ./app/
COPY alembic/   ./alembic/
COPY alembic.ini ./alembic.ini

# Create the uploads directory used by the media static-file mount
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

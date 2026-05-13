# AGENTS.md

## Dev Commands

```bash
# Setup
python -m venv .venv && .venv\Scripts\activate
pip install -e ".[dev]"

# Run
uvicorn app.main:app --reload

# Lint
ruff check .

# Test
pytest
```

## Important Quirks

- **Database**: Local PostgreSQL runs on port **5434** (not 5432)
- **Password hashing**: Uses `bcrypt` directly, not passlib (passlib has a bug with bcrypt)
- **Email validation**: Avoid `EmailStr` in schemas - use plain `str` for development/testing
- **ENUMs in migrations**: PostgreSQL fails if ENUM type already exists. Use `CREATE TYPE IF NOT EXISTS` or set `create_type=False` in Column
- **Soft deletes**: Use `deactivated_at = now()` instead of `db.delete()`
- **Alembic**: Run `alembic revision --autogenerate -m "description"` then edit migration before `alembic upgrade head`

## Architecture

- `app/api/v1/endpoints/` - HTTP controllers
- `app/services/` - Business logic, transforms SQLAlchemy models to Pydantic schemas
- `app/repositories/` - Data access, returns SQLAlchemy models only
- `app/schemas/` - Pydantic models (Request/Response)
- `app/models/` - SQLAlchemy ORM models
- `app/core/` - Config, database, security, enums

## Entry Points

- App: `app/main.py`
- API docs: `http://localhost:8000/api/v1/docs`

## Testing

- Test files in `tests/integration/` and `tests/unit/`
- Use `pytest` with `asyncio_mode = "auto"` (configured in pyproject.toml)
- Integration tests require PostgreSQL running on port 5434
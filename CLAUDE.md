# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a **monorepo** containing two independently-versioned sub-projects:

- `backend/` — FastAPI Python API (also a standalone git repo pointing at Bitbucket)
- `frontend/` — Next.js TypeScript UI (also a standalone git repo pointing at Bitbucket)
- `docker-compose.yml` — Root-level compose file for **demo/Railway deployment** (SQLite, no Postgres)
- `backend/docker-compose.yml` — Backend-only compose with **Postgres + pgAdmin** for local dev
- `sync-demo.sh` — Pulls Bitbucket changes into this GitHub monorepo, then pushes to Railway

## Backend Commands

All commands run from `backend/`:

```bash
uv sync                                          # install/update dependencies
uv run uvicorn app.main:app --reload             # dev server (hot reload)
uv run pytest                                    # all tests (requires arqdata_test DB)
uv run pytest tests/path/to/test_file.py        # single test file
uv run ruff format .                             # auto-format
uv run ruff check --fix .                        # lint + auto-fix
alembic upgrade head                             # apply migrations (Postgres only)
alembic revision --autogenerate -m "description" # generate new migration
docker compose up -d                             # start local Postgres (port 5434) + pgAdmin (5050)
```

Backend `.env` (for local Postgres development):
```
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5434/arqdata
JWT_SECRET_KEY=your-dev-secret
ALLOWED_ORIGINS=["http://localhost:3000"]
```

For demo/SQLite mode, omit `.env` — defaults in `app/core/config.py` apply (`sqlite:///./demo.db`).

**Tests** connect to `postgresql+psycopg://postgres:postgres@localhost:5434/arqdata_test` (hardcoded in `tests/conftest.py`). Create this DB before running tests. Each test gets a transaction-wrapped session that rolls back on teardown — do not mock the DB.

## Frontend Commands

All commands run from `frontend/`:

```bash
npm install
npm run dev                   # dev server on :3000
npm run build                 # production build (standalone output)
npm run lint                  # ESLint
npx tsc --noEmit              # type-check without building
npm test                      # Vitest unit/component tests (80% coverage threshold)
npm run test:watch            # Vitest watch mode
npm run test:e2e              # Playwright E2E (requires both servers running)
npx playwright install        # first-time browser install for Playwright
```

E2E tests expect frontend at `http://127.0.0.1:3000` and backend at `http://localhost:8000`.

## Docker (Full Stack Demo)

From the monorepo root:
```bash
docker compose up --build     # builds and starts frontend (:3000) + backend (:8000) with SQLite
```

## Backend Architecture

**Request flow:** `api/v1/endpoints/` → `services/` → `repositories/` → SQLAlchemy models

- **Endpoints** (`app/api/v1/endpoints/`): Pydantic validation only; delegates all logic to services.
- **Services** (`app/services/`): Business logic, authorization checks, exception raising.
- **Repositories** (`app/repositories/`): All SQLAlchemy queries; return ORM objects.
- **Models** (`app/models/`): SQLAlchemy 2.0 ORM. Use `Uuid` and `JSON` (dialect-agnostic), not `UUID(as_uuid=True)` or `JSONB` — the codebase supports both PostgreSQL and SQLite.
- **Schemas** (`app/schemas/`): Pydantic v2 request/response shapes; separate from ORM models.
- **Dependencies** (`app/dependencies/auth.py`): `CurrentUser` dataclass + `get_current_user` for JWT extraction. Also exposes `require_admin` and `require_admin_or_consultant` Depends shortcuts. Route-level role checks are done in the service layer, not endpoint decorators.
- **Exceptions** (`app/exceptions/domain.py`): Raise typed domain exceptions from services; `handlers.py` maps them to HTTP status codes automatically.

`app/main.py` runs `Base.metadata.create_all()` + `initialize_seed_data()` on startup via lifespan. In SQLite mode this creates all tables; in Postgres use Alembic (`alembic upgrade head`).

### Domain Exceptions

| Exception | HTTP | When to use |
|-----------|------|-------------|
| `ValidationDomainError` | 422 | Invalid business rule input |
| `NotFoundDomainError` | 404 | Resource doesn't exist |
| `ForbiddenDomainError` | 403 | Insufficient permissions |
| `UnauthorizedDomainError` | 401 | Missing/invalid auth token |
| `ConflictDomainError` | 409 | Unique constraint or state conflict |

### Authorization / Permission Model

User roles: `ADMINISTRADOR`, `CONSULTOR`, `EMPRESA` (`UserType` in `app/core/enums.py`).

Projects are divided into blocks (`ProjectBlock`): `PROJECT`, `AS_IS`, `TO_BE`, `BRECHAS`, `ROADMAP`. Each membership record stores a `PermissionLevel` (0–5) per block:

| Level | Name | Meaning |
|-------|------|---------|
| 0 | `SIN_ACCESO` | No access |
| 1 | `LECTURA` | Read-only |
| 2 | `COMENTAR` | Comment |
| 3 | `EDITAR` | Edit |
| 4 | `APROBAR` | Approve |
| 5 | `DELEGAR` | Delegate (project manager) |

Project managers always hold level 5 in all blocks. Permission logic lives in `app/core/permissions.py` and `app/services/project_permission_service.py`.

### Naming Conventions (Backend)

- Variables/functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `snake_case`
- Imports ordered: stdlib → third-party → first-party (`app`)
- Line length: 100 characters, double quotes

## Frontend Architecture

**App Router** with route groups for access control:
- `(admin)/` — ADMIN + CONSULTOR shared layout (sidebar + header)
- `(admin)/consultor/proyectos/[id]/` — project workspace; triggers "Proyecto activo" sidebar section
- `(empresa)/` — EMPRESA-only routes
- `(diagnostico)/` — public maturity questionnaire (no auth, minimal header)
- `(full-width-pages)/` — auth pages (signin, invitation activation, etc.)

**State & data:**
- `AuthContext` (`src/context/AuthContext.tsx`): user stored in `localStorage` under `arqdata_auth_user`; tokens under `token` (access) and `refresh_token`. Backend role `ADMINISTRADOR` is mapped to frontend `"ADMIN"`.
- Axios interceptor in `src/lib/api/client.ts` auto-injects the Bearer header and redirects to `/signin` on 401.
- All API calls go through typed client modules in `src/lib/api/` — never `fetch` directly in components.
- `react-hook-form` + `zod` for all form validation.

**Sidebar** (`src/layout/AppSidebar.tsx`): Role-based sections computed via `useMemo`. The "Proyecto activo" section only renders when `pathname` matches `/consultor/proyectos/[id]`.

### Naming Conventions (Frontend)

- Components: `PascalCase` (`UserCard.tsx`)
- Hooks: `camelCase` with `use` prefix (`useAuthUser.ts`)
- Non-component files: `kebab-case` (`auth-utils.ts`)
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Line length: 80 characters, double quotes, semicolons, 2-space indent
- Tailwind classes are auto-sorted by Prettier on commit

## Commit Convention

Both repos enforce **Conventional Commits** via `.husky/commit-msg` hook:
```
feat(scope): short description
fix: short description
chore: short description
```

Activate hooks after cloning each sub-repo: `git config core.hooksPath .husky`

## Deployment (Railway)

- **GitHub monorepo** (`master` branch) is what Railway watches.
- Backend service: Root Directory = `backend`, Builder = Dockerfile, branch = `master`.
- Frontend service: Root Directory = `frontend`, Builder = Dockerfile, branch = `master`.
- Required frontend build arg: `NEXT_PUBLIC_API_URL` (Railway backend public URL + `/api/v1`).
- Required backend env vars: `DATABASE_URL`, `JWT_SECRET_KEY`, `ALLOWED_ORIGINS` (JSON array string).
- To sync Bitbucket → Railway: run `./sync-demo.sh` from the monorepo root.

## Demo Seed Credentials

Created by `app/data_initializer.py` on first startup:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@arqdata.local | Admin12345! |
| Consultor | consultor@demo.com | Consultor12345! |
| Empresa | empresa@demo.com | Empresa12345! |

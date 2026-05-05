# Repository Guidelines

## Project Structure & Module Organization

- `backend/`: FastAPI API + persistence.
  - `backend/app/` application code, `backend/alembic/` DB migrations, `backend/tests/` (pytest integration tests).
  - `backend/docker-compose.yml` provides Postgres + pgAdmin for local development.
- `frontend/`: Next.js (App Router) UI.
  - `frontend/src/` application code, `frontend/public/` static assets, `frontend/tests/` (Vitest + Playwright).
- `DOC/` and root documents contain project write-ups/diagrams (non-code artifacts).

## Build, Test, and Development Commands

Backend (from `backend/`):
- `uv sync`: install dependencies (uses `uv.lock`).
- `uv run uvicorn app.main:app --reload`: run API locally with hot reload.
- `uv run pytest`: run backend tests.
- `uv run ruff format .` / `uv run ruff check .`: format and lint.
- `docker compose up -d`: start local Postgres (`localhost:5434`) and pgAdmin (`localhost:5050`).

Frontend (from `frontend/`):
- `npm install`: install dependencies.
- `npm run dev`: run Next.js dev server.
- `npm run build` / `npm run start`: production build and serve.
- `npm run lint`: ESLint across the project.
- `npm test` / `npm run test:e2e`: unit/component tests (Vitest) and E2E tests (Playwright).

## Coding Style & Naming Conventions

- Backend: 4 spaces, max line length 100, double quotes; format/lint with Ruff (`backend/pyproject.toml`).
  - Names: `snake_case` (functions/files), `PascalCase` (classes), `UPPER_SNAKE_CASE` (constants).
- Frontend: 2 spaces, semicolons, max line length 80; Prettier (with Tailwind class sorting) + ESLint.
  - Names: components `PascalCase.tsx`, hooks `useXxx`, utilities `kebab-case.ts`.

## Testing Guidelines

- Backend: pytest files `test_*.py` under `backend/tests/` (integration tests live in `backend/tests/integration/`).
- Frontend: Vitest `*.test.ts(x)` under `frontend/tests/component/`; Playwright `*.spec.ts` under `frontend/tests/e2e/`.

## Commit & Pull Request Guidelines

- Conventional Commits are enforced by `commit-msg` hooks in `backend/.husky/` and `frontend/.husky/`:
  - Example: `feat(auth): add JWT login endpoint`, `fix: handle null user`.
  - Note: this workspace may not include Git history; follow the hook’s allowed types.
- PRs: describe intent + approach, link the related issue/ticket, and include screenshots for UI changes; keep changes scoped (avoid drive-by reformatting).

## Agent-Specific Instructions

- Prefer module-local guidance: `backend/CONTRIBUTING.md` and `frontend/CONTRIBUTING.md`.
- Run the smallest relevant checks before handing off (e.g., `uv run pytest` for backend-only edits, `npm test` for frontend-only edits).

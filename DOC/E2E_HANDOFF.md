# E2E Handoff

## Scope
- Focus: Playwright E2E for real user flows, permissions, user management, and artifact approval/applicability.
- Current branch work: frontend `test/asis-artifact-maturity-questionnaire`, backend `test/users`.

## Seeded Users
- `admin@arqdata.local` / `Admin12345!`
- `consultor@example.com` / `Consultor123!`
- `empresa@example.com` / `Empresa123!`

## Validated Flows
- Login for registered users.
- Admin console: create/edit/deactivate users, duplicate email, self-deactivate guard.
- Authz: non-admin route guards, API 403 for forbidden admin endpoints.
- Permission matrix: levels 0-5 across consultor and empresa roles.
- Permission changes live: revoke/grant edit, remove membership, deactivate user.
- Project/user/artifact relations: membership, artifact overrides, approval locks.
- Artifact approval/applicability: consultant approval, company approval, rejection cycle, `NO_APLICABLE` and reactivation.
- AS-IS questionnaire: public submission with evidence, consultor validation/finalization, artifact approval, empresa read-only results.

## Key Files
- `frontend/tests/e2e/*.spec.ts`
- `frontend/tests/e2e/asis-questionnaire.spec.ts`
- `frontend/src/lib/adapters/project.adapter.ts`
- `frontend/src/app/(admin)/consultor/proyectos/[id]/entregable/[entregableId]/page.tsx`
- `frontend/src/components/entregables/er/ModeloEREditor.tsx`
- `frontend/src/lib/api/usuarios.ts`
- `backend/seed_demo.py`

## Notes
- Playwright Chromium may fail inside the sandbox; local user runs are the source of truth.
- For future sessions, start by checking `git status` in `frontend/` and `backend/`, then run the relevant `npm run test:e2e -- <spec>.ts` command.

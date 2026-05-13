# Deploy Demo en Render

Este repositorio incluye `render.yaml` para crear automáticamente:

- `pdg-api` (FastAPI backend)
- `pdg-frontend` (Next.js frontend)
- `pdg-db` (PostgreSQL administrado por Render)

## Pasos

1. En Render, elige **New +** → **Blueprint**.
2. Selecciona el repositorio `rojasluismanuel467-lab/PDG`.
3. Render leerá `render.yaml` y propondrá los 3 servicios.
4. Acepta y despliega.

## Qué queda automatizado

- Migraciones: `alembic upgrade head` (en `preDeployCommand` del backend)
- Seed demo: `python seed_demo.py` (en `preDeployCommand` del backend)
- Variables clave (`DATABASE_URL`, `JWT_SECRET_KEY`, proxy interno frontend→backend)

## Credenciales demo

- `admin@arqdata.local : Admin12345!`
- `consultor@example.com : Consultor123!`
- `empresa@example.com : Empresa123!`

También se muestran en el frontend vía `NEXT_PUBLIC_DEMO_CREDENTIALS`.

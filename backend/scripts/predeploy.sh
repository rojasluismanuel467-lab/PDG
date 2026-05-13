#!/usr/bin/env bash
set -euo pipefail

echo "[predeploy] Applying database migrations..."
alembic upgrade head

echo "[predeploy] Seeding demo data..."
python seed_demo.py

echo "[predeploy] Done."

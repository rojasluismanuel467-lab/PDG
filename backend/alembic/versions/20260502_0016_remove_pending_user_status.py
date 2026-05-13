"""Remove PENDIENTE from user status enum.

Revision ID: 20260502_0016
Revises: 20260501_0015
Create Date: 2026-05-02 15:05:00.000000
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260502_0016"
down_revision: str | None = "20260501_0015"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Normaliza datos previos antes de remover el valor del enum.
    op.execute("UPDATE users SET estado = 'ACTIVO' WHERE estado = 'PENDIENTE'")

    op.execute("ALTER TABLE users ALTER COLUMN estado DROP DEFAULT")
    op.execute("CREATE TYPE user_status_enum_new AS ENUM ('ACTIVO', 'INACTIVO')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN estado TYPE user_status_enum_new "
        "USING estado::text::user_status_enum_new"
    )
    op.execute("DROP TYPE user_status_enum")
    op.execute("ALTER TYPE user_status_enum_new RENAME TO user_status_enum")
    op.execute("ALTER TABLE users ALTER COLUMN estado SET DEFAULT 'ACTIVO'")


def downgrade() -> None:
    op.execute("ALTER TABLE users ALTER COLUMN estado DROP DEFAULT")
    op.execute("CREATE TYPE user_status_enum_old AS ENUM ('ACTIVO', 'INACTIVO', 'PENDIENTE')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN estado TYPE user_status_enum_old "
        "USING estado::text::user_status_enum_old"
    )
    op.execute("DROP TYPE user_status_enum")
    op.execute("ALTER TYPE user_status_enum_old RENAME TO user_status_enum")
    op.execute("ALTER TABLE users ALTER COLUMN estado SET DEFAULT 'ACTIVO'")

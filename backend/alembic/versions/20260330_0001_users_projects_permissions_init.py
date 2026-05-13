"""Create initial users, projects, memberships and auth support tables.

Revision ID: 20260330_0001
Revises: None
Create Date: 2026-03-30 00:00:00
"""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260330_0001"
down_revision = None
branch_labels = None
depends_on = None


def _user_type_enum() -> sa.Enum:
    return sa.Enum("ADMINISTRADOR", "CONSULTOR", "EMPRESA", name="user_type_enum")


def _user_status_enum() -> sa.Enum:
    return sa.Enum("ACTIVO", "INACTIVO", "PENDIENTE", name="user_status_enum")


def _project_status_enum() -> sa.Enum:
    return sa.Enum("ACTIVO", "EN_PAUSA", "CERRADO", "BLOQUEADO", name="project_status_enum")


def _invited_user_type_enum() -> sa.Enum:
    return sa.Enum("ADMINISTRADOR", "CONSULTOR", "EMPRESA", name="invited_user_type_enum")


def _invitation_status_enum() -> sa.Enum:
    return sa.Enum("PENDIENTE", "ACEPTADA", "EXPIRADA", "REVOCADA", name="invitation_status_enum")


def _audit_user_type_enum() -> sa.Enum:
    return sa.Enum("ADMINISTRADOR", "CONSULTOR", "EMPRESA", name="audit_user_type_enum")


def upgrade() -> None:
    user_type_enum = _user_type_enum()
    user_status_enum = _user_status_enum()
    project_status_enum = _project_status_enum()
    invited_user_type_enum = _invited_user_type_enum()
    invitation_status_enum = _invitation_status_enum()
    audit_user_type_enum = _audit_user_type_enum()

    bind = op.get_bind()

    # Lista de enums a crear de forma segura
    enums_to_create = [
        ("user_type_enum", ["ADMINISTRADOR", "CONSULTOR", "EMPRESA"]),
        ("user_status_enum", ["ACTIVO", "INACTIVO", "PENDIENTE"]),
        ("project_status_enum", ["ACTIVO", "EN_PAUSA", "CERRADO", "BLOQUEADO"]),
        ("invited_user_type_enum", ["ADMINISTRADOR", "CONSULTOR", "EMPRESA"]),
        ("invitation_status_enum", ["PENDIENTE", "ACEPTADA", "EXPIRADA", "REVOCADA"]),
        ("audit_user_type_enum", ["ADMINISTRADOR", "CONSULTOR", "EMPRESA"]),
    ]

    for enum_name, labels in enums_to_create:
        # Check if type exists
        res = bind.execute(
            sa.text(f"SELECT 1 FROM pg_type WHERE typname = '{enum_name}'")
        ).fetchone()
        if not res:
            labels_str = ", ".join([f"'{label}'" for label in labels])
            op.execute(sa.text(f"CREATE TYPE {enum_name} AS ENUM ({labels_str})"))

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column(
            "tipo_usuario",
            postgresql.ENUM(
                "ADMINISTRADOR", "CONSULTOR", "EMPRESA", name="user_type_enum", create_type=False
            ),
            nullable=False,
        ),
        sa.Column(
            "estado",
            postgresql.ENUM(
                "ACTIVO", "INACTIVO", "PENDIENTE", name="user_status_enum", create_type=False
            ),
            nullable=False,
            server_default=sa.text("'PENDIENTE'::user_status_enum"),
        ),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("nombre", sa.String(length=255), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column(
            "estado",
            postgresql.ENUM(
                "ACTIVO",
                "EN_PAUSA",
                "CERRADO",
                "BLOQUEADO",
                name="project_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'ACTIVO'::project_status_enum"),
        ),
        sa.Column("manager_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "project_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_manager", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("nivel_asis", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("nivel_tobe", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("nivel_brechas", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("assigned_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.CheckConstraint(
            "nivel_asis >= 0 AND nivel_asis <= 5", name="ck_membership_nivel_asis_0_5"
        ),
        sa.CheckConstraint(
            "nivel_tobe >= 0 AND nivel_tobe <= 5", name="ck_membership_nivel_tobe_0_5"
        ),
        sa.CheckConstraint(
            "nivel_brechas >= 0 AND nivel_brechas <= 5",
            name="ck_membership_nivel_brechas_0_5",
        ),
        sa.CheckConstraint(
            "(NOT is_manager) OR (nivel_asis = 5 AND nivel_tobe = 5 AND nivel_brechas = 5)",
            name="ck_membership_manager_levels",
        ),
        sa.ForeignKeyConstraint(["assigned_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "user_id", name="uq_project_membership_project_user"),
    )

    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("token", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "invited_user_type",
            postgresql.ENUM(
                "ADMINISTRADOR",
                "CONSULTOR",
                "EMPRESA",
                name="invited_user_type_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "PENDIENTE",
                "ACEPTADA",
                "EXPIRADA",
                "REVOCADA",
                name="invitation_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'PENDIENTE'::invitation_status_enum"),
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_invitations_token"),
    )
    op.create_index("ix_invitations_token", "invitations", ["token"], unique=False)
    op.create_index("ix_invitations_email", "invitations", ["email"], unique=False)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=False)

    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "perfil_usuario",
            postgresql.ENUM(
                "ADMINISTRADOR",
                "CONSULTOR",
                "EMPRESA",
                name="audit_user_type_enum",
                create_type=False,
            ),
            nullable=True,
        ),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("tipo_accion", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "datos_adicionales",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"], unique=False)
    op.create_index("ix_audit_log_project_id", "audit_log", ["project_id"], unique=False)
    op.create_index("ix_audit_log_tipo_accion", "audit_log", ["tipo_accion"], unique=False)
    op.create_index("ix_audit_log_resource_id", "audit_log", ["resource_id"], unique=False)

    admin_id = str(uuid.uuid4())
    bind.execute(
        sa.text(
            """
            INSERT INTO users (
                id, nombre, email, password_hash, tipo_usuario, estado, created_at, updated_at
            )
            VALUES (
                :id, :nombre, :email, :password_hash, 'ADMINISTRADOR', 'ACTIVO', now(), now()
            )
            ON CONFLICT (email) DO NOTHING
            """
        ),
        {
            "id": admin_id,
            "nombre": "Administrador Inicial",
            "email": "admin@arqdata.local",
            "password_hash": "$2b$12$ames8NqBt4MneOO469uMR.QV/bABZdhKtEVkG0a9ArYYSp.RfORwW",
        },
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_resource_id", table_name="audit_log")
    op.drop_index("ix_audit_log_tipo_accion", table_name="audit_log")
    op.drop_index("ix_audit_log_project_id", table_name="audit_log")
    op.drop_index("ix_audit_log_user_id", table_name="audit_log")
    op.drop_table("audit_log")

    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_invitations_email", table_name="invitations")
    op.drop_index("ix_invitations_token", table_name="invitations")
    op.drop_table("invitations")

    op.drop_table("project_memberships")
    op.drop_table("projects")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    _audit_user_type_enum().drop(bind, checkfirst=True)
    _invitation_status_enum().drop(bind, checkfirst=True)
    _invited_user_type_enum().drop(bind, checkfirst=True)
    _project_status_enum().drop(bind, checkfirst=True)
    _user_status_enum().drop(bind, checkfirst=True)
    _user_type_enum().drop(bind, checkfirst=True)

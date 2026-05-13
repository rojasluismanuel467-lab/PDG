"""Create maturity questionnaire tables.

Revision ID: 20260331_0002
Revises: 20260330_0001
Create Date: 2026-03-31 00:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260331_0002"
down_revision = "20260330_0001"
branch_labels = None
depends_on = None


DIMENSIONS = [
    (
        1,
        "Gobernanza y Organización",
        "Estructura de roles, políticas y comités de decisión.",
        0.25,
        1,
    ),
    (
        2,
        "Gestión de Datos",
        "Prácticas operativas de administración y ciclo de vida del dato.",
        0.20,
        2,
    ),
    (
        3,
        "Arquitectura de Datos",
        "Diseño de modelos, integración y estructura del ecosistema de datos.",
        0.15,
        3,
    ),
    (
        4,
        "Seguridad y Cumplimiento",
        "Controles, privacidad y cumplimiento normativo sobre datos.",
        0.20,
        4,
    ),
    (5, "Calidad de Datos", "Capacidad de medir, corregir y sostener calidad del dato.", 0.15, 5),
    (
        6,
        "Tecnología e Infraestructura",
        "Plataformas, herramientas y soporte técnico del ecosistema.",
        0.05,
        6,
    ),
]

SUBDOMAINS = [
    (
        101,
        1,
        "Roles y Responsabilidades",
        "Definición y asignación formal de responsabilidades sobre datos.",
        0.50,
        1,
    ),
    (
        102,
        1,
        "Políticas y Decisión",
        "Políticas, comités y mecanismos de decisión sobre datos.",
        0.50,
        2,
    ),
    (201, 2, "Ciclo de Vida", "Gestión del dato desde su creación hasta su retiro.", 0.50, 1),
    (202, 2, "Metadatos", "Definición, custodia y uso de metadatos y glosarios.", 0.50, 2),
    (301, 3, "Modelado", "Modelos conceptuales, lógicos y físicos de datos.", 0.50, 1),
    (302, 3, "Integración", "Flujos, interoperabilidad y consistencia entre sistemas.", 0.50, 2),
    (401, 4, "Privacidad", "Protección de datos personales y datos sensibles.", 0.50, 1),
    (402, 4, "Controles", "Accesos, auditoría y gestión de riesgos de seguridad.", 0.50, 2),
    (501, 5, "Medición", "Indicadores, reglas y monitoreo de calidad.", 0.50, 1),
    (502, 5, "Remediación", "Procesos para corregir y prevenir defectos de calidad.", 0.50, 2),
    (601, 6, "Plataformas", "Capacidad tecnológica de almacenamiento y procesamiento.", 0.50, 1),
    (
        602,
        6,
        "Herramientas",
        "Herramientas de soporte para gobierno y operación de datos.",
        0.50,
        2,
    ),
]


def _response_status_enum() -> sa.Enum:
    return sa.Enum("active", "anulada", name="maturity_response_status_enum")


def _validation_status_enum() -> sa.Enum:
    return sa.Enum(
        "PENDIENTE",
        "EN_REVISION",
        "APROBADA",
        "RECHAZADA",
        name="maturity_validation_status_enum",
    )


def _answer_validation_status_enum() -> sa.Enum:
    return sa.Enum(
        "PENDIENTE",
        "EN_REVISION",
        "APROBADA",
        "RECHAZADA",
        name="maturity_answer_validation_status_enum",
    )


def upgrade() -> None:
    bind = op.get_bind()

    enums_to_create = [
        ("maturity_response_status_enum", ["active", "anulada"]),
        ("maturity_validation_status_enum", ["PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA"]),
        (
            "maturity_answer_validation_status_enum",
            ["PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA"],
        ),
    ]
    for enum_name, labels in enums_to_create:
        res = bind.execute(
            sa.text(f"SELECT 1 FROM pg_type WHERE typname = '{enum_name}'")
        ).fetchone()
        if not res:
            labels_str = ", ".join([f"'{label}'" for label in labels])
            op.execute(sa.text(f"CREATE TYPE {enum_name} AS ENUM ({labels_str})"))

    op.create_table(
        "maturity_dimensions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("weight", sa.Numeric(5, 4), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "maturity_subdomains",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dimension_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("weight", sa.Numeric(5, 4), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["dimension_id"], ["maturity_dimensions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "maturity_questionnaires",
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
        sa.Column("phase", sa.String(length=20), nullable=False, server_default=sa.text("'AS_IS'")),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("access_code", sa.String(length=64), nullable=False),
        sa.Column("access_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("closed_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("phase = 'AS_IS'", name="ck_maturity_questionnaire_phase_asis"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["closed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("access_code", name="uq_maturity_questionnaire_access_code"),
        sa.UniqueConstraint("project_id", "phase", name="uq_maturity_questionnaire_project_phase"),
    )
    op.create_index(
        "ix_maturity_questionnaires_project_id",
        "maturity_questionnaires",
        ["project_id"],
        unique=False,
    )

    op.create_table(
        "maturity_questions",
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
        sa.Column("questionnaire_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dimension_id", sa.Integer(), nullable=False),
        sa.Column("subdomain_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "applicable_roles",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("weight", sa.Numeric(5, 4), nullable=False, server_default=sa.text("1.0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.ForeignKeyConstraint(
            ["questionnaire_id"], ["maturity_questionnaires.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["dimension_id"], ["maturity_dimensions.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["subdomain_id"], ["maturity_subdomains.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_maturity_questions_questionnaire_id",
        "maturity_questions",
        ["questionnaire_id"],
        unique=False,
    )

    op.create_table(
        "maturity_responses",
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
        sa.Column("questionnaire_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("respondent_name", sa.String(length=255), nullable=False),
        sa.Column("respondent_email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "active", "anulada", name="maturity_response_status_enum", create_type=False
            ),
            nullable=False,
            server_default=sa.text("'active'::maturity_response_status_enum"),
        ),
        sa.Column(
            "estado_validacion",
            postgresql.ENUM(
                "PENDIENTE",
                "EN_REVISION",
                "APROBADA",
                "RECHAZADA",
                name="maturity_validation_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'PENDIENTE'::maturity_validation_status_enum"),
        ),
        sa.Column("anulation_reason", sa.Text(), nullable=True),
        sa.Column("anulated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("anulated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("validated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("validation_comments", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["questionnaire_id"], ["maturity_questionnaires.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["anulated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["validated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_maturity_responses_questionnaire_id",
        "maturity_responses",
        ["questionnaire_id"],
        unique=False,
    )
    op.create_index(
        "ix_maturity_responses_email", "maturity_responses", ["respondent_email"], unique=False
    )

    op.create_table(
        "maturity_answers",
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
        sa.Column("response_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("respondent_score", sa.Integer(), nullable=False),
        sa.Column("validated_score", sa.Integer(), nullable=True),
        sa.Column(
            "estado_validacion",
            postgresql.ENUM(
                "PENDIENTE",
                "EN_REVISION",
                "APROBADA",
                "RECHAZADA",
                name="maturity_answer_validation_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default=sa.text("'PENDIENTE'::maturity_answer_validation_status_enum"),
        ),
        sa.Column("validation_comments", sa.Text(), nullable=True),
        sa.Column("evidence_url", sa.Text(), nullable=True),
        sa.Column("evidence_name", sa.Text(), nullable=True),
        sa.Column("evidence_type", sa.Text(), nullable=True),
        sa.Column("evidence_size", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "respondent_score >= 0 AND respondent_score <= 5",
            name="ck_maturity_answer_respondent_score",
        ),
        sa.CheckConstraint(
            "(validated_score IS NULL) OR (validated_score >= 0 AND validated_score <= 5)",
            name="ck_maturity_answer_validated_score",
        ),
        sa.ForeignKeyConstraint(["response_id"], ["maturity_responses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["maturity_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "response_id", "question_id", name="uq_maturity_answer_response_question"
        ),
    )
    op.create_index(
        "ix_maturity_answers_response_id", "maturity_answers", ["response_id"], unique=False
    )

    dimension_table = sa.table(
        "maturity_dimensions",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("weight", sa.Numeric()),
        sa.column("display_order", sa.Integer()),
    )
    subdomain_table = sa.table(
        "maturity_subdomains",
        sa.column("id", sa.Integer()),
        sa.column("dimension_id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("weight", sa.Numeric()),
        sa.column("display_order", sa.Integer()),
    )
    op.bulk_insert(
        dimension_table,
        [
            {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "weight": row[3],
                "display_order": row[4],
            }
            for row in DIMENSIONS
        ],
    )
    op.bulk_insert(
        subdomain_table,
        [
            {
                "id": row[0],
                "dimension_id": row[1],
                "name": row[2],
                "description": row[3],
                "weight": row[4],
                "display_order": row[5],
            }
            for row in SUBDOMAINS
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_maturity_answers_response_id", table_name="maturity_answers")
    op.drop_table("maturity_answers")

    op.drop_index("ix_maturity_responses_email", table_name="maturity_responses")
    op.drop_index("ix_maturity_responses_questionnaire_id", table_name="maturity_responses")
    op.drop_table("maturity_responses")

    op.drop_index("ix_maturity_questions_questionnaire_id", table_name="maturity_questions")
    op.drop_table("maturity_questions")

    op.drop_index("ix_maturity_questionnaires_project_id", table_name="maturity_questionnaires")
    op.drop_table("maturity_questionnaires")

    op.drop_table("maturity_subdomains")
    op.drop_table("maturity_dimensions")

    bind = op.get_bind()
    _answer_validation_status_enum().drop(bind, checkfirst=True)
    _validation_status_enum().drop(bind, checkfirst=True)
    _response_status_enum().drop(bind, checkfirst=True)

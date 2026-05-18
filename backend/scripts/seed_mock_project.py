"""
Script de seed para proyecto mock de prueba.

Crea:
- Empresa: RetailTech S.A.S. (sector retail/e-commerce)
- Proyecto: "RetailTech — Diagnóstico Arquitectura de Datos 2025"
- Usuario empresa asociado
- Cuestionario de madurez AS-IS con respuestas realistas (madurez media-baja ~2/5)

Uso:
    cd backend/
    uv run python scripts/seed_mock_project.py
"""

from __future__ import annotations

import sys
import uuid
from datetime import date, datetime, timezone

sys.path.insert(0, ".")

from sqlalchemy.orm import Session

from app.core.database import engine
from app.core.enums import (
    MaturityResponseStatus,
    MaturityValidationStatus,
    ProjectBlock,
    ProjectStatus,
    UserStatus,
    UserType,
)
from app.core.maturity_questionnaire_catalog import QUESTION_TEMPLATE_CATALOG
from app.core.security import hash_password
from app.models.company import Company
from app.models.maturity_answer import MaturityAnswer
from app.models.maturity_questionnaire import MaturityQuestionnaire
from app.models.maturity_question import MaturityQuestion
from app.models.maturity_response import MaturityResponse
from app.models.project import Project
from app.models.user import User
from app.core.artifact_catalog import ARTIFACT_CATALOG
from app.core.enums import ProjectArtifactStatus
from app.models.project_artifact import ProjectArtifact
from app.repositories.project_membership_repository import ProjectMembershipRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository

# Scores por dimensión DAMA (0-5). Simula empresa con madurez media-baja.
DIMENSION_SCORES: dict[int, int] = {
    1: 2,   # Gobernanza de Datos — Básico (sin política formal)
    2: 2,   # Arquitectura de Datos — Básico (documentación parcial)
    3: 1,   # Modelado y Diseño — Inicial (ad hoc)
    4: 3,   # Almacenamiento y Operaciones — Definido (backups OK)
    5: 2,   # Seguridad de Datos — Básico (controles básicos)
    6: 1,   # Integración e Interoperabilidad — Inicial (integraciones manuales)
    7: 1,   # Documentos y Contenido — Inicial
    8: 2,   # Datos de Referencia y Maestros — Básico
    9: 2,   # Data Warehousing y BI — Básico (reportes Excel)
    10: 1,  # Metadatos — Inicial (sin catálogo)
    11: 2,  # Calidad de Datos — Básico (sin proceso formal)
}

RESPONDENTE_COMMENTS: dict[int, str] = {
    1: "No existe un área de gobernanza de datos. Las políticas son informales.",
    2: "Tenemos diagramas desactualizados de la arquitectura en Confluence.",
    4: "Los backups se realizan diariamente. Tenemos un DBA dedicado.",
    6: "Las integraciones entre sistemas son via exportaciones CSV manuales. Es un cuello de botella.",
    9: "Usamos Excel y Power BI básico. Los datos se extraen manualmente cada semana.",
    10: "No existe diccionario de datos ni catálogo de metadatos formal.",
    11: "Hay problemas de duplicados en clientes y productos. Sin proceso de limpieza.",
}


def run() -> None:
    with Session(engine) as db:
        # Verificar si ya existe
        existing = UserRepository.get_by_email(db, email="empresa@retailtech.mock")
        if existing is not None:
            print("El proyecto mock ya existe. Usa 'docker compose down -v' para reset completo.")
            return

        # Obtener el consultor demo
        consultant = UserRepository.get_by_email(db, email="consultor@demo.com")
        if consultant is None:
            print("ERROR: El consultor demo no existe. Asegúrate de haber iniciado el backend "
                  "al menos una vez para que se ejecute initialize_seed_data().")
            sys.exit(1)

        print("Creando empresa RetailTech S.A.S. ...")
        company = Company(
            name="RetailTech S.A.S.",
            contact_email="contacto@retailtech.mock",
        )
        db.add(company)
        db.flush()
        db.refresh(company)

        print("Creando usuario empresa ...")
        empresa_user = User(
            nombre="Ana Martínez (RetailTech)",
            email="empresa@retailtech.mock",
            tipo_usuario=UserType.EMPRESA,
            estado=UserStatus.ACTIVO,
            password_hash=hash_password("RetailTech12345!"),
            created_by_user_id=consultant.id,
            company_id=company.id,
        )
        empresa_user = UserRepository.create(db, user=empresa_user)

        print("Creando proyecto ...")
        project = Project(
            nombre="RetailTech — Diagnóstico Arquitectura de Datos 2025",
            descripcion=(
                "RetailTech S.A.S. es una empresa de retail con presencia en 3 ciudades. "
                "Opera una tienda online (e-commerce) y 12 puntos de venta físicos. "
                "Cuenta con ~150 empleados y procesa ~5.000 pedidos/mes. "
                "Sus sistemas actuales son heterogéneos y con poca integración entre sí."
            ),
            client_company_name=company.name,
            client_company_email=company.contact_email,
            company_id=company.id,
            estimated_end_date=date(2025, 12, 31),
            estado=ProjectStatus.ACTIVO,
            manager_user_id=consultant.id,
        )
        project = ProjectRepository.create_project(db, project=project)
        print(f"  Proyecto creado: {project.id}")

        print("Creando artefactos del proyecto (entregables por fase) ...")
        artifacts = [
            ProjectArtifact(
                project_id=project.id,
                code=d.code,
                name=d.name,
                description=d.description,
                block=d.block,
                order_index=d.order_index,
                block_order=d.block_order,
                status=ProjectArtifactStatus.PENDING,
                is_applicable=True,
            )
            for d in ARTIFACT_CATALOG
        ]
        ProjectRepository.create_artifacts(db, artifacts=artifacts)

        print("Creando cuestionario de madurez AS-IS ...")
        questionnaire = MaturityQuestionnaire(
            project_id=project.id,
            phase=ProjectBlock.AS_IS,
            is_closed=True,
            access_code=uuid.uuid4().hex[:12].upper(),
            dimension_weights_override={},
            custom_roles_override=[],
            score_criteria_override=[],
            created_by_user_id=consultant.id,
            closed_by_user_id=consultant.id,
            closed_at=datetime.now(timezone.utc),
        )
        db.add(questionnaire)
        db.flush()
        db.refresh(questionnaire)

        print("Creando preguntas del cuestionario ...")
        questions: list[MaturityQuestion] = []
        for template in QUESTION_TEMPLATE_CATALOG:
            q = MaturityQuestion(
                questionnaire_id=questionnaire.id,
                dimension_id=template["dimension_id"],
                subdomain_id=template["subdomain_id"],
                text=template["text"],
                applicable_roles=template["applicable_roles"],
                score_criteria_override=[],
                weight=float(template["weight"]),
                is_active=True,
            )
            db.add(q)
            questions.append(q)
        db.flush()

        print("Creando respuesta del cuestionario (Ana Martínez, Data Owner) ...")
        response = MaturityResponse(
            questionnaire_id=questionnaire.id,
            respondent_name="Ana Martínez",
            respondent_email="empresa@retailtech.mock",
            role="data-owner",
            status=MaturityResponseStatus.ACTIVE,
            estado_validacion=MaturityValidationStatus.APROBADA,
            submitted_at=datetime.now(timezone.utc),
            validated_by_user_id=consultant.id,
            validated_at=datetime.now(timezone.utc),
            validation_comments="Respuestas revisadas y validadas por el consultor.",
        )
        db.add(response)
        db.flush()
        db.refresh(response)

        print("Creando respuestas por pregunta ...")
        for q in questions:
            score = DIMENSION_SCORES.get(q.dimension_id, 2)
            comment = RESPONDENTE_COMMENTS.get(q.dimension_id)
            answer = MaturityAnswer(
                response_id=response.id,
                question_id=q.id,
                respondent_score=score,
                validated_score=score,
                estado_validacion=MaturityValidationStatus.APROBADA,
                respondent_comments=comment,
            )
            db.add(answer)

        db.commit()

        print("\n✓ Proyecto mock creado exitosamente.")
        print(f"  Project ID : {project.id}")
        print(f"  Nombre     : {project.nombre}")
        print(f"  Login      : empresa@retailtech.mock / RetailTech12345!")
        print()
        print("Próximos pasos:")
        print("  1. Sube un documento del proyecto en el frontend (PDF, TXT, etc.)")
        print("  2. Espera a que el estado del documento pase a READY")
        print("  3. Genera los artefactos AS-IS desde el frontend o Swagger")
        print(f"     POST /api/v1/projects/{project.id}/ai/asis/ASIS_SYSTEM_INVENTORY_MATRIX/generate")


if __name__ == "__main__":
    run()

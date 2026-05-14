from datetime import date

from sqlalchemy.orm import Session, sessionmaker

from app.core.artifact_catalog import ARTIFACT_CATALOG
from app.core.database import engine
from app.core.enums import ProjectArtifactStatus, ProjectStatus, UserStatus, UserType
from app.core.security import hash_password
from app.models.company import Company
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.user import User
from app.repositories.project_membership_repository import ProjectMembershipRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository

DEMO_ADMIN_EMAIL = "admin@arqdata.local"
DEMO_CONSULTANT_EMAIL = "consultor@demo.com"
DEMO_EMPRESA_EMAIL = "empresa@demo.com"


def initialize_seed_data(db: Session) -> None:
    # Idempotency guard: skip if demo data is already present
    if UserRepository.get_by_email(db, email=DEMO_CONSULTANT_EMAIL) is not None:
        return

    # Admin (may already exist if someone created it manually)
    admin = UserRepository.get_by_email(db, email=DEMO_ADMIN_EMAIL)
    if admin is None:
        admin = User(
            nombre="Administrador Inicial",
            email=DEMO_ADMIN_EMAIL,
            tipo_usuario=UserType.ADMINISTRADOR,
            estado=UserStatus.ACTIVO,
            password_hash=hash_password("Admin12345!"),
        )
        admin = UserRepository.create(db, user=admin)

    consultant = User(
        nombre="Consultor Demo",
        email=DEMO_CONSULTANT_EMAIL,
        tipo_usuario=UserType.CONSULTOR,
        estado=UserStatus.ACTIVO,
        password_hash=hash_password("Consultor12345!"),
        created_by_user_id=admin.id,
    )
    consultant = UserRepository.create(db, user=consultant)

    demo_company = Company(
        name="Empresa Demo S.A.S.",
        contact_email=DEMO_EMPRESA_EMAIL,
    )
    db.add(demo_company)
    db.flush()
    db.refresh(demo_company)

    enterprise = User(
        nombre="Empresa Demo",
        email=DEMO_EMPRESA_EMAIL,
        tipo_usuario=UserType.EMPRESA,
        estado=UserStatus.ACTIVO,
        password_hash=hash_password("Empresa12345!"),
        created_by_user_id=consultant.id,
        company_id=demo_company.id,
    )
    enterprise = UserRepository.create(db, user=enterprise)

    project = Project(
        nombre="Proyecto Demo ArqData",
        descripcion="Proyecto de demostración para explorar todas las funcionalidades de la plataforma.",
        client_company_name=demo_company.name,
        client_company_email=demo_company.contact_email,
        company_id=demo_company.id,
        estimated_end_date=date(2026, 12, 31),
        estado=ProjectStatus.ACTIVO,
        manager_user_id=consultant.id,
    )
    project = ProjectRepository.create_project(db, project=project)

    artifacts = [
        ProjectArtifact(
            project_id=project.id,
            code=definition.code,
            name=definition.name,
            description=definition.description,
            block=definition.block,
            order_index=definition.order_index,
            block_order=definition.block_order,
            status=ProjectArtifactStatus.PENDING,
            is_applicable=True,
        )
        for definition in ARTIFACT_CATALOG
    ]
    ProjectRepository.create_artifacts(db, artifacts=artifacts)

    ProjectRepository.create_manager_membership(
        db,
        project_id=project.id,
        user_id=consultant.id,
    )

    ProjectMembershipRepository.create_membership(
        db,
        project_id=project.id,
        user_id=enterprise.id,
        is_manager=False,
        project_permission_level=1,
        nivel_asis=0,
        nivel_tobe=0,
        nivel_brechas=0,
        nivel_roadmap=0,
        assigned_by_user_id=consultant.id,
    )

    db.commit()


if __name__ == "__main__":
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        initialize_seed_data(db)
        print("Seed data initialized successfully")
        print(f"  Admin:     {DEMO_ADMIN_EMAIL} / Admin12345!")
        print(f"  Consultor: {DEMO_CONSULTANT_EMAIL} / Consultor12345!")
        print(f"  Empresa:   {DEMO_EMPRESA_EMAIL} / Empresa12345!")
        print("  Project:   Proyecto Demo ArqData")
    finally:
        db.close()

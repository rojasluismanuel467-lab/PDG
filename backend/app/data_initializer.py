from datetime import date

from sqlalchemy.orm import Session, sessionmaker

from app.core.database import engine
from app.core.enums import ProjectStatus, UserStatus, UserType
from app.core.security import hash_password
from app.models.company import Company
from app.models.project import Project
from app.models.user import User
from app.repositories.company_repository import CompanyRepository
from app.repositories.project_membership_repository import ProjectMembershipRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.user_repository import UserRepository


def initialize_seed_data(db: Session) -> None:
    existing_consultant = UserRepository.get_by_email(db, email="consultor@test.com")
    if existing_consultant is not None:
        return

    admin = UserRepository.get_by_email(db, email="admin@arqdata.local")
    if admin is None:
        admin = User(
            nombre="Administrador Inicial",
            email="admin@arqdata.local",
            tipo_usuario=UserType.ADMINISTRADOR,
            estado=UserStatus.ACTIVO,
            password_hash=hash_password("Admin12345!"),
        )
        admin = UserRepository.create(db, user=admin)

    created_by = admin.id

    consultant = User(
        nombre="Consultor Demo",
        email="consultor@test.com",
        tipo_usuario=UserType.CONSULTOR,
        estado=UserStatus.ACTIVO,
        password_hash=hash_password("consultor123"),
        created_by_user_id=created_by,
    )
    consultant = UserRepository.create(db, user=consultant)

    demo_company = Company(
        name="Empresa Demo",
        contact_email="empresa@test.com",
    )
    db.add(demo_company)
    db.flush()
    db.refresh(demo_company)

    enterprise = User(
        nombre="Empresa Demo",
        email="empresa@test.com",
        tipo_usuario=UserType.EMPRESA,
        estado=UserStatus.ACTIVO,
        password_hash=hash_password("empresa123"),
        created_by_user_id=consultant.id,
        company_id=demo_company.id,
    )
    enterprise = UserRepository.create(db, user=enterprise)

    project = Project(
        nombre="Proyecto Demo",
        descripcion="Proyecto inicial de demostracion",
        client_company_name=demo_company.name,
        client_company_email=demo_company.contact_email,
        company_id=demo_company.id,
        estimated_end_date=date(2026, 12, 31),
        estado=ProjectStatus.ACTIVO,
        manager_user_id=consultant.id,
    )
    project = ProjectRepository.create_project(db, project=project)

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
        print("Seed data created successfully")
        print("- Consultant: consultor@test.com / consultor123")
        print("- Enterprise: empresa@test.com / empresa123")
        print("- Company: Empresa Demo")
        print("- Project: Proyecto Demo (managed by Consultant)")
    finally:
        db.close()

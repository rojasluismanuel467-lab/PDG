from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import Select, select

from app.core.config import settings
from app.core.enums import UserType
from app.core.security import hash_password
from app.core.database import SessionLocal
from app.models.project import Project
from app.repositories.company_repository import CompanyRepository
from app.repositories.project_membership_repository import ProjectMembershipRepository
from app.repositories.user_repository import UserRepository
from app.schemas.company import CreateCompanyRequest
from app.schemas.project import CreateProjectRequest
from app.schemas.user import UserCreate
from app.services.company_service import CompanyService
from app.services.project_service import ProjectService
from app.services.user_service import UserService


def _ensure_user(*, db, actor_user_id, nombre: str, email: str, tipo: UserType, password: str):
    existing = UserRepository.get_by_email(db, email=email.lower())
    if existing is not None:
        return existing
    UserService.create_user(
        db,
        payload=UserCreate(
            nombre=nombre,
            email=email,
            tipo_usuario=tipo,
            password=password,
        ),
        created_by_user_id=actor_user_id,
    )
    created = UserRepository.get_by_email(db, email=email.lower())
    if created is None:
        raise RuntimeError(f"Failed to create user {email}")
    return created


def _get_demo_project(db) -> Project | None:
    stmt: Select[tuple[Project]] = select(Project).where(
        Project.nombre == "Proyecto Demo",
    )
    return db.execute(stmt).scalar_one_or_none()


def main() -> None:
    db = SessionLocal()
    try:
        admin = UserRepository.get_by_email(db, email=settings.ADMIN_SEED_EMAIL.lower())
        if admin is None:
            raise RuntimeError(
                "Admin seed user not found. Run migrations first (alembic upgrade head)."
            )

        # Set a known password for local/dev.
        admin.password_hash = hash_password("Admin12345!")
        db.flush()

        consultant = _ensure_user(
            db=db,
            actor_user_id=admin.id,
            nombre="Consultor Demo",
            email="consultor@example.com",
            tipo=UserType.CONSULTOR,
            password="Consultor123!",
        )
        company = _ensure_user(
            db=db,
            actor_user_id=admin.id,
            nombre="Empresa Demo",
            email="empresa@example.com",
            tipo=UserType.EMPRESA,
            password="Empresa123!",
        )
        readonly = _ensure_user(
            db=db,
            actor_user_id=admin.id,
            nombre="Lector Demo",
            email="lector@example.com",
            tipo=UserType.CONSULTOR,
            password="Lector123!",
        )

        project = _get_demo_project(db)
        if project is None:
            demo_company = CompanyService.create_company(
                db,
                actor_user_type=admin.tipo_usuario,
                payload=CreateCompanyRequest(
                    name="Empresa Demo",
                    contact_email=company.email,
                ),
            )
            company_record = CompanyRepository.get_by_id(db, company_id=demo_company.id)
            if company_record is None:
                raise RuntimeError("Company was not created")
            from app.repositories.user_repository import UserRepository as UR
            company_user = UR.get_by_email(db, email=company.email)
            if company_user:
                company_user.company_id = company_record.id
                db.flush()
            ProjectService.create_project(
                db,
                actor_user_id=admin.id,
                actor_user_type=admin.tipo_usuario,
                payload=CreateProjectRequest(
                    name="Proyecto Demo",
                    description="Proyecto de ejemplo para validar flujos end-to-end.",
                    company_id=demo_company.id,
                    estimated_end_date=date.today() + timedelta(days=30),
                ),
            )
            project = _get_demo_project(db)
            if project is None:
                raise RuntimeError("Project was not created")

        # Ensure memberships exist with useful permissions.
        def ensure_membership(user_id, *, project_level, asis, tobe, brechas, roadmap):
            membership = ProjectMembershipRepository.get_membership(
                db, project_id=project.id, user_id=user_id
            )
            if membership is None:
                ProjectMembershipRepository.create_membership(
                    db,
                    project_id=project.id,
                    user_id=user_id,
                    is_manager=False,
                    project_permission_level=project_level,
                    nivel_asis=asis,
                    nivel_tobe=tobe,
                    nivel_brechas=brechas,
                    nivel_roadmap=roadmap,
                    assigned_by_user_id=admin.id,
                )
            else:
                membership.project_permission_level = project_level
                membership.nivel_asis = asis
                membership.nivel_tobe = tobe
                membership.nivel_brechas = brechas
                membership.nivel_roadmap = roadmap
                db.flush()

        ensure_membership(
            consultant.id,
            project_level=5,
            asis=5,
            tobe=5,
            brechas=5,
            roadmap=5,
        )
        ensure_membership(
            company.id,
            project_level=4,
            asis=2,
            tobe=2,
            brechas=2,
            roadmap=2,
        )
        ensure_membership(
            readonly.id,
            project_level=1,
            asis=1,
            tobe=1,
            brechas=1,
            roadmap=1,
        )

        db.commit()

        print("Seed OK")
        print(f"Project: {project.nombre} ({project.id})")
        print("Users:")
        print("- admin@arqdata.local / Admin12345! (ADMINISTRADOR)")
        print("- consultor@example.com / Consultor123! (CONSULTOR)")
        print("- empresa@example.com / Empresa123! (EMPRESA)")
        print("- lector@example.com / Lector123! (CONSULTOR, lectura)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

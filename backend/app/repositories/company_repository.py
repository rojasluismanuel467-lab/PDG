from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User
from app.core.enums import UserType


class CompanyRepository:
    @staticmethod
    def create(db: Session, *, company: Company) -> Company:
        db.add(company)
        db.flush()
        db.refresh(company)
        return company

    @staticmethod
    def get_by_id(db: Session, *, company_id: uuid.UUID) -> Company | None:
        return db.execute(
            select(Company).where(Company.id == company_id)
        ).scalar_one_or_none()

    @staticmethod
    def list_companies(
        db: Session, *, search: str | None = None
    ) -> list[Company]:
        stmt = select(Company).order_by(Company.name.asc())
        if search:
            pattern = f"%{search.lower()}%"
            stmt = stmt.where(Company.name.ilike(pattern))
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_empresa_users_by_company(
        db: Session, *, company_id: uuid.UUID
    ) -> list[User]:
        stmt = select(User).where(
            User.company_id == company_id,
            User.tipo_usuario == UserType.EMPRESA,
        )
        return list(db.execute(stmt).scalars().all())

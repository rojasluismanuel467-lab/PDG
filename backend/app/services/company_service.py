from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.enums import UserType
from app.exceptions.domain import ConflictDomainError, ForbiddenDomainError, NotFoundDomainError
from app.models.company import Company
from app.repositories.company_repository import CompanyRepository
from app.schemas.company import (
    CompanyListResponse,
    CompanyResponse,
    CreateCompanyRequest,
)


class CompanyService:
    @staticmethod
    def _to_response(company: Company) -> CompanyResponse:
        return CompanyResponse(
            id=company.id,
            name=company.name,
            contact_email=company.contact_email,
            created_at=company.created_at,
            updated_at=company.updated_at,
        )

    @classmethod
    def create_company(
        cls,
        db: Session,
        *,
        actor_user_type: UserType,
        payload: CreateCompanyRequest,
    ) -> CompanyResponse:
        if actor_user_type not in {UserType.ADMINISTRADOR, UserType.CONSULTOR}:
            raise ForbiddenDomainError("Only ADMINISTRADOR or CONSULTOR can create companies")

        company = Company(
            name=payload.name.strip(),
            contact_email=payload.contact_email.lower().strip(),
        )
        created = CompanyRepository.create(db, company=company)
        db.commit()
        return cls._to_response(created)

    @classmethod
    def list_companies(
        cls,
        db: Session,
        *,
        search: str | None,
    ) -> CompanyListResponse:
        items = CompanyRepository.list_companies(db, search=search)
        return CompanyListResponse(
            total=len(items),
            items=[cls._to_response(c) for c in items],
        )

    @classmethod
    def get_company(
        cls,
        db: Session,
        *,
        company_id,
    ) -> CompanyResponse:
        company = CompanyRepository.get_by_id(db, company_id=company_id)
        if company is None:
            raise NotFoundDomainError("Company not found")
        return cls._to_response(company)

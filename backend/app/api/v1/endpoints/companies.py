import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import CurrentUser, require_admin_or_consultant, get_current_user
from app.dependencies.db import get_db
from app.schemas.company import CompanyListResponse, CompanyResponse, CreateCompanyRequest
from app.services.company_service import CompanyService

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=CompanyListResponse)
def list_companies(
    search: str | None = Query(default=None, min_length=1, max_length=255),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_consultant),
) -> CompanyListResponse:
    return CompanyService.list_companies(db, search=search)


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CreateCompanyRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin_or_consultant),
) -> CompanyResponse:
    return CompanyService.create_company(
        db,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_admin_or_consultant),
) -> CompanyResponse:
    return CompanyService.get_company(db, company_id=company_id)

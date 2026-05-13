from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    contact_email: str
    created_at: datetime
    updated_at: datetime


class CompanyListResponse(BaseModel):
    total: int
    items: list[CompanyResponse]


class CreateCompanyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    contact_email: str = Field(min_length=1, max_length=255)

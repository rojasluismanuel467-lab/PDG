from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import MaturityResponseStatus, MaturityValidationStatus, ProjectBlock


class SubdomainResponse(BaseModel):
    id: int
    name: str
    description: str
    weight: float


class RoleCatalogResponse(BaseModel):
    id: str
    name: str
    description: str
    is_system: bool = False


class RoleCatalogUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=2, max_length=500)


class ScoreCriteriaItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score: int = Field(ge=0)
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=5, max_length=800)


class DimensionWithSubdomainsResponse(BaseModel):
    id: int
    name: str
    description: str
    weight: float
    subdomains: list[SubdomainResponse]


class QuestionConfigRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dimension_id: int
    subdomain_id: int
    text: str = Field(min_length=5, max_length=5000)
    applicable_roles: list[str] = Field(min_length=1)
    weight: float = Field(default=1.0, gt=0, le=5)
    score_criteria: list[ScoreCriteriaItem] = Field(default_factory=list)


class QuestionnaireConfigUpsertRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phase: ProjectBlock = ProjectBlock.AS_IS
    questions: list[QuestionConfigRequest]
    dimension_weights: dict[int, float] = Field(default_factory=dict)
    roles: list[RoleCatalogUpsertRequest] = Field(default_factory=list)
    score_criteria: list[ScoreCriteriaItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def ensure_phase_is_as_is(self) -> QuestionnaireConfigUpsertRequest:
        if self.phase != ProjectBlock.AS_IS:
            raise ValueError("Only AS_IS phase is supported for maturity questionnaire")
        return self


class QuestionResponse(BaseModel):
    id: UUID
    dimension_id: int
    subdomain_id: int
    text: str
    applicable_roles: list[str]
    weight: float
    score_criteria: list[ScoreCriteriaItem] = Field(default_factory=list)


class QuestionnaireConfigResponse(BaseModel):
    project_id: UUID
    phase: ProjectBlock
    roles: list[RoleCatalogResponse]
    score_criteria: list[ScoreCriteriaItem]
    dimensions: list[DimensionWithSubdomainsResponse]
    template_questions: list[QuestionResponse]
    questions: list[QuestionResponse]
    is_closed: bool
    access_code: str | None = None
    access_expires_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SubmitAnswerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: UUID
    score: int = Field(ge=0)
    evidencia_url: str | None = None
    evidencia_nombre: str | None = Field(default=None, max_length=500)
    evidencia_tipo: str | None = Field(default=None, max_length=255)
    evidencia_size: int | None = Field(default=None, ge=0)
    respondent_comentarios: str | None = Field(default=None, max_length=10000)


class SubmitResponseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    respondent_name: str = Field(min_length=2, max_length=255)
    respondent_email: str = Field(min_length=3, max_length=255)
    role: str = Field(min_length=2, max_length=100)
    answers: list[SubmitAnswerRequest] = Field(min_length=1)


class ValidateAnswerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    validated_score: int = Field(ge=0)
    validacion_comentarios: str | None = None


class FinalizeEvaluationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmation: bool = True


class AnularResponseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=3, max_length=5000)


class UpdateQuestionnaireStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_closed: bool


class AnswerResponse(BaseModel):
    id: UUID
    question_id: UUID
    question_text: str | None = None
    score: int
    respondent_score: int
    validated_score: int | None
    evidencia_url: str | None
    evidencia_nombre: str | None
    evidencia_tipo: str | None
    evidencia_size: int | None
    respondent_comentarios: str | None
    estado_validacion: MaturityValidationStatus
    validacion_comentarios: str | None


class ResponseDTO(BaseModel):
    id: UUID
    respondent_name: str
    respondent_email: str
    role: str
    answers: list[AnswerResponse]
    status: MaturityResponseStatus
    anulation_reason: str | None
    anulated_at: datetime | None
    anulated_by: UUID | None
    submitted_at: datetime
    estado_validacion: MaturityValidationStatus
    validado_por: UUID | None
    validado_en: datetime | None
    validacion_comentarios: str | None


class ResponseListResponse(BaseModel):
    responses: list[ResponseDTO]
    total: int
    active: int
    anuladas: int
    pendientes_validacion: int
    validadas: int


class SubmitResponseSuccess(BaseModel):
    id: UUID
    message: str
    submitted_at: datetime


class EvidenceUploadResponse(BaseModel):
    evidencia_url: str
    evidencia_nombre: str
    evidencia_tipo: str
    evidencia_size: int


class QuestionnaireStatusResponse(BaseModel):
    project_id: UUID
    is_closed: bool
    updated_at: datetime


class SubdomainResultResponse(BaseModel):
    subdomain_id: int
    subdomain_name: str
    score: float
    percent: float
    question_count: int
    validated_question_count: int


class DimensionResultResponse(BaseModel):
    dimension_id: int
    dimension_name: str
    score: float
    percent: float
    weight: float
    maturity_level: str
    question_count: int
    validated_question_count: int
    subdomains: list[SubdomainResultResponse]


class QuestionnaireResultsResponse(BaseModel):
    overall_score: float
    overall_percent: float
    maturity_level: str
    dimensions: list[DimensionResultResponse]
    respondent_count: int
    validated_response_count: int
    calculated_at: datetime


class PublicQuestionnaireValidationResponse(BaseModel):
    valid: bool
    questionnaire_id: UUID | None = None
    project_id: UUID | None = None
    project_name: str | None = None
    is_closed: bool | None = None
    expires_at: datetime | None = None
    error: str | None = None

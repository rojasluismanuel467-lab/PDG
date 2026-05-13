from __future__ import annotations

import mimetypes
import os
import secrets
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from urllib.parse import quote

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import (
    MaturityResponseStatus,
    MaturityValidationStatus,
    PermissionLevel,
    ProjectBlock,
    UserType,
)
from app.core.maturity_questionnaire_catalog import (
    DAMA_ROLE_CATALOG,
    MATURITY_SCORE_CRITERIA_DEFAULT,
    QUESTION_TEMPLATE_CATALOG,
)
from app.core.permissions import QUESTIONNAIRE_ARTIFACT_CODE
from app.exceptions.domain import (
    ConflictDomainError,
    ForbiddenDomainError,
    NotFoundDomainError,
    ValidationDomainError,
)
from app.models.maturity_answer import MaturityAnswer
from app.models.maturity_question import MaturityQuestion
from app.models.maturity_questionnaire import MaturityQuestionnaire
from app.models.maturity_response import MaturityResponse
from app.models.project_artifact import ProjectArtifact
from app.models.project_membership import ProjectMembership
from app.repositories.maturity_questionnaire_repository import MaturityQuestionnaireRepository
from app.schemas.maturity_questionnaire import (
    AnswerResponse,
    AnularResponseRequest,
    DimensionResultResponse,
    DimensionWithSubdomainsResponse,
    EvidenceUploadResponse,
    FinalizeEvaluationRequest,
    PublicQuestionnaireValidationResponse,
    QuestionConfigRequest,
    QuestionnaireConfigResponse,
    QuestionnaireConfigUpsertRequest,
    QuestionnaireResultsResponse,
    QuestionnaireStatusResponse,
    ResponseDTO,
    ResponseListResponse,
    RoleCatalogResponse,
    RoleCatalogUpsertRequest,
    ScoreCriteriaItem,
    SubdomainResponse,
    SubdomainResultResponse,
    SubmitResponseRequest,
    SubmitResponseSuccess,
    UpdateQuestionnaireStatusRequest,
    ValidateAnswerRequest,
)


class MaturityQuestionnaireService:
    ACCESS_CODE_TTL_DAYS = 30
    MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EVIDENCE_EXTENSIONS = {
        ".pdf",
        ".txt",
        ".csv",
        ".tsv",
        ".json",
        ".xml",
        ".md",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
    }

    @staticmethod
    def _to_float(value: Decimal | float | int) -> float:
        return float(value)

    @staticmethod
    def _answer_score(answer: MaturityAnswer) -> int:
        return (
            answer.validated_score
            if answer.validated_score is not None
            else answer.respondent_score
        )

    @classmethod
    def _dimension_weight_override_map(
        cls, *, questionnaire: MaturityQuestionnaire | None
    ) -> dict[int, float]:
        if questionnaire is None or not questionnaire.dimension_weights_override:
            return {}

        overrides: dict[int, float] = {}
        for key, value in questionnaire.dimension_weights_override.items():
            try:
                dimension_id = int(key)
            except (TypeError, ValueError):
                continue
            if value is None:
                continue
            try:
                parsed = float(value)
            except (TypeError, ValueError):
                continue
            if parsed > 0:
                overrides[dimension_id] = parsed
        return overrides

    @staticmethod
    def _maturity_level(score: float) -> str:
        if score <= 0:
            return "No evaluado"
        if score < 1.5:
            return "Inicial"
        if score < 2.5:
            return "Repetible"
        if score < 3.5:
            return "Definido"
        if score < 4.5:
            return "Gestionado"
        return "Optimizado"

    @staticmethod
    def _generate_access_code(db: Session) -> str:
        while True:
            code = secrets.token_urlsafe(9).replace("-", "").replace("_", "").upper()[:12]
            if MaturityQuestionnaireRepository.count_access_code(db, access_code=code) == 0:
                return code

    @classmethod
    def _catalog_dimensions(
        cls,
        db: Session,
        *,
        weight_overrides: dict[int, float] | None = None,
    ) -> list[DimensionWithSubdomainsResponse]:
        dimensions = MaturityQuestionnaireRepository.list_dimensions(db)
        override_map = weight_overrides or {}
        return [
            DimensionWithSubdomainsResponse(
                id=dimension.id,
                name=dimension.name,
                description=dimension.description,
                weight=override_map.get(dimension.id, cls._to_float(dimension.weight)),
                subdomains=[
                    SubdomainResponse(
                        id=subdomain.id,
                        name=subdomain.name,
                        description=subdomain.description,
                        weight=cls._to_float(subdomain.weight),
                    )
                    for subdomain in sorted(
                        dimension.subdomains, key=lambda item: item.display_order
                    )
                ],
            )
            for dimension in dimensions
        ]

    @staticmethod
    def _catalog_roles() -> list[RoleCatalogResponse]:
        return [
            RoleCatalogResponse(
                id=role["id"],
                name=role["name"],
                description=role["description"],
                is_system=True,
            )
            for role in DAMA_ROLE_CATALOG
        ]

    @classmethod
    def _catalog_roles_with_overrides(
        cls,
        *,
        questionnaire: MaturityQuestionnaire | None,
    ) -> list[RoleCatalogResponse]:
        role_map: dict[str, RoleCatalogResponse] = {role.id: role for role in cls._catalog_roles()}

        if questionnaire is None or not questionnaire.custom_roles_override:
            return list(role_map.values())

        for raw_role in questionnaire.custom_roles_override:
            role_id = str(raw_role.get("id", "")).strip()
            if not role_id:
                continue
            role_map[role_id] = RoleCatalogResponse(
                id=role_id,
                name=str(raw_role.get("name", role_id)).strip() or role_id,
                description=str(raw_role.get("description", role_id)).strip() or role_id,
                is_system=False,
            )
        return list(role_map.values())

    @staticmethod
    def _template_question_responses() -> list[dict[str, object]]:
        return [
            {
                "id": uuid.UUID(int=int(template["template_id"])),
                "dimension_id": int(template["dimension_id"]),
                "subdomain_id": int(template["subdomain_id"]),
                "text": str(template["text"]),
                "applicable_roles": list(template["applicable_roles"]),
                "weight": float(template["weight"]),
                "score_criteria": [
                    {
                        "score": int(item["score"]),
                        "name": str(item["name"]),
                        "description": str(item["description"]),
                    }
                    for item in MATURITY_SCORE_CRITERIA_DEFAULT
                ],
            }
            for template in QUESTION_TEMPLATE_CATALOG
        ]

    @staticmethod
    def _default_score_criteria() -> list[ScoreCriteriaItem]:
        return [
            ScoreCriteriaItem(
                score=int(item["score"]),
                name=str(item["name"]),
                description=str(item["description"]),
            )
            for item in MATURITY_SCORE_CRITERIA_DEFAULT
        ]

    @staticmethod
    def _is_valid_score_criteria_set(criteria: list[ScoreCriteriaItem]) -> bool:
        if len(criteria) < 2:
            return False
        scores = [item.score for item in criteria]
        return len(scores) == len(set(scores))

    @classmethod
    def _score_criteria_with_overrides(
        cls,
        *,
        questionnaire: MaturityQuestionnaire | None,
    ) -> list[ScoreCriteriaItem]:
        if questionnaire is None or not questionnaire.score_criteria_override:
            return cls._default_score_criteria()

        parsed: list[ScoreCriteriaItem] = []
        for raw_item in questionnaire.score_criteria_override:
            try:
                parsed.append(
                    ScoreCriteriaItem(
                        score=int(raw_item.get("score", -1)),
                        name=str(raw_item.get("name", "")).strip(),
                        description=str(raw_item.get("description", "")).strip(),
                    )
                )
            except Exception:
                continue

        if not cls._is_valid_score_criteria_set(parsed):
            return cls._default_score_criteria()

        return sorted(parsed, key=lambda item: item.score)

    @classmethod
    def _sanitize_score_criteria(
        cls,
        criteria: list[ScoreCriteriaItem] | None,
    ) -> list[dict[str, int | str]]:
        if not criteria:
            return []
        if len(criteria) < 2:
            raise ValidationDomainError(
                "Each question score criteria must define at least 2 entries"
            )
        scores = [item.score for item in criteria]
        if len(scores) != len(set(scores)):
            raise ValidationDomainError(
                "Each question score criteria must include unique score values"
            )
        return [
            {
                "score": int(item.score),
                "name": item.name.strip(),
                "description": item.description.strip(),
            }
            for item in sorted(criteria, key=lambda item: item.score)
        ]

    @classmethod
    def _question_score_criteria(
        cls,
        *,
        question: MaturityQuestion | None,
        questionnaire: MaturityQuestionnaire | None,
    ) -> list[ScoreCriteriaItem]:
        if question is not None and question.score_criteria_override:
            raw = question.score_criteria_override
            parsed: list[ScoreCriteriaItem] = []
            for item in raw:
                try:
                    parsed.append(
                        ScoreCriteriaItem(
                            score=int(item.get("score", -1)),
                            name=str(item.get("name", "")).strip(),
                            description=str(item.get("description", "")).strip(),
                        )
                    )
                except Exception:
                    continue
            if cls._is_valid_score_criteria_set(parsed):
                return sorted(parsed, key=lambda entry: entry.score)
        return cls._score_criteria_with_overrides(questionnaire=questionnaire)

    @classmethod
    def _question_allowed_scores(
        cls,
        *,
        question: MaturityQuestion,
        questionnaire: MaturityQuestionnaire | None,
    ) -> set[int]:
        return {
            item.score
            for item in cls._question_score_criteria(
                question=question,
                questionnaire=questionnaire,
            )
        }

    @staticmethod
    def _build_template_questions(*, questionnaire_id: uuid.UUID) -> list[MaturityQuestion]:
        return [
            MaturityQuestion(
                questionnaire_id=questionnaire_id,
                dimension_id=int(template["dimension_id"]),
                subdomain_id=int(template["subdomain_id"]),
                text=str(template["text"]).strip(),
                applicable_roles=list(template["applicable_roles"]),
                score_criteria_override=[],
                weight=float(template["weight"]),
                is_active=True,
            )
            for template in QUESTION_TEMPLATE_CATALOG
        ]

    @classmethod
    def initialize_default_questionnaire(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        created_by_user_id: uuid.UUID,
    ) -> MaturityQuestionnaire:
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire(db, project_id=project_id)
        if questionnaire is not None:
            return questionnaire

        questionnaire = MaturityQuestionnaire(
            project_id=project_id,
            phase=ProjectBlock.AS_IS,
            is_closed=False,
            access_code=cls._generate_access_code(db),
            access_expires_at=datetime.now(UTC) + timedelta(days=cls.ACCESS_CODE_TTL_DAYS),
            created_by_user_id=created_by_user_id,
        )
        questionnaire = MaturityQuestionnaireRepository.create_questionnaire(
            db, questionnaire=questionnaire
        )
        MaturityQuestionnaireRepository.replace_questions(
            db,
            questionnaire=questionnaire,
            questions=cls._build_template_questions(questionnaire_id=questionnaire.id),
        )
        db.flush()
        return questionnaire

    @classmethod
    def _require_project_access(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        minimum_level: PermissionLevel,
    ) -> None:
        project = MaturityQuestionnaireRepository.get_project_by_id(db, project_id=project_id)
        if project is None:
            raise NotFoundDomainError("Project not found")
        if project.manager_user_id == actor_user_id:
            return

        membership = MaturityQuestionnaireRepository.get_membership(
            db,
            project_id=project_id,
            user_id=actor_user_id,
        )
        if membership is None:
            raise ForbiddenDomainError("You are not a member of this project")

        # EMPRESA and CONSULTOR users are added as members so they can read
        # and approve the questionnaire. Their nivel_asis might be initialised
        # to 0 (SIN_ACCESO) which would otherwise block them. Grant them
        # implicit APROBAR access so they can fulfil their role.
        if actor_user_type in {UserType.EMPRESA, UserType.CONSULTOR}:
            if int(minimum_level) <= int(PermissionLevel.APROBAR):
                return
            if actor_user_type == UserType.EMPRESA:
                raise ForbiddenDomainError(
                    "EMPRESA users do not have sufficient permission for this operation"
                )

        artifact = MaturityQuestionnaireRepository.get_artifact_by_code(
            db,
            project_id=project_id,
            artifact_code=QUESTIONNAIRE_ARTIFACT_CODE,
        )
        current_level = cls._resolve_effective_questionnaire_permission(
            db,
            actor_user_id=actor_user_id,
            membership=membership,
            artifact=artifact,
        )
        if current_level < int(minimum_level):
            raise ForbiddenDomainError(
                f"Insufficient permission in questionnaire: required {int(minimum_level)}, current {current_level}"
            )

    @staticmethod
    def _resolve_effective_questionnaire_permission(
        db: Session,
        *,
        actor_user_id: uuid.UUID,
        membership: ProjectMembership,
        artifact: ProjectArtifact | None,
    ) -> int:
        if artifact is not None:
            artifact_permission = MaturityQuestionnaireRepository.get_artifact_permission(
                db,
                artifact_id=artifact.id,
                user_id=actor_user_id,
            )
            if artifact_permission is not None:
                return int(artifact_permission.permission_level)

        block_level = membership.nivel_asis
        if block_level is not None:
            return int(block_level)

        if membership.project_permission_level is not None:
            return int(membership.project_permission_level)

        return int(PermissionLevel.SIN_ACCESO)

    @staticmethod
    def _require_consultant_role(*, actor_user_type: UserType) -> None:
        if actor_user_type not in {UserType.CONSULTOR, UserType.ADMINISTRADOR}:
            raise ForbiddenDomainError(
                "Only consultor users can manage questionnaire configuration"
            )

    @classmethod
    def _to_response_dto(cls, response: MaturityResponse) -> ResponseDTO:
        answers = sorted(response.answers, key=lambda item: item.created_at)
        return ResponseDTO(
            id=response.id,
            respondent_name=response.respondent_name,
            respondent_email=response.respondent_email,
            role=response.role,
            answers=[
                AnswerResponse(
                    id=answer.id,
                    question_id=answer.question_id,
                    question_text=answer.question.text if answer.question is not None else None,
                    score=cls._answer_score(answer),
                    respondent_score=answer.respondent_score,
                    validated_score=answer.validated_score,
                    evidencia_url=answer.evidence_url,
                    evidencia_nombre=answer.evidence_name,
                    evidencia_tipo=answer.evidence_type,
                    evidencia_size=answer.evidence_size,
                    respondent_comentarios=answer.respondent_comments,
                    estado_validacion=answer.estado_validacion,
                    validacion_comentarios=answer.validation_comments,
                )
                for answer in answers
            ],
            status=response.status,
            anulation_reason=response.anulation_reason,
            anulated_at=response.anulated_at,
            anulated_by=response.anulated_by_user_id,
            submitted_at=response.submitted_at,
            estado_validacion=response.estado_validacion,
            validado_por=response.validated_by_user_id,
            validado_en=response.validated_at,
            validacion_comentarios=response.validation_comments,
        )

    @staticmethod
    def _response_status_from_answers(answers: list[MaturityAnswer]) -> MaturityValidationStatus:
        statuses = [answer.estado_validacion for answer in answers]
        if not statuses or any(status == MaturityValidationStatus.PENDIENTE for status in statuses):
            return MaturityValidationStatus.PENDIENTE
        if all(status == MaturityValidationStatus.APROBADA for status in statuses):
            return MaturityValidationStatus.APROBADA
        if all(status == MaturityValidationStatus.RECHAZADA for status in statuses):
            return MaturityValidationStatus.RECHAZADA
        return MaturityValidationStatus.EN_REVISION

    @classmethod
    def _to_questionnaire_config_response(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        questionnaire: MaturityQuestionnaire | None,
    ) -> QuestionnaireConfigResponse:
        questions = []
        is_closed = False
        access_code = None
        access_expires_at = None
        created_at = None
        updated_at = None

        if questionnaire is not None:
            questions = [
                {
                    "id": question.id,
                    "dimension_id": question.dimension_id,
                    "subdomain_id": question.subdomain_id,
                    "text": question.text,
                    "applicable_roles": question.applicable_roles,
                    "weight": cls._to_float(question.weight),
                    "score_criteria": cls._question_score_criteria(
                        question=question,
                        questionnaire=questionnaire,
                    ),
                }
                for question in sorted(questionnaire.questions, key=lambda item: item.created_at)
                if question.is_active
            ]
            is_closed = questionnaire.is_closed
            access_code = questionnaire.access_code
            access_expires_at = questionnaire.access_expires_at
            created_at = questionnaire.created_at
            updated_at = questionnaire.updated_at

        dimension_weight_overrides = cls._dimension_weight_override_map(questionnaire=questionnaire)
        catalog_roles = cls._catalog_roles_with_overrides(questionnaire=questionnaire)
        score_criteria = cls._score_criteria_with_overrides(questionnaire=questionnaire)

        return QuestionnaireConfigResponse(
            project_id=project_id,
            phase=ProjectBlock.AS_IS,
            roles=catalog_roles,
            score_criteria=score_criteria,
            dimensions=cls._catalog_dimensions(db, weight_overrides=dimension_weight_overrides),
            template_questions=cls._template_question_responses(),
            questions=questions,
            is_closed=is_closed,
            access_code=access_code,
            access_expires_at=access_expires_at,
            created_at=created_at,
            updated_at=updated_at,
        )

    @classmethod
    def _build_question_model(
        cls,
        *,
        questionnaire_id: uuid.UUID,
        payload: QuestionConfigRequest,
        dimension_ids: set[int],
        subdomain_dimension_map: dict[int, int],
        allowed_role_ids: set[str] | None = None,
    ) -> MaturityQuestion:
        if payload.dimension_id not in dimension_ids:
            raise ValidationDomainError(f"Unknown dimension_id: {payload.dimension_id}")
        mapped_dimension = subdomain_dimension_map.get(payload.subdomain_id)
        if mapped_dimension is None:
            raise ValidationDomainError(f"Unknown subdomain_id: {payload.subdomain_id}")
        if mapped_dimension != payload.dimension_id:
            raise ValidationDomainError(
                f"Subdomain {payload.subdomain_id} does not belong to dimension {payload.dimension_id}"
            )

        roles = [role.strip() for role in payload.applicable_roles if role.strip()]
        if not roles:
            raise ValidationDomainError("Each question must define at least one applicable role")
        if allowed_role_ids is not None:
            undefined_roles = [role for role in roles if role not in allowed_role_ids]
            if undefined_roles:
                raise ValidationDomainError(
                    f"Undefined role ids in question configuration: {undefined_roles}"
                )

        return MaturityQuestion(
            questionnaire_id=questionnaire_id,
            dimension_id=payload.dimension_id,
            subdomain_id=payload.subdomain_id,
            text=payload.text.strip(),
            applicable_roles=roles,
            score_criteria_override=cls._sanitize_score_criteria(payload.score_criteria),
            weight=payload.weight,
            is_active=True,
        )

    @classmethod
    def get_config(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
    ) -> QuestionnaireConfigResponse:
        cls._require_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.LECTURA,
        )
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire(db, project_id=project_id)
        if questionnaire is None:
            questionnaire = cls.initialize_default_questionnaire(
                db,
                project_id=project_id,
                created_by_user_id=actor_user_id,
            )
            db.commit()
            questionnaire = MaturityQuestionnaireRepository.get_questionnaire(
                db, project_id=project_id
            )
        return cls._to_questionnaire_config_response(
            db, project_id=project_id, questionnaire=questionnaire
        )

    @classmethod
    def upsert_config(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: QuestionnaireConfigUpsertRequest,
    ) -> QuestionnaireConfigResponse:
        cls._require_consultant_role(actor_user_type=actor_user_type)
        cls._require_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.EDITAR,
        )
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire(db, project_id=project_id)
        if questionnaire is None:
            questionnaire = cls.initialize_default_questionnaire(
                db,
                project_id=project_id,
                created_by_user_id=actor_user_id,
            )

        system_roles = cls._catalog_roles()
        system_role_ids = {role.id for role in system_roles}
        role_map: dict[str, RoleCatalogResponse] = {
            role.id: role for role in cls._catalog_roles_with_overrides(questionnaire=questionnaire)
        }
        if payload.roles:
            role_map = {role.id: role for role in system_roles}
            for role_payload in payload.roles:
                sanitized_role = RoleCatalogUpsertRequest(
                    id=role_payload.id.strip(),
                    name=role_payload.name.strip(),
                    description=role_payload.description.strip(),
                )
                role_map[sanitized_role.id] = RoleCatalogResponse(
                    id=sanitized_role.id,
                    name=sanitized_role.name,
                    description=sanitized_role.description,
                    is_system=sanitized_role.id in system_role_ids,
                )
            questionnaire.custom_roles_override = [
                {
                    "id": role.id,
                    "name": role.name,
                    "description": role.description,
                }
                for role in role_map.values()
                if not role.is_system
            ]
        allowed_role_ids = set(role_map.keys())

        dimension_ids = set(MaturityQuestionnaireRepository.get_dimension_map(db).keys())
        subdomain_map = MaturityQuestionnaireRepository.get_subdomain_map(db)
        subdomain_dimension_map = {
            subdomain_id: subdomain.dimension_id
            for subdomain_id, subdomain in subdomain_map.items()
        }
        questions = [
            cls._build_question_model(
                questionnaire_id=questionnaire.id,
                payload=question_payload,
                dimension_ids=dimension_ids,
                subdomain_dimension_map=subdomain_dimension_map,
                allowed_role_ids=allowed_role_ids,
            )
            for question_payload in payload.questions
        ]
        if payload.dimension_weights:
            invalid_dimension_ids = [
                dimension_id
                for dimension_id in payload.dimension_weights
                if dimension_id not in dimension_ids
            ]
            if invalid_dimension_ids:
                raise ValidationDomainError(
                    f"Unknown dimension ids in dimension_weights: {invalid_dimension_ids}"
                )
            invalid_weights = [
                weight for weight in payload.dimension_weights.values() if weight <= 0 or weight > 5
            ]
            if invalid_weights:
                raise ValidationDomainError(
                    "All dimension weights must be greater than 0 and less than or equal to 5"
                )

            questionnaire.dimension_weights_override = {
                str(dimension_id): float(weight)
                for dimension_id, weight in payload.dimension_weights.items()
            }

        if payload.score_criteria:
            if len(payload.score_criteria) < 2:
                raise ValidationDomainError("Score criteria must define at least 2 entries")
            scores = [item.score for item in payload.score_criteria]
            if len(scores) != len(set(scores)):
                raise ValidationDomainError(
                    "Score criteria must include unique score values"
                )

            questionnaire.score_criteria_override = [
                {
                    "score": int(item.score),
                    "name": item.name.strip(),
                    "description": item.description.strip(),
                }
                for item in sorted(payload.score_criteria, key=lambda item: item.score)
            ]
        MaturityQuestionnaireRepository.replace_questions(
            db, questionnaire=questionnaire, questions=questions
        )
        db.commit()
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire(db, project_id=project_id)
        return cls._to_questionnaire_config_response(
            db, project_id=project_id, questionnaire=questionnaire
        )

    @classmethod
    def update_status(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: UpdateQuestionnaireStatusRequest,
    ) -> QuestionnaireStatusResponse:
        cls._require_consultant_role(actor_user_type=actor_user_type)
        cls._require_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.APROBAR,
        )
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire(db, project_id=project_id)
        if questionnaire is None:
            raise NotFoundDomainError("Questionnaire not configured for project")
        artifact = MaturityQuestionnaireRepository.get_artifact_by_code(
            db,
            project_id=project_id,
            artifact_code=QUESTIONNAIRE_ARTIFACT_CODE,
        )
        if (
            payload.is_closed is False
            and artifact is not None
            and artifact.consultant_approved
        ):
            raise ForbiddenDomainError(
                "Approved questionnaire cannot be reopened for new responses"
            )

        questionnaire.is_closed = payload.is_closed
        questionnaire.closed_at = datetime.now(UTC) if payload.is_closed else None
        questionnaire.closed_by_user_id = actor_user_id if payload.is_closed else None
        db.commit()
        db.refresh(questionnaire)
        return QuestionnaireStatusResponse(
            project_id=project_id,
            is_closed=questionnaire.is_closed,
            updated_at=questionnaire.updated_at,
        )

    @classmethod
    def validate_public_access(
        cls, db: Session, *, access_code: str
    ) -> PublicQuestionnaireValidationResponse:
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire_by_code(
            db, access_code=access_code
        )
        if questionnaire is None:
            return PublicQuestionnaireValidationResponse(valid=False, error="Código inválido")
        if questionnaire.access_expires_at and datetime.now(UTC) > questionnaire.access_expires_at:
            return PublicQuestionnaireValidationResponse(valid=False, error="Código expirado")

        project = MaturityQuestionnaireRepository.get_project_by_id(
            db, project_id=questionnaire.project_id
        )
        return PublicQuestionnaireValidationResponse(
            valid=not questionnaire.is_closed,
            questionnaire_id=questionnaire.id,
            project_id=questionnaire.project_id,
            project_name=project.nombre if project else None,
            is_closed=questionnaire.is_closed,
            expires_at=questionnaire.access_expires_at,
            error="Cuestionario cerrado" if questionnaire.is_closed else None,
        )

    @classmethod
    def get_public_config(
        cls,
        db: Session,
        *,
        access_code: str,
    ) -> QuestionnaireConfigResponse:
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire_by_code(
            db, access_code=access_code
        )
        if questionnaire is None:
            raise NotFoundDomainError("Questionnaire access code not found")
        if questionnaire.is_closed:
            raise ForbiddenDomainError("Questionnaire is closed")
        if questionnaire.access_expires_at and datetime.now(UTC) > questionnaire.access_expires_at:
            raise ForbiddenDomainError("Questionnaire access code expired")
        return cls._to_questionnaire_config_response(
            db,
            project_id=questionnaire.project_id,
            questionnaire=questionnaire,
        )

    @classmethod
    def submit_response(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        access_code: str,
        payload: SubmitResponseRequest,
    ) -> SubmitResponseSuccess:
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire_by_code(
            db, access_code=access_code
        )
        if questionnaire is None or questionnaire.project_id != project_id:
            raise NotFoundDomainError("Questionnaire access code not found")
        artifact = MaturityQuestionnaireRepository.get_artifact_by_code(
            db,
            project_id=questionnaire.project_id,
            artifact_code=QUESTIONNAIRE_ARTIFACT_CODE,
        )
        if artifact is not None and artifact.consultant_approved:
            raise ForbiddenDomainError(
                "Questionnaire finalized by consultant and closed for new responses"
            )
        if questionnaire.is_closed:
            raise ForbiddenDomainError("Questionnaire is closed")
        if questionnaire.access_expires_at and datetime.now(UTC) > questionnaire.access_expires_at:
            raise ForbiddenDomainError("Questionnaire access code expired")
        if not questionnaire.questions:
            raise ConflictDomainError("Questionnaire has no configured questions")

        existing_emails = {
            response.respondent_email.lower() for response in questionnaire.responses
        }
        if payload.respondent_email.lower() in existing_emails:
            raise ConflictDomainError("A response with this email already exists")

        respondent_role = payload.role.strip()
        question_map = {
            question.id: question for question in questionnaire.questions if question.is_active
        }
        applicable_question_map = {
            question.id: question
            for question in question_map.values()
            if respondent_role in question.applicable_roles
        }
        if not applicable_question_map:
            raise ValidationDomainError("No active questions found for selected role")

        payload_question_ids = {answer.question_id for answer in payload.answers}
        if payload_question_ids != set(applicable_question_map.keys()):
            raise ValidationDomainError(
                "Answers must cover exactly the questions assigned to respondent role"
            )
        if any(
            not answer.evidencia_url
            or not answer.evidencia_nombre
            or not answer.evidencia_tipo
            or answer.evidencia_size is None
            or answer.evidencia_size <= 0
            for answer in payload.answers
        ):
            raise ValidationDomainError("Evidence file is required for every answer")

        submitted_at = datetime.now(UTC)
        for answer in payload.answers:
            question = applicable_question_map[answer.question_id]
            allowed_scores = cls._question_allowed_scores(
                question=question,
                questionnaire=questionnaire,
            )
            if answer.score not in allowed_scores:
                raise ValidationDomainError(
                    f"Invalid score {answer.score} for question {answer.question_id}. "
                    "Score must match the configured scale for that question."
                )

        response = MaturityResponse(
            questionnaire_id=questionnaire.id,
            respondent_name=payload.respondent_name.strip(),
            respondent_email=payload.respondent_email.strip().lower(),
            role=respondent_role,
            status=MaturityResponseStatus.ACTIVE,
            estado_validacion=MaturityValidationStatus.PENDIENTE,
            submitted_at=submitted_at,
        )
        response = MaturityQuestionnaireRepository.create_response(db, response=response)
        answers = [
            MaturityAnswer(
                response_id=response.id,
                question_id=answer_payload.question_id,
                respondent_score=answer_payload.score,
                validated_score=None,
                estado_validacion=MaturityValidationStatus.PENDIENTE,
                validation_comments=None,
                respondent_comments=(
                    answer_payload.respondent_comentarios.strip()
                    if answer_payload.respondent_comentarios
                    else None
                ),
                evidence_url=answer_payload.evidencia_url,
                evidence_name=answer_payload.evidencia_nombre,
                evidence_type=answer_payload.evidencia_tipo,
                evidence_size=answer_payload.evidencia_size,
            )
            for answer_payload in payload.answers
        ]
        MaturityQuestionnaireRepository.create_answers(db, answers=answers)
        db.commit()
        return SubmitResponseSuccess(
            id=response.id, message="Respuestas guardadas exitosamente", submitted_at=submitted_at
        )

    @classmethod
    async def upload_evidence(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        access_code: str,
        file: UploadFile,
    ) -> EvidenceUploadResponse:
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire_by_code(
            db, access_code=access_code
        )
        if questionnaire is None or questionnaire.project_id != project_id:
            raise NotFoundDomainError("Questionnaire access code not found")
        if questionnaire.is_closed:
            raise ForbiddenDomainError("Questionnaire is closed")
        if questionnaire.access_expires_at and datetime.now(UTC) > questionnaire.access_expires_at:
            raise ForbiddenDomainError("Questionnaire access code expired")

        original_name = (file.filename or "").strip()
        if not original_name:
            raise ValidationDomainError("Evidence file name is required")

        safe_name = Path(original_name).name
        guessed_content_type = (
            file.content_type or mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
        )
        extension = Path(safe_name).suffix.lower()
        if extension not in cls.ALLOWED_EVIDENCE_EXTENSIONS:
            raise ValidationDomainError(
                "Unsupported evidence file type. Allowed: pdf, txt, csv, tsv, json, xml, md, "
                "doc/docx, xls/xlsx, ppt/pptx, png, jpg/jpeg, gif, webp"
            )

        project_upload_dir = Path(settings.MEDIA_ROOT).resolve() / "questionnaire" / str(project_id)
        project_upload_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid.uuid4().hex}{extension}"
        target_path = project_upload_dir / stored_name

        file_size = 0
        try:
            with target_path.open("wb") as output:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    if file_size > cls.MAX_EVIDENCE_FILE_BYTES:
                        raise ValidationDomainError("Evidence file exceeds 10 MB")
                    output.write(chunk)
        except Exception:
            if target_path.exists():
                os.remove(target_path)
            raise
        finally:
            await file.close()

        relative_path = f"questionnaire/{project_id}/{stored_name}"
        evidence_url = f"{settings.BACKEND_BASE_URL}/media/{quote(relative_path)}"
        return EvidenceUploadResponse(
            evidencia_url=evidence_url,
            evidencia_nombre=safe_name,
            evidencia_tipo=guessed_content_type,
            evidencia_size=file_size,
        )

    @classmethod
    def list_responses(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        status: MaturityResponseStatus | None,
    ) -> ResponseListResponse:
        cls._require_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.LECTURA,
        )
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire(db, project_id=project_id)
        if questionnaire is None:
            return ResponseListResponse(
                responses=[], total=0, active=0, anuladas=0, pendientes_validacion=0, validadas=0
            )

        responses = sorted(
            questionnaire.responses, key=lambda item: item.submitted_at, reverse=True
        )
        if status is not None:
            responses = [response for response in responses if response.status == status]
        response_dtos = [cls._to_response_dto(response) for response in responses]
        return ResponseListResponse(
            responses=response_dtos,
            total=len(responses),
            active=sum(
                1 for response in responses if response.status == MaturityResponseStatus.ACTIVE
            ),
            anuladas=sum(
                1 for response in responses if response.status == MaturityResponseStatus.ANULADA
            ),
            pendientes_validacion=sum(
                1
                for response in responses
                if response.estado_validacion == MaturityValidationStatus.PENDIENTE
            ),
            validadas=sum(
                1
                for response in responses
                if response.estado_validacion == MaturityValidationStatus.APROBADA
            ),
        )

    @classmethod
    def anular_response(
        cls,
        db: Session,
        *,
        response_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: AnularResponseRequest,
    ) -> ResponseDTO:
        response = MaturityQuestionnaireRepository.get_response(db, response_id=response_id)
        if response is None:
            raise NotFoundDomainError("Questionnaire response not found")
        cls._require_consultant_role(actor_user_type=actor_user_type)
        cls._require_project_access(
            db,
            project_id=response.questionnaire.project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.EDITAR,
        )
        if response.status == MaturityResponseStatus.ANULADA:
            raise ConflictDomainError("Response is already annulled")

        response.status = MaturityResponseStatus.ANULADA
        response.anulation_reason = payload.reason.strip()
        response.anulated_at = datetime.now(UTC)
        response.anulated_by_user_id = actor_user_id
        db.commit()
        db.refresh(response)
        return cls._to_response_dto(response)

    @classmethod
    def reactivar_response(
        cls,
        db: Session,
        *,
        response_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
    ) -> ResponseDTO:
        response = MaturityQuestionnaireRepository.get_response(db, response_id=response_id)
        if response is None:
            raise NotFoundDomainError("Questionnaire response not found")
        cls._require_consultant_role(actor_user_type=actor_user_type)
        cls._require_project_access(
            db,
            project_id=response.questionnaire.project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.EDITAR,
        )
        if response.status != MaturityResponseStatus.ANULADA:
            raise ConflictDomainError("Response is not annulled")

        response.status = MaturityResponseStatus.ACTIVE
        response.anulation_reason = None
        response.anulated_at = None
        response.anulated_by_user_id = None
        db.commit()
        db.refresh(response)
        return cls._to_response_dto(response)

    @classmethod
    def validate_answer(
        cls,
        db: Session,
        *,
        response_id: uuid.UUID,
        answer_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: ValidateAnswerRequest,
    ) -> ResponseDTO:
        response = MaturityQuestionnaireRepository.get_response(db, response_id=response_id)
        if response is None:
            raise NotFoundDomainError("Questionnaire response not found")
        cls._require_consultant_role(actor_user_type=actor_user_type)
        cls._require_project_access(
            db,
            project_id=response.questionnaire.project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.APROBAR,
        )
        answer = next((item for item in response.answers if item.id == answer_id), None)
        if answer is None:
            raise NotFoundDomainError("Questionnaire answer not found")
        if response.estado_validacion == MaturityValidationStatus.APROBADA:
            raise ConflictDomainError("Evaluation already finalized and cannot be modified")

        allowed_scores = cls._question_allowed_scores(
            question=answer.question,
            questionnaire=response.questionnaire,
        )
        if payload.validated_score not in allowed_scores:
            raise ValidationDomainError(
                f"Invalid validated score {payload.validated_score} for question {answer.question_id}. "
                "Score must match the configured scale for that question."
            )

        answer.validated_score = payload.validated_score
        answer.validation_comments = payload.validacion_comentarios
        # Draft mode: keep answer/response pending until explicit finalization.
        answer.estado_validacion = MaturityValidationStatus.PENDIENTE
        response.estado_validacion = MaturityValidationStatus.PENDIENTE
        response.validated_by_user_id = None
        response.validated_at = None
        response.validation_comments = None
        db.commit()
        db.refresh(response)
        return cls._to_response_dto(response)

    @classmethod
    def finalize_response_evaluation(
        cls,
        db: Session,
        *,
        response_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
        payload: FinalizeEvaluationRequest,
    ) -> ResponseDTO:
        # Lock the response row to make finalization idempotent under concurrency.
        response = MaturityQuestionnaireRepository.get_response_for_update(
            db, response_id=response_id
        )
        if response is None:
            raise NotFoundDomainError("Questionnaire response not found")
        cls._require_consultant_role(actor_user_type=actor_user_type)
        cls._require_project_access(
            db,
            project_id=response.questionnaire.project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.APROBAR,
        )
        if response.status == MaturityResponseStatus.ANULADA:
            raise ConflictDomainError("Cannot finalize an annulled response")
        if response.estado_validacion == MaturityValidationStatus.APROBADA:
            raise ConflictDomainError("Evaluation already finalized")
        if not payload.confirmation:
            raise ValidationDomainError("Finalization confirmation is required")
        if not response.answers:
            raise ValidationDomainError("Response has no answers to finalize")

        missing_drafts = [
            answer.question_id for answer in response.answers if answer.validated_score is None
        ]
        if missing_drafts:
            raise ValidationDomainError("All answers must be evaluated before finalizing")

        for answer in response.answers:
            answer.estado_validacion = MaturityValidationStatus.APROBADA

        validated_at = datetime.now(UTC)
        finalized = MaturityQuestionnaireRepository.finalize_response_if_pending(
            db,
            response_id=response.id,
            actor_user_id=actor_user_id,
            validated_at=validated_at,
        )
        if not finalized:
            raise ConflictDomainError("Evaluation already finalized")

        response.estado_validacion = MaturityValidationStatus.APROBADA
        response.validated_by_user_id = actor_user_id
        response.validated_at = validated_at
        db.commit()
        db.refresh(response)
        return cls._to_response_dto(response)

    @classmethod
    def get_results(
        cls,
        db: Session,
        *,
        project_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        actor_user_type: UserType,
    ) -> QuestionnaireResultsResponse:
        cls._require_project_access(
            db,
            project_id=project_id,
            actor_user_id=actor_user_id,
            actor_user_type=actor_user_type,
            minimum_level=PermissionLevel.LECTURA,
        )
        questionnaire = MaturityQuestionnaireRepository.get_questionnaire(db, project_id=project_id)
        dimensions = MaturityQuestionnaireRepository.list_dimensions(db)
        dimension_weight_overrides = cls._dimension_weight_override_map(questionnaire=questionnaire)

        active_responses = []
        approved_responses = []
        question_map: dict[uuid.UUID, MaturityQuestion] = {}
        if questionnaire is not None:
            active_responses = [
                response
                for response in questionnaire.responses
                if response.status == MaturityResponseStatus.ACTIVE
            ]
            approved_responses = [
                response
                for response in active_responses
                if response.estado_validacion == MaturityValidationStatus.APROBADA
            ]
            question_map = {
                question.id: question for question in questionnaire.questions if question.is_active
            }

        answer_totals: dict[uuid.UUID, list[int]] = defaultdict(list)
        question_max_scores: dict[uuid.UUID, int] = {}
        validated_question_ids: set[uuid.UUID] = set()
        validated_response_ids: set[uuid.UUID] = set()
        for question in question_map.values():
            criteria = cls._question_score_criteria(
                question=question,
                questionnaire=questionnaire,
            )
            question_max_scores[question.id] = max(item.score for item in criteria)

        for response in approved_responses:
            validated_response_ids.add(response.id)
            for answer in response.answers:
                if answer.estado_validacion != MaturityValidationStatus.APROBADA:
                    continue
                answer_totals[answer.question_id].append(cls._answer_score(answer))
                validated_question_ids.add(answer.question_id)

        dimension_results: list[DimensionResultResponse] = []
        weighted_scores: list[float] = []
        weighted_total = 0.0

        for dimension in dimensions:
            dimension_scores: list[float] = []
            dimension_question_count = 0
            dimension_validated_count = 0
            subdomain_results: list[SubdomainResultResponse] = []
            for subdomain in sorted(dimension.subdomains, key=lambda item: item.display_order):
                subdomain_scores: list[float] = []
                subdomain_question_count = 0
                subdomain_validated_count = 0
                for question in question_map.values():
                    if (
                        question.dimension_id != dimension.id
                        or question.subdomain_id != subdomain.id
                    ):
                        continue
                    subdomain_question_count += 1
                    scores = answer_totals.get(question.id, [])
                    if scores:
                        max_score = question_max_scores.get(question.id, 5)
                        if max_score <= 0:
                            continue
                        normalized_score = (sum(scores) / len(scores)) / max_score
                        subdomain_scores.append(normalized_score * 5)
                    if question.id in validated_question_ids:
                        subdomain_validated_count += 1

                subdomain_score = (
                    sum(subdomain_scores) / len(subdomain_scores) if subdomain_scores else 0.0
                )
                subdomain_results.append(
                    SubdomainResultResponse(
                        subdomain_id=subdomain.id,
                        subdomain_name=subdomain.name,
                        score=round(subdomain_score, 2),
                        percent=round((subdomain_score / 5) * 100, 2) if subdomain_scores else 0.0,
                        question_count=subdomain_question_count,
                        validated_question_count=subdomain_validated_count,
                    )
                )
                if subdomain_scores:
                    dimension_scores.append(subdomain_score)
                dimension_question_count += subdomain_question_count
                dimension_validated_count += subdomain_validated_count

            dimension_score = (
                sum(dimension_scores) / len(dimension_scores) if dimension_scores else 0.0
            )
            weight = dimension_weight_overrides.get(dimension.id, cls._to_float(dimension.weight))
            weighted_total += weight
            weighted_scores.append(dimension_score * weight)
            dimension_results.append(
                DimensionResultResponse(
                    dimension_id=dimension.id,
                    dimension_name=dimension.name,
                    score=round(dimension_score, 2),
                    percent=round((dimension_score / 5) * 100, 2) if dimension_scores else 0.0,
                    weight=weight,
                    maturity_level=cls._maturity_level(dimension_score),
                    question_count=dimension_question_count,
                    validated_question_count=dimension_validated_count,
                    subdomains=subdomain_results,
                )
            )

        overall_score = round(sum(weighted_scores) / weighted_total, 2) if weighted_total else 0.0
        return QuestionnaireResultsResponse(
            overall_score=overall_score,
            overall_percent=round((overall_score / 5) * 100, 2) if overall_score else 0.0,
            maturity_level=cls._maturity_level(overall_score),
            dimensions=dimension_results,
            respondent_count=len(active_responses),
            validated_response_count=len(validated_response_ids),
            calculated_at=datetime.now(UTC),
        )

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.core.enums import UserStatus, UserType
from app.dependencies.auth import get_current_user
from app.exceptions.domain import ForbiddenDomainError, ValidationDomainError
from app.main import app
from app.schemas.maturity_questionnaire import (
    EvidenceUploadResponse,
    PublicQuestionnaireValidationResponse,
    QuestionnaireResultsResponse,
    ResponseDTO,
)
from app.services.maturity_questionnaire_service import MaturityQuestionnaireService


def test_questionnaire_config_requires_auth(client) -> None:
    response = client.get(f"/api/v1/projects/{uuid.uuid4()}/questionnaire/config")
    assert response.status_code == 401


def test_questionnaire_validate_public_access_does_not_require_auth(client, monkeypatch) -> None:
    questionnaire_id = uuid.uuid4()
    project_id = uuid.uuid4()

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "validate_public_access",
        staticmethod(
            lambda db, access_code: PublicQuestionnaireValidationResponse(
                valid=True,
                questionnaire_id=questionnaire_id,
                project_id=project_id,
                project_name="Proyecto Demo",
                is_closed=False,
                expires_at=datetime(2026, 4, 30, tzinfo=UTC),
                error=None,
            )
        ),
    )

    response = client.get("/api/v1/questionnaire/validate/CODIGO123")
    assert response.status_code == 200
    assert response.json()["valid"] is True
    assert response.json()["project_name"] == "Proyecto Demo"


def test_questionnaire_public_config_does_not_require_auth(client, monkeypatch) -> None:
    project_id = uuid.uuid4()

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "get_public_config",
        staticmethod(
            lambda db, access_code: {
                "project_id": str(project_id),
                "phase": "AS_IS",
                "roles": [],
                "score_criteria": [
                    {"score": 0, "name": "Inexistente", "description": "Sin evidencia"},
                    {"score": 1, "name": "Inicial", "description": "Muy básico"},
                    {"score": 2, "name": "Básico", "description": "Parcial"},
                    {"score": 3, "name": "Definido", "description": "Consistente"},
                    {"score": 4, "name": "Gestionado", "description": "Medido"},
                    {"score": 5, "name": "Optimizado", "description": "Mejora continua"},
                ],
                "dimensions": [],
                "template_questions": [],
                "questions": [],
                "is_closed": False,
                "access_code": "ABC123DEF456",
                "access_expires_at": None,
                "created_at": None,
                "updated_at": None,
            }
        ),
    )

    response = client.get("/api/v1/questionnaire/config/CODIGO123")
    assert response.status_code == 200
    assert response.json()["phase"] == "AS_IS"


def test_questionnaire_upsert_forbidden_maps_to_403(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_forbidden(db, project_id, actor_user_id, actor_user_type, payload):
        raise ForbiddenDomainError("Insufficient permission in AS_IS")

    monkeypatch.setattr(
        MaturityQuestionnaireService, "upsert_config", staticmethod(_raise_forbidden)
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/questionnaire/config",
        json={"phase": "AS_IS", "questions": []},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_questionnaire_submit_validation_maps_to_422(client, monkeypatch) -> None:
    def _raise_validation(db, project_id, access_code, payload):
        raise ValidationDomainError(
            "Answers must cover exactly the configured questionnaire questions"
        )

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "submit_response",
        staticmethod(_raise_validation),
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/questionnaire/responses?code=ABCD1234",
        json={
            "respondent_name": "Luis",
            "respondent_email": "luis@empresa.com",
            "role": "data-owner",
            "answers": [{"question_id": str(uuid.uuid4()), "score": 4}],
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_questionnaire_evidence_upload_success(client, monkeypatch) -> None:
    async def _upload(db, project_id, access_code, file):
        return EvidenceUploadResponse(
            evidencia_url="http://127.0.0.1:8000/media/questionnaire/sample.txt",
            evidencia_nombre="sample.txt",
            evidencia_tipo="text/plain",
            evidencia_size=10,
        )

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "upload_evidence",
        staticmethod(_upload),
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/questionnaire/evidence-upload?code=ABCD1234",
        files={"file": ("sample.txt", b"evidence", "text/plain")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["evidencia_nombre"] == "sample.txt"
    assert payload["evidencia_size"] == 10


def test_questionnaire_evidence_upload_validation_maps_to_422(client, monkeypatch) -> None:
    async def _raise_validation(db, project_id, access_code, file):
        raise ValidationDomainError("Unsupported evidence file type")

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "upload_evidence",
        staticmethod(_raise_validation),
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/questionnaire/evidence-upload?code=ABCD1234",
        files={"file": ("malware.exe", b"bad", "application/octet-stream")},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_questionnaire_results_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "get_results",
        staticmethod(
            lambda db, project_id, actor_user_id, actor_user_type: QuestionnaireResultsResponse(
                overall_score=3.5,
                overall_percent=70.0,
                maturity_level="Gestionado",
                dimensions=[],
                respondent_count=2,
                validated_response_count=1,
                calculated_at=datetime(2026, 3, 31, tzinfo=UTC),
            )
        ),
    )

    response = client.get(f"/api/v1/projects/{uuid.uuid4()}/questionnaire/results")
    assert response.status_code == 200
    assert response.json()["maturity_level"] == "Gestionado"


def test_questionnaire_config_spanish_alias_works(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "get_config",
        staticmethod(
            lambda db, project_id, actor_user_id, actor_user_type: {
                "project_id": project_id,
                "phase": "AS_IS",
                "roles": [],
                "score_criteria": [
                    {"score": 0, "name": "Inexistente", "description": "Sin evidencia"},
                    {"score": 1, "name": "Inicial", "description": "Muy básico"},
                    {"score": 2, "name": "Básico", "description": "Parcial"},
                    {"score": 3, "name": "Definido", "description": "Consistente"},
                    {"score": 4, "name": "Gestionado", "description": "Medido"},
                    {"score": 5, "name": "Optimizado", "description": "Mejora continua"},
                ],
                "dimensions": [],
                "template_questions": [],
                "questions": [],
                "is_closed": False,
                "access_code": "ABC123DEF456",
                "access_expires_at": None,
                "created_at": None,
                "updated_at": None,
            }
        ),
    )

    response = client.get(f"/api/v1/proyectos/{uuid.uuid4()}/cuestionario/config")
    assert response.status_code == 200
    assert response.json()["phase"] == "AS_IS"


def test_questionnaire_management_forbidden_for_empresa_user(client, monkeypatch) -> None:
    empresa_user = type(
        "EmpresaUser",
        (),
        {
            "id": uuid.uuid4(),
            "tipo_usuario": UserType.EMPRESA,
            "email": "empresa@acme.com",
            "estado": UserStatus.ACTIVO,
        },
    )()
    app.dependency_overrides[get_current_user] = lambda: empresa_user

    def _raise_forbidden(db, project_id, actor_user_id, actor_user_type, payload):
        raise ForbiddenDomainError("Only consultor users can manage questionnaire configuration")

    monkeypatch.setattr(
        MaturityQuestionnaireService, "upsert_config", staticmethod(_raise_forbidden)
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/questionnaire/config",
        json={"phase": "AS_IS", "questions": []},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_questionnaire_finalize_evaluation_success(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    response_id = uuid.uuid4()
    answer_id = uuid.uuid4()
    question_id = uuid.uuid4()

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "finalize_response_evaluation",
        staticmethod(
            lambda db, response_id, actor_user_id, actor_user_type, payload: ResponseDTO(
                id=response_id,
                respondent_name="Luis",
                respondent_email="luis@empresa.com",
                role="cdo",
                answers=[
                    {
                        "id": answer_id,
                        "question_id": question_id,
                        "question_text": "Pregunta demo",
                        "score": 3,
                        "respondent_score": 2,
                        "validated_score": 3,
                        "evidencia_url": None,
                        "evidencia_nombre": None,
                        "evidencia_tipo": None,
                        "evidencia_size": None,
                        "estado_validacion": "APROBADA",
                        "validacion_comentarios": None,
                    }
                ],
                status="active",
                anulation_reason=None,
                anulated_at=None,
                anulated_by=None,
                submitted_at=datetime(2026, 3, 31, tzinfo=UTC),
                estado_validacion="APROBADA",
                validado_por=consultant_current_user.id,
                validado_en=datetime(2026, 3, 31, tzinfo=UTC),
                validacion_comentarios=None,
            )
        ),
    )

    response = client.patch(
        f"/api/v1/questionnaire/responses/{response_id}/finalize-evaluation",
        json={"confirmation": True},
    )
    assert response.status_code == 200
    assert response.json()["estado_validacion"] == "APROBADA"


def test_questionnaire_validate_answer_success_keeps_pending_status(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    response_id = uuid.uuid4()
    answer_id = uuid.uuid4()
    question_id = uuid.uuid4()

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "validate_answer",
        staticmethod(
            lambda db, response_id, answer_id, actor_user_id, actor_user_type, payload: ResponseDTO(
                id=response_id,
                respondent_name="Luis",
                respondent_email="luis@empresa.com",
                role="cdo",
                answers=[
                    {
                        "id": answer_id,
                        "question_id": question_id,
                        "question_text": "Pregunta demo",
                        "score": 3,
                        "respondent_score": 2,
                        "validated_score": 3,
                        "evidencia_url": None,
                        "evidencia_nombre": None,
                        "evidencia_tipo": None,
                        "evidencia_size": None,
                        "estado_validacion": "PENDIENTE",
                        "validacion_comentarios": "Borrador guardado",
                    }
                ],
                status="active",
                anulation_reason=None,
                anulated_at=None,
                anulated_by=None,
                submitted_at=datetime(2026, 3, 31, tzinfo=UTC),
                estado_validacion="PENDIENTE",
                validado_por=None,
                validado_en=None,
                validacion_comentarios=None,
            )
        ),
    )

    response = client.patch(
        f"/api/v1/questionnaire/responses/{response_id}/answers/{answer_id}/validate",
        json={"validated_score": 3, "validacion_comentarios": "Borrador guardado"},
    )
    assert response.status_code == 200
    assert response.json()["estado_validacion"] == "PENDIENTE"


def test_questionnaire_finalize_evaluation_incomplete_maps_to_422(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_validation(db, response_id, actor_user_id, actor_user_type, payload):
        raise ValidationDomainError("All answers must be evaluated before finalizing")

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "finalize_response_evaluation",
        staticmethod(_raise_validation),
    )

    response = client.patch(
        f"/api/v1/questionnaire/responses/{uuid.uuid4()}/finalize-evaluation",
        json={"confirmation": True},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_questionnaire_anular_response_success(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    response_id = uuid.uuid4()
    answer_id = uuid.uuid4()
    question_id = uuid.uuid4()

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "anular_response",
        staticmethod(
            lambda db, response_id, actor_user_id, actor_user_type, payload: ResponseDTO(
                id=response_id,
                respondent_name="Luis",
                respondent_email="luis@empresa.com",
                role="cdo",
                answers=[
                    {
                        "id": answer_id,
                        "question_id": question_id,
                        "question_text": "Pregunta demo",
                        "score": 3,
                        "respondent_score": 3,
                        "validated_score": None,
                        "evidencia_url": None,
                        "evidencia_nombre": None,
                        "evidencia_tipo": None,
                        "evidencia_size": None,
                        "estado_validacion": "PENDIENTE",
                        "validacion_comentarios": None,
                    }
                ],
                status="anulada",
                anulation_reason=payload.reason,
                anulated_at=datetime(2026, 3, 31, tzinfo=UTC),
                anulated_by=consultant_current_user.id,
                submitted_at=datetime(2026, 3, 31, tzinfo=UTC),
                estado_validacion="PENDIENTE",
                validado_por=None,
                validado_en=None,
                validacion_comentarios=None,
            )
        ),
    )

    response = client.patch(
        f"/api/v1/questionnaire/responses/{response_id}/anular",
        json={"reason": "Evidencia inconsistente"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "anulada"
    assert response.json()["anulation_reason"] == "Evidencia inconsistente"


def test_questionnaire_reactivar_response_success(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    response_id = uuid.uuid4()
    answer_id = uuid.uuid4()
    question_id = uuid.uuid4()

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "reactivar_response",
        staticmethod(
            lambda db, response_id, actor_user_id, actor_user_type: ResponseDTO(
                id=response_id,
                respondent_name="Luis",
                respondent_email="luis@empresa.com",
                role="cdo",
                answers=[
                    {
                        "id": answer_id,
                        "question_id": question_id,
                        "question_text": "Pregunta demo",
                        "score": 3,
                        "respondent_score": 3,
                        "validated_score": None,
                        "evidencia_url": None,
                        "evidencia_nombre": None,
                        "evidencia_tipo": None,
                        "evidencia_size": None,
                        "estado_validacion": "PENDIENTE",
                        "validacion_comentarios": None,
                    }
                ],
                status="active",
                anulation_reason=None,
                anulated_at=None,
                anulated_by=None,
                submitted_at=datetime(2026, 3, 31, tzinfo=UTC),
                estado_validacion="PENDIENTE",
                validado_por=None,
                validado_en=None,
                validacion_comentarios=None,
            )
        ),
    )

    response = client.patch(f"/api/v1/questionnaire/responses/{response_id}/reactivar")
    assert response.status_code == 200
    assert response.json()["status"] == "active"
    assert response.json()["anulation_reason"] is None

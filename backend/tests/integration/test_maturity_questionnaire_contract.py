from __future__ import annotations

import json
import uuid
from pathlib import Path

from app.core.enums import UserType
from app.dependencies.auth import get_current_user
from app.exceptions.domain import ConflictDomainError, ForbiddenDomainError, ValidationDomainError
from app.main import app
from app.schemas.maturity_questionnaire import (
    QuestionnaireConfigResponse,
    QuestionnaireResultsResponse,
    ResponseListResponse,
)
from app.services.maturity_questionnaire_service import MaturityQuestionnaireService

SNAPSHOT_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "questionnaire_contract"


def _load_snapshot(name: str) -> dict:
    return json.loads((SNAPSHOT_DIR / name).read_text(encoding="utf-8"))


def _consultor_user():
    return type(
        "ConsultorUser",
        (),
        {
            "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
            "tipo_usuario": UserType.CONSULTOR,
            "email": "consultor@acme.com",
            "estado": "ACTIVO",
        },
    )()


def test_contract_config_schema_matches_snapshot(client, monkeypatch) -> None:
    project_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    app.dependency_overrides[get_current_user] = _consultor_user

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "get_config",
        staticmethod(
            lambda db, project_id, actor_user_id, actor_user_type: (
                QuestionnaireConfigResponse.model_validate(_load_snapshot("config.snapshot.json"))
            )
        ),
    )

    response = client.get(f"/api/v1/projects/{project_id}/questionnaire/config")
    assert response.status_code == 200
    assert response.json() == _load_snapshot("config.snapshot.json")


def test_contract_responses_schema_matches_snapshot(client, monkeypatch) -> None:
    project_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    app.dependency_overrides[get_current_user] = _consultor_user

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "list_responses",
        staticmethod(
            lambda db, project_id, actor_user_id, actor_user_type, status: (
                ResponseListResponse.model_validate(_load_snapshot("responses.snapshot.json"))
            )
        ),
    )

    response = client.get(f"/api/v1/projects/{project_id}/questionnaire/responses")
    assert response.status_code == 200
    assert response.json() == _load_snapshot("responses.snapshot.json")


def test_contract_results_schema_matches_snapshot(client, monkeypatch) -> None:
    project_id = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    app.dependency_overrides[get_current_user] = _consultor_user

    monkeypatch.setattr(
        MaturityQuestionnaireService,
        "get_results",
        staticmethod(
            lambda db, project_id, actor_user_id, actor_user_type: (
                QuestionnaireResultsResponse.model_validate(_load_snapshot("results.snapshot.json"))
            )
        ),
    )

    response = client.get(f"/api/v1/projects/{project_id}/questionnaire/results")
    assert response.status_code == 200
    assert response.json() == _load_snapshot("results.snapshot.json")


def test_contract_error_403_forbidden(client, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = _consultor_user

    def _raise_forbidden(db, project_id, actor_user_id, actor_user_type, payload):
        raise ForbiddenDomainError("Insufficient permission in questionnaire")

    monkeypatch.setattr(
        MaturityQuestionnaireService, "upsert_config", staticmethod(_raise_forbidden)
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/questionnaire/config",
        json={"phase": "AS_IS", "questions": []},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_contract_error_409_conflict(client, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = _consultor_user

    def _raise_conflict(db, response_id, actor_user_id, actor_user_type, payload):
        raise ConflictDomainError("Response is already annulled")

    monkeypatch.setattr(
        MaturityQuestionnaireService, "anular_response", staticmethod(_raise_conflict)
    )

    response = client.patch(
        f"/api/v1/questionnaire/responses/{uuid.uuid4()}/anular",
        json={"reason": "duplicated response"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


def test_contract_error_422_validation(client, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = _consultor_user

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

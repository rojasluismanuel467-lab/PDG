from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.dependencies.auth import get_current_user
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.main import app
from app.schemas.dfd import (
    DFDCommentResponse,
    DFDModelResponse,
    DFDVersionsResponse,
)
from app.services.dfd_service import DFDService


def _sample_model(project_id: uuid.UUID, artifact_id: uuid.UUID) -> DFDModelResponse:
    timestamp = datetime(2026, 4, 1, tzinfo=UTC)
    model_id = uuid.uuid4()
    return DFDModelResponse(
        id=model_id,
        project_id=project_id,
        artifact_id=artifact_id,
        phase="AS_IS",
        name="DFD AS-IS",
        description="Sample DFD",
        level=1,
        nodos=[],
        flujos=[],
        comentarios=[],
        version_actual="1",
        current_version_number=1,
        historial_versiones=[],
        created_at=timestamp,
        updated_at=timestamp,
        last_saved_at=timestamp,
    )


def test_get_dfd_requires_auth(client) -> None:
    response = client.get(f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/dfd")
    assert response.status_code == 401


def test_get_dfd_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    expected = _sample_model(project_id, artifact_id)

    monkeypatch.setattr(
        DFDService,
        "get_model",
        staticmethod(lambda db, project_id, artifact_id, actor_user_id, actor_user_email: expected),
    )

    response = client.get(f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/dfd")
    assert response.status_code == 200
    assert response.json()["name"] == "DFD AS-IS"


def test_save_dfd_validation_error_maps_422(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_validation(
        db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload
    ):
        raise ValidationDomainError("Invalid DFD payload")

    monkeypatch.setattr(DFDService, "upsert_model", staticmethod(_raise_validation))

    response = client.put(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/dfd",
        json={"name": "DFD AS-IS", "description": "", "level": 1, "nodos": [], "flujos": []},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_preview_dfd_not_found_maps_404(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_not_found(
        db, project_id, artifact_id, source_version_number, actor_user_id, actor_user_email
    ):
        raise NotFoundDomainError("DFD source version not found")

    monkeypatch.setattr(DFDService, "preview_version", staticmethod(_raise_not_found))

    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/dfd/versions/4/preview"
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_restore_dfd_forbidden_maps_403(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_forbidden(
        db,
        project_id,
        artifact_id,
        actor_user_id,
        actor_user_type,
        actor_user_email,
        payload,
    ):
        raise ForbiddenDomainError("Insufficient permission to edit DFD")

    monkeypatch.setattr(DFDService, "restore_version", staticmethod(_raise_forbidden))

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/dfd/restore-version",
        json={"source_version_number": 1, "change_summary": "Restore"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_list_dfd_versions_schema(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    model_id = uuid.uuid4()
    now = datetime(2026, 4, 1, tzinfo=UTC)
    expected = DFDVersionsResponse(
        model_id=model_id,
        versions=[
            {
                "id": uuid.uuid4(),
                "version_number": 3,
                "created_at": now,
                "created_by_user_id": consultant_current_user.id,
                "created_by_user_email": consultant_current_user.email,
                "change_summary": "Manual update from DFD editor.",
            }
        ],
    )

    monkeypatch.setattr(
        DFDService,
        "list_versions",
        staticmethod(lambda db, project_id, artifact_id, actor_user_id, actor_user_email: expected),
    )

    response = client.get(f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/dfd/versions")
    assert response.status_code == 200
    assert response.json()["versions"][0]["version_number"] == 3


def test_create_dfd_comment_schema(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    now = datetime(2026, 4, 1, tzinfo=UTC)
    expected = DFDCommentResponse(
        id=uuid.uuid4(),
        model_id=uuid.uuid4(),
        target_type="nodo",
        target_client_id="proceso-1",
        content="Review this DFD",
        status="open",
        created_by_user_id=consultant_current_user.id,
        created_by_user_email=consultant_current_user.email,
        created_by_user_name="Consultor",
        created_by_user_type="CONSULTOR",
        created_in_version_number=2,
        created_at=now,
        updated_at=now,
    )

    monkeypatch.setattr(
        DFDService,
        "create_comment",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload: (
                expected
            )
        ),
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/dfd/comments",
        json={"target_type": "nodo", "target_client_id": "proceso-1", "content": "Review this DFD"},
    )
    assert response.status_code == 200
    assert response.json()["target_type"] == "nodo"

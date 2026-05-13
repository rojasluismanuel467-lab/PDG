from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.dependencies.auth import get_current_user
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.main import app
from app.schemas.conceptual_model import (
    ConceptualCommentResponse,
    ConceptualModelCommentsResponse,
    ConceptualModelResponse,
    ConceptualModelUpsertRequest,
    ConceptualModelVersionsResponse,
    ConceptualVersionPreviewResponse,
)
from app.services.conceptual_model_service import ConceptualModelService


def test_conceptual_model_requires_auth(client) -> None:
    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model"
    )
    assert response.status_code == 401


def test_get_conceptual_model_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    model_id = uuid.uuid4()

    monkeypatch.setattr(
        ConceptualModelService,
        "get_model",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email: (
                ConceptualModelResponse(
                    id=model_id,
                    project_id=project_id,
                    artifact_id=artifact_id,
                    phase="AS_IS",
                    name="AS-IS Conceptual Diagram",
                    description="",
                    entities=[],
                    relations=[],
                    current_version_number=1,
                    created_at=datetime(2026, 3, 31, tzinfo=UTC),
                    updated_at=datetime(2026, 3, 31, tzinfo=UTC),
                    last_saved_at=datetime(2026, 3, 31, tzinfo=UTC),
                )
            )
        ),
    )

    response = client.get(f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/conceptual-model")
    assert response.status_code == 200
    assert response.json()["name"] == "AS-IS Conceptual Diagram"


def test_upsert_conceptual_model_forbidden_maps_to_403(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_forbidden(
        db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload
    ):
        raise ForbiddenDomainError("Insufficient permission for conceptual diagram")

    monkeypatch.setattr(ConceptualModelService, "upsert_model", staticmethod(_raise_forbidden))

    response = client.put(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model",
        json={
            "name": "AS-IS Conceptual Diagram",
            "description": "",
            "entities": [],
            "relations": [],
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_upsert_conceptual_model_validation_maps_to_422(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_validation(
        db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload
    ):
        raise ValidationDomainError("Relation cardinality is invalid")

    monkeypatch.setattr(ConceptualModelService, "upsert_model", staticmethod(_raise_validation))

    response = client.put(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model",
        json={
            "name": "AS-IS Conceptual Diagram",
            "description": "",
            "entities": [],
            "relations": [],
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_list_conceptual_model_versions_success(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    model_id = uuid.uuid4()
    version_id = uuid.uuid4()

    monkeypatch.setattr(
        ConceptualModelService,
        "list_versions",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_email: (
                ConceptualModelVersionsResponse(
                    model_id=model_id,
                    versions=[
                        {
                            "id": version_id,
                            "version_number": 2,
                            "created_at": datetime(2026, 3, 31, tzinfo=UTC),
                            "created_by_user_id": consultant_current_user.id,
                            "created_by_user_email": consultant_current_user.email,
                            "change_summary": "Updated entities",
                        }
                    ],
                )
            )
        ),
    )

    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/versions"
    )
    assert response.status_code == 200
    assert response.json()["versions"][0]["version_number"] == 2


def test_list_conceptual_comments_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    model_id = uuid.uuid4()
    comment_id = uuid.uuid4()

    monkeypatch.setattr(
        ConceptualModelService,
        "list_comments",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_email, status=None, include_outdated=True, only_active=False: (
                ConceptualModelCommentsResponse(
                    model_id=model_id,
                    comments=[
                        ConceptualCommentResponse(
                            id=comment_id,
                            model_id=model_id,
                            target_type="entity",
                            target_client_id="ent-1",
                            content="Review this entity",
                            status="open",
                            created_by_user_id=consultant_current_user.id,
                            created_by_user_email=consultant_current_user.email,
                            created_by_user_name="Consultant User",
                            created_by_user_type=consultant_current_user.tipo_usuario.value,
                            created_at=datetime(2026, 3, 31, tzinfo=UTC),
                            updated_at=datetime(2026, 3, 31, tzinfo=UTC),
                        )
                    ],
                )
            )
        ),
    )

    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/comments"
    )
    assert response.status_code == 200
    assert response.json()["comments"][0]["target_type"] == "entity"


def test_create_conceptual_comment_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    model_id = uuid.uuid4()
    comment_id = uuid.uuid4()

    monkeypatch.setattr(
        ConceptualModelService,
        "create_comment",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload: (
                ConceptualCommentResponse(
                    id=comment_id,
                    model_id=model_id,
                    target_type=payload.target_type,
                    target_client_id=payload.target_client_id,
                    content=payload.content,
                    status="open",
                    created_by_user_id=actor_user_id,
                    created_by_user_email=actor_user_email,
                    created_by_user_name="Consultant User",
                    created_by_user_type=actor_user_type.value,
                    created_at=datetime(2026, 3, 31, tzinfo=UTC),
                    updated_at=datetime(2026, 3, 31, tzinfo=UTC),
                )
            )
        ),
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/comments",
        json={
            "target_type": "entity",
            "target_client_id": "ent-1",
            "content": "Please validate naming.",
        },
    )
    assert response.status_code == 200
    assert response.json()["created_by_user_email"] == consultant_current_user.email


def test_update_conceptual_comment_forbidden_maps_to_403(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_forbidden(
        db,
        project_id,
        artifact_id,
        comment_id,
        actor_user_id,
        actor_user_type,
        actor_user_email,
        payload,
    ):
        raise ForbiddenDomainError("You cannot edit this comment")

    monkeypatch.setattr(ConceptualModelService, "update_comment", staticmethod(_raise_forbidden))

    response = client.patch(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/comments/{uuid.uuid4()}",
        json={"status": "resolved"},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_preview_conceptual_version_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    model_id = uuid.uuid4()

    monkeypatch.setattr(
        ConceptualModelService,
        "preview_version",
        staticmethod(
            lambda db, project_id, artifact_id, source_version_number, actor_user_id: (
                ConceptualVersionPreviewResponse(
                    model_id=model_id,
                    source_version_number=source_version_number,
                    snapshot=ConceptualModelUpsertRequest(
                        name="Preview v2",
                        description="Preview",
                        entities=[],
                        relations=[],
                        change_summary=None,
                    ),
                )
            )
        ),
    )

    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/versions/2/preview"
    )
    assert response.status_code == 200
    assert response.json()["source_version_number"] == 2


def test_preview_conceptual_version_not_found_maps_to_404(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_not_found(db, project_id, artifact_id, source_version_number, actor_user_id):
        raise NotFoundDomainError("Source version not found")

    monkeypatch.setattr(ConceptualModelService, "preview_version", staticmethod(_raise_not_found))

    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/versions/99/preview"
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_restore_conceptual_version_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    model_id = uuid.uuid4()

    monkeypatch.setattr(
        ConceptualModelService,
        "restore_version",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload: (
                ConceptualModelResponse(
                    id=model_id,
                    project_id=project_id,
                    artifact_id=artifact_id,
                    phase="AS_IS",
                    name="Restored Diagram",
                    description="",
                    entities=[],
                    relations=[],
                    comments=[],
                    current_version_number=6,
                    created_at=datetime(2026, 3, 31, tzinfo=UTC),
                    updated_at=datetime(2026, 3, 31, tzinfo=UTC),
                    last_saved_at=datetime(2026, 3, 31, tzinfo=UTC),
                )
            )
        ),
    )

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/restore-version",
        json={
            "source_version_number": 2,
            "change_summary": "Restore test",
        },
    )
    assert response.status_code == 200
    assert response.json()["current_version_number"] == 6


def test_restore_conceptual_version_forbidden_maps_to_403(
    client, consultant_current_user, monkeypatch
) -> None:
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
        raise ForbiddenDomainError("Insufficient permission for conceptual diagram")

    monkeypatch.setattr(ConceptualModelService, "restore_version", staticmethod(_raise_forbidden))

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/restore-version",
        json={
            "source_version_number": 2,
            "change_summary": "Restore test",
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_restore_conceptual_version_not_found_maps_to_404(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_not_found(
        db,
        project_id,
        artifact_id,
        actor_user_id,
        actor_user_type,
        actor_user_email,
        payload,
    ):
        raise NotFoundDomainError("Source version not found")

    monkeypatch.setattr(ConceptualModelService, "restore_version", staticmethod(_raise_not_found))

    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model/restore-version",
        json={
            "source_version_number": 999,
            "change_summary": "Restore test",
        },
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.dependencies.auth import get_current_user
from app.exceptions.domain import (
    ConflictDomainError,
    ForbiddenDomainError,
    ValidationDomainError,
)
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

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "conceptual_contract"
MODEL_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
COMMENT_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
VERSION_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
PROJECT_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
ARTIFACT_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
ACTOR_USER_ID = uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")


def _load_snapshot(name: str) -> dict:
    with (FIXTURES_DIR / name).open("r", encoding="utf-8") as file:
        return json.load(file)


def _project_model_snapshot(payload: dict) -> dict:
    projected_entities: list[dict] = []
    for entity in payload.get("entities", []):
        projected_attributes = []
        for attribute in entity.get("attributes", []):
            projected_attributes.append(
                {
                    "id": attribute.get("id"),
                    "name": attribute.get("name"),
                    "data_type": attribute.get("data_type"),
                    "is_pk": attribute.get("is_pk"),
                    "is_fk": attribute.get("is_fk"),
                    "is_nullable": attribute.get("is_nullable"),
                }
            )
        projected_entities.append(
            {
                "id": entity.get("id"),
                "name": entity.get("name"),
                "description": entity.get("description"),
                "position_x": entity.get("position_x"),
                "position_y": entity.get("position_y"),
                "color": entity.get("color"),
                "attributes": projected_attributes,
            }
        )

    projected_comments = []
    for comment in payload.get("comments", []):
        projected_comments.append(
            {
                "id": comment.get("id"),
                "model_id": comment.get("model_id"),
                "target_type": comment.get("target_type"),
                "target_client_id": comment.get("target_client_id"),
                "content": comment.get("content"),
                "status": comment.get("status"),
                "created_by_user_id": comment.get("created_by_user_id"),
                "created_by_user_email": comment.get("created_by_user_email"),
                "created_by_user_name": comment.get("created_by_user_name"),
                "created_by_user_type": comment.get("created_by_user_type"),
                "created_at": comment.get("created_at"),
                "updated_at": comment.get("updated_at"),
            }
        )

    projected_relations = []
    for relation in payload.get("relations", []):
        projected_relations.append(
            {
                "id": relation.get("id"),
                "name": relation.get("name"),
                "source_entity_id": relation.get("source_entity_id"),
                "target_entity_id": relation.get("target_entity_id"),
                "cardinality": relation.get("cardinality"),
            }
        )

    return {
        "id": payload.get("id"),
        "project_id": payload.get("project_id"),
        "artifact_id": payload.get("artifact_id"),
        "phase": payload.get("phase"),
        "name": payload.get("name"),
        "description": payload.get("description"),
        "entities": projected_entities,
        "relations": projected_relations,
        "comments": projected_comments,
        "current_version_number": payload.get("current_version_number"),
        "created_at": payload.get("created_at"),
        "updated_at": payload.get("updated_at"),
        "last_saved_at": payload.get("last_saved_at"),
    }


def _project_comments_snapshot(payload: dict) -> dict:
    projected_comments = []
    for comment in payload.get("comments", []):
        projected_comments.append(
            {
                "id": comment.get("id"),
                "model_id": comment.get("model_id"),
                "target_type": comment.get("target_type"),
                "target_client_id": comment.get("target_client_id"),
                "content": comment.get("content"),
                "status": comment.get("status"),
                "created_by_user_id": comment.get("created_by_user_id"),
                "created_by_user_email": comment.get("created_by_user_email"),
                "created_by_user_name": comment.get("created_by_user_name"),
                "created_by_user_type": comment.get("created_by_user_type"),
                "created_at": comment.get("created_at"),
                "updated_at": comment.get("updated_at"),
            }
        )
    return {
        "model_id": payload.get("model_id"),
        "comments": projected_comments,
    }


def _sample_model_response(
    *,
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    actor_user_email: str,
) -> ConceptualModelResponse:
    timestamp = datetime(2026, 4, 1, tzinfo=UTC)
    return ConceptualModelResponse(
        id=MODEL_ID,
        project_id=project_id,
        artifact_id=artifact_id,
        phase="AS_IS",
        name="AS-IS Conceptual Diagram",
        description="Contract test model",
        entities=[
            {
                "id": "ent-customer",
                "name": "Customer",
                "description": "Customer master entity",
                "position_x": 100,
                "position_y": 120,
                "color": "#3B82F6",
                "attributes": [
                    {
                        "id": "attr-customer-id",
                        "name": "customer_id",
                        "data_type": "UUID",
                        "is_pk": True,
                        "is_fk": False,
                        "is_nullable": False,
                    }
                ],
            }
        ],
        relations=[
            {
                "id": "rel-customer-order",
                "name": "customer_orders",
                "source_entity_id": "ent-customer",
                "target_entity_id": "ent-order",
                "cardinality": "1:N",
            }
        ],
        comments=[
            {
                "id": COMMENT_ID,
                "model_id": MODEL_ID,
                "target_type": "general",
                "target_client_id": None,
                "content": "Looks good",
                "status": "open",
                "created_by_user_id": actor_user_id,
                "created_by_user_email": actor_user_email,
                "created_by_user_name": "Consultant User",
                "created_by_user_type": "CONSULTOR",
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        ],
        current_version_number=3,
        created_at=timestamp,
        updated_at=timestamp,
        last_saved_at=timestamp,
    )


def test_contract_get_model_response_schema(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    project_id = PROJECT_ID
    artifact_id = ARTIFACT_ID
    expected = _sample_model_response(
        project_id=project_id,
        artifact_id=artifact_id,
        actor_user_id=ACTOR_USER_ID,
        actor_user_email="consultant.contract@arqdata.local",
    )

    monkeypatch.setattr(
        ConceptualModelService,
        "get_model",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email: (
                expected
            )
        ),
    )

    response = client.get(f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/conceptual-model")
    assert response.status_code == 200
    parsed = ConceptualModelResponse.model_validate(response.json())
    assert parsed.name == "AS-IS Conceptual Diagram"
    assert parsed.current_version_number == 3
    assert _project_model_snapshot(parsed.model_dump(mode="json")) == _load_snapshot(
        "model.snapshot.json"
    )


def test_contract_versions_response_schema(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    model_id = MODEL_ID
    created_at = datetime(2026, 4, 1, tzinfo=UTC)
    monkeypatch.setattr(
        ConceptualModelService,
        "list_versions",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_email: (
                ConceptualModelVersionsResponse(
                    model_id=model_id,
                    versions=[
                        {
                            "id": VERSION_ID,
                            "version_number": 2,
                            "created_at": created_at,
                            "created_by_user_id": ACTOR_USER_ID,
                            "created_by_user_email": "consultant.contract@arqdata.local",
                            "change_summary": "Manual update from conceptual diagram editor.",
                        }
                    ],
                )
            )
        ),
    )

    response = client.get(
        f"/api/v1/projects/{PROJECT_ID}/artifacts/{ARTIFACT_ID}/conceptual-model/versions"
    )
    assert response.status_code == 200
    parsed = ConceptualModelVersionsResponse.model_validate(response.json())
    assert parsed.versions[0].version_number == 2
    assert parsed.model_dump(mode="json") == _load_snapshot("versions.snapshot.json")


def test_contract_preview_response_schema(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    monkeypatch.setattr(
        ConceptualModelService,
        "preview_version",
        staticmethod(
            lambda db, project_id, artifact_id, source_version_number, actor_user_id: (
                ConceptualVersionPreviewResponse(
                    model_id=uuid.uuid4(),
                    source_version_number=source_version_number,
                    snapshot=ConceptualModelUpsertRequest(
                        name="Preview v5",
                        description="Snapshot",
                        entities=[],
                        relations=[],
                        change_summary=None,
                    ),
                )
            )
        ),
    )

    response = client.get(
        f"/api/v1/projects/{PROJECT_ID}/artifacts/{ARTIFACT_ID}/conceptual-model/versions/5/preview"
    )
    assert response.status_code == 200
    parsed = ConceptualVersionPreviewResponse.model_validate(response.json())
    assert parsed.source_version_number == 5


def test_contract_comments_response_schema(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    model_id = MODEL_ID
    created_at = datetime(2026, 4, 1, tzinfo=UTC)
    monkeypatch.setattr(
        ConceptualModelService,
        "list_comments",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_email, status=None, include_outdated=True, only_active=False: (
                ConceptualModelCommentsResponse(
                    model_id=model_id,
                    comments=[
                        ConceptualCommentResponse(
                            id=COMMENT_ID,
                            model_id=model_id,
                            target_type="entity",
                            target_client_id="ent-customer",
                            content="Validate this naming.",
                            status="open",
                            created_by_user_id=ACTOR_USER_ID,
                            created_by_user_email="consultant.contract@arqdata.local",
                            created_by_user_name="Consultant User",
                            created_by_user_type="CONSULTOR",
                            created_at=created_at,
                            updated_at=created_at,
                        )
                    ],
                )
            )
        ),
    )

    response = client.get(
        f"/api/v1/projects/{PROJECT_ID}/artifacts/{ARTIFACT_ID}/conceptual-model/comments"
    )
    assert response.status_code == 200
    parsed = ConceptualModelCommentsResponse.model_validate(response.json())
    assert parsed.comments[0].target_type == "entity"
    assert _project_comments_snapshot(parsed.model_dump(mode="json")) == _load_snapshot(
        "comments.snapshot.json"
    )


def test_contract_error_mapping_403_forbidden(client, consultant_current_user, monkeypatch) -> None:
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


def test_contract_error_mapping_409_conflict(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_conflict(
        db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload
    ):
        raise ConflictDomainError("Version conflict while updating conceptual model")

    monkeypatch.setattr(ConceptualModelService, "upsert_model", staticmethod(_raise_conflict))

    response = client.put(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/conceptual-model",
        json={
            "name": "AS-IS Conceptual Diagram",
            "description": "",
            "entities": [],
            "relations": [],
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


def test_contract_error_mapping_422_validation(
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


def test_contract_openapi_snapshot_conceptual_paths(client) -> None:
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    payload = response.json()

    conceptual_paths = {
        path: sorted(path_item.keys())
        for path, path_item in payload["paths"].items()
        if "/conceptual-model" in path
    }
    expected_snapshot = _load_snapshot("openapi_paths.snapshot.json")
    assert conceptual_paths == expected_snapshot

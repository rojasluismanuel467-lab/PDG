from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.dependencies.auth import get_current_user
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError, ValidationDomainError
from app.main import app
from app.schemas.logical_data_model import (
    LogicalCommentResponse,
    LogicalDataModelResponse,
    LogicalModelSnapshotRequest,
    LogicalVersionPreviewResponse,
    LogicalVersionResponse,
    LogicalVersionsResponse,
)
from app.services.logical_data_model_service import LogicalDataModelService


def _sample_model(project_id: uuid.UUID, artifact_id: uuid.UUID) -> LogicalDataModelResponse:
    now = datetime(2026, 4, 1, tzinfo=UTC)
    return LogicalDataModelResponse(
        id=uuid.uuid4(),
        proyecto_id=project_id,
        entregable_id=artifact_id,
        fase="TO_BE",
        nombre="TO-BE Logical Data Model",
        descripcion="Target-state logical model",
        tablas=[],
        sql_ddl="",
        notas_markdown="",
        comentarios=[],
        version_actual="1",
        versiones=[],
        created_at=now,
        updated_at=now,
    )


def test_get_logical_data_model_requires_auth(client) -> None:
    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/logical-data-model"
    )
    assert response.status_code == 401


def test_get_logical_data_model_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    expected = _sample_model(project_id, artifact_id)

    monkeypatch.setattr(
        LogicalDataModelService,
        "get_model",
        staticmethod(lambda db, project_id, artifact_id, actor_user_id, actor_user_email: expected),
    )

    response = client.get(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/logical-data-model"
    )
    assert response.status_code == 200
    assert response.json()["nombre"] == "TO-BE Logical Data Model"


def test_upsert_logical_data_model_validation_error_maps_422(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_validation(
        db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload
    ):
        raise ValidationDomainError("Invalid payload")

    monkeypatch.setattr(LogicalDataModelService, "upsert_model", staticmethod(_raise_validation))

    response = client.put(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/logical-data-model",
        json={
            "nombre": "TO-BE Logical Data Model",
            "descripcion": "",
            "tablas": [],
            "sql_ddl": "",
            "notas_markdown": "",
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_list_versions_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    now = datetime(2026, 4, 1, tzinfo=UTC)
    payload = LogicalVersionsResponse(
        model_id=uuid.uuid4(),
        versions=[
            LogicalVersionResponse(
                id=uuid.uuid4(),
                version_number=2,
                created_at=now,
                created_by_user_id=None,
                created_by_user_email="admin@arqdata.local",
                change_summary="Manual update",
            )
        ],
    )
    monkeypatch.setattr(
        LogicalDataModelService,
        "list_versions",
        staticmethod(lambda db, project_id, artifact_id, actor_user_id, actor_user_email: payload),
    )

    response = client.get(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/versions"
    )
    assert response.status_code == 200
    assert response.json()["versions"][0]["version_number"] == 2


def test_preview_version_not_found_maps_404(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_not_found(
        db, project_id, artifact_id, source_version_number, actor_user_id, actor_user_email
    ):
        raise NotFoundDomainError("Version not found")

    monkeypatch.setattr(LogicalDataModelService, "preview_version", staticmethod(_raise_not_found))
    response = client.get(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/logical-data-model/versions/99/preview"
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_preview_version_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    payload = LogicalVersionPreviewResponse(
        model_id=uuid.uuid4(),
        source_version_number=1,
        snapshot=LogicalModelSnapshotRequest(
            nombre="Preview",
            descripcion="Preview data",
            tablas=[],
            sql_ddl="",
            notas_markdown="",
        ),
    )
    monkeypatch.setattr(
        LogicalDataModelService,
        "preview_version",
        staticmethod(
            lambda db, project_id, artifact_id, source_version_number, actor_user_id, actor_user_email: (
                payload
            )
        ),
    )
    response = client.get(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/versions/1/preview"
    )
    assert response.status_code == 200
    assert response.json()["snapshot"]["nombre"] == "Preview"


def test_restore_version_forbidden_maps_403(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_forbidden(
        db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload
    ):
        raise ForbiddenDomainError("Locked artifact")

    monkeypatch.setattr(LogicalDataModelService, "restore_version", staticmethod(_raise_forbidden))
    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/logical-data-model/versions/restore",
        json={"source_version_number": 1},
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_create_comment_maps_422(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_validation(
        db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload
    ):
        raise ValidationDomainError("Table not found")

    monkeypatch.setattr(LogicalDataModelService, "create_comment", staticmethod(_raise_validation))
    response = client.post(
        f"/api/v1/projects/{uuid.uuid4()}/artifacts/{uuid.uuid4()}/logical-data-model/comments",
        json={
            "target_type": "tabla",
            "target_client_id": "tbl-404",
            "content": "Comentario",
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_comment_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    now = datetime(2026, 4, 1, tzinfo=UTC)
    expected_comment = LogicalCommentResponse(
        id=uuid.uuid4(),
        model_id=uuid.uuid4(),
        target_type="tabla",
        target_client_id="tbl-001",
        content="Revisar PK",
        status="open",
        created_by_user_id=None,
        created_by_user_email="admin@arqdata.local",
        created_by_user_name="Admin",
        created_by_user_type="CONSULTOR",
        created_in_version_number=2,
        created_at=now,
        updated_at=now,
    )
    monkeypatch.setattr(
        LogicalDataModelService,
        "create_comment",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload: (
                expected_comment
            )
        ),
    )
    response = client.post(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/comments",
        json={"target_type": "tabla", "target_client_id": "tbl-001", "content": "Revisar PK"},
    )
    assert response.status_code == 200
    assert response.json()["target_client_id"] == "tbl-001"


def test_create_column_comment_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    now = datetime(2026, 4, 1, tzinfo=UTC)
    expected_comment = LogicalCommentResponse(
        id=uuid.uuid4(),
        model_id=uuid.uuid4(),
        target_type="columna",
        target_client_id="col-001",
        content="Revisar longitud",
        status="open",
        created_by_user_id=None,
        created_by_user_email="admin@arqdata.local",
        created_by_user_name="Admin",
        created_by_user_type="CONSULTOR",
        created_in_version_number=2,
        created_at=now,
        updated_at=now,
    )
    monkeypatch.setattr(
        LogicalDataModelService,
        "create_comment",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload: (
                expected_comment
            )
        ),
    )
    response = client.post(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/logical-data-model/comments",
        json={
            "target_type": "columna",
            "target_client_id": "col-001",
            "content": "Revisar longitud",
        },
    )
    assert response.status_code == 200
    assert response.json()["target_type"] == "columna"

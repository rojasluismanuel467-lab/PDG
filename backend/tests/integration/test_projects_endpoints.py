from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.dependencies.auth import get_current_user
from app.exceptions.domain import ForbiddenDomainError, NotFoundDomainError
from app.main import app
from app.schemas.project import ProjectDetailResponse, ProjectResponse
from app.schemas.project_membership import ArtifactPermissionResponse
from app.services.project_membership_service import ProjectMembershipService
from app.services.project_service import ProjectService


def _project_detail(project_id: uuid.UUID, manager_id: uuid.UUID) -> ProjectDetailResponse:
    now = datetime(2026, 3, 31, tzinfo=UTC)
    return ProjectDetailResponse(
        id=project_id,
        name="ACME Data Architecture",
        description="Project to assess the current data architecture state.",
        client_company={"name": "ACME", "email": "client@acme.com"},
        estimated_end_date="2026-06-30",
        status="ACTIVO",
        manager={"id": manager_id, "name": "Alice"},
        progress=0,
        artifacts={"total": 16, "approved": 0, "not_applicable": 0},
        created_at=now,
        updated_at=now,
        artifact_items=[],
    )


def test_projects_create_success(client, admin_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: admin_current_user
    project_id = uuid.uuid4()

    monkeypatch.setattr(
        ProjectService,
        "create_project",
        staticmethod(
            lambda db, actor_user_id, actor_user_type, payload: _project_detail(
                project_id, admin_current_user.id
            )
        ),
    )

    response = client.post(
        "/api/v1/projects",
        json={
            "name": "ACME Data Architecture",
            "description": "Project to assess the current data architecture state.",
            "company_id": str(uuid.uuid4()),
            "estimated_end_date": "2026-06-30",
        },
    )

    assert response.status_code == 201
    assert response.json()["id"] == str(project_id)
    assert response.json()["artifacts"]["total"] == 16


def test_projects_create_forbidden_for_consultant_user(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_forbidden(db, actor_user_id, actor_user_type, payload):
        raise ForbiddenDomainError("Only ADMINISTRADOR can create projects")

    monkeypatch.setattr(ProjectService, "create_project", staticmethod(_raise_forbidden))

    response = client.post(
        "/api/v1/projects",
        json={
            "name": "ACME Data Architecture",
            "description": "Project to assess the current data architecture state.",
            "company_id": str(uuid.uuid4()),
            "estimated_end_date": "2026-06-30",
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_projects_create_forbidden_for_company_user(client, monkeypatch) -> None:
    company_user = type(
        "CompanyUser",
        (),
        {
            "id": uuid.uuid4(),
            "tipo_usuario": "EMPRESA",
            "email": "client@acme.com",
            "estado": "ACTIVO",
        },
    )()
    app.dependency_overrides[get_current_user] = lambda: company_user

    def _raise_forbidden(db, actor_user_id, actor_user_type, payload):
        raise ForbiddenDomainError("Only ADMINISTRADOR can create projects")

    monkeypatch.setattr(ProjectService, "create_project", staticmethod(_raise_forbidden))

    response = client.post(
        "/api/v1/projects",
        json={
            "name": "ACME Data Architecture",
            "company_id": str(uuid.uuid4()),
            "estimated_end_date": "2026-06-30",
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_projects_list_success(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    now = datetime(2026, 3, 31, tzinfo=UTC)

    monkeypatch.setattr(
        ProjectService,
        "list_projects",
        staticmethod(
            lambda db, actor_user_id: {
                "total": 1,
                "items": [
                    ProjectResponse(
                        id=project_id,
                        name="ACME Data Architecture",
                        description="Project to assess the current data architecture state.",
                        client_company={"name": "ACME", "email": "client@acme.com"},
                        estimated_end_date="2026-06-30",
                        status="ACTIVO",
                        manager={"id": consultant_current_user.id, "name": "Alice"},
                        progress=0,
                        artifacts={"total": 16, "approved": 0, "not_applicable": 0},
                        created_at=now,
                        updated_at=now,
                    )
                ],
            }
        ),
    )

    response = client.get("/api/v1/projects")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_project_detail_not_found_maps_to_404(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    def _raise_not_found(db, project_id, actor_user_id):
        raise NotFoundDomainError("Project not found")

    monkeypatch.setattr(ProjectService, "get_project", staticmethod(_raise_not_found))

    response = client.get(f"/api/v1/projects/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_project_artifact_permission_update_success(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    user_id = uuid.uuid4()
    now = datetime(2026, 3, 31, tzinfo=UTC)

    monkeypatch.setattr(
        ProjectMembershipService,
        "update_artifact_permission",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, target_user_id, payload: (
                ArtifactPermissionResponse(
                    artifact_id=artifact_id,
                    project_id=project_id,
                    user_id=target_user_id,
                    permission_level=payload.permission_level,
                    assigned_by_user_id=actor_user_id,
                    created_at=now,
                    updated_at=now,
                )
            )
        ),
    )

    response = client.patch(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/permissions/{user_id}",
        json={"permission_level": 4},
    )
    assert response.status_code == 200
    assert response.json()["permission_level"] == 4


def test_project_artifact_consultant_review_success(
    client, consultant_current_user, monkeypatch
) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    now = datetime(2026, 3, 31, tzinfo=UTC)

    monkeypatch.setattr(
        ProjectService,
        "review_project_artifact_consultant",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, payload: {
                "id": artifact_id,
                "code": "ASIS_CONCEPTUAL_DIAGRAM",
                "name": "AS-IS Conceptual Diagram",
                "description": "desc",
                "block": "AS_IS",
                "order_index": 2,
                "block_order": 2,
                "status": "PENDING_COMPANY_APPROVAL",
                "is_applicable": True,
                "consultant_approved": True,
                "company_approved": False,
                "consultant_approved_at": now,
                "company_approved_at": None,
                "approved_at": None,
                "approved_by_user_id": None,
                "review_cycles": 0,
                "last_rejection_reason": None,
                "effective_permission_level": 5,
                "created_at": now,
                "updated_at": now,
            }
        ),
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/review/consultant",
        json={"approved": True},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING_COMPANY_APPROVAL"


def test_project_artifact_company_review_success(client, monkeypatch) -> None:
    company_user = type(
        "CompanyUser",
        (),
        {
            "id": uuid.uuid4(),
            "tipo_usuario": "EMPRESA",
            "email": "company@acme.com",
            "estado": "ACTIVO",
        },
    )()
    app.dependency_overrides[get_current_user] = lambda: company_user
    project_id = uuid.uuid4()
    artifact_id = uuid.uuid4()
    now = datetime(2026, 3, 31, tzinfo=UTC)

    monkeypatch.setattr(
        ProjectService,
        "review_project_artifact_company",
        staticmethod(
            lambda db, project_id, artifact_id, actor_user_id, actor_user_type, payload: {
                "id": artifact_id,
                "code": "ASIS_CONCEPTUAL_DIAGRAM",
                "name": "AS-IS Conceptual Diagram",
                "description": "desc",
                "block": "AS_IS",
                "order_index": 2,
                "block_order": 2,
                "status": "APPROVED",
                "is_applicable": True,
                "consultant_approved": True,
                "company_approved": True,
                "consultant_approved_at": now,
                "company_approved_at": now,
                "approved_at": now,
                "approved_by_user_id": company_user.id,
                "review_cycles": 0,
                "last_rejection_reason": None,
                "effective_permission_level": 4,
                "created_at": now,
                "updated_at": now,
            }
        ),
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/artifacts/{artifact_id}/review/company",
        json={"approved": True},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

from __future__ import annotations

import uuid

from app.dependencies.auth import get_current_user
from app.exceptions.domain import ConflictDomainError, NotFoundDomainError
from app.main import app
from app.schemas.user import UserListResponse, UserResponse
from app.services.project_membership_service import ProjectMembershipService
from app.services.user_service import UserService


def test_users_requires_auth(client) -> None:
    response = client.get("/api/v1/users")
    assert response.status_code == 401


def test_users_list_success_for_consultant(client, consultant_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user

    mocked_user = UserResponse(
        id=uuid.uuid4(),
        nombre="Ana",
        email="ana@acme.com",
        tipo_usuario="CONSULTOR",
        estado="ACTIVO",
        created_by_user_id=consultant_current_user.id,
        deactivated_at=None,
        created_at="2026-03-30T00:00:00Z",
        updated_at="2026-03-30T00:00:00Z",
    )
    monkeypatch.setattr(
        UserService,
        "list_users",
        staticmethod(
            lambda db, tipo_usuario, estado, search: UserListResponse(total=1, items=[mocked_user])
        ),
    )

    response = client.get("/api/v1/users")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_users_list_success_for_empresa(client, empresa_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: empresa_current_user

    mocked_user = UserResponse(
        id=uuid.uuid4(),
        nombre="Ana",
        email="ana@acme.com",
        tipo_usuario="CONSULTOR",
        estado="ACTIVO",
        created_by_user_id=empresa_current_user.id,
        deactivated_at=None,
        created_at="2026-03-30T00:00:00Z",
        updated_at="2026-03-30T00:00:00Z",
    )
    monkeypatch.setattr(
        UserService,
        "list_users",
        staticmethod(
            lambda db, tipo_usuario, estado, search: UserListResponse(total=1, items=[mocked_user])
        ),
    )

    response = client.get("/api/v1/users")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_users_list_success_for_admin(client, admin_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: admin_current_user

    mocked_user = UserResponse(
        id=uuid.uuid4(),
        nombre="Ana",
        email="ana@acme.com",
        tipo_usuario="CONSULTOR",
        estado="ACTIVO",
        created_by_user_id=admin_current_user.id,
        deactivated_at=None,
        created_at="2026-03-30T00:00:00Z",
        updated_at="2026-03-30T00:00:00Z",
    )

    monkeypatch.setattr(
        UserService,
        "list_users",
        staticmethod(
            lambda db, tipo_usuario, estado, search: UserListResponse(total=1, items=[mocked_user])
        ),
    )

    response = client.get("/api/v1/users")
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_users_create_conflict_maps_to_409(client, admin_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: admin_current_user

    def _raise_conflict(db, payload, created_by_user_id):
        raise ConflictDomainError("Email is already registered")

    monkeypatch.setattr(UserService, "create_user", staticmethod(_raise_conflict))

    response = client.post(
        "/api/v1/users",
        json={
            "nombre": "Luis",
            "email": "luis@acme.com",
            "tipo_usuario": "CONSULTOR",
            "password": "Secret123!",
            "estado": "ACTIVO",
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


def test_project_memberships_update_validation_422(client, admin_current_user) -> None:
    app.dependency_overrides[get_current_user] = lambda: admin_current_user

    response = client.patch(
        f"/api/v1/projects/{uuid.uuid4()}/members/{uuid.uuid4()}/permissions",
        json={},
    )
    assert response.status_code == 422


def test_project_memberships_not_found_maps_to_404(client, admin_current_user, monkeypatch) -> None:
    app.dependency_overrides[get_current_user] = lambda: admin_current_user

    def _raise_not_found(db, project_id, actor_user_id):
        raise NotFoundDomainError("Project not found")

    monkeypatch.setattr(
        ProjectMembershipService,
        "list_members",
        staticmethod(_raise_not_found),
    )

    response = client.get(f"/api/v1/projects/{uuid.uuid4()}/members")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"

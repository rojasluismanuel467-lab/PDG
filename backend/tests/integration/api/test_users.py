import uuid
from typing import Any

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.enums import UserStatus, UserType
from app.dependencies.auth import get_current_user
from app.main import app
from app.models.user import User
from tests.fixtures.user_fixtures import create_mock_user


@pytest.fixture
def auth_client(client: TestClient, admin_current_user) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: admin_current_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)


def test_create_user_endpoint_201(auth_client: TestClient, db: Any) -> None:
    payload = {
        "nombre": "Integration User",
        "email": "integration@test.local",
        "tipo_usuario": UserType.CONSULTOR.value,
        "password": "securepassword",
        "estado": UserStatus.ACTIVO.value,
    }

    response = auth_client.post("/api/v1/users", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["nombre"] == payload["nombre"]
    assert data["email"] == payload["email"]
    assert data["tipo_usuario"] == payload["tipo_usuario"]
    assert "id" in data


def test_create_user_duplicate_email_409(auth_client: TestClient, db: Any) -> None:
    # First creation
    payload = {
        "nombre": "Integration User 2",
        "email": "duplicate@test.local",
        "tipo_usuario": UserType.CONSULTOR.value,
    }
    auth_client.post("/api/v1/users", json=payload)

    # Second creation with same email
    response = auth_client.post("/api/v1/users", json=payload)
    
    assert response.status_code == status.HTTP_409_CONFLICT
    assert "already registered" in response.json()["detail"]


def test_list_users_endpoint_200(auth_client: TestClient, db: Any) -> None:
    # Setup some data
    user1 = create_mock_user(email="list1@test.local", tipo_usuario=UserType.EMPRESA)
    user2 = create_mock_user(email="list2@test.local", tipo_usuario=UserType.CONSULTOR)
    db.add(user1)
    db.add(user2)
    db.commit()

    response = auth_client.get("/api/v1/users")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert data["total"] >= 2


def test_update_user_endpoint_200(auth_client: TestClient, db: Any) -> None:
    # Setup
    user = create_mock_user(email="update@test.local")
    db.add(user)
    db.commit()
    db.refresh(user)

    payload = {
        "nombre": "Updated Name",
        "estado": UserStatus.INACTIVO.value,
    }

    response = auth_client.patch(f"/api/v1/users/{user.id}", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["nombre"] == "Updated Name"
    assert data["estado"] == UserStatus.INACTIVO.value


def test_deactivate_user_endpoint_200(auth_client: TestClient, db: Any) -> None:
    # Setup
    user = create_mock_user(email="deactivate@test.local")
    db.add(user)
    db.commit()
    db.refresh(user)

    response = auth_client.patch(f"/api/v1/users/{user.id}/deactivate")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["estado"] == UserStatus.INACTIVO.value
    assert data["deactivated_at"] is not None


def test_deactivate_own_user_endpoint_422(auth_client: TestClient, admin_current_user) -> None:
    response = auth_client.patch(f"/api/v1/users/{admin_current_user.id}/deactivate")

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "cannot deactivate your own account" in response.json()["detail"]

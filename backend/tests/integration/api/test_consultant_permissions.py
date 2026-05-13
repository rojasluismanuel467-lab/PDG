import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.core.enums import UserType
from app.dependencies.auth import get_current_user
from app.main import app
from tests.fixtures.user_fixtures import create_mock_user


@pytest.fixture
def consultant_client(client: TestClient, consultant_current_user) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: consultant_current_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)


def test_consultant_can_list_users(consultant_client: TestClient, db) -> None:
    # Setup: ensure there are some users in the DB
    user = create_mock_user(email="test_list@test.local", tipo_usuario=UserType.EMPRESA)
    db.add(user)
    db.commit()

    response = consultant_client.get("/api/v1/users?tipo_usuario=EMPRESA&estado=ACTIVO")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert any(u["email"] == "test_list@test.local" for u in data["items"])

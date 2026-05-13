import uuid
from datetime import UTC, datetime

import pytest

from app.core.enums import UserStatus, UserType
from app.exceptions.domain import ConflictDomainError, NotFoundDomainError, ValidationDomainError
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.services.user_service import UserService
from tests.fixtures.user_fixtures import create_mock_user


class _FakeDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.flush_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def flush(self) -> None:
        self.flush_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1


def test_create_user_success(monkeypatch) -> None:
    db = _FakeDb()
    actor_id = uuid.uuid4()
    payload = UserCreate(
        nombre="Test Service User",
        email="service@example.com",
        tipo_usuario=UserType.CONSULTOR,
        password="securepassword",
        estado=UserStatus.ACTIVO,
    )

    def mock_get_by_email(*args, **kwargs):
        return None  # No existing user

    def mock_create(*args, user, **kwargs):
        user.id = uuid.uuid4()
        user.created_at = datetime.now(UTC)
        user.updated_at = datetime.now(UTC)
        return user

    monkeypatch.setattr(UserRepository, "get_by_email", mock_get_by_email)
    monkeypatch.setattr(UserRepository, "create", mock_create)

    response = UserService.create_user(db, payload=payload, created_by_user_id=actor_id)

    assert response.nombre == payload.nombre
    assert response.email == payload.email
    assert response.tipo_usuario == payload.tipo_usuario
    assert response.created_by_user_id == actor_id
    assert db.commit_calls == 1


def test_create_user_duplicate_email_conflict(monkeypatch) -> None:
    db = _FakeDb()
    payload = UserCreate(
        nombre="Test Service User",
        email="duplicate@example.com",
        tipo_usuario=UserType.CONSULTOR,
    )

    def mock_get_by_email(*args, **kwargs):
        return create_mock_user(email="duplicate@example.com")

    monkeypatch.setattr(UserRepository, "get_by_email", mock_get_by_email)

    with pytest.raises(ConflictDomainError, match="Email is already registered"):
        UserService.create_user(db, payload=payload, created_by_user_id=uuid.uuid4())

    assert db.commit_calls == 0


def test_update_user_success(monkeypatch) -> None:
    db = _FakeDb()
    user_id = uuid.uuid4()
    mock_user = create_mock_user(id=user_id, nombre="Old Name", estado=UserStatus.ACTIVO)
    payload = UserUpdate(nombre="New Name", estado=UserStatus.INACTIVO)

    def mock_get_by_id(*args, **kwargs):
        return mock_user

    monkeypatch.setattr(UserRepository, "get_by_id", mock_get_by_id)

    response = UserService.update_user(db, user_id=user_id, payload=payload)

    assert response.nombre == "New Name"
    assert response.estado == UserStatus.INACTIVO
    assert response.deactivated_at is not None
    assert db.flush_calls == 1
    assert db.commit_calls == 1


def test_update_user_not_found(monkeypatch) -> None:
    db = _FakeDb()
    payload = UserUpdate(nombre="New Name")

    def mock_get_by_id(*args, **kwargs):
        return None

    monkeypatch.setattr(UserRepository, "get_by_id", mock_get_by_id)

    with pytest.raises(NotFoundDomainError, match="User not found"):
        UserService.update_user(db, user_id=uuid.uuid4(), payload=payload)


def test_deactivate_user_success(monkeypatch) -> None:
    db = _FakeDb()
    user_id = uuid.uuid4()
    actor_id = uuid.uuid4()
    mock_user = create_mock_user(id=user_id, estado=UserStatus.ACTIVO)

    def mock_get_by_id(*args, **kwargs):
        return mock_user

    monkeypatch.setattr(UserRepository, "get_by_id", mock_get_by_id)

    response = UserService.deactivate_user(db, user_id=user_id, actor_user_id=actor_id)

    assert response.estado == UserStatus.INACTIVO
    assert response.deactivated_at is not None
    assert db.flush_calls == 1
    assert db.commit_calls == 1


def test_deactivate_own_user_validation_error() -> None:
    db = _FakeDb()
    user_id = uuid.uuid4()

    with pytest.raises(ValidationDomainError, match="You cannot deactivate your own account"):
        UserService.deactivate_user(db, user_id=user_id, actor_user_id=user_id)

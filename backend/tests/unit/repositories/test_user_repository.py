import uuid
from sqlalchemy.orm import Session

from app.core.enums import UserStatus, UserType
from app.models.user import User
from app.repositories.user_repository import UserRepository
from tests.fixtures.user_fixtures import create_mock_user


def test_create_user_success(db: Session) -> None:
    # Arrange
    user = create_mock_user(email="newuser@example.com")

    # Act
    created_user = UserRepository.create(db, user=user)
    db.commit()

    # Assert
    assert created_user.id is not None
    assert created_user.email == "newuser@example.com"
    assert created_user.nombre == "Test User"
    
    # Verify persistence
    persisted_user = db.get(User, created_user.id)
    assert persisted_user is not None
    assert persisted_user.email == "newuser@example.com"


def test_get_by_id_found_and_not_found(db: Session) -> None:
    # Arrange
    user = create_mock_user(email="getbyid@example.com")
    UserRepository.create(db, user=user)
    db.commit()

    # Act - Found
    found_user = UserRepository.get_by_id(db, user_id=user.id)
    
    # Assert - Found
    assert found_user is not None
    assert found_user.id == user.id

    # Act - Not Found
    not_found_user = UserRepository.get_by_id(db, user_id=uuid.uuid4())
    
    # Assert - Not Found
    assert not_found_user is None


def test_get_by_email_found_and_not_found(db: Session) -> None:
    # Arrange
    user = create_mock_user(email="getbyemail@example.com")
    UserRepository.create(db, user=user)
    db.commit()

    # Act - Found (case insensitive)
    found_user = UserRepository.get_by_email(db, email="GETBYEMAIL@example.com")
    
    # Assert - Found
    assert found_user is not None
    assert found_user.id == user.id

    # Act - Not Found
    not_found_user = UserRepository.get_by_email(db, email="nonexistent@example.com")
    
    # Assert - Not Found
    assert not_found_user is None


def test_list_users_with_filters(db: Session) -> None:
    # Arrange
    admin_user = create_mock_user(
        email="admin_list@example.com",
        tipo_usuario=UserType.ADMINISTRADOR,
        estado=UserStatus.ACTIVO
    )
    consultant_user = create_mock_user(
        email="consultant_list@example.com",
        tipo_usuario=UserType.CONSULTOR,
        estado=UserStatus.INACTIVO
    )
    UserRepository.create(db, user=admin_user)
    UserRepository.create(db, user=consultant_user)
    db.commit()

    # Act - No filters (should find at least 2)
    items, total = UserRepository.list_users(db)
    assert total >= 2

    # Act - Filter by tipo_usuario
    items_admin, total_admin = UserRepository.list_users(db, tipo_usuario=UserType.ADMINISTRADOR)
    assert any(u.id == admin_user.id for u in items_admin)

    # Act - Filter by estado
    items_inactive, total_inactive = UserRepository.list_users(db, estado=UserStatus.INACTIVO)
    assert any(u.id == consultant_user.id for u in items_inactive)

    # Act - Filter by search (email part)
    items_search, total_search = UserRepository.list_users(db, search="consultant_list")
    assert total_search >= 1
    assert any(u.id == consultant_user.id for u in items_search)

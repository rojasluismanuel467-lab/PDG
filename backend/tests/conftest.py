from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.enums import UserStatus, UserType
from app.dependencies.auth import CurrentUser
from app.dependencies.db import get_db
from app.main import app
from app.models.base import Base

TEST_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5434/arqdata_test"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db() -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db
        
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_current_user() -> CurrentUser:
    return CurrentUser(
        id=uuid.uuid4(),
        tipo_usuario=UserType.ADMINISTRADOR,
        email="admin@acme.com",
        estado=UserStatus.ACTIVO,
    )

@pytest.fixture
def consultant_current_user() -> CurrentUser:
    return CurrentUser(
        id=uuid.uuid4(),
        tipo_usuario=UserType.CONSULTOR,
        email="consultor@acme.com",
        estado=UserStatus.ACTIVO,
    )


@pytest.fixture
def empresa_current_user() -> CurrentUser:
    return CurrentUser(
        id=uuid.uuid4(),
        tipo_usuario=UserType.EMPRESA,
        email="empresa@acme.com",
        estado=UserStatus.ACTIVO,
    )

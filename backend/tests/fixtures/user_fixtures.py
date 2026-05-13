import uuid
from app.core.enums import UserStatus, UserType
from app.models.user import User

def create_mock_user(
    *,
    id: uuid.UUID | None = None,
    nombre: str = "Test User",
    email: str = "test@user.com",
    tipo_usuario: UserType = UserType.CONSULTOR,
    estado: UserStatus = UserStatus.ACTIVO,
    password_hash: str = "hashed_password",
    created_by_user_id: uuid.UUID | None = None,
) -> User:
    return User(
        id=id or uuid.uuid4(),
        nombre=nombre,
        email=email,
        tipo_usuario=tipo_usuario,
        estado=estado,
        password_hash=password_hash,
        created_by_user_id=created_by_user_id,
    )

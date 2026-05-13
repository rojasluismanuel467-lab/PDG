from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.exceptions.domain import UnauthorizedDomainError

# Mantenemos pwd_context solo por compatibilidad si se usa en otros sitios,
# pero no lo usaremos para bcrypt debido al bug conocido con versiones nuevas.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@dataclass
class TokenPayload:
    sub: str
    exp: datetime
    token_type: str
    jti: str | None = None


def hash_password(password: str) -> str:
    # Usar bcrypt directamente para evitar el error: module 'bcrypt' has no attribute '__about__'
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        # Usar bcrypt directo para la verificación
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception as e:
        print(f"Error en verificación bcrypt: {e}")
        # Intento de fallback por si quedara algún hash antiguo de passlib
        try:
            return pwd_context.verify(password, password_hash)
        except Exception:
            return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(subject: str) -> tuple[str, datetime]:
    expire = datetime.now(UTC) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "exp": expire,
        "type": "access",
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt, expire


def create_refresh_token(subject: str) -> tuple[str, datetime, str]:
    expire = datetime.now(UTC) + timedelta(minutes=settings.JWT_REFRESH_TOKEN_EXPIRE_MINUTES)
    token_id = str(uuid.uuid4())
    payload = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
        "jti": token_id,
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt, expire, token_id


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise UnauthorizedDomainError("Invalid or expired token") from exc


def parse_token_payload(token: str) -> TokenPayload:
    data = decode_token(token)
    sub = data.get("sub")
    token_type = data.get("type")
    exp_raw = data.get("exp")
    jti = data.get("jti")

    if not isinstance(sub, str) or not isinstance(token_type, str) or exp_raw is None:
        raise UnauthorizedDomainError("Invalid token payload")

    if isinstance(exp_raw, (float, int)):
        exp = datetime.fromtimestamp(float(exp_raw), tz=UTC)
    elif isinstance(exp_raw, str):
        try:
            exp = datetime.fromisoformat(exp_raw)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=UTC)
        except ValueError as exc:
            raise UnauthorizedDomainError("Invalid token expiration format") from exc
    else:
        raise UnauthorizedDomainError("Invalid token expiration format")

    return TokenPayload(
        sub=sub, exp=exp, token_type=token_type, jti=jti if isinstance(jti, str) else None
    )

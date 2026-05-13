from http import HTTPStatus
from typing import Any


class DomainError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str = "DOMAIN_ERROR",
        status_code: int = HTTPStatus.BAD_REQUEST,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
        }


class ValidationDomainError(DomainError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message,
            code="VALIDATION_ERROR",
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            details=details,
        )


class ForbiddenDomainError(DomainError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message,
            code="FORBIDDEN",
            status_code=HTTPStatus.FORBIDDEN,
            details=details,
        )


class UnauthorizedDomainError(DomainError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message,
            code="UNAUTHORIZED",
            status_code=HTTPStatus.UNAUTHORIZED,
            details=details,
        )


class NotFoundDomainError(DomainError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message,
            code="NOT_FOUND",
            status_code=HTTPStatus.NOT_FOUND,
            details=details,
        )


class ConflictDomainError(DomainError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message,
            code="CONFLICT",
            status_code=HTTPStatus.CONFLICT,
            details=details,
        )

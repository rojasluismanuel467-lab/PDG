from enum import IntEnum, StrEnum


class UserType(StrEnum):
    ADMINISTRADOR = "ADMINISTRADOR"
    CONSULTOR = "CONSULTOR"
    EMPRESA = "EMPRESA"


class UserStatus(StrEnum):
    ACTIVO = "ACTIVO"
    INACTIVO = "INACTIVO"


class ProjectStatus(StrEnum):
    ACTIVO = "ACTIVO"
    EN_PAUSA = "EN_PAUSA"
    CERRADO = "CERRADO"
    BLOQUEADO = "BLOQUEADO"


class ProjectBlock(StrEnum):
    PROJECT = "PROJECT"
    AS_IS = "AS_IS"
    TO_BE = "TO_BE"
    BRECHAS = "BRECHAS"
    ROADMAP = "ROADMAP"


class ProjectArtifactStatus(StrEnum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_COMPANY_APPROVAL = "PENDING_COMPANY_APPROVAL"
    APPROVED = "APPROVED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class MaturityResponseStatus(StrEnum):
    ACTIVE = "active"
    ANULADA = "anulada"


class MaturityValidationStatus(StrEnum):
    PENDIENTE = "PENDIENTE"
    EN_REVISION = "EN_REVISION"
    APROBADA = "APROBADA"
    RECHAZADA = "RECHAZADA"


class InvitationStatus(StrEnum):
    PENDIENTE = "PENDIENTE"
    ACEPTADA = "ACEPTADA"
    EXPIRADA = "EXPIRADA"
    REVOCADA = "REVOCADA"


class PermissionLevel(IntEnum):
    SIN_ACCESO = 0
    LECTURA = 1
    COMENTAR = 2
    EDITAR = 3
    APROBAR = 4
    DELEGAR = 5


class RaciAssignmentType(StrEnum):
    R = "R"
    A = "A"
    C = "C"
    I = "I"


class RaciCommentReferenceType(StrEnum):
    ACTIVIDAD = "actividad"
    ROL = "rol"
    GENERAL = "general"


class RaciStatus(StrEnum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

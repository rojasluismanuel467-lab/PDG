from app.core.enums import PermissionLevel, ProjectBlock

# Project managers always operate at level 5 in every block.
MANAGER_PERMISSION_LEVEL = PermissionLevel.DELEGAR

# Delegated users can assign up to level 4.
MAX_DELEGATED_ASSIGNMENT_LEVEL = PermissionLevel.APROBAR

# Mapping used by authorization services for dynamic block checks.
BLOCK_PERMISSION_FIELD_MAP: dict[ProjectBlock, str] = {
    ProjectBlock.PROJECT: "project_permission_level",
    ProjectBlock.AS_IS: "nivel_asis",
    ProjectBlock.TO_BE: "nivel_tobe",
    ProjectBlock.BRECHAS: "nivel_brechas",
    ProjectBlock.ROADMAP: "nivel_roadmap",
}

# Business rule: maturity questionnaire belongs to AS_IS block.
QUESTIONNAIRE_BLOCK = ProjectBlock.AS_IS
QUESTIONNAIRE_ARTIFACT_CODE = "ASIS_MATURITY_QUESTIONNAIRE"


def validate_permission_level(level: int) -> int:
    if level < PermissionLevel.SIN_ACCESO or level > PermissionLevel.DELEGAR:
        raise ValueError("Permission level must be between 0 and 5")
    return level


def can_assign_level(
    *,
    assigner_level: int,
    target_level: int,
    is_assigner_manager: bool,
) -> bool:
    assigner_level = validate_permission_level(assigner_level)
    target_level = validate_permission_level(target_level)

    if is_assigner_manager:
        return True
    if assigner_level < PermissionLevel.DELEGAR:
        return False
    return target_level <= MAX_DELEGATED_ASSIGNMENT_LEVEL

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import app.schemas.raci
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.schemas.raci import (
    RaciActivityCreate,
    RaciActivityResponse,
    RaciAssignmentUpdate,
    RaciCommentCreate,
    RaciCommentResponse,
    RaciGridResponse,
    RaciMatrixCreate,
    RaciMatrixResponse,
    RaciRoleCreate,
    RaciRoleResponse,
)
from app.services.raci_service import RaciService

# Intenta importar los errores definidos en el service
try:
    from app.exceptions.domain import ConflictDomainError, NotFoundDomainError
except ImportError:

    class NotFoundDomainError(Exception):
        pass

    class ConflictDomainError(Exception):
        pass


router = APIRouter()


def get_raci_service(db: Session = Depends(get_db)):
    return RaciService(db)


@router.get("", response_model=list[RaciMatrixResponse])
def list_raci_matrices(
    project_id: UUID | None = None,
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        return service.list_matrices(project_id)
    except Exception as e:
        import traceback

        print(traceback.format_exc())  # Esto se verá en tu terminal de uvicorn
        raise HTTPException(status_code=400, detail=f"Error en list_matrices: {str(e)}")


@router.post("", response_model=RaciMatrixResponse, status_code=status.HTTP_201_CREATED)
def create_raci_matrix(
    data: RaciMatrixCreate,
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        return service.create_matrix(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{matrix_id}/grid", response_model=RaciGridResponse)
def get_raci_grid(
    matrix_id: UUID,
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        return service.get_grid(matrix_id)
    except NotFoundDomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{matrix_id}/roles", response_model=RaciRoleResponse, status_code=status.HTTP_201_CREATED
)
def create_raci_role(
    matrix_id: UUID,
    data: RaciRoleCreate,
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        return service.add_role(matrix_id, data)
    except NotFoundDomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{matrix_id}/activities",
    response_model=RaciActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_raci_activity(
    matrix_id: UUID,
    data: RaciActivityCreate,
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        return service.add_activity(matrix_id, data)
    except NotFoundDomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{matrix_id}/activities/{activity_id}/assignments")
def update_raci_assignments(
    matrix_id: UUID,
    activity_id: UUID,
    assignments: list[RaciAssignmentUpdate],
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        service.update_assignments(matrix_id, activity_id, assignments)
        return {"detail": "Assignments updated successfully"}
    except NotFoundDomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ConflictDomainError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{matrix_id}")
def update_raci_matrix_bulk(
    matrix_id: UUID,
    data: app.schemas.raci.RaciBulkUpdate,
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        service.sync_bulk(matrix_id, data, actor_nombre=current_user.nombre)
        return {"detail": "Matrix successfully synced"}
    except NotFoundDomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/{matrix_id}/comments", response_model=RaciCommentResponse, status_code=status.HTTP_201_CREATED
)
def post_raci_comment(
    matrix_id: UUID,
    data: RaciCommentCreate,
    current_user=Depends(get_current_user),
    service: RaciService = Depends(get_raci_service),
):
    try:
        # Extraemos datos del usuario actual del token
        author_id = current_user.id
        author_nombre = current_user.nombre
        author_perfil = current_user.tipo_usuario

        return service.add_comment(
            matrix_id,
            data,
            author_id=author_id,
            author_nombre=author_nombre,
            author_perfil=author_perfil,
        )
    except NotFoundDomainError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

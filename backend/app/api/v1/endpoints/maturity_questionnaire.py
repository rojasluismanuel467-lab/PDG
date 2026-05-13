import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.enums import MaturityResponseStatus
from app.dependencies.auth import CurrentUser, get_current_user
from app.dependencies.db import get_db
from app.schemas.maturity_questionnaire import (
    AnularResponseRequest,
    EvidenceUploadResponse,
    FinalizeEvaluationRequest,
    PublicQuestionnaireValidationResponse,
    QuestionnaireConfigResponse,
    QuestionnaireConfigUpsertRequest,
    QuestionnaireResultsResponse,
    QuestionnaireStatusResponse,
    ResponseDTO,
    ResponseListResponse,
    SubmitResponseRequest,
    SubmitResponseSuccess,
    UpdateQuestionnaireStatusRequest,
    ValidateAnswerRequest,
)
from app.services.maturity_questionnaire_service import MaturityQuestionnaireService

router = APIRouter(tags=["maturity-questionnaire"])


@router.get(
    "/projects/{project_id}/questionnaire/config", response_model=QuestionnaireConfigResponse
)
@router.get(
    "/proyectos/{project_id}/cuestionario/config",
    response_model=QuestionnaireConfigResponse,
    include_in_schema=False,
)
def get_questionnaire_config(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> QuestionnaireConfigResponse:
    return MaturityQuestionnaireService.get_config(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
    )


@router.post(
    "/projects/{project_id}/questionnaire/config", response_model=QuestionnaireConfigResponse
)
@router.post(
    "/proyectos/{project_id}/cuestionario/config",
    response_model=QuestionnaireConfigResponse,
    include_in_schema=False,
)
def upsert_questionnaire_config(
    project_id: uuid.UUID,
    payload: QuestionnaireConfigUpsertRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> QuestionnaireConfigResponse:
    return MaturityQuestionnaireService.upsert_config(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.patch(
    "/projects/{project_id}/questionnaire/status", response_model=QuestionnaireStatusResponse
)
@router.patch(
    "/proyectos/{project_id}/cuestionario/estado",
    response_model=QuestionnaireStatusResponse,
    include_in_schema=False,
)
def update_questionnaire_status(
    project_id: uuid.UUID,
    payload: UpdateQuestionnaireStatusRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> QuestionnaireStatusResponse:
    return MaturityQuestionnaireService.update_status(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.get(
    "/questionnaire/validate/{access_code}", response_model=PublicQuestionnaireValidationResponse
)
@router.get(
    "/cuestionario/validate/{access_code}",
    response_model=PublicQuestionnaireValidationResponse,
    include_in_schema=False,
)
def validate_questionnaire_access(
    access_code: str,
    db: Session = Depends(get_db),
) -> PublicQuestionnaireValidationResponse:
    return MaturityQuestionnaireService.validate_public_access(db, access_code=access_code)


@router.get("/questionnaire/config/{access_code}", response_model=QuestionnaireConfigResponse)
@router.get(
    "/cuestionario/config/{access_code}",
    response_model=QuestionnaireConfigResponse,
    include_in_schema=False,
)
def get_public_questionnaire_config(
    access_code: str,
    db: Session = Depends(get_db),
) -> QuestionnaireConfigResponse:
    return MaturityQuestionnaireService.get_public_config(db, access_code=access_code)


@router.post(
    "/projects/{project_id}/questionnaire/responses",
    response_model=SubmitResponseSuccess,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/proyectos/{project_id}/cuestionario/respuestas",
    response_model=SubmitResponseSuccess,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def submit_questionnaire_response(
    project_id: uuid.UUID,
    payload: SubmitResponseRequest,
    code: str = Query(..., min_length=6, max_length=64),
    db: Session = Depends(get_db),
) -> SubmitResponseSuccess:
    return MaturityQuestionnaireService.submit_response(
        db,
        project_id=project_id,
        access_code=code,
        payload=payload,
    )


@router.post(
    "/projects/{project_id}/questionnaire/evidence-upload",
    response_model=EvidenceUploadResponse,
)
@router.post(
    "/proyectos/{project_id}/cuestionario/evidencia",
    response_model=EvidenceUploadResponse,
    include_in_schema=False,
)
async def upload_questionnaire_evidence(
    project_id: uuid.UUID,
    code: str = Query(..., min_length=6, max_length=64),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> EvidenceUploadResponse:
    return await MaturityQuestionnaireService.upload_evidence(
        db,
        project_id=project_id,
        access_code=code,
        file=file,
    )


@router.get("/projects/{project_id}/questionnaire/responses", response_model=ResponseListResponse)
@router.get(
    "/proyectos/{project_id}/cuestionario/respuestas",
    response_model=ResponseListResponse,
    include_in_schema=False,
)
def list_questionnaire_responses(
    project_id: uuid.UUID,
    status_filter: MaturityResponseStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ResponseListResponse:
    return MaturityQuestionnaireService.list_responses(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        status=status_filter,
    )


@router.patch("/questionnaire/responses/{response_id}/anular", response_model=ResponseDTO)
@router.patch(
    "/cuestionario/respuestas/{response_id}/anular",
    response_model=ResponseDTO,
    include_in_schema=False,
)
def anular_questionnaire_response(
    response_id: uuid.UUID,
    payload: AnularResponseRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ResponseDTO:
    return MaturityQuestionnaireService.anular_response(
        db,
        response_id=response_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.patch("/questionnaire/responses/{response_id}/reactivar", response_model=ResponseDTO)
@router.patch(
    "/cuestionario/respuestas/{response_id}/reactivar",
    response_model=ResponseDTO,
    include_in_schema=False,
)
def reactivar_questionnaire_response(
    response_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ResponseDTO:
    return MaturityQuestionnaireService.reactivar_response(
        db,
        response_id=response_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
    )


@router.patch(
    "/questionnaire/responses/{response_id}/answers/{answer_id}/validate",
    response_model=ResponseDTO,
)
@router.patch(
    "/cuestionario/respuestas/{response_id}/answers/{answer_id}/validate",
    response_model=ResponseDTO,
    include_in_schema=False,
)
def validate_questionnaire_answer(
    response_id: uuid.UUID,
    answer_id: uuid.UUID,
    payload: ValidateAnswerRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ResponseDTO:
    return MaturityQuestionnaireService.validate_answer(
        db,
        response_id=response_id,
        answer_id=answer_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.patch(
    "/questionnaire/responses/{response_id}/finalize-evaluation",
    response_model=ResponseDTO,
)
@router.patch(
    "/cuestionario/respuestas/{response_id}/finalizar-evaluacion",
    response_model=ResponseDTO,
    include_in_schema=False,
)
def finalize_questionnaire_response_evaluation(
    response_id: uuid.UUID,
    payload: FinalizeEvaluationRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ResponseDTO:
    return MaturityQuestionnaireService.finalize_response_evaluation(
        db,
        response_id=response_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/questionnaire/results", response_model=QuestionnaireResultsResponse
)
@router.get(
    "/proyectos/{project_id}/cuestionario/resultados",
    response_model=QuestionnaireResultsResponse,
    include_in_schema=False,
)
def get_questionnaire_results(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> QuestionnaireResultsResponse:
    return MaturityQuestionnaireService.get_results(
        db,
        project_id=project_id,
        actor_user_id=current_user.id,
        actor_user_type=current_user.tipo_usuario,
    )

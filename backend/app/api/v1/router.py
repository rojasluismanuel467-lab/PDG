from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.brechas import router as brechas_router
from app.api.v1.endpoints.companies import router as companies_router
from app.api.v1.endpoints.business_glossary import router as business_glossary_router
from app.api.v1.endpoints.conceptual_model import router as conceptual_model_router
from app.api.v1.endpoints.dfd import router as dfd_router
from app.api.v1.endpoints.inventory_matrix import router as inventory_matrix_router
from app.api.v1.endpoints.logical_data_model import router as logical_data_model_router
from app.api.v1.endpoints.maturity_questionnaire import router as maturity_questionnaire_router
from app.api.v1.endpoints.project_memberships import router as project_memberships_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.raci import router as raci_router
from app.api.v1.endpoints.ai import router as ai_router
from app.api.v1.endpoints.ai_documents import router as ai_documents_router
from app.api.v1.endpoints.users import router as users_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(users_router)
router.include_router(companies_router)
router.include_router(projects_router)
router.include_router(project_memberships_router)
router.include_router(maturity_questionnaire_router)
router.include_router(raci_router, prefix="/raci-matrices", tags=["RACI"])
router.include_router(brechas_router)
router.include_router(conceptual_model_router)
router.include_router(dfd_router)
router.include_router(inventory_matrix_router)
router.include_router(business_glossary_router)
router.include_router(logical_data_model_router)
router.include_router(ai_router)
router.include_router(ai_documents_router)


@router.get("/ping")
def ping():
    return {"message": "pong"}

# Diagrama Relacional de Schemas Pydantic

Este diagrama muestra las relaciones entre los diferentes modelos Pydantic del proyecto.

```mermaid
classDiagram
    class ActivateInvitationRequest {
        +str token
        +str password
        +Union[str, NoneType] nombre?
    }

    class AuthLoginRequest {
        +str email
        +str password
    }

    class AuthLoginResponse {
        +AuthUserResponse user
        +TokenPairResponse tokens
    }

    class AuthLogoutRequest {
        +Union[str, NoneType] refresh_token?
    }

    class AuthLogoutResponse {
        +str message
        +int revoked_tokens
    }

    class AuthMessageResponse {
        +str message
    }

    class AuthRefreshRequest {
        +str refresh_token
    }

    class AuthRefreshResponse {
        +TokenPairResponse tokens
    }

    class AuthUserResponse {
        +UUID id
        +str nombre
        +str email
        +UserType tipo_usuario
        +UserStatus estado
    }

    class TokenPairResponse {
        +str access_token
        +str refresh_token
        +str token_type?
        +datetime access_token_expires_at
        +datetime refresh_token_expires_at
    }

    class UserRegisterRequest {
        +str nombre
        +EmailStr email
        +str password
        +UserType tipo_usuario
    }

    class BrechasVersionResponse {
        +str version
        +datetime fecha
        +str autor
        +Union[str, NoneType] descripcion_cambio
    }

    class CRUDComparisonSchema {
        +str id
        +str entidad
        +bool asis_create
        +bool asis_read
        +bool asis_update
        +bool asis_delete
        +bool tobe_create
        +bool tobe_read
        +bool tobe_update
        +bool tobe_delete
        +str brecha?
        +BrechaImpacto impacto
    }

    class CRUDMatrixResponse {
        +UUID id
        +UUID proyecto_id
        +UUID entregable_id
        +str nombre
        +str descripcion
        +List[CRUDComparisonSchema] comparaciones
        +str version_actual
        +List[BrechasVersionResponse] historial_versiones
        +datetime created_at
        +datetime updated_at
    }

    class CRUDMatrixSnapshotRequest {
        +str nombre
        +str descripcion?
        +List[CRUDComparisonSchema] comparaciones?
        +Union[str, NoneType] change_summary?
    }

    class ExportDocumentRequest {
        +ExportFormat formato
    }

    class GapAnalysisReportResponse {
        +UUID id
        +UUID proyecto_id
        +UUID entregable_id
        +str nombre
        +str descripcion
        +str resumen_ejecutivo
        +List[GapSchema] brechas
        +int total_brechas
        +int brechas_criticas
        +List[str] recomendaciones_prioritarias
        +List[str] formato_objetivo
        +str version_actual
        +List[BrechasVersionResponse] historial_versiones
        +datetime created_at
        +datetime updated_at
    }

    class GapAnalysisReportSnapshotRequest {
        +str nombre
        +str descripcion?
        +str resumen_ejecutivo?
        +List[GapSchema] brechas?
        +int total_brechas
        +int brechas_criticas
        +List[str] recomendaciones_prioritarias?
        +List[str] formato_objetivo?
        +Union[str, NoneType] change_summary?
    }

    class GapSchema {
        +str id
        +str area
        +str brecha
        +BrechaImpacto impacto
        +BrechaPrioridad prioridad
        +str recomendacion
    }

    class IntegrationQualityRulesResponse {
        +UUID id
        +UUID proyecto_id
        +UUID entregable_id
        +str nombre
        +str descripcion
        +str resumen_tecnico
        +List[IntegrationRuleSchema] reglas
        +List[str] criterios_aceptacion
        +List[str] formato_objetivo
        +str version_actual
        +List[BrechasVersionResponse] historial_versiones
        +datetime created_at
        +datetime updated_at
    }

    class IntegrationQualityRulesSnapshotRequest {
        +str nombre
        +str descripcion?
        +str resumen_tecnico?
        +List[IntegrationRuleSchema] reglas?
        +List[str] criterios_aceptacion?
        +List[str] formato_objetivo?
        +Union[str, NoneType] change_summary?
    }

    class IntegrationRuleSchema {
        +str id
        +str nombre
        +str descripcion?
        +IntegrationRuleType tipo
        +IntegrationRulePriority prioridad
        +str condicion
        +str accion
    }

    class AddGlossaryCommentRequest {
        +Union[str, NoneType] referencia_id?
        +Literal[termino, general] referencia_tipo
        +str contenido
    }

    class BusinessGlossaryResponse {
        +UUID id
        +UUID proyecto_id
        +UUID entregable_id
        +str nombre
        +str descripcion
        +List[TerminoGlosarioSchema] terminos
        +List[ComentarioGlosarioResponse] comentarios
        +str version_actual
        +List[VersionGlosarioResponse] historial_versiones
        +datetime created_at
        +datetime updated_at
    }

    class BusinessGlossarySnapshotRequest {
        +str nombre
        +str descripcion?
        +List[TerminoGlosarioSchema] terminos?
        +Union[str, NoneType] change_summary?
    }

    class ComentarioGlosarioResponse {
        +str id
        +Union[str, NoneType] referencia_id
        +str referencia_tipo
        +str autor_id
        +str autor_nombre
        +str autor_perfil
        +str contenido
        +str estado
        +str created_at
    }

    class TerminoGlosarioSchema {
        +str id
        +str termino
        +str definicion?
        +str propietario?
        +List[str] entidades_relacionadas?
        +List[str] sinonimos?
        +str notas?
    }

    class VersionGlosarioResponse {
        +str version
        +datetime fecha
        +str autor
        +Union[str, NoneType] descripcion_cambio
        +int total_terminos
    }

    class ConceptualAttributePayload {
        +str id
        +str name
        +str data_type
        +bool is_pk
        +bool is_fk
        +bool is_nullable
        +Union[str, NoneType] description?
        +Union[str, NoneType] fk_entity_ref?
        +Union[str, NoneType] fk_attribute_ref?
    }

    class ConceptualAttributeResponse {
        +str id
        +str name
        +str data_type
        +bool is_pk
        +bool is_fk
        +bool is_nullable
        +Union[str, NoneType] description?
        +Union[str, NoneType] fk_entity_ref?
        +Union[str, NoneType] fk_attribute_ref?
    }

    class ConceptualCommentCreateRequest {
        +str target_type
        +Union[str, NoneType] target_client_id?
        +str content
    }

    class ConceptualCommentResponse {
        +UUID id
        +UUID model_id
        +str target_type
        +Union[str, NoneType] target_client_id?
        +str content
        +str status
        +Union[int, NoneType] created_in_version_number?
        +Union[datetime, NoneType] outdated_at?
        +bool is_outdated?
        +UUID created_by_user_id
        +str created_by_user_email
        +str created_by_user_name
        +str created_by_user_type
        +datetime created_at
        +datetime updated_at
    }

    class ConceptualCommentUpdateRequest {
        +Union[str, NoneType] content?
        +Union[str, NoneType] status?
    }

    class ConceptualEntityPayload {
        +str id
        +str name
        +str description?
        +float position_x
        +float position_y
        +Union[str, NoneType] color?
        +List[ConceptualAttributePayload] attributes?
    }

    class ConceptualEntityResponse {
        +str id
        +str name
        +str description
        +float position_x
        +float position_y
        +Union[str, NoneType] color?
        +List[ConceptualAttributeResponse] attributes
    }

    class ConceptualModelCommentsResponse {
        +UUID model_id
        +List[ConceptualCommentResponse] comments
    }

    class ConceptualModelResponse {
        +UUID id
        +UUID project_id
        +UUID artifact_id
        +ProjectBlock phase
        +str name
        +str description
        +List[ConceptualEntityResponse] entities
        +List[ConceptualRelationResponse] relations
        +List[ConceptualCommentResponse] comments?
        +int current_version_number
        +datetime created_at
        +datetime updated_at
        +Union[datetime, NoneType] last_saved_at?
    }

    class ConceptualModelRestoreVersionRequest {
        +int source_version_number
        +Union[str, NoneType] change_summary?
    }

    class ConceptualModelUpsertRequest {
        +str name
        +str description?
        +List[ConceptualEntityPayload] entities?
        +List[ConceptualRelationPayload] relations?
        +Union[str, NoneType] change_summary?
    }

    class ConceptualModelVersionItem {
        +UUID id
        +int version_number
        +datetime created_at
        +UUID created_by_user_id
        +str created_by_user_email
        +Union[str, NoneType] change_summary?
    }

    class ConceptualModelVersionsResponse {
        +UUID model_id
        +List[ConceptualModelVersionItem] versions
    }

    class ConceptualRelationPayload {
        +str id
        +str name
        +str source_entity_id
        +str target_entity_id
        +str cardinality
        +Union[str, NoneType] description?
        +Union[str, NoneType] fk_attribute_id?
    }

    class ConceptualRelationResponse {
        +str id
        +str name
        +str source_entity_id
        +str target_entity_id
        +str cardinality
        +Union[str, NoneType] description?
        +Union[str, NoneType] fk_attribute_id?
    }

    class ConceptualVersionPreviewResponse {
        +UUID model_id
        +int source_version_number
        +ConceptualModelUpsertRequest snapshot
    }

    class DFDCommentCreateRequest {
        +str target_type
        +Union[str, NoneType] target_client_id?
        +str content
    }

    class DFDCommentResponse {
        +UUID id
        +UUID model_id
        +str target_type
        +Union[str, NoneType] target_client_id
        +str content
        +str status
        +Union[UUID, NoneType] created_by_user_id
        +str created_by_user_email
        +Union[str, NoneType] created_by_user_name
        +str created_by_user_type
        +int created_in_version_number
        +datetime created_at
        +datetime updated_at
    }

    class DFDFlowSchema {
        +str id
        +str origen_id
        +str destino_id
        +str etiqueta
        +Union[str, NoneType] datos_descripcion?
        +List[str] datos_campos?
        +Union[str, NoneType] fase?
        +Union[str, NoneType] tipo_flujo?
    }

    class DFDModelResponse {
        +UUID id
        +UUID project_id
        +UUID artifact_id
        +str phase
        +str name
        +str description
        +int level
        +List[DFDNodeSchema] nodos
        +List[DFDFlowSchema] flujos
        +List[DFDCommentResponse] comentarios
        +str version_actual
        +int current_version_number
        +List[DFDVersionResponse] historial_versiones
        +datetime created_at
        +datetime updated_at
        +datetime last_saved_at
    }

    class DFDModelSnapshotRequest {
        +str name
        +str description?
        +int level
        +List[DFDNodeSchema] nodos?
        +List[DFDFlowSchema] flujos?
        +Union[str, NoneType] change_summary?
    }

    class DFDNodeSchema {
        +str id
        +str tipo
        +str nombre
        +str descripcion?
        +Union[str, NoneType] numero_proceso?
        +Union[str, NoneType] prefijo_almacen?
        +float posicion_x
        +float posicion_y
        +Union[float, NoneType] width?
        +Union[float, NoneType] height?
        +Union[str, NoneType] color?
        +Union[str, NoneType] fase?
        +Union[str, NoneType] categoria?
        +List[str] etiquetas?
    }

    class DFDRestoreVersionRequest {
        +int source_version_number
        +Union[str, NoneType] change_summary?
    }

    class DFDVersionPreviewResponse {
        +UUID model_id
        +int source_version_number
        +DFDModelSnapshotRequest snapshot
    }

    class DFDVersionResponse {
        +UUID id
        +int version_number
        +datetime created_at
        +Union[UUID, NoneType] created_by_user_id
        +str created_by_user_email
        +Union[str, NoneType] change_summary
    }

    class DFDVersionsResponse {
        +UUID model_id
        +List[DFDVersionResponse] versions
    }

    class AddInventoryCommentRequest {
        +Union[str, NoneType] referencia_id?
        +Literal[sistema, general] referencia_tipo
        +str contenido
    }

    class ComentarioInventarioResponse {
        +str id
        +Union[str, NoneType] referencia_id
        +str referencia_tipo
        +str autor_id
        +str autor_nombre
        +str autor_perfil
        +str contenido
        +str estado
        +str created_at
    }

    class InventoryMatrixResponse {
        +UUID id
        +UUID proyecto_id
        +UUID entregable_id
        +str nombre
        +str descripcion
        +List[SistemaInventarioSchema] sistemas
        +List[ComentarioInventarioResponse] comentarios
        +str version_actual
        +List[VersionInventarioResponse] historial_versiones
        +datetime created_at
        +datetime updated_at
    }

    class InventoryMatrixSnapshotRequest {
        +str nombre
        +str descripcion?
        +List[SistemaInventarioSchema] sistemas?
        +Union[str, NoneType] change_summary?
    }

    class SistemaInventarioSchema {
        +str id
        +str nombre
        +TipoSistema tipo
        +str descripcion?
        +Union[str, NoneType] tecnologia?
        +Union[str, NoneType] version?
        +Union[str, NoneType] proveedor?
        +Union[str, NoneType] propietario_negocio?
        +Union[str, NoneType] propietario_tecnico?
        +Union[NivelCriticidad, NoneType] criticidad?
        +Union[EstadoSistema, NoneType] estado?
        +List[str] ambientes?
        +List[str] datos_que_maneja?
        +Union[List[str], NoneType] areas_estrategicas?
        +Union[str, NoneType] notas?
    }

    class VersionInventarioResponse {
        +str version
        +datetime fecha
        +str autor
        +Union[str, NoneType] descripcion_cambio
        +int total_sistemas
    }

    class LogicalColumnSchema {
        +str id
        +str nombre
        +str tipo_dato
        +str descripcion?
        +bool es_pk?
        +bool es_fk?
        +bool es_nullable?
        +bool es_unique?
        +int orden
    }

    class LogicalCommentCreateRequest {
        +str target_type
        +str target_client_id
        +str content
    }

    class LogicalCommentResponse {
        +UUID id
        +UUID model_id
        +str target_type
        +str target_client_id
        +str content
        +str status
        +Union[UUID, NoneType] created_by_user_id
        +str created_by_user_email
        +Union[str, NoneType] created_by_user_name
        +str created_by_user_type
        +int created_in_version_number
        +datetime created_at
        +datetime updated_at
    }

    class LogicalDataModelResponse {
        +UUID id
        +UUID proyecto_id
        +UUID entregable_id
        +str fase
        +str nombre
        +str descripcion
        +List[LogicalTableSchema] tablas
        +str sql_ddl
        +str notas_markdown
        +List[LogicalCommentResponse] comentarios
        +str version_actual
        +List[dict] versiones
        +datetime created_at
        +datetime updated_at
    }

    class LogicalDataModelUpsertRequest {
        +str nombre
        +str descripcion?
        +List[LogicalTableSchema] tablas?
        +str sql_ddl?
        +str notas_markdown?
        +Union[str, NoneType] change_summary?
    }

    class LogicalModelSnapshotRequest {
        +str nombre
        +str descripcion?
        +List[LogicalTableSchema] tablas?
        +str sql_ddl?
        +str notas_markdown?
        +Union[str, NoneType] change_summary?
    }

    class LogicalRestoreVersionRequest {
        +int source_version_number
        +Union[str, NoneType] change_summary?
    }

    class LogicalTableSchema {
        +str id
        +str nombre
        +str esquema
        +str descripcion?
        +List[LogicalColumnSchema] columnas?
        +List[dict] indices?
        +List[dict] constraints?
    }

    class LogicalVersionPreviewResponse {
        +UUID model_id
        +int source_version_number
        +LogicalModelSnapshotRequest snapshot
    }

    class LogicalVersionResponse {
        +UUID id
        +int version_number
        +datetime created_at
        +Union[UUID, NoneType] created_by_user_id
        +str created_by_user_email
        +Union[str, NoneType] change_summary
    }

    class LogicalVersionsResponse {
        +UUID model_id
        +List[LogicalVersionResponse] versions
    }

    class AnswerResponse {
        +UUID id
        +UUID question_id
        +Union[str, NoneType] question_text?
        +int score
        +int respondent_score
        +Union[int, NoneType] validated_score
        +Union[str, NoneType] evidencia_url
        +Union[str, NoneType] evidencia_nombre
        +Union[str, NoneType] evidencia_tipo
        +Union[int, NoneType] evidencia_size
        +MaturityValidationStatus estado_validacion
        +Union[str, NoneType] validacion_comentarios
    }

    class AnularResponseRequest {
        +str reason
    }

    class DimensionResultResponse {
        +int dimension_id
        +str dimension_name
        +float score
        +float percent
        +float weight
        +str maturity_level
        +int question_count
        +int validated_question_count
        +List[SubdomainResultResponse] subdomains
    }

    class DimensionWithSubdomainsResponse {
        +int id
        +str name
        +str description
        +float weight
        +List[SubdomainResponse] subdomains
    }

    class EvidenceUploadResponse {
        +str evidencia_url
        +str evidencia_nombre
        +str evidencia_tipo
        +int evidencia_size
    }

    class FinalizeEvaluationRequest {
        +bool confirmation?
    }

    class PublicQuestionnaireValidationResponse {
        +bool valid
        +Union[UUID, NoneType] questionnaire_id?
        +Union[UUID, NoneType] project_id?
        +Union[str, NoneType] project_name?
        +Union[bool, NoneType] is_closed?
        +Union[datetime, NoneType] expires_at?
        +Union[str, NoneType] error?
    }

    class QuestionConfigRequest {
        +int dimension_id
        +int subdomain_id
        +str text
        +List[str] applicable_roles
        +float weight?
        +List[ScoreCriteriaItem] score_criteria?
    }

    class QuestionResponse {
        +UUID id
        +int dimension_id
        +int subdomain_id
        +str text
        +List[str] applicable_roles
        +float weight
        +List[ScoreCriteriaItem] score_criteria?
    }

    class QuestionnaireConfigResponse {
        +UUID project_id
        +ProjectBlock phase
        +List[RoleCatalogResponse] roles
        +List[ScoreCriteriaItem] score_criteria
        +List[DimensionWithSubdomainsResponse] dimensions
        +List[QuestionResponse] template_questions
        +List[QuestionResponse] questions
        +bool is_closed
        +Union[str, NoneType] access_code?
        +Union[datetime, NoneType] access_expires_at?
        +Union[datetime, NoneType] created_at?
        +Union[datetime, NoneType] updated_at?
    }

    class QuestionnaireConfigUpsertRequest {
        +ProjectBlock phase?
        +List[QuestionConfigRequest] questions
        +Dict dimension_weights?
        +List[RoleCatalogUpsertRequest] roles?
        +List[ScoreCriteriaItem] score_criteria?
    }

    class QuestionnaireResultsResponse {
        +float overall_score
        +float overall_percent
        +str maturity_level
        +List[DimensionResultResponse] dimensions
        +int respondent_count
        +int validated_response_count
        +datetime calculated_at
    }

    class QuestionnaireStatusResponse {
        +UUID project_id
        +bool is_closed
        +datetime updated_at
    }

    class ResponseDTO {
        +UUID id
        +str respondent_name
        +str respondent_email
        +str role
        +List[AnswerResponse] answers
        +MaturityResponseStatus status
        +Union[str, NoneType] anulation_reason
        +Union[datetime, NoneType] anulated_at
        +Union[UUID, NoneType] anulated_by
        +datetime submitted_at
        +MaturityValidationStatus estado_validacion
        +Union[UUID, NoneType] validado_por
        +Union[datetime, NoneType] validado_en
        +Union[str, NoneType] validacion_comentarios
    }

    class ResponseListResponse {
        +List[ResponseDTO] responses
        +int total
        +int active
        +int anuladas
        +int pendientes_validacion
        +int validadas
    }

    class RoleCatalogResponse {
        +str id
        +str name
        +str description
        +bool is_system?
    }

    class RoleCatalogUpsertRequest {
        +str id
        +str name
        +str description
    }

    class ScoreCriteriaItem {
        +int score
        +str name
        +str description
    }

    class SubdomainResponse {
        +int id
        +str name
        +str description
        +float weight
    }

    class SubdomainResultResponse {
        +int subdomain_id
        +str subdomain_name
        +float score
        +float percent
        +int question_count
        +int validated_question_count
    }

    class SubmitAnswerRequest {
        +UUID question_id
        +int score
        +Union[str, NoneType] evidencia_url?
        +Union[str, NoneType] evidencia_nombre?
        +Union[str, NoneType] evidencia_tipo?
        +Union[int, NoneType] evidencia_size?
    }

    class SubmitResponseRequest {
        +str respondent_name
        +str respondent_email
        +str role
        +List[SubmitAnswerRequest] answers
    }

    class SubmitResponseSuccess {
        +UUID id
        +str message
        +datetime submitted_at
    }

    class UpdateQuestionnaireStatusRequest {
        +bool is_closed
    }

    class ValidateAnswerRequest {
        +int validated_score
        +Union[str, NoneType] validacion_comentarios?
    }

    class ArtifactPermissionResponse {
        +UUID artifact_id
        +UUID project_id
        +UUID user_id
        +int permission_level
        +Union[UUID, NoneType] assigned_by_user_id
        +datetime created_at
        +datetime updated_at
    }

    class InviteProjectMemberRequest {
        +EmailStr email
        +UserType tipo_usuario
        +Union[str, NoneType] nombre?
        +Union[int, NoneType] project_permission_level?
        +Union[int, NoneType] nivel_asis?
        +Union[int, NoneType] nivel_tobe?
        +Union[int, NoneType] nivel_brechas?
        +Union[int, NoneType] nivel_roadmap?
    }

    class InviteProjectMemberResponse {
        +str message
        +ProjectMemberResponse member
        +Union[str, NoneType] invitation_token
        +Union[datetime, NoneType] invitation_expires_at
    }

    class ProjectMemberResponse {
        +UUID membership_id
        +UUID project_id
        +UUID user_id
        +str nombre
        +EmailStr email
        +UserType tipo_usuario
        +UserStatus estado_usuario
        +bool is_manager
        +Union[UUID, NoneType] assigned_by_user_id
        +ProjectPermissionLevels permisos
        +datetime created_at
        +datetime updated_at
    }

    class ProjectMembersListResponse {
        +int total
        +List[ProjectMemberResponse] items
    }

    class ProjectPermissionLevels {
        +Union[int, NoneType] project_permission_level?
        +Union[int, NoneType] nivel_asis?
        +Union[int, NoneType] nivel_tobe?
        +Union[int, NoneType] nivel_brechas?
        +Union[int, NoneType] nivel_roadmap?
    }

    class RemoveProjectMemberResponse {
        +str message
    }

    class UpdateArtifactPermissionRequest {
        +int permission_level
    }

    class UpdateProjectMemberPermissionsRequest {
        +Union[int, NoneType] project_permission_level?
        +Union[int, NoneType] nivel_asis?
        +Union[int, NoneType] nivel_tobe?
        +Union[int, NoneType] nivel_brechas?
        +Union[int, NoneType] nivel_roadmap?
    }

    class ArtifactReviewRequest {
        +bool approved
        +Union[str, NoneType] reason?
    }

    class CreateProjectRequest {
        +str name
        +Union[str, NoneType] description?
        +str client_company_name
        +EmailStr client_company_email
        +date estimated_end_date
    }

    class ProjectArtifactResponse {
        +UUID id
        +str code
        +str name
        +str description
        +ProjectBlock block
        +int order_index
        +int block_order
        +ProjectArtifactStatus status
        +bool is_applicable
        +bool consultant_approved
        +bool company_approved
        +Union[datetime, NoneType] consultant_approved_at
        +Union[datetime, NoneType] company_approved_at
        +Union[datetime, NoneType] approved_at
        +Union[UUID, NoneType] approved_by_user_id
        +int review_cycles
        +Union[str, NoneType] last_rejection_reason
        +int effective_permission_level
        +datetime created_at
        +datetime updated_at
    }

    class ProjectArtifactSummary {
        +int total
        +int approved
        +int not_applicable
    }

    class ProjectArtifactsListResponse {
        +int total
        +List[ProjectArtifactResponse] items
    }

    class ProjectCompanyResponse {
        +str name
        +EmailStr email
    }

    class ProjectDetailResponse {
        +UUID id
        +str name
        +Union[str, NoneType] description
        +ProjectCompanyResponse client_company
        +date estimated_end_date
        +ProjectStatus status
        +ProjectManagerResponse manager
        +int progress
        +ProjectArtifactSummary artifacts
        +datetime created_at
        +datetime updated_at
        +List[ProjectArtifactResponse] artifact_items
    }

    class ProjectListResponse {
        +int total
        +List[ProjectResponse] items
    }

    class ProjectManagerResponse {
        +UUID id
        +str name
    }

    class ProjectResponse {
        +UUID id
        +str name
        +Union[str, NoneType] description
        +ProjectCompanyResponse client_company
        +date estimated_end_date
        +ProjectStatus status
        +ProjectManagerResponse manager
        +int progress
        +ProjectArtifactSummary artifacts
        +datetime created_at
        +datetime updated_at
    }

    class UpdateArtifactRequest {
        +Union[ProjectArtifactStatus, NoneType] status?
        +Union[bool, NoneType] is_applicable?
        +Union[bool, NoneType] consultant_approved?
        +Union[bool, NoneType] company_approved?
        +Union[str, NoneType] last_rejection_reason?
    }

    class UpdateProjectRequest {
        +Union[str, NoneType] name?
        +Union[str, NoneType] description?
        +Union[str, NoneType] client_company_name?
        +Union[EmailStr, NoneType] client_company_email?
        +Union[date, NoneType] estimated_end_date?
        +Union[ProjectStatus, NoneType] status?
    }

    class RaciActivityCreate {
        +str name
        +Union[str, NoneType] description?
        +str category
        +Union[str, NoneType] notas?
    }

    class RaciActivityResponse {
        +UUID id
        +str nombre
        +Union[str, NoneType] descripcion
        +str categoria
        +Union[str, NoneType] notas?
        +Dict asignaciones?
    }

    class RaciActivityUpdate {
        +Union[str, NoneType] name?
        +Union[str, NoneType] description?
        +Union[str, NoneType] category?
        +Union[str, NoneType] notas?
        +Union[int, NoneType] order_index?
    }

    class RaciAssignmentUpdate {
        +UUID role_id
        +Union[RaciAssignmentType, NoneType] assignment_type?
    }

    class RaciBulkActivity {
        +UUID id
        +str name
        +Union[str, NoneType] description?
        +str category
        +Union[str, NoneType] notas?
        +Dict asignaciones?
    }

    class RaciBulkRole {
        +UUID id
        +str name
        +Union[str, NoneType] area?
        +Union[str, NoneType] description?
    }

    class RaciBulkUpdate {
        +str nombre
        +Union[str, NoneType] descripcion?
        +List[RaciBulkRole] roles?
        +List[RaciBulkActivity] actividades?
    }

    class RaciCommentCreate {
        +Union[UUID, NoneType] referencia_id?
        +RaciCommentReferenceType referencia_tipo
        +str contenido
    }

    class RaciCommentResponse {
        +UUID id
        +Union[UUID, NoneType] referencia_id?
        +RaciCommentReferenceType referencia_tipo
        +UUID autor_id
        +str autor_nombre
        +str autor_perfil
        +str contenido
        +str estado
        +datetime created_at
    }

    class RaciGridResponse {
        +UUID id
        +UUID proyecto_id
        +Union[UUID, NoneType] entregable_id?
        +str nombre
        +Union[str, NoneType] descripcion
        +str version_actual
        +datetime created_at
        +datetime updated_at
        +List[RaciRoleResponse] roles?
        +List[RaciActivityResponse] actividades?
        +List[RaciCommentResponse] comentarios?
        +List[RaciVersionHistoryResponse] historial_versiones?
    }

    class RaciMatrixCreate {
        +UUID project_id
        +Union[UUID, NoneType] entregable_id?
        +str name
        +Union[str, NoneType] description?
    }

    class RaciMatrixResponse {
        +UUID id
        +UUID proyecto_id
        +Union[UUID, NoneType] entregable_id?
        +str nombre
        +Union[str, NoneType] descripcion
        +str version_actual
        +datetime created_at
        +datetime updated_at
    }

    class RaciMatrixUpdate {
        +Union[str, NoneType] name?
        +Union[str, NoneType] description?
        +Union[RaciStatus, NoneType] status?
    }

    class RaciRoleCreate {
        +str name
        +Union[str, NoneType] area?
        +Union[str, NoneType] description?
    }

    class RaciRoleResponse {
        +UUID id
        +str nombre
        +Union[str, NoneType] area?
        +Union[str, NoneType] descripcion
    }

    class RaciRoleUpdate {
        +Union[str, NoneType] name?
        +Union[str, NoneType] area?
        +Union[str, NoneType] description?
        +Union[int, NoneType] order_index?
    }

    class RaciVersionHistoryResponse {
        +str version
        +datetime fecha
        +str autor
        +str descripcion_cambio
        +int total_actividades
        +int total_roles
    }

    class UserCreate {
        +str nombre
        +str email
        +UserType tipo_usuario
        +Union[str, NoneType] password?
        +UserStatus estado?
    }

    class UserListResponse {
        +int total
        +List[UserResponse] items
    }

    class UserResponse {
        +UUID id
        +str nombre
        +str email
        +UserType tipo_usuario
        +UserStatus estado
        +Union[UUID, NoneType] created_by_user_id
        +Union[datetime, NoneType] deactivated_at
        +datetime created_at
        +datetime updated_at
    }

    class UserUpdate {
        +Union[str, NoneType] nombre?
        +Union[UserStatus, NoneType] estado?
    }

    AuthLoginResponse --> AuthUserResponse
    AuthLoginResponse --> UserResponse
    AuthLoginResponse --> TokenPairResponse
    AuthRefreshResponse --> TokenPairResponse
    CRUDMatrixResponse "1" --> "*" CRUDComparisonSchema
    CRUDMatrixResponse "1" --> "*" BrechasVersionResponse
    CRUDMatrixSnapshotRequest "1" --> "*" CRUDComparisonSchema
    GapAnalysisReportResponse "1" --> "*" GapSchema
    GapAnalysisReportResponse "1" --> "*" BrechasVersionResponse
    GapAnalysisReportSnapshotRequest "1" --> "*" GapSchema
    IntegrationQualityRulesResponse "1" --> "*" IntegrationRuleSchema
    IntegrationQualityRulesResponse "1" --> "*" BrechasVersionResponse
    IntegrationQualityRulesSnapshotRequest "1" --> "*" IntegrationRuleSchema
    BusinessGlossaryResponse "1" --> "*" TerminoGlosarioSchema
    BusinessGlossaryResponse "1" --> "*" ComentarioGlosarioResponse
    BusinessGlossaryResponse "1" --> "*" VersionGlosarioResponse
    BusinessGlossarySnapshotRequest "1" --> "*" TerminoGlosarioSchema
    ConceptualEntityPayload "1" --> "*" ConceptualAttributePayload
    ConceptualEntityResponse "1" --> "*" ConceptualAttributeResponse
    ConceptualModelCommentsResponse "1" --> "*" ConceptualCommentResponse
    ConceptualModelResponse "1" --> "*" ConceptualEntityResponse
    ConceptualModelResponse "1" --> "*" ConceptualRelationResponse
    ConceptualModelResponse "1" --> "*" ConceptualCommentResponse
    ConceptualModelUpsertRequest "1" --> "*" ConceptualEntityPayload
    ConceptualModelUpsertRequest "1" --> "*" ConceptualRelationPayload
    ConceptualModelVersionsResponse "1" --> "*" ConceptualModelVersionItem
    ConceptualVersionPreviewResponse --> ConceptualModelUpsertRequest
    DFDModelResponse "1" --> "*" DFDNodeSchema
    DFDModelResponse "1" --> "*" DFDFlowSchema
    DFDModelResponse "1" --> "*" DFDCommentResponse
    DFDModelResponse "1" --> "*" DFDVersionResponse
    DFDModelSnapshotRequest "1" --> "*" DFDNodeSchema
    DFDModelSnapshotRequest "1" --> "*" DFDFlowSchema
    DFDVersionPreviewResponse --> DFDModelSnapshotRequest
    DFDVersionsResponse "1" --> "*" DFDVersionResponse
    InventoryMatrixResponse "1" --> "*" SistemaInventarioSchema
    InventoryMatrixResponse "1" --> "*" ComentarioInventarioResponse
    InventoryMatrixResponse "1" --> "*" VersionInventarioResponse
    InventoryMatrixSnapshotRequest "1" --> "*" SistemaInventarioSchema
    LogicalDataModelResponse "1" --> "*" LogicalTableSchema
    LogicalDataModelResponse "1" --> "*" LogicalCommentResponse
    LogicalDataModelUpsertRequest "1" --> "*" LogicalTableSchema
    LogicalModelSnapshotRequest "1" --> "*" LogicalTableSchema
    LogicalTableSchema "1" --> "*" LogicalColumnSchema
    LogicalVersionPreviewResponse --> LogicalModelSnapshotRequest
    LogicalVersionsResponse "1" --> "*" LogicalVersionResponse
    DimensionResultResponse "1" --> "*" SubdomainResultResponse
    DimensionWithSubdomainsResponse "1" --> "*" SubdomainResponse
    QuestionConfigRequest "1" --> "*" ScoreCriteriaItem
    QuestionResponse "1" --> "*" ScoreCriteriaItem
    QuestionnaireConfigResponse "1" --> "*" RoleCatalogResponse
    QuestionnaireConfigResponse "1" --> "*" ScoreCriteriaItem
    QuestionnaireConfigResponse "1" --> "*" DimensionWithSubdomainsResponse
    QuestionnaireConfigResponse "1" --> "*" QuestionResponse
    QuestionnaireConfigUpsertRequest "1" --> "*" QuestionConfigRequest
    QuestionnaireConfigUpsertRequest "1" --> "*" RoleCatalogUpsertRequest
    QuestionnaireConfigUpsertRequest "1" --> "*" ScoreCriteriaItem
    QuestionnaireResultsResponse "1" --> "*" DimensionResultResponse
    ResponseDTO "1" --> "*" AnswerResponse
    ResponseListResponse "1" --> "*" ResponseDTO
    SubmitResponseRequest "1" --> "*" SubmitAnswerRequest
    InviteProjectMemberResponse --> ProjectMemberResponse
    ProjectMemberResponse --> ProjectPermissionLevels
    ProjectMembersListResponse "1" --> "*" ProjectMemberResponse
    ProjectArtifactsListResponse "1" --> "*" ProjectArtifactResponse
    ProjectDetailResponse --> ProjectCompanyResponse
    ProjectDetailResponse --> ProjectManagerResponse
    ProjectDetailResponse --> ProjectArtifactSummary
    ProjectDetailResponse "1" --> "*" ProjectArtifactResponse
    ProjectListResponse "1" --> "*" ProjectResponse
    ProjectResponse --> ProjectCompanyResponse
    ProjectResponse --> ProjectManagerResponse
    ProjectResponse --> ProjectArtifactSummary
    RaciBulkUpdate "1" --> "*" RaciBulkRole
    RaciBulkUpdate "1" --> "*" RaciBulkActivity
    RaciGridResponse "1" --> "*" RaciRoleResponse
    RaciGridResponse "1" --> "*" RaciActivityResponse
    RaciGridResponse "1" --> "*" RaciCommentResponse
    RaciGridResponse "1" --> "*" RaciVersionHistoryResponse
    UserListResponse "1" --> "*" UserResponse
```

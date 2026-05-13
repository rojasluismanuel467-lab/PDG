```mermaid
---
title: app
---
classDiagram
    class ActivateInvitationRequest {
        + str token
        + str password
        + str | None nombre
    }

    class AddGlossaryCommentRequest {
        + Any model_config
        + str | None referencia_id
        + Literal["termino", "general"] referencia_tipo
        + str contenido
    }

    class AddInventoryCommentRequest {
        + Any model_config
        + str | None referencia_id
        + Literal["sistema", "general"] referencia_tipo
        + str contenido
    }

    class MaturityValidationStatus {
        <<enumeration>>
        + str PENDIENTE
        + str EN_REVISION
        + str APROBADA
        + str RECHAZADA
    }

    class AnswerResponse {
        + UUID id
        + UUID question_id
        + str | None question_text
        + int score
        + int respondent_score
        + int | None validated_score
        + str | None evidencia_url
        + str | None evidencia_nombre
        + str | None evidencia_tipo
        + int | None evidencia_size
        + MaturityValidationStatus estado_validacion
        + str | None validacion_comentarios
    }

    class AnularResponseRequest {
        + Any model_config
        + str reason
    }

    class ProjectBlock {
        <<enumeration>>
        + str PROJECT
        + str AS_IS
        + str TO_BE
        + str BRECHAS
        + str ROADMAP
    }

    class ArtifactDefinition {
        + str code
        + str name
        + str description
        + ProjectBlock block
        + int block_order
        + int order_index
    }

    class ArtifactPermissionResponse {
        + UUID artifact_id
        + UUID project_id
        + UUID user_id
        + int permission_level
        + UUID | None assigned_by_user_id
        + datetime created_at
        + datetime updated_at
    }

    class ArtifactReviewRequest {
        + Any model_config
        + bool approved
        + str | None reason
        + validate_reason(self) ArtifactReviewRequest
    }

    class AuditLog {
        + str \_\_tablename__
        + Mapped[uuid.UUID] id
        + Mapped[datetime] timestamp
        + Mapped[uuid.UUID | None] user_id
        + Mapped[UserType | None] perfil_usuario
        + Mapped[uuid.UUID | None] project_id
        + Mapped[str] tipo_accion
        + Mapped[str] descripcion
        + Mapped[uuid.UUID | None] resource_id
        + Mapped[dict] datos_adicionales
    }

    class AuthLoginRequest {
        + str email
        + str password
    }

    class UserStatus {
        <<enumeration>>
        + str ACTIVO
        + str INACTIVO
        + str PENDIENTE
    }

    class UserType {
        <<enumeration>>
        + str ADMINISTRADOR
        + str CONSULTOR
        + str EMPRESA
    }

    class AuthUserResponse {
        + UUID id
        + str nombre
        + str email
        + UserType tipo_usuario
        + UserStatus estado
    }

    class TokenPairResponse {
        + str access_token
        + str refresh_token
        + str token_type
        + datetime access_token_expires_at
        + datetime refresh_token_expires_at
    }

    class AuthLoginResponse {
        + AuthUserResponse user
        + TokenPairResponse tokens
    }

    class AuthLogoutRequest {
        + str | None refresh_token
    }

    class AuthLogoutResponse {
        + str message
        + int revoked_tokens
    }

    class AuthMessageResponse {
        + str message
    }

    class AuthRefreshRequest {
        + str refresh_token
    }

    class AuthRefreshResponse {
        + TokenPairResponse tokens
    }

    class AuthRepository {
        + @staticmethod get_user_by_email(db, email) User | None$
        + @staticmethod get_user_by_id(db, user_id) User | None$
        + @staticmethod get_invitation_by_token(db, token) Invitation | None$
        + @staticmethod get_refresh_token(db, token_hash) RefreshToken | None$
        + @staticmethod save_refresh_token(db, *, user_id, token_hash, expires_at) RefreshToken$
        + @staticmethod revoke_refresh_token(db, token) None$
        + @staticmethod revoke_all_refresh_tokens_for_user(db, *, user_id) int$
        + @staticmethod add_audit_log(db, *, user_id, perfil_usuario, project_id, tipo_accion, descripcion, resource_id, datos_adicionales) AuditLog$
    }

    class AuthService {
        - @staticmethod \_build_user_response(user) AuthUserResponse$
        + @classmethod get_current_user_profile(cls, user) AuthUserResponse
        - @staticmethod \_issue_tokens(db, user) TokenPairResponse$
        + @classmethod login(cls, db, *, email, password) AuthLoginResponse
        + @classmethod refresh(cls, db, *, refresh_token) AuthRefreshResponse
        + @classmethod logout(cls, db, *, current_user, refresh_token) int
        + @classmethod activate_invitation(cls, db, *, payload) AuthLoginResponse
    }

    class Base

    class BrechaImpacto {
        <<enumeration>>
        + str ALTO
        + str MEDIO
        + str BAJO
    }

    class BrechaPrioridad {
        <<enumeration>>
        + str CRITICA
        + str ALTA
        + str MEDIA
        + str BAJA
    }

    class BrechasRepository {
        + @staticmethod get_project(db, *, project_id) Project | None$
        + @staticmethod get_artifact(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod list_project_artifacts(db, *, project_id) list[ProjectArtifact]$
        + @staticmethod get_conceptual_model_by_artifact(db, *, artifact_id) ConceptualModel | None$
        + @staticmethod get_logical_model_by_artifact(db, *, artifact_id) LogicalDataModel | None$
        + @staticmethod get_dfd_model_by_artifact(db, *, artifact_id) DFDModel | None$
        + @staticmethod get_user_email(db, *, user_id) str | None$
        + @staticmethod get_crud_matrix(db, *, project_id, artifact_id) GapsCRUDMatrix | None$
        + @staticmethod create_crud_matrix(db, *, model) GapsCRUDMatrix$
        + @staticmethod create_crud_matrix_version(db, *, version) GapsCRUDMatrixVersion$
        + @staticmethod get_gap_report(db, *, project_id, artifact_id) GapAnalysisReport | None$
        + @staticmethod create_gap_report(db, *, model) GapAnalysisReport$
        + @staticmethod create_gap_report_version(db, *, version) GapAnalysisReportVersion$
        + @staticmethod get_integration_rules(db, *, project_id, artifact_id) IntegrationQualityRules | None$
        + @staticmethod create_integration_rules(db, *, model) IntegrationQualityRules$
        + @staticmethod create_integration_rules_version(db, *, version) IntegrationQualityRulesVersion$
    }

    class BrechasService {
        + str CRUD_ARTIFACT_CODE
        + str GAP_REPORT_ARTIFACT_CODE
        + str RULES_ARTIFACT_CODE
        + set SUPPORTED_CODES
        - @staticmethod \_normalize(value) str$
        - @staticmethod \_version_label(version_number) str$
        - @staticmethod \_artifact_lock_check(artifact) None$
        - @staticmethod \_map_versions(versions) list[BrechasVersionResponse]$
        - @classmethod \_resolve_artifact(cls, db, *, project_id, artifact_id, expected_code) ProjectArtifact
        - @staticmethod \_resolve_permission(db, *, project_id, actor_user_id, artifact, minimum_level) int$
        - @staticmethod \_fallback_entities(project_name) tuple[list[_EntitySnapshot], list[_EntitySnapshot]]$
        - @staticmethod \_entity_snapshots_from_conceptual(model) list[_EntitySnapshot]$
        - @staticmethod \_entity_snapshots_from_logical(model) list[_EntitySnapshot]$
        - @classmethod \_build_context(cls, db, *, project_id) dict
        - @classmethod \_infer_ops(cls, snapshot, stage) dict[str, bool]
        - @classmethod \_crud_gap_description(cls, *, entidad, asis, tobe) str
        - @classmethod \_crud_impact(cls, row, *, is_critical_entity) BrechaImpacto
        - @classmethod \_generate_crud_matrix_payload(cls, db, *, project_id) dict
        - @classmethod \_build_gap_area(cls, entity_name) str
        - @classmethod \_build_gap_priority(cls, impact, entity_name) BrechaPrioridad
        - @classmethod \_generate_gap_report_payload(cls, db, *, project_id, crud_comparisons) dict
        - @classmethod \_rule_type_from_gap(cls, gap) IntegrationRuleType
        - @classmethod \_rule_priority_from_gap(cls, gap) IntegrationRulePriority
        - @classmethod \_generate_integration_rules_payload(cls, db, *, project_id, gap_report) dict
        - @classmethod \_ensure_crud_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) GapsCRUDMatrix
        - @classmethod \_ensure_gap_report(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) GapAnalysisReport
        - @classmethod \_ensure_integration_rules(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) IntegrationQualityRules
        - @classmethod \_map_crud_matrix(cls, model) CRUDMatrixResponse
        - @classmethod \_map_gap_report(cls, model) GapAnalysisReportResponse
        - @classmethod \_map_integration_rules(cls, model) IntegrationQualityRulesResponse
        + @classmethod get_crud_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) CRUDMatrixResponse
        + @classmethod upsert_crud_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, payload) CRUDMatrixResponse
        + @classmethod generate_crud_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) CRUDMatrixResponse
        + @classmethod get_gap_report(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) GapAnalysisReportResponse
        + @classmethod upsert_gap_report(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, payload) GapAnalysisReportResponse
        + @classmethod generate_gap_report(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) GapAnalysisReportResponse
        + @classmethod get_integration_rules(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) IntegrationQualityRulesResponse
        + @classmethod upsert_integration_rules(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, payload) IntegrationQualityRulesResponse
        + @classmethod generate_integration_rules(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) IntegrationQualityRulesResponse
        - @staticmethod \_gap_report_markdown(report) str$
        - @staticmethod \_integration_rules_markdown(document) str$
        - @staticmethod \_build_gap_report_pdf(report) bytes$
        - @staticmethod \_build_integration_rules_pdf(document) bytes$
        - @staticmethod \_build_gap_report_docx(report) bytes$
        - @staticmethod \_build_integration_rules_docx(document_data) bytes$
        + @classmethod export_gap_report(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, export_format) tuple[bytes, str, str]
        + @classmethod export_integration_rules(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, export_format) tuple[bytes, str, str]
    }

    class BrechasVersionResponse {
        + str version
        + datetime fecha
        + str autor
        + str | None descripcion_cambio
    }

    class BusinessGlossary {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[list[dict]] terms
        + Mapped[list[dict]] comments
        + Mapped[int] current_version_number
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime] last_saved_at
        + Mapped[list[BusinessGlossaryVersion]] versions
    }

    class BusinessGlossaryRepository {
        + @staticmethod get_project(db, *, project_id) Project | None$
        + @staticmethod get_artifact(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod get_user(db, *, user_id) User | None$
        + @staticmethod get_artifact_by_code(db, *, project_id, code) ProjectArtifact | None$
        + @staticmethod get_conceptual_model_by_artifact(db, *, artifact_id) ConceptualModel | None$
        + @staticmethod get_logical_model_by_artifact(db, *, artifact_id) LogicalDataModel | None$
        + @staticmethod get_glossary(db, *, project_id, artifact_id) BusinessGlossary | None$
        + @staticmethod create_glossary(db, *, model) BusinessGlossary$
        + @staticmethod create_version(db, *, version) BusinessGlossaryVersion$
    }

    class ComentarioGlosarioResponse {
        + str id
        + str | None referencia_id
        + str referencia_tipo
        + str autor_id
        + str autor_nombre
        + str autor_perfil
        + str contenido
        + str estado
        + str created_at
    }

    class TerminoGlosarioSchema {
        + Any model_config
        + str id
        + str termino
        + str definicion
        + str propietario
        + list[str] entidades_relacionadas
        + list[str] sinonimos
        + str notas
    }

    class VersionGlosarioResponse {
        + str version
        + datetime fecha
        + str autor
        + str | None descripcion_cambio
        + int total_terminos
    }

    class BusinessGlossaryResponse {
        + UUID id
        + UUID proyecto_id
        + UUID entregable_id
        + str nombre
        + str descripcion
        + list[TerminoGlosarioSchema] terminos
        + list[ComentarioGlosarioResponse] comentarios
        + str version_actual
        + list[VersionGlosarioResponse] historial_versiones
        + datetime created_at
        + datetime updated_at
    }

    class BusinessGlossaryService {
        + str ARTIFACT_CODE
        - @staticmethod \_version_label(version_number) str$
        - @staticmethod \_normalize(value) str$
        - @staticmethod \_artifact_lock_check(artifact) None$
        - @classmethod \_resolve_artifact(cls, db, *, project_id, artifact_id) ProjectArtifact
        - @staticmethod \_resolve_permission(db, *, project_id, actor_user_id, artifact, minimum_level) None$
        - @staticmethod \_map_versions(versions) list[VersionGlosarioResponse]$
        - @staticmethod \_map_comments(raw) list[ComentarioGlosarioResponse]$
        - @classmethod \_map_model(cls, model) BusinessGlossaryResponse
        - @classmethod \_generate_payload(cls, db, *, project_id) dict
        - @classmethod \_fallback_terms(cls, project_name) list[dict]
        - @classmethod \_ensure_glossary(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) BusinessGlossary
        + @classmethod get_glossary(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) BusinessGlossaryResponse
        + @classmethod upsert_glossary(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, payload) BusinessGlossaryResponse
        + @classmethod generate_glossary(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) BusinessGlossaryResponse
        + @classmethod add_comment(cls, db, *, project_id, artifact_id, actor_user_id, payload) BusinessGlossaryResponse
    }

    class BusinessGlossarySnapshotRequest {
        + Any model_config
        + str nombre
        + str descripcion
        + list[TerminoGlosarioSchema] terminos
        + str | None change_summary
    }

    class BusinessGlossaryVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] glossary_id
        + Mapped[int] version_number
        + Mapped[dict] snapshot
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[BusinessGlossary] glossary
    }

    class CRUDComparisonSchema {
        + Any model_config
        + str id
        + str entidad
        + bool asis_create
        + bool asis_read
        + bool asis_update
        + bool asis_delete
        + bool tobe_create
        + bool tobe_read
        + bool tobe_update
        + bool tobe_delete
        + str brecha
        + BrechaImpacto impacto
    }

    class CRUDMatrixResponse {
        + UUID id
        + UUID proyecto_id
        + UUID entregable_id
        + str nombre
        + str descripcion
        + list[CRUDComparisonSchema] comparaciones
        + str version_actual
        + list[BrechasVersionResponse] historial_versiones
        + datetime created_at
        + datetime updated_at
    }

    class CRUDMatrixSnapshotRequest {
        + Any model_config
        + str nombre
        + str descripcion
        + list[CRUDComparisonSchema] comparaciones
        + str | None change_summary
    }

    class ComentarioInventarioResponse {
        + str id
        + str | None referencia_id
        + str referencia_tipo
        + str autor_id
        + str autor_nombre
        + str autor_perfil
        + str contenido
        + str estado
        + str created_at
    }

    class ConceptualModel {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[ProjectBlock] phase
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[int] current_version
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime | None] last_saved_at
        + Mapped[list[ConceptualEntity]] entities
        + Mapped[list[ConceptualRelation]] relations
        + Mapped[list[ConceptualModelVersion]] versions
        + Mapped[list[ConceptualComment]] comments
    }

    class ConceptualEntity {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] model_id
        + Mapped[str] client_id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[float] position_x
        + Mapped[float] position_y
        + Mapped[str | None] color
        + Mapped[int] order_index
        + Mapped[ConceptualModel] model
        + Mapped[list[ConceptualAttribute]] attributes
    }

    class ConceptualAttribute {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] entity_id
        + Mapped[str] client_id
        + Mapped[str] name
        + Mapped[str] data_type
        + Mapped[bool] is_pk
        + Mapped[bool] is_fk
        + Mapped[bool] is_nullable
        + Mapped[str | None] description
        + Mapped[str | None] fk_entity_client_id
        + Mapped[str | None] fk_attribute_ref
        + Mapped[int] order_index
        + Mapped[ConceptualEntity] entity
    }

    class ConceptualAttributePayload {
        + Any model_config
        + str id
        + str name
        + str data_type
        + bool is_pk
        + bool is_fk
        + bool is_nullable
        + str | None description
        + str | None fk_entity_ref
        + str | None fk_attribute_ref
    }

    class ConceptualAttributeResponse {
        + str id
        + str name
        + str data_type
        + bool is_pk
        + bool is_fk
        + bool is_nullable
        + str | None description
        + str | None fk_entity_ref
        + str | None fk_attribute_ref
    }

    class ConceptualComment {
        + str \_\_tablename__
        + Mapped[uuid.UUID] model_id
        + Mapped[str] target_type
        + Mapped[str | None] target_client_id
        + Mapped[str] content
        + Mapped[str] status
        + Mapped[int] created_in_version_number
        + Mapped[datetime | None] outdated_at
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[str] created_by_user_name
        + Mapped[UserType] created_by_user_type
        + Mapped[ConceptualModel] model
    }

    class ConceptualCommentCreateRequest {
        + Any model_config
        + str target_type
        + str | None target_client_id
        + str content
    }

    class ConceptualCommentResponse {
        + UUID id
        + UUID model_id
        + str target_type
        + str | None target_client_id
        + str content
        + str status
        + int | None created_in_version_number
        + datetime | None outdated_at
        + bool is_outdated
        + UUID created_by_user_id
        + str created_by_user_email
        + str created_by_user_name
        + str created_by_user_type
        + datetime created_at
        + datetime updated_at
    }

    class ConceptualCommentUpdateRequest {
        + Any model_config
        + str | None content
        + str | None status
    }

    class ConceptualEntityPayload {
        + Any model_config
        + str id
        + str name
        + str description
        + float position_x
        + float position_y
        + str | None color
        + list[ConceptualAttributePayload] attributes
    }

    class ConceptualEntityResponse {
        + str id
        + str name
        + str description
        + float position_x
        + float position_y
        + str | None color
        + list[ConceptualAttributeResponse] attributes
    }

    class ConceptualModelCommentsResponse {
        + UUID model_id
        + list[ConceptualCommentResponse] comments
    }

    class ConceptualModelRepository {
        + @staticmethod get_project_by_id(db, *, project_id) Project | None$
        + @staticmethod get_membership(db, *, project_id, user_id) ProjectMembership | None$
        + @staticmethod get_artifact_by_id(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod get_artifact_permission(db, *, artifact_id, user_id) ProjectArtifactPermission | None$
        + @staticmethod get_model_by_artifact(db, *, artifact_id) ConceptualModel | None$
        + @staticmethod get_user_by_id(db, *, user_id) User | None$
        + @staticmethod create_model(db, *, model) ConceptualModel$
        + @staticmethod list_versions(db, *, model_id) list[ConceptualModelVersion]$
        + @staticmethod get_version_by_number(db, *, model_id, version_number) ConceptualModelVersion | None$
        + @staticmethod replace_entities(db, *, model, entities) None$
        + @staticmethod replace_relations(db, *, model, relations) None$
        + @staticmethod create_version(db, *, version) ConceptualModelVersion$
        + @staticmethod list_comments(db, *, model_id) list[ConceptualComment]$
        + @staticmethod create_comment(db, *, comment) ConceptualComment$
        + @staticmethod get_comment_by_id(db, *, model_id, comment_id) ConceptualComment | None$
        + @staticmethod delete_comment(db, *, comment) None$
    }

    class ConceptualRelationResponse {
        + str id
        + str name
        + str source_entity_id
        + str target_entity_id
        + str cardinality
        + str | None description
        + str | None fk_attribute_id
    }

    class ConceptualModelResponse {
        + UUID id
        + UUID project_id
        + UUID artifact_id
        + ProjectBlock phase
        + str name
        + str description
        + list[ConceptualEntityResponse] entities
        + list[ConceptualRelationResponse] relations
        + list[ConceptualCommentResponse] comments
        + int current_version_number
        + datetime created_at
        + datetime updated_at
        + datetime | None last_saved_at
    }

    class ConceptualModelRestoreVersionRequest {
        + Any model_config
        + int source_version_number
        + str | None change_summary
    }

    class ConceptualModelService {
        - @classmethod \_snapshot_to_upsert_request(cls, *, snapshot, change_summary) ConceptualModelUpsertRequest
        - @classmethod \_serialize_comment(cls, *, comment) ConceptualCommentResponse
        - @classmethod \_require_consultant_for_edit(cls, *, actor_user_type) None
        - @classmethod \_resolve_artifact_or_raise(cls, db, *, project_id, artifact_id) ProjectArtifact
        - @classmethod \_resolve_effective_permission(cls, db, *, artifact, actor_user_id, minimum_level) None
        - @classmethod \_default_name_for_artifact(cls, *, artifact) str
        - @classmethod \_build_snapshot(cls, *, model) dict[str, object]
        - @classmethod \_to_response(cls, *, model) ConceptualModelResponse
        - @classmethod \_initialize_if_missing(cls, db, *, artifact, actor_user_id, actor_user_email) ConceptualModel
        + @classmethod get_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email) ConceptualModelResponse
        - @classmethod \_validate_payload(cls, *, payload) None
        + @classmethod upsert_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) ConceptualModelResponse
        - @classmethod \_mark_outdated_comments_for_missing_targets(cls, *, model, current_entity_ids, current_relation_ids) None
        - @classmethod \_validate_comment_target(cls, *, model, target_type, target_client_id) None
        - @classmethod \_can_manage_comment(cls, *, artifact, actor_user_id, actor_user_type, comment, db) bool
        + @classmethod list_comments(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, status, include_outdated, only_active) ConceptualModelCommentsResponse
        + @classmethod create_comment(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) ConceptualCommentResponse
        + @classmethod update_comment(cls, db, *, project_id, artifact_id, comment_id, actor_user_id, actor_user_type, actor_user_email, payload) ConceptualCommentResponse
        + @classmethod delete_comment(cls, db, *, project_id, artifact_id, comment_id, actor_user_id, actor_user_type, actor_user_email) None
        + @classmethod list_versions(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) ConceptualModelVersionsResponse
        + @classmethod preview_version(cls, db, *, project_id, artifact_id, source_version_number, actor_user_id) ConceptualVersionPreviewResponse
        + @classmethod restore_version(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) ConceptualModelResponse
    }

    class ConceptualRelationPayload {
        + Any model_config
        + str id
        + str name
        + str source_entity_id
        + str target_entity_id
        + str cardinality
        + str | None description
        + str | None fk_attribute_id
    }

    class ConceptualModelUpsertRequest {
        + Any model_config
        + str name
        + str description
        + list[ConceptualEntityPayload] entities
        + list[ConceptualRelationPayload] relations
        + str | None change_summary
    }

    class ConceptualModelVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] model_id
        + Mapped[int] version_number
        + Mapped[dict[str, object]] snapshot_json
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[ConceptualModel] model
    }

    class ConceptualModelVersionItem {
        + UUID id
        + int version_number
        + datetime created_at
        + UUID created_by_user_id
        + str created_by_user_email
        + str | None change_summary
    }

    class ConceptualModelVersionsResponse {
        + UUID model_id
        + list[ConceptualModelVersionItem] versions
    }

    class ConceptualRelation {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] model_id
        + Mapped[str] client_id
        + Mapped[str] name
        + Mapped[str] source_entity_client_id
        + Mapped[str] target_entity_client_id
        + Mapped[str] cardinality
        + Mapped[str | None] description
        + Mapped[str | None] fk_attribute_client_id
        + Mapped[int] order_index
        + Mapped[ConceptualModel] model
    }

    class ConceptualVersionPreviewResponse {
        + UUID model_id
        + int source_version_number
        + ConceptualModelUpsertRequest snapshot
    }

    class DomainError {
        - \_\_init__(self, message, *, code, status_code, details) None
        + to_dict(self) dict[str, Any]
    }

    class ConflictDomainError {
        - \_\_init__(self, message, details) None
    }

    class CreateProjectRequest {
        + Any model_config
        + str name
        + str | None description
        + str client_company_name
        + EmailStr client_company_email
        + date estimated_end_date
    }

    class CurrentUser {
        <<dataclass>>
        + uuid.UUID id
        + UserType tipo_usuario
        + str email
        + UserStatus estado
    }

    class DFDModel {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[str] phase
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[int] level
        + Mapped[list[dict]] nodes
        + Mapped[list[dict]] flows
        + Mapped[int] current_version_number
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime] last_saved_at
        + Mapped[list[DFDVersion]] versions
        + Mapped[list[DFDComment]] comments
    }

    class DFDComment {
        + str \_\_tablename__
        + Mapped[uuid.UUID] id
        + Mapped[uuid.UUID] model_id
        + Mapped[str] target_type
        + Mapped[str | None] target_client_id
        + Mapped[str] content
        + Mapped[str] status
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[str | None] created_by_user_name
        + Mapped[str] created_by_user_type
        + Mapped[int] created_in_version_number
        + Mapped[datetime] created_at
        + Mapped[datetime] updated_at
        + Mapped[DFDModel] model
    }

    class DFDCommentCreateRequest {
        + Any model_config
        + str target_type
        + str | None target_client_id
        + str content
    }

    class DFDCommentResponse {
        + UUID id
        + UUID model_id
        + str target_type
        + str | None target_client_id
        + str content
        + str status
        + UUID | None created_by_user_id
        + str created_by_user_email
        + str | None created_by_user_name
        + str created_by_user_type
        + int created_in_version_number
        + datetime created_at
        + datetime updated_at
    }

    class DFDFlowSchema {
        + Any model_config
        + str id
        + str origen_id
        + str destino_id
        + str etiqueta
        + str | None datos_descripcion
        + list[str] datos_campos
        + str | None fase
        + str | None tipo_flujo
    }

    class DFDNodeSchema {
        + Any model_config
        + str id
        + str tipo
        + str nombre
        + str descripcion
        + str | None numero_proceso
        + str | None prefijo_almacen
        + float posicion_x
        + float posicion_y
        + float | None width
        + float | None height
        + str | None color
        + str | None fase
        + str | None categoria
        + list[str] etiquetas
    }

    class DFDVersionResponse {
        + UUID id
        + int version_number
        + datetime created_at
        + UUID | None created_by_user_id
        + str created_by_user_email
        + str | None change_summary
    }

    class DFDModelResponse {
        + UUID id
        + UUID project_id
        + UUID artifact_id
        + str phase
        + str name
        + str description
        + int level
        + list[DFDNodeSchema] nodos
        + list[DFDFlowSchema] flujos
        + list[DFDCommentResponse] comentarios
        + str version_actual
        + int current_version_number
        + list[DFDVersionResponse] historial_versiones
        + datetime created_at
        + datetime updated_at
        + datetime last_saved_at
    }

    class DFDModelSnapshotRequest {
        + Any model_config
        + str name
        + str description
        + int level
        + list[DFDNodeSchema] nodos
        + list[DFDFlowSchema] flujos
        + str | None change_summary
    }

    class DFDRepository {
        + @staticmethod get_artifact(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod get_model(db, *, project_id, artifact_id) DFDModel | None$
        + @staticmethod create_model(db, *, model) DFDModel$
        + @staticmethod create_version(db, *, version) DFDVersion$
        + @staticmethod get_version(db, *, model_id, version_number) DFDVersion | None$
        + @staticmethod list_versions(db, *, model_id) list[DFDVersion]$
        + @staticmethod create_comment(db, *, comment) DFDComment$
        + @staticmethod list_comments(db, *, model_id) Sequence[DFDComment]$
    }

    class DFDRestoreVersionRequest {
        + Any model_config
        + int source_version_number
        + str | None change_summary
    }

    class DFDService {
        + str AS_IS_ARTIFACT_CODE
        + str TO_BE_ARTIFACT_CODE
        + set SUPPORTED_ARTIFACT_CODES
        - @staticmethod \_get_actor_name(db, *, actor_user_id, fallback_email) str$
        - @staticmethod \_default_snapshot(*, artifact_code) dict$
        - @classmethod \_validate_artifact_access(cls, db, *, project_id, artifact_id)
        - @classmethod \_ensure_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) DFDModel
        - @staticmethod \_map_comment(comment) DFDCommentResponse$
        - @staticmethod \_map_version(version) DFDVersionResponse$
        - @classmethod \_map_model(cls, model) DFDModelResponse
        + @classmethod get_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) DFDModelResponse
        + @classmethod upsert_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) DFDModelResponse
        + @classmethod list_versions(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) DFDVersionsResponse
        + @classmethod preview_version(cls, db, *, project_id, artifact_id, source_version_number, actor_user_id, actor_user_email) DFDVersionPreviewResponse
        + @classmethod restore_version(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) DFDModelResponse
        + @classmethod list_comments(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) list[DFDCommentResponse]
        + @classmethod create_comment(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) DFDCommentResponse
    }

    class DFDVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] id
        + Mapped[uuid.UUID] model_id
        + Mapped[int] version_number
        + Mapped[dict] snapshot
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[datetime] created_at
        + Mapped[DFDModel] model
    }

    class DFDVersionPreviewResponse {
        + UUID model_id
        + int source_version_number
        + DFDModelSnapshotRequest snapshot
    }

    class DFDVersionsResponse {
        + UUID model_id
        + list[DFDVersionResponse] versions
    }

    class SubdomainResultResponse {
        + int subdomain_id
        + str subdomain_name
        + float score
        + float percent
        + int question_count
        + int validated_question_count
    }

    class DimensionResultResponse {
        + int dimension_id
        + str dimension_name
        + float score
        + float percent
        + float weight
        + str maturity_level
        + int question_count
        + int validated_question_count
        + list[SubdomainResultResponse] subdomains
    }

    class SubdomainResponse {
        + int id
        + str name
        + str description
        + float weight
    }

    class DimensionWithSubdomainsResponse {
        + int id
        + str name
        + str description
        + float weight
        + list[SubdomainResponse] subdomains
    }

    class EstadoSistema {
        <<enumeration>>
        + str PRODUCCION
        + str DESARROLLO
        + str MANTENIMIENTO
        + str LEGADO
        + str DEPRECADO
    }

    class EvidenceUploadResponse {
        + str evidencia_url
        + str evidencia_nombre
        + str evidencia_tipo
        + int evidencia_size
    }

    class ExportFormat {
        <<enumeration>>
        + str MARKDOWN
        + str PDF
        + str WORD
    }

    class ExportDocumentRequest {
        + Any model_config
        + ExportFormat formato
    }

    class FinalizeEvaluationRequest {
        + Any model_config
        + bool confirmation
    }

    class ForbiddenDomainError {
        - \_\_init__(self, message, details) None
    }

    class GapAnalysisReport {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[str] executive_summary
        + Mapped[list[dict]] gaps
        + Mapped[int] total_gaps
        + Mapped[int] critical_gaps
        + Mapped[list[str]] priority_recommendations
        + Mapped[list[str]] target_formats
        + Mapped[int] current_version_number
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime] last_saved_at
        + Mapped[list[GapAnalysisReportVersion]] versions
    }

    class GapSchema {
        + Any model_config
        + str id
        + str area
        + str brecha
        + BrechaImpacto impacto
        + BrechaPrioridad prioridad
        + str recomendacion
    }

    class GapAnalysisReportResponse {
        + UUID id
        + UUID proyecto_id
        + UUID entregable_id
        + str nombre
        + str descripcion
        + str resumen_ejecutivo
        + list[GapSchema] brechas
        + int total_brechas
        + int brechas_criticas
        + list[str] recomendaciones_prioritarias
        + list[str] formato_objetivo
        + str version_actual
        + list[BrechasVersionResponse] historial_versiones
        + datetime created_at
        + datetime updated_at
    }

    class GapAnalysisReportSnapshotRequest {
        + Any model_config
        + str nombre
        + str descripcion
        + str resumen_ejecutivo
        + list[GapSchema] brechas
        + int total_brechas
        + int brechas_criticas
        + list[str] recomendaciones_prioritarias
        + list[str] formato_objetivo
        + str | None change_summary
        + validate_counts(self) GapAnalysisReportSnapshotRequest
    }

    class GapAnalysisReportVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] report_id
        + Mapped[int] version_number
        + Mapped[dict] snapshot
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[GapAnalysisReport] report
    }

    class GapsCRUDMatrix {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[list[dict]] comparisons
        + Mapped[int] current_version_number
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime] last_saved_at
        + Mapped[list[GapsCRUDMatrixVersion]] versions
    }

    class GapsCRUDMatrixVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] matrix_id
        + Mapped[int] version_number
        + Mapped[dict] snapshot
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[GapsCRUDMatrix] matrix
    }

    class IntegrationQualityRules {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[str] technical_summary
        + Mapped[list[dict]] rules
        + Mapped[list[str]] acceptance_criteria
        + Mapped[list[str]] target_formats
        + Mapped[int] current_version_number
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime] last_saved_at
        + Mapped[list[IntegrationQualityRulesVersion]] versions
    }

    class IntegrationRulePriority {
        <<enumeration>>
        + str ALTA
        + str MEDIA
        + str BAJA
    }

    class IntegrationRuleType {
        <<enumeration>>
        + str MATCHING
        + str VALIDACION
        + str CONSOLIDACION
    }

    class IntegrationRuleSchema {
        + Any model_config
        + str id
        + str nombre
        + str descripcion
        + IntegrationRuleType tipo
        + IntegrationRulePriority prioridad
        + str condicion
        + str accion
    }

    class IntegrationQualityRulesResponse {
        + UUID id
        + UUID proyecto_id
        + UUID entregable_id
        + str nombre
        + str descripcion
        + str resumen_tecnico
        + list[IntegrationRuleSchema] reglas
        + list[str] criterios_aceptacion
        + list[str] formato_objetivo
        + str version_actual
        + list[BrechasVersionResponse] historial_versiones
        + datetime created_at
        + datetime updated_at
    }

    class IntegrationQualityRulesSnapshotRequest {
        + Any model_config
        + str nombre
        + str descripcion
        + str resumen_tecnico
        + list[IntegrationRuleSchema] reglas
        + list[str] criterios_aceptacion
        + list[str] formato_objetivo
        + str | None change_summary
    }

    class IntegrationQualityRulesVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] document_id
        + Mapped[int] version_number
        + Mapped[dict] snapshot
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[IntegrationQualityRules] document
    }

    class InventoryMatrix {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[list[dict]] systems
        + Mapped[list[dict]] comments
        + Mapped[int] current_version_number
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime] last_saved_at
        + Mapped[list[InventoryMatrixVersion]] versions
    }

    class InventoryMatrixRepository {
        + @staticmethod get_project(db, *, project_id) Project | None$
        + @staticmethod get_artifact(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod get_user(db, *, user_id) User | None$
        + @staticmethod get_matrix(db, *, project_id, artifact_id) InventoryMatrix | None$
        + @staticmethod create_matrix(db, *, model) InventoryMatrix$
        + @staticmethod create_version(db, *, version) InventoryMatrixVersion$
    }

    class NivelCriticidad {
        <<enumeration>>
        + str CRITICO
        + str ALTO
        + str MEDIO
        + str BAJO
    }

    class TipoSistema {
        <<enumeration>>
        + str APLICACION
        + str BASE_DE_DATOS
        + str PLATAFORMA
        + str SERVICIO_EXTERNO
        + str INFRAESTRUCTURA
    }

    class SistemaInventarioSchema {
        + Any model_config
        + str id
        + str nombre
        + TipoSistema tipo
        + str descripcion
        + str | None tecnologia
        + str | None version
        + str | None proveedor
        + str | None propietario_negocio
        + str | None propietario_tecnico
        + NivelCriticidad | None criticidad
        + EstadoSistema | None estado
        + list[str] ambientes
        + list[str] datos_que_maneja
        + list[str] | None areas_estrategicas
        + str | None notas
    }

    class VersionInventarioResponse {
        + str version
        + datetime fecha
        + str autor
        + str | None descripcion_cambio
        + int total_sistemas
    }

    class InventoryMatrixResponse {
        + UUID id
        + UUID proyecto_id
        + UUID entregable_id
        + str nombre
        + str descripcion
        + list[SistemaInventarioSchema] sistemas
        + list[ComentarioInventarioResponse] comentarios
        + str version_actual
        + list[VersionInventarioResponse] historial_versiones
        + datetime created_at
        + datetime updated_at
    }

    class InventoryMatrixService {
        + str ARTIFACT_CODE
        - @staticmethod \_version_label(version_number) str$
        - @staticmethod \_normalize(value) str$
        - @staticmethod \_artifact_lock_check(artifact) None$
        - @classmethod \_resolve_artifact(cls, db, *, project_id, artifact_id) ProjectArtifact
        - @staticmethod \_resolve_permission(db, *, project_id, actor_user_id, artifact, minimum_level) None$
        - @staticmethod \_map_versions(versions) list[VersionInventarioResponse]$
        - @staticmethod \_map_comments(raw) list[ComentarioInventarioResponse]$
        - @classmethod \_map_model(cls, model) InventoryMatrixResponse
        - @classmethod \_infer_tipo(cls, entity_name) TipoSistema
        - @classmethod \_infer_criticidad(cls, entity_name, attr_count) NivelCriticidad
        - @classmethod \_generate_payload(cls, db, *, project_id) dict
        - @classmethod \_fallback_systems(cls, project_name) list[dict]
        - @classmethod \_ensure_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) InventoryMatrix
        + @classmethod get_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) InventoryMatrixResponse
        + @classmethod upsert_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email, payload) InventoryMatrixResponse
        + @classmethod generate_matrix(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) InventoryMatrixResponse
        + @classmethod add_comment(cls, db, *, project_id, artifact_id, actor_user_id, payload) InventoryMatrixResponse
    }

    class InventoryMatrixSnapshotRequest {
        + Any model_config
        + str nombre
        + str descripcion
        + list[SistemaInventarioSchema] sistemas
        + str | None change_summary
    }

    class InventoryMatrixVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] matrix_id
        + Mapped[int] version_number
        + Mapped[dict] snapshot
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[InventoryMatrix] matrix
    }

    class InvitationStatus {
        <<enumeration>>
        + str PENDIENTE
        + str ACEPTADA
        + str EXPIRADA
        + str REVOCADA
    }

    class Invitation {
        + str \_\_tablename__
        + Mapped[str] token
        + Mapped[str] email
        + Mapped[UserType] invited_user_type
        + Mapped[InvitationStatus] status
        + Mapped[uuid.UUID | None] project_id
        + Mapped[uuid.UUID] invited_by_user_id
        + Mapped[uuid.UUID | None] target_user_id
        + Mapped[datetime] expires_at
        + Mapped[datetime | None] accepted_at
    }

    class InviteProjectMemberRequest {
        + Any model_config
        + EmailStr email
        + UserType tipo_usuario
        + str | None nombre
        + int | None project_permission_level
        + int | None nivel_asis
        + int | None nivel_tobe
        + int | None nivel_brechas
        + int | None nivel_roadmap
    }

    class ProjectPermissionLevels {
        + int | None project_permission_level
        + int | None nivel_asis
        + int | None nivel_tobe
        + int | None nivel_brechas
        + int | None nivel_roadmap
    }

    class ProjectMemberResponse {
        + UUID membership_id
        + UUID project_id
        + UUID user_id
        + str nombre
        + EmailStr email
        + UserType tipo_usuario
        + UserStatus estado_usuario
        + bool is_manager
        + UUID | None assigned_by_user_id
        + ProjectPermissionLevels permisos
        + datetime created_at
        + datetime updated_at
    }

    class InviteProjectMemberResponse {
        + str message
        + ProjectMemberResponse member
        + str | None invitation_token
        + datetime | None invitation_expires_at
    }

    class LogicalColumnSchema {
        + Any model_config
        + str id
        + str nombre
        + str tipo_dato
        + str descripcion
        + bool es_pk
        + bool es_fk
        + bool es_nullable
        + bool es_unique
        + int orden
    }

    class LogicalCommentCreateRequest {
        + Any model_config
        + str target_type
        + str target_client_id
        + str content
    }

    class LogicalCommentResponse {
        + UUID id
        + UUID model_id
        + str target_type
        + str target_client_id
        + str content
        + str status
        + UUID | None created_by_user_id
        + str created_by_user_email
        + str | None created_by_user_name
        + str created_by_user_type
        + int created_in_version_number
        + datetime created_at
        + datetime updated_at
    }

    class LogicalDataModel {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[str] phase
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[list[dict]] tables
        + Mapped[str] sql_ddl
        + Mapped[str] notes_markdown
        + Mapped[list[dict]] comments
        + Mapped[list[dict]] versions
        + Mapped[str] current_version
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[uuid.UUID | None] updated_by_user_id
        + Mapped[datetime] last_saved_at
    }

    class LogicalDataModelComment {
        + str \_\_tablename__
        + Mapped[uuid.UUID] model_id
        + Mapped[str] target_type
        + Mapped[str] target_client_id
        + Mapped[str] content
        + Mapped[str] status
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
        + Mapped[str | None] created_by_user_name
        + Mapped[str] created_by_user_type
        + Mapped[int] created_in_version_number
    }

    class LogicalDataModelRepository {
        + @staticmethod get_artifact(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod get_model(db, *, project_id, artifact_id) LogicalDataModel | None$
        + @staticmethod create_model(db, *, model) LogicalDataModel$
        + @staticmethod list_versions(db, *, model_id) list[LogicalDataModelVersion]$
        + @staticmethod get_version(db, *, model_id, version_number) LogicalDataModelVersion | None$
        + @staticmethod create_version(db, *, version) LogicalDataModelVersion$
        + @staticmethod list_comments(db, *, model_id) list[LogicalDataModelComment]$
        + @staticmethod create_comment(db, *, comment) LogicalDataModelComment$
    }

    class LogicalTableSchema {
        + Any model_config
        + str id
        + str nombre
        + str esquema
        + str descripcion
        + list[LogicalColumnSchema] columnas
        + list[dict] indices
        + list[dict] constraints
    }

    class LogicalDataModelResponse {
        + UUID id
        + UUID proyecto_id
        + UUID entregable_id
        + str fase
        + str nombre
        + str descripcion
        + list[LogicalTableSchema] tablas
        + str sql_ddl
        + str notas_markdown
        + list[LogicalCommentResponse] comentarios
        + str version_actual
        + list[dict] versiones
        + datetime created_at
        + datetime updated_at
    }

    class LogicalDataModelService {
        + str SUPPORTED_ARTIFACT_CODE
        - @staticmethod \_get_actor_name(db, *, actor_user_id, fallback_email) str$
        - @staticmethod \_default_model_payload() dict$
        - @classmethod \_validate_artifact_access(cls, db, *, project_id, artifact_id)
        - @classmethod \_ensure_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) LogicalDataModel
        - @staticmethod \_map_comment(comment) LogicalCommentResponse$
        - @staticmethod \_map_version(version) LogicalVersionResponse$
        - @classmethod \_map_response(cls, db, model) LogicalDataModelResponse
        + @classmethod get_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) LogicalDataModelResponse
        + @classmethod upsert_model(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) LogicalDataModelResponse
        + @classmethod list_versions(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) LogicalVersionsResponse
        + @classmethod preview_version(cls, db, *, project_id, artifact_id, source_version_number, actor_user_id, actor_user_email) LogicalVersionPreviewResponse
        + @classmethod restore_version(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) LogicalDataModelResponse
        + @classmethod list_comments(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_email) list[LogicalCommentResponse]
        + @classmethod create_comment(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, actor_user_email, payload) LogicalCommentResponse
    }

    class LogicalModelSnapshotRequest {
        + Any model_config
        + str nombre
        + str descripcion
        + list[LogicalTableSchema] tablas
        + str sql_ddl
        + str notas_markdown
        + str | None change_summary
    }

    class LogicalDataModelUpsertRequest

    class LogicalDataModelVersion {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] model_id
        + Mapped[int] version_number
        + Mapped[dict] snapshot
        + Mapped[str | None] change_summary
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[str] created_by_user_email
    }

    class LogicalRestoreVersionRequest {
        + Any model_config
        + int source_version_number
        + str | None change_summary
    }

    class LogicalVersionPreviewResponse {
        + UUID model_id
        + int source_version_number
        + LogicalModelSnapshotRequest snapshot
    }

    class LogicalVersionResponse {
        + UUID id
        + int version_number
        + datetime created_at
        + UUID | None created_by_user_id
        + str created_by_user_email
        + str | None change_summary
    }

    class LogicalVersionsResponse {
        + UUID model_id
        + list[LogicalVersionResponse] versions
    }

    class MaturityQuestionnaire {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[ProjectBlock] phase
        + Mapped[bool] is_closed
        + Mapped[str] access_code
        + Mapped[dict[str, float]] dimension_weights_override
        + Mapped[list[dict[str, str]]] custom_roles_override
        + Mapped[list[dict[str, int | str]]] score_criteria_override
        + Mapped[datetime | None] access_expires_at
        + Mapped[uuid.UUID] created_by_user_id
        + Mapped[uuid.UUID | None] closed_by_user_id
        + Mapped[datetime | None] closed_at
        + Mapped[list[MaturityQuestion]] questions
        + Mapped[list[MaturityResponse]] responses
    }

    class MaturityQuestion {
        + str \_\_tablename__
        + Mapped[uuid.UUID] questionnaire_id
        + Mapped[int] dimension_id
        + Mapped[int] subdomain_id
        + Mapped[str] text
        + Mapped[list[str]] applicable_roles
        + Mapped[list[dict[str, int | str]]] score_criteria_override
        + Mapped[float] weight
        + Mapped[bool] is_active
        + Mapped[MaturityQuestionnaire] questionnaire
        + Mapped[list[MaturityAnswer]] answers
    }

    class MaturityResponseStatus {
        <<enumeration>>
        + str ACTIVE
        + str ANULADA
    }

    class MaturityResponse {
        + str \_\_tablename__
        + Mapped[uuid.UUID] questionnaire_id
        + Mapped[str] respondent_name
        + Mapped[str] respondent_email
        + Mapped[str] role
        + Mapped[MaturityResponseStatus] status
        + Mapped[MaturityValidationStatus] estado_validacion
        + Mapped[str | None] anulation_reason
        + Mapped[datetime | None] anulated_at
        + Mapped[uuid.UUID | None] anulated_by_user_id
        + Mapped[uuid.UUID | None] validated_by_user_id
        + Mapped[datetime | None] validated_at
        + Mapped[str | None] validation_comments
        + Mapped[datetime] submitted_at
        + Mapped[MaturityQuestionnaire] questionnaire
        + Mapped[list[MaturityAnswer]] answers
    }

    class MaturityAnswer {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] response_id
        + Mapped[uuid.UUID] question_id
        + Mapped[int] respondent_score
        + Mapped[int | None] validated_score
        + Mapped[MaturityValidationStatus] estado_validacion
        + Mapped[str | None] validation_comments
        + Mapped[str | None] evidence_url
        + Mapped[str | None] evidence_name
        + Mapped[str | None] evidence_type
        + Mapped[int | None] evidence_size
        + Mapped[MaturityResponse] response
        + Mapped[MaturityQuestion] question
    }

    class MaturityDimension {
        + str \_\_tablename__
        + Mapped[int] id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[float] weight
        + Mapped[int] display_order
        + Mapped[list[MaturitySubdomain]] subdomains
    }

    class MaturityQuestionnaireRepository {
        + @staticmethod get_project_by_id(db, *, project_id) Project | None$
        + @staticmethod get_membership(db, *, project_id, user_id) ProjectMembership | None$
        + @staticmethod get_artifact_by_code(db, *, project_id, artifact_code) ProjectArtifact | None$
        + @staticmethod get_artifact_permission(db, *, artifact_id, user_id) ProjectArtifactPermission | None$
        + @staticmethod list_dimensions(db) list[MaturityDimension]$
        + @staticmethod get_dimension_map(db) dict[int, MaturityDimension]$
        + @staticmethod get_subdomain_map(db) dict[int, MaturitySubdomain]$
        + @staticmethod get_questionnaire(db, *, project_id) MaturityQuestionnaire | None$
        + @staticmethod get_questionnaire_by_code(db, *, access_code) MaturityQuestionnaire | None$
        + @staticmethod create_questionnaire(db, *, questionnaire) MaturityQuestionnaire$
        + @staticmethod replace_questions(db, *, questionnaire, questions) list[MaturityQuestion]$
        + @staticmethod count_access_code(db, *, access_code) int$
        + @staticmethod create_response(db, *, response) MaturityResponse$
        + @staticmethod create_answers(db, *, answers) list[MaturityAnswer]$
        + @staticmethod get_response(db, *, response_id) MaturityResponse | None$
    }

    class MaturityQuestionnaireService {
        + int ACCESS_CODE_TTL_DAYS
        + int MAX_EVIDENCE_FILE_BYTES
        + set ALLOWED_EVIDENCE_EXTENSIONS
        - @staticmethod \_to_float(value) float$
        - @staticmethod \_answer_score(answer) int$
        - @classmethod \_dimension_weight_override_map(cls, *, questionnaire) dict[int, float]
        - @staticmethod \_maturity_level(score) str$
        - @staticmethod \_generate_access_code(db) str$
        - @classmethod \_catalog_dimensions(cls, db, *, weight_overrides) list[DimensionWithSubdomainsResponse]
        - @staticmethod \_catalog_roles() list[RoleCatalogResponse]$
        - @classmethod \_catalog_roles_with_overrides(cls, *, questionnaire) list[RoleCatalogResponse]
        - @staticmethod \_template_question_responses() list[dict[str, object]]$
        - @staticmethod \_default_score_criteria() list[ScoreCriteriaItem]$
        - @classmethod \_score_criteria_with_overrides(cls, *, questionnaire) list[ScoreCriteriaItem]
        - @classmethod \_sanitize_score_criteria(cls, criteria) list[dict[str, int | str]]
        - @classmethod \_question_score_criteria(cls, *, question, questionnaire) list[ScoreCriteriaItem]
        - @staticmethod \_build_template_questions(*, questionnaire_id) list[MaturityQuestion]$
        + @classmethod initialize_default_questionnaire(cls, db, *, project_id, created_by_user_id) MaturityQuestionnaire
        - @classmethod \_require_project_access(cls, db, *, project_id, actor_user_id, minimum_level) None
        - @staticmethod \_resolve_effective_questionnaire_permission(db, *, actor_user_id, membership, artifact) int$
        - @staticmethod \_require_consultant_role(*, actor_user_type) None$
        - @classmethod \_to_response_dto(cls, response) ResponseDTO
        - @staticmethod \_response_status_from_answers(answers) MaturityValidationStatus$
        - @classmethod \_to_questionnaire_config_response(cls, db, *, project_id, questionnaire) QuestionnaireConfigResponse
        - @classmethod \_build_question_model(cls, *, questionnaire_id, payload, dimension_ids, subdomain_dimension_map, allowed_role_ids) MaturityQuestion
        + @classmethod get_config(cls, db, *, project_id, actor_user_id, actor_user_type) QuestionnaireConfigResponse
        + @classmethod upsert_config(cls, db, *, project_id, actor_user_id, actor_user_type, payload) QuestionnaireConfigResponse
        + @classmethod update_status(cls, db, *, project_id, actor_user_id, actor_user_type, payload) QuestionnaireStatusResponse
        + @classmethod validate_public_access(cls, db, *, access_code) PublicQuestionnaireValidationResponse
        + @classmethod get_public_config(cls, db, *, access_code) QuestionnaireConfigResponse
        + @classmethod submit_response(cls, db, *, project_id, access_code, payload) SubmitResponseSuccess
        + @classmethod async upload_evidence(cls, db, *, project_id, access_code, file) EvidenceUploadResponse
        + @classmethod list_responses(cls, db, *, project_id, actor_user_id, actor_user_type, status) ResponseListResponse
        + @classmethod anular_response(cls, db, *, response_id, actor_user_id, actor_user_type, payload) ResponseDTO
        + @classmethod reactivar_response(cls, db, *, response_id, actor_user_id, actor_user_type) ResponseDTO
        + @classmethod validate_answer(cls, db, *, response_id, answer_id, actor_user_id, actor_user_type, payload) ResponseDTO
        + @classmethod finalize_response_evaluation(cls, db, *, response_id, actor_user_id, actor_user_type, payload) ResponseDTO
        + @classmethod get_results(cls, db, *, project_id, actor_user_id, actor_user_type) QuestionnaireResultsResponse
    }

    class MaturitySubdomain {
        + str \_\_tablename__
        + Mapped[int] id
        + Mapped[int] dimension_id
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[float] weight
        + Mapped[int] display_order
        + Mapped[MaturityDimension] dimension
    }

    class NotFoundDomainError {
        - \_\_init__(self, message, details) None
    }

    class PermissionLevel {
        <<enumeration>>
        + int SIN_ACCESO
        + int LECTURA
        + int COMENTAR
        + int EDITAR
        + int APROBAR
        + int DELEGAR
    }

    class ProjectStatus {
        <<enumeration>>
        + str ACTIVO
        + str EN_PAUSA
        + str CERRADO
        + str BLOQUEADO
    }

    class Project {
        + str \_\_tablename__
        + Mapped[str] nombre
        + Mapped[str | None] descripcion
        + Mapped[str] client_company_name
        + Mapped[str] client_company_email
        + Mapped[date] estimated_end_date
        + Mapped[ProjectStatus] estado
        + Mapped[uuid.UUID] manager_user_id
        + Mapped["User"] manager_user
        + Mapped[list["ProjectMembership"]] memberships
        + Mapped[list["ProjectArtifact"]] artifacts
    }

    class ProjectArtifactStatus {
        <<enumeration>>
        + str PENDING
        + str IN_PROGRESS
        + str PENDING_COMPANY_APPROVAL
        + str APPROVED
        + str NOT_APPLICABLE
    }

    class ProjectArtifact {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[str] code
        + Mapped[str] name
        + Mapped[str] description
        + Mapped[ProjectBlock] block
        + Mapped[int] order_index
        + Mapped[int] block_order
        + Mapped[ProjectArtifactStatus] status
        + Mapped[bool] is_applicable
        + Mapped[bool] consultant_approved
        + Mapped[bool] company_approved
        + Mapped[datetime | None] consultant_approved_at
        + Mapped[datetime | None] company_approved_at
        + Mapped[datetime | None] approved_at
        + Mapped[uuid.UUID | None] approved_by_user_id
        + Mapped[int] review_cycles
        + Mapped[str | None] last_rejection_reason
        + Mapped[Project] project
        + Mapped[list[ProjectArtifactPermission]] permissions
    }

    class ProjectArtifactPermission {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] artifact_id
        + Mapped[uuid.UUID] user_id
        + Mapped[int] permission_level
        + Mapped[uuid.UUID | None] assigned_by_user_id
        + Mapped[ProjectArtifact] artifact
    }

    class ProjectArtifactResponse {
        + UUID id
        + str code
        + str name
        + str description
        + ProjectBlock block
        + int order_index
        + int block_order
        + ProjectArtifactStatus status
        + bool is_applicable
        + bool consultant_approved
        + bool company_approved
        + datetime | None consultant_approved_at
        + datetime | None company_approved_at
        + datetime | None approved_at
        + UUID | None approved_by_user_id
        + int review_cycles
        + str | None last_rejection_reason
        + int effective_permission_level
        + datetime created_at
        + datetime updated_at
    }

    class ProjectArtifactSummary {
        + int total
        + int approved
        + int not_applicable
    }

    class ProjectArtifactsListResponse {
        + int total
        + list[ProjectArtifactResponse] items
    }

    class ProjectCompanyResponse {
        + str name
        + EmailStr email
    }

    class ProjectManagerResponse {
        + UUID id
        + str name
    }

    class ProjectResponse {
        + UUID id
        + str name
        + str | None description
        + ProjectCompanyResponse client_company
        + date estimated_end_date
        + ProjectStatus status
        + ProjectManagerResponse manager
        + int progress
        + ProjectArtifactSummary artifacts
        + datetime created_at
        + datetime updated_at
    }

    class ProjectDetailResponse {
        + list[ProjectArtifactResponse] artifact_items
    }

    class ProjectListResponse {
        + int total
        + list[ProjectResponse] items
    }

    class ProjectMembersListResponse {
        + int total
        + list[ProjectMemberResponse] items
    }

    class ProjectMembership {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID] user_id
        + Mapped[bool] is_manager
        + Mapped[int | None] project_permission_level
        + Mapped[int | None] nivel_asis
        + Mapped[int | None] nivel_tobe
        + Mapped[int | None] nivel_brechas
        + Mapped[int | None] nivel_roadmap
        + Mapped[uuid.UUID | None] assigned_by_user_id
        + Mapped["Project"] project
        + Mapped["User"] user
    }

    class ProjectMembershipRepository {
        + @staticmethod get_project_by_id(db, *, project_id) Project | None$
        + @staticmethod get_user_by_id(db, *, user_id) User | None$
        + @staticmethod get_user_by_email(db, *, email) User | None$
        + @staticmethod create_user(db, *, nombre, email, tipo_usuario, estado, created_by_user_id) User$
        + @staticmethod get_membership(db, *, project_id, user_id) ProjectMembership | None$
        + @staticmethod list_memberships(db, *, project_id) list[ProjectMembership]$
        + @staticmethod create_membership(db, *, project_id, user_id, is_manager, project_permission_level, nivel_asis, nivel_tobe, nivel_brechas, nivel_roadmap, assigned_by_user_id) ProjectMembership$
        + @staticmethod get_artifact_by_id(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod get_artifact_permission(db, *, artifact_id, user_id) ProjectArtifactPermission | None$
        + @staticmethod upsert_artifact_permission(db, *, project_id, artifact_id, user_id, permission_level, assigned_by_user_id) ProjectArtifactPermission$
        + @staticmethod delete_membership(db, *, membership) None$
        + @staticmethod create_invitation(db, *, token, email, invited_user_type, project_id, invited_by_user_id, target_user_id, expires_at) Invitation$
        + @staticmethod add_audit_log(db, *, user_id, perfil_usuario, project_id, tipo_accion, descripcion, resource_id, datos_adicionales) AuditLog$
    }

    class ProjectMembershipService {
        - @staticmethod \_resolve_project_access(db, *, project_id, actor_user_id) _ProjectAccessContext$
        - @staticmethod \_actor_level_for_field(*, context, field_name) int$
        - @classmethod \_validate_permission_changes(cls, *, context, requested_fields) None
        - @staticmethod \_to_artifact_permission_response(permission) ArtifactPermissionResponse$
        - @staticmethod \_to_member_response(membership, user) ProjectMemberResponse$
        + @classmethod invite_member(cls, db, *, project_id, actor_user_id, actor_user_type, payload) InviteProjectMemberResponse
        + @classmethod list_members(cls, db, *, project_id, actor_user_id) ProjectMembersListResponse
        + @classmethod update_member_permissions(cls, db, *, project_id, actor_user_id, actor_user_type, target_user_id, payload) ProjectMemberResponse
        + @classmethod update_artifact_permission(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, target_user_id, payload) ArtifactPermissionResponse
        + @classmethod remove_member(cls, db, *, project_id, actor_user_id, actor_user_type, target_user_id) RemoveProjectMemberResponse
    }

    class ProjectPermissionService {
        + @staticmethod get_project_or_raise(db, *, project_id) Project$
        + @classmethod get_membership_or_raise(cls, db, *, project_id, actor_user_id) tuple[Project, ProjectMembership | None]
        + @staticmethod resolve_effective_level(*, project, membership, artifact, artifact_level) int$
        + @classmethod resolve_project_level(cls, db, *, project_id, actor_user_id, minimum_level) tuple[Project, ProjectMembership | None, int]
        + @classmethod resolve_artifact_level(cls, db, *, project_id, actor_user_id, artifact, minimum_level) tuple[Project, ProjectMembership | None, int]
    }

    class ProjectRepository {
        + @staticmethod create_project(db, *, project) Project$
        + @staticmethod get_project_by_id(db, *, project_id) Project | None$
        + @staticmethod list_projects_for_user(db, *, user_id) list[Project]$
        + @staticmethod create_manager_membership(db, *, project_id, user_id) ProjectMembership$
        + @staticmethod create_artifacts(db, *, artifacts) list[ProjectArtifact]$
        + @staticmethod get_artifact_by_id(db, *, project_id, artifact_id) ProjectArtifact | None$
        + @staticmethod list_artifacts_by_project(db, *, project_id) list[ProjectArtifact]$
        + @staticmethod get_membership(db, *, project_id, user_id) ProjectMembership | None$
        + @staticmethod get_artifact_permission(db, *, artifact_id, user_id) ProjectArtifactPermission | None$
        + @staticmethod add_audit_log(db, *, user_id, perfil_usuario, project_id, tipo_accion, descripcion, resource_id, datos_adicionales) AuditLog$
    }

    class ProjectService {
        - @staticmethod \_ensure_project_creator_role(*, actor_user_type) None$
        - @staticmethod \_artifact_summary(artifacts) ProjectArtifactSummary$
        - @classmethod \_project_progress(cls, artifacts) int
        - @staticmethod \_clear_approval_state(artifact) None$
        - @classmethod \_ensure_reviewer_role(cls, *, reviewer, actor_user_type) None
        - @classmethod \_artifact_response(cls, *, artifact, effective_permission_level) ProjectArtifactResponse
        - @classmethod \_project_response(cls, *, project) ProjectResponse
        + @classmethod create_project(cls, db, *, actor_user_id, actor_user_type, payload) ProjectDetailResponse
        + @classmethod list_projects(cls, db, *, actor_user_id) ProjectListResponse
        + @classmethod get_project(cls, db, *, project_id, actor_user_id) ProjectDetailResponse
        + @classmethod update_project(cls, db, *, project_id, actor_user_id, actor_user_type, payload) ProjectDetailResponse
        + @classmethod list_project_artifacts(cls, db, *, project_id, actor_user_id) ProjectArtifactsListResponse
        + @classmethod update_project_artifact(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, payload) ProjectArtifactResponse
        - @classmethod \_review_project_artifact(cls, db, *, reviewer, project_id, artifact_id, actor_user_id, actor_user_type, payload) ProjectArtifactResponse
        + @classmethod review_project_artifact_consultant(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, payload) ProjectArtifactResponse
        + @classmethod review_project_artifact_company(cls, db, *, project_id, artifact_id, actor_user_id, actor_user_type, payload) ProjectArtifactResponse
    }

    class PublicQuestionnaireValidationResponse {
        + bool valid
        + UUID | None questionnaire_id
        + UUID | None project_id
        + str | None project_name
        + bool | None is_closed
        + datetime | None expires_at
        + str | None error
    }

    class ScoreCriteriaItem {
        + Any model_config
        + int score
        + str name
        + str description
    }

    class QuestionConfigRequest {
        + Any model_config
        + int dimension_id
        + int subdomain_id
        + str text
        + list[str] applicable_roles
        + float weight
        + list[ScoreCriteriaItem] score_criteria
    }

    class QuestionResponse {
        + UUID id
        + int dimension_id
        + int subdomain_id
        + str text
        + list[str] applicable_roles
        + float weight
        + list[ScoreCriteriaItem] score_criteria
    }

    class RoleCatalogResponse {
        + str id
        + str name
        + str description
        + bool is_system
    }

    class QuestionnaireConfigResponse {
        + UUID project_id
        + ProjectBlock phase
        + list[RoleCatalogResponse] roles
        + list[ScoreCriteriaItem] score_criteria
        + list[DimensionWithSubdomainsResponse] dimensions
        + list[QuestionResponse] template_questions
        + list[QuestionResponse] questions
        + bool is_closed
        + str | None access_code
        + datetime | None access_expires_at
        + datetime | None created_at
        + datetime | None updated_at
    }

    class RoleCatalogUpsertRequest {
        + Any model_config
        + str id
        + str name
        + str description
    }

    class QuestionnaireConfigUpsertRequest {
        + Any model_config
        + ProjectBlock phase
        + list[QuestionConfigRequest] questions
        + dict[int, float] dimension_weights
        + list[RoleCatalogUpsertRequest] roles
        + list[ScoreCriteriaItem] score_criteria
        + ensure_phase_is_as_is(self) QuestionnaireConfigUpsertRequest
    }

    class QuestionnaireResultsResponse {
        + float overall_score
        + float overall_percent
        + str maturity_level
        + list[DimensionResultResponse] dimensions
        + int respondent_count
        + int validated_response_count
        + datetime calculated_at
    }

    class QuestionnaireStatusResponse {
        + UUID project_id
        + bool is_closed
        + datetime updated_at
    }

    class RaciActivity {
        + str \_\_tablename__
        + Mapped[uuid.UUID] matrix_id
        + Mapped[str] name
        + Mapped[str | None] description
        + Mapped[str] category
        + Mapped[int] order_index
        + Mapped[str | None] notas
        + Mapped["RaciMatrix"] matrix
        + Mapped[list["RaciAssignment"]] assignments
    }

    class RaciActivityCreate {
        + str name
        + str | None description
        + str category
        + str | None notas
    }

    class RaciActivityResponse {
        + UUID id
        + str nombre
        + str | None descripcion
        + str categoria
        + str | None notas
        + dict[str, str] asignaciones
        + Any model_config
    }

    class RaciActivityUpdate {
        + str | None name
        + str | None description
        + str | None category
        + str | None notas
        + int | None order_index
    }

    class RaciAssignmentType {
        <<enumeration>>
        + str R
        + str A
        + str C
        + str I
    }

    class RaciAssignment {
        + str \_\_tablename__
        + tuple \_\_table_args__
        + Mapped[uuid.UUID] matrix_id
        + Mapped[uuid.UUID] activity_id
        + Mapped[uuid.UUID] role_id
        + Mapped[RaciAssignmentType] assignment_type
        + Mapped["RaciActivity"] activity
        + Mapped["RaciRole"] role
    }

    class RaciAssignmentUpdate {
        + UUID role_id
        + RaciAssignmentType | None assignment_type
    }

    class RaciBulkActivity {
        + UUID id
        + str name
        + str | None description
        + str category
        + str | None notas
        + dict[str, str] asignaciones
    }

    class RaciBulkRole {
        + UUID id
        + str name
        + str | None area
        + str | None description
    }

    class RaciBulkUpdate {
        + str nombre
        + str | None descripcion
        + list[RaciBulkRole] roles
        + list[RaciBulkActivity] actividades
    }

    class RaciCommentReferenceType {
        <<enumeration>>
        + str ACTIVIDAD
        + str ROL
        + str GENERAL
    }

    class RaciComment {
        + str \_\_tablename__
        + Mapped[uuid.UUID] matrix_id
        + Mapped[uuid.UUID | None] reference_id
        + Mapped[RaciCommentReferenceType] reference_type
        + Mapped[uuid.UUID] author_id
        + Mapped[str] author_nombre
        + Mapped[str] author_perfil
        + Mapped[str] contenido
        + Mapped[str] estado
        + Mapped["RaciMatrix"] matrix
        + Mapped["User"] author
    }

    class RaciCommentCreate {
        + UUID | None referencia_id
        + RaciCommentReferenceType referencia_tipo
        + str contenido
    }

    class RaciCommentResponse {
        + UUID id
        + UUID | None referencia_id
        + RaciCommentReferenceType referencia_tipo
        + UUID autor_id
        + str autor_nombre
        + str autor_perfil
        + str contenido
        + str estado
        + datetime created_at
        + Any model_config
    }

    class RaciMatrixResponse {
        + UUID id
        + UUID proyecto_id
        + UUID | None entregable_id
        + str nombre
        + str | None descripcion
        + str version_actual
        + datetime created_at
        + datetime updated_at
        + Any model_config
    }

    class RaciRoleResponse {
        + UUID id
        + str nombre
        + str | None area
        + str | None descripcion
        + Any model_config
    }

    class RaciVersionHistoryResponse {
        + str version
        + datetime fecha
        + str autor
        + str descripcion_cambio
        + int total_actividades
        + int total_roles
        + Any model_config
    }

    class RaciGridResponse {
        + list[RaciRoleResponse] roles
        + list[RaciActivityResponse] actividades
        + list[RaciCommentResponse] comentarios
        + list[RaciVersionHistoryResponse] historial_versiones
        + Any model_config
    }

    class RaciStatus {
        <<enumeration>>
        + str DRAFT
        + str ACTIVE
        + str ARCHIVED
    }

    class RaciMatrix {
        + str \_\_tablename__
        + Mapped[uuid.UUID] project_id
        + Mapped[uuid.UUID | None] entregable_id
        + Mapped[str] name
        + Mapped[str | None] description
        + Mapped[RaciStatus] status
        + Mapped[str] version_actual
        + Mapped[list["RaciRole"]] roles
        + Mapped[list["RaciActivity"]] activities
        + Mapped[list["RaciComment"]] comments
        + Mapped[list["RaciVersionHistory"]] history
    }

    class RaciMatrixCreate {
        + UUID project_id
        + UUID | None entregable_id
        + str name
        + str | None description
    }

    class RaciMatrixUpdate {
        + str | None name
        + str | None description
        + RaciStatus | None status
    }

    class RaciRepository {
        - \_\_init__(self, db) None
        + create_matrix(self, matrix) RaciMatrix
        + get_matrix(self, matrix_id) RaciMatrix | None
        + get_matrix_with_relations(self, matrix_id) RaciMatrix | None
        + list_matrices_by_project(self, project_id) Sequence[RaciMatrix]
        + get_role(self, role_id) RaciRole | None
        + create_role(self, role) RaciRole
        + delete_role(self, role) None
        + get_activity(self, activity_id) RaciActivity | None
        + get_activity_with_assignments(self, activity_id) RaciActivity | None
        + create_activity(self, activity) RaciActivity
        + delete_activity(self, activity) None
        + insert_assignment(self, assignment) RaciAssignment
        + delete_assignment_for_activity_and_role(self, activity_id, role_id) None
        + get_assignment(self, activity_id, role_id) RaciAssignment | None
        + create_comment(self, comment) RaciComment
    }

    class RaciRole {
        + str \_\_tablename__
        + Mapped[uuid.UUID] matrix_id
        + Mapped[str] name
        + Mapped[str | None] area
        + Mapped[str | None] description
        + Mapped[int] order_index
        + Mapped["RaciMatrix"] matrix
        + Mapped[list["RaciAssignment"]] assignments
    }

    class RaciRoleCreate {
        + str name
        + str | None area
        + str | None description
    }

    class RaciRoleUpdate {
        + str | None name
        + str | None area
        + str | None description
        + int | None order_index
    }

    class RaciService {
        - \_\_init__(self, db) None
        + create_matrix(self, data) RaciMatrixResponse
        + list_matrices(self, project_id) list[RaciMatrixResponse]
        + get_grid(self, matrix_id) RaciGridResponse
        + add_role(self, matrix_id, data) RaciRoleResponse
        + add_activity(self, matrix_id, data) RaciActivityResponse
        + update_assignments(self, matrix_id, activity_id, assignments)
        + sync_bulk(self, matrix_id, data)
        + add_comment(self, matrix_id, data, author_id, author_nombre, author_perfil) RaciCommentResponse
    }

    class RaciVersionHistory {
        + str \_\_tablename__
        + Mapped[uuid.UUID] matrix_id
        + Mapped[str] version
        + Mapped[str] autor
        + Mapped[str] descripcion_cambio
        + Mapped[int] total_actividades
        + Mapped[int] total_roles
        + Mapped["RaciMatrix"] matrix
    }

    class RefreshToken {
        + str \_\_tablename__
        + Mapped[uuid.UUID] user_id
        + Mapped[str] token_hash
        + Mapped[datetime] expires_at
        + Mapped[datetime | None] revoked_at
    }

    class RemoveProjectMemberResponse {
        + str message
    }

    class ResponseDTO {
        + UUID id
        + str respondent_name
        + str respondent_email
        + str role
        + list[AnswerResponse] answers
        + MaturityResponseStatus status
        + str | None anulation_reason
        + datetime | None anulated_at
        + UUID | None anulated_by
        + datetime submitted_at
        + MaturityValidationStatus estado_validacion
        + UUID | None validado_por
        + datetime | None validado_en
        + str | None validacion_comentarios
    }

    class ResponseListResponse {
        + list[ResponseDTO] responses
        + int total
        + int active
        + int anuladas
        + int pendientes_validacion
        + int validadas
    }

    class Settings {
        + Any model_config
        + str PROJECT_NAME
        + str VERSION
        + str API_V1_STR
        + list[str] ALLOWED_ORIGINS
        + str DATABASE_URL
        + str ADMIN_SEED_EMAIL
        + str ADMIN_SEED_NAME
        + str JWT_SECRET_KEY
        + str JWT_ALGORITHM
        + int JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        + int JWT_REFRESH_TOKEN_EXPIRE_MINUTES
        + str BACKEND_BASE_URL
        + str MEDIA_ROOT
        + @classmethod assemble_cors_origins(cls, v) list[str]
    }

    class SubmitAnswerRequest {
        + Any model_config
        + UUID question_id
        + int score
        + str | None evidencia_url
        + str | None evidencia_nombre
        + str | None evidencia_tipo
        + int | None evidencia_size
    }

    class SubmitResponseRequest {
        + Any model_config
        + str respondent_name
        + str respondent_email
        + str role
        + list[SubmitAnswerRequest] answers
    }

    class SubmitResponseSuccess {
        + UUID id
        + str message
        + datetime submitted_at
    }

    class TimestampedUUIDModel {
        + bool \_\_abstract__
        + Mapped[uuid.UUID] id
        + Mapped[datetime] created_at
        + Mapped[datetime] updated_at
    }

    class TokenPayload {
        <<dataclass>>
        + str sub
        + datetime exp
        + str token_type
        + str | None jti
    }

    class UnauthorizedDomainError {
        - \_\_init__(self, message, details) None
    }

    class UpdateArtifactPermissionRequest {
        + Any model_config
        + int permission_level
    }

    class UpdateArtifactRequest {
        + Any model_config
        + ProjectArtifactStatus | None status
        + bool | None is_applicable
        + bool | None consultant_approved
        + bool | None company_approved
        + str | None last_rejection_reason
        + ensure_at_least_one_field(self) UpdateArtifactRequest
    }

    class UpdateProjectMemberPermissionsRequest {
        + Any model_config
        + int | None project_permission_level
        + int | None nivel_asis
        + int | None nivel_tobe
        + int | None nivel_brechas
        + int | None nivel_roadmap
        + ensure_at_least_one_field(self) UpdateProjectMemberPermissionsRequest
    }

    class UpdateProjectRequest {
        + Any model_config
        + str | None name
        + str | None description
        + str | None client_company_name
        + EmailStr | None client_company_email
        + date | None estimated_end_date
        + ProjectStatus | None status
        + ensure_at_least_one_field(self) UpdateProjectRequest
    }

    class UpdateQuestionnaireStatusRequest {
        + Any model_config
        + bool is_closed
    }

    class User {
        + str \_\_tablename__
        + Mapped[str] nombre
        + Mapped[str] email
        + Mapped[str | None] password_hash
        + Mapped[UserType] tipo_usuario
        + Mapped[UserStatus] estado
        + Mapped[uuid.UUID | None] created_by_user_id
        + Mapped[datetime | None] deactivated_at
        + Mapped["User | None"] created_by
        + Mapped[list["Project"]] managed_projects
        + Mapped[list["ProjectMembership"]] memberships
    }

    class UserCreate {
        + Any model_config
        + str nombre
        + str email
        + UserType tipo_usuario
        + str | None password
        + UserStatus estado
    }

    class UserResponse {
        + UUID id
        + str nombre
        + str email
        + UserType tipo_usuario
        + UserStatus estado
        + UUID | None created_by_user_id
        + datetime | None deactivated_at
        + datetime created_at
        + datetime updated_at
    }

    class UserListResponse {
        + int total
        + list[UserResponse] items
    }

    class UserRegisterRequest {
        + str nombre
        + EmailStr email
        + str password
        + UserType tipo_usuario
    }

    class UserRepository {
        + @staticmethod get_by_id(db, *, user_id) User | None$
        + @staticmethod get_by_email(db, *, email) User | None$
        + @staticmethod create(db, *, user) User$
        + @staticmethod list_users(db, *, tipo_usuario, estado, search) tuple[list[User], int]$
    }

    class UserService {
        - @staticmethod \_to_response(user) UserResponse$
        + @classmethod create_user(cls, db, *, payload, created_by_user_id) UserResponse
        + @classmethod list_users(cls, db, *, tipo_usuario, estado, search) UserListResponse
        + @classmethod update_user(cls, db, *, user_id, payload) UserResponse
        + @classmethod deactivate_user(cls, db, *, user_id, actor_user_id) UserResponse
        + @classmethod register_user(cls, db, *, payload) UserResponse
    }

    class UserUpdate {
        + Any model_config
        + str | None nombre
        + UserStatus | None estado
    }

    class ValidateAnswerRequest {
        + Any model_config
        + int validated_score
        + str | None validacion_comentarios
    }

    class ValidationDomainError {
        - \_\_init__(self, message, details) None
    }

    class _EntitySnapshot {
        <<dataclass>>
        + str nombre
        + int atributos
        + int fks
    }

    class _ProjectAccessContext {
        <<dataclass>>
        + bool is_manager
        + ProjectMembership | None actor_membership
    }

    Settings --|> pydantic_settings.BaseSettings

    DomainError --|> Exception

    ValidationDomainError --|> DomainError

    ForbiddenDomainError --|> DomainError

    UnauthorizedDomainError --|> DomainError

    NotFoundDomainError --|> DomainError

    ConflictDomainError --|> DomainError

    AuditLog --|> app.models.base.Base

    Base --|> sqlalchemy.orm.DeclarativeBase

    TimestampedUUIDModel --|> Base

    BusinessGlossary --|> app.models.base.TimestampedUUIDModel

    BusinessGlossaryVersion --|> app.models.base.TimestampedUUIDModel

    ConceptualAttribute --|> app.models.base.TimestampedUUIDModel

    ConceptualComment --|> app.models.base.TimestampedUUIDModel

    ConceptualEntity --|> app.models.base.TimestampedUUIDModel

    ConceptualModel --|> app.models.base.TimestampedUUIDModel

    ConceptualModelVersion --|> app.models.base.TimestampedUUIDModel

    ConceptualRelation --|> app.models.base.TimestampedUUIDModel

    DFDComment --|> app.models.base.Base

    DFDModel --|> app.models.base.TimestampedUUIDModel

    DFDVersion --|> app.models.base.Base

    GapAnalysisReport --|> app.models.base.TimestampedUUIDModel

    GapAnalysisReportVersion --|> app.models.base.TimestampedUUIDModel

    GapsCRUDMatrix --|> app.models.base.TimestampedUUIDModel

    GapsCRUDMatrixVersion --|> app.models.base.TimestampedUUIDModel

    IntegrationQualityRules --|> app.models.base.TimestampedUUIDModel

    IntegrationQualityRulesVersion --|> app.models.base.TimestampedUUIDModel

    InventoryMatrix --|> app.models.base.TimestampedUUIDModel

    InventoryMatrixVersion --|> app.models.base.TimestampedUUIDModel

    Invitation --|> app.models.base.TimestampedUUIDModel

    LogicalDataModel --|> app.models.base.TimestampedUUIDModel

    LogicalDataModelComment --|> app.models.base.TimestampedUUIDModel

    LogicalDataModelVersion --|> app.models.base.TimestampedUUIDModel

    MaturityAnswer --|> app.models.base.TimestampedUUIDModel

    MaturityDimension --|> app.models.base.Base

    MaturityQuestion --|> app.models.base.TimestampedUUIDModel

    MaturityQuestionnaire --|> app.models.base.TimestampedUUIDModel

    MaturityResponse --|> app.models.base.TimestampedUUIDModel

    MaturitySubdomain --|> app.models.base.Base

    Project --|> app.models.base.TimestampedUUIDModel

    ProjectArtifact --|> app.models.base.TimestampedUUIDModel

    ProjectArtifactPermission --|> app.models.base.TimestampedUUIDModel

    ProjectMembership --|> app.models.base.TimestampedUUIDModel

    RaciMatrix --|> app.models.base.TimestampedUUIDModel

    RaciRole --|> app.models.base.TimestampedUUIDModel

    RaciActivity --|> app.models.base.TimestampedUUIDModel

    RaciAssignment --|> app.models.base.TimestampedUUIDModel

    RaciComment --|> app.models.base.TimestampedUUIDModel

    RaciVersionHistory --|> app.models.base.TimestampedUUIDModel

    RefreshToken --|> app.models.base.TimestampedUUIDModel

    User --|> app.models.base.TimestampedUUIDModel

    AuthLoginRequest --|> pydantic.BaseModel

    UserRegisterRequest --|> pydantic.BaseModel

    AuthRefreshRequest --|> pydantic.BaseModel

    AuthLogoutRequest --|> pydantic.BaseModel

    ActivateInvitationRequest --|> pydantic.BaseModel

    AuthUserResponse --|> pydantic.BaseModel

    TokenPairResponse --|> pydantic.BaseModel

    AuthLoginResponse --|> pydantic.BaseModel

    AuthRefreshResponse --|> pydantic.BaseModel

    AuthMessageResponse --|> pydantic.BaseModel

    AuthLogoutResponse --|> pydantic.BaseModel

    CRUDComparisonSchema --|> pydantic.BaseModel

    BrechasVersionResponse --|> pydantic.BaseModel

    CRUDMatrixSnapshotRequest --|> pydantic.BaseModel

    CRUDMatrixResponse --|> pydantic.BaseModel

    GapSchema --|> pydantic.BaseModel

    GapAnalysisReportSnapshotRequest --|> pydantic.BaseModel

    GapAnalysisReportResponse --|> pydantic.BaseModel

    IntegrationRuleSchema --|> pydantic.BaseModel

    IntegrationQualityRulesSnapshotRequest --|> pydantic.BaseModel

    IntegrationQualityRulesResponse --|> pydantic.BaseModel

    ExportDocumentRequest --|> pydantic.BaseModel

    TerminoGlosarioSchema --|> pydantic.BaseModel

    ComentarioGlosarioResponse --|> pydantic.BaseModel

    VersionGlosarioResponse --|> pydantic.BaseModel

    BusinessGlossarySnapshotRequest --|> pydantic.BaseModel

    AddGlossaryCommentRequest --|> pydantic.BaseModel

    BusinessGlossaryResponse --|> pydantic.BaseModel

    ConceptualAttributePayload --|> pydantic.BaseModel

    ConceptualEntityPayload --|> pydantic.BaseModel

    ConceptualRelationPayload --|> pydantic.BaseModel

    ConceptualModelUpsertRequest --|> pydantic.BaseModel

    ConceptualModelRestoreVersionRequest --|> pydantic.BaseModel

    ConceptualCommentCreateRequest --|> pydantic.BaseModel

    ConceptualCommentUpdateRequest --|> pydantic.BaseModel

    ConceptualCommentResponse --|> pydantic.BaseModel

    ConceptualAttributeResponse --|> pydantic.BaseModel

    ConceptualEntityResponse --|> pydantic.BaseModel

    ConceptualRelationResponse --|> pydantic.BaseModel

    ConceptualModelResponse --|> pydantic.BaseModel

    ConceptualModelVersionItem --|> pydantic.BaseModel

    ConceptualModelVersionsResponse --|> pydantic.BaseModel

    ConceptualVersionPreviewResponse --|> pydantic.BaseModel

    ConceptualModelCommentsResponse --|> pydantic.BaseModel

    DFDNodeSchema --|> pydantic.BaseModel

    DFDFlowSchema --|> pydantic.BaseModel

    DFDCommentResponse --|> pydantic.BaseModel

    DFDCommentCreateRequest --|> pydantic.BaseModel

    DFDVersionResponse --|> pydantic.BaseModel

    DFDVersionsResponse --|> pydantic.BaseModel

    DFDModelSnapshotRequest --|> pydantic.BaseModel

    DFDModelResponse --|> pydantic.BaseModel

    DFDVersionPreviewResponse --|> pydantic.BaseModel

    DFDRestoreVersionRequest --|> pydantic.BaseModel

    SistemaInventarioSchema --|> pydantic.BaseModel

    ComentarioInventarioResponse --|> pydantic.BaseModel

    VersionInventarioResponse --|> pydantic.BaseModel

    InventoryMatrixSnapshotRequest --|> pydantic.BaseModel

    AddInventoryCommentRequest --|> pydantic.BaseModel

    InventoryMatrixResponse --|> pydantic.BaseModel

    LogicalColumnSchema --|> pydantic.BaseModel

    LogicalTableSchema --|> pydantic.BaseModel

    LogicalVersionResponse --|> pydantic.BaseModel

    LogicalVersionsResponse --|> pydantic.BaseModel

    LogicalModelSnapshotRequest --|> pydantic.BaseModel

    LogicalDataModelUpsertRequest --|> LogicalModelSnapshotRequest

    LogicalVersionPreviewResponse --|> pydantic.BaseModel

    LogicalRestoreVersionRequest --|> pydantic.BaseModel

    LogicalCommentResponse --|> pydantic.BaseModel

    LogicalCommentCreateRequest --|> pydantic.BaseModel

    LogicalDataModelResponse --|> pydantic.BaseModel

    SubdomainResponse --|> pydantic.BaseModel

    RoleCatalogResponse --|> pydantic.BaseModel

    RoleCatalogUpsertRequest --|> pydantic.BaseModel

    ScoreCriteriaItem --|> pydantic.BaseModel

    DimensionWithSubdomainsResponse --|> pydantic.BaseModel

    QuestionConfigRequest --|> pydantic.BaseModel

    QuestionnaireConfigUpsertRequest --|> pydantic.BaseModel

    QuestionResponse --|> pydantic.BaseModel

    QuestionnaireConfigResponse --|> pydantic.BaseModel

    SubmitAnswerRequest --|> pydantic.BaseModel

    SubmitResponseRequest --|> pydantic.BaseModel

    ValidateAnswerRequest --|> pydantic.BaseModel

    FinalizeEvaluationRequest --|> pydantic.BaseModel

    AnularResponseRequest --|> pydantic.BaseModel

    UpdateQuestionnaireStatusRequest --|> pydantic.BaseModel

    AnswerResponse --|> pydantic.BaseModel

    ResponseDTO --|> pydantic.BaseModel

    ResponseListResponse --|> pydantic.BaseModel

    SubmitResponseSuccess --|> pydantic.BaseModel

    EvidenceUploadResponse --|> pydantic.BaseModel

    QuestionnaireStatusResponse --|> pydantic.BaseModel

    SubdomainResultResponse --|> pydantic.BaseModel

    DimensionResultResponse --|> pydantic.BaseModel

    QuestionnaireResultsResponse --|> pydantic.BaseModel

    PublicQuestionnaireValidationResponse --|> pydantic.BaseModel

    ProjectArtifactSummary --|> pydantic.BaseModel

    ProjectArtifactResponse --|> pydantic.BaseModel

    ProjectCompanyResponse --|> pydantic.BaseModel

    ProjectManagerResponse --|> pydantic.BaseModel

    ProjectResponse --|> pydantic.BaseModel

    ProjectListResponse --|> pydantic.BaseModel

    ProjectDetailResponse --|> ProjectResponse

    CreateProjectRequest --|> pydantic.BaseModel

    UpdateProjectRequest --|> pydantic.BaseModel

    UpdateArtifactRequest --|> pydantic.BaseModel

    ProjectArtifactsListResponse --|> pydantic.BaseModel

    ArtifactReviewRequest --|> pydantic.BaseModel

    ProjectPermissionLevels --|> pydantic.BaseModel

    InviteProjectMemberRequest --|> pydantic.BaseModel

    UpdateProjectMemberPermissionsRequest --|> pydantic.BaseModel

    UpdateArtifactPermissionRequest --|> pydantic.BaseModel

    ArtifactPermissionResponse --|> pydantic.BaseModel

    ProjectMemberResponse --|> pydantic.BaseModel

    ProjectMembersListResponse --|> pydantic.BaseModel

    InviteProjectMemberResponse --|> pydantic.BaseModel

    RemoveProjectMemberResponse --|> pydantic.BaseModel

    RaciVersionHistoryResponse --|> pydantic.BaseModel

    RaciCommentCreate --|> pydantic.BaseModel

    RaciCommentResponse --|> pydantic.BaseModel

    RaciBulkActivity --|> pydantic.BaseModel

    RaciBulkRole --|> pydantic.BaseModel

    RaciBulkUpdate --|> pydantic.BaseModel

    RaciRoleCreate --|> pydantic.BaseModel

    RaciRoleUpdate --|> pydantic.BaseModel

    RaciRoleResponse --|> pydantic.BaseModel

    RaciAssignmentUpdate --|> pydantic.BaseModel

    RaciActivityCreate --|> pydantic.BaseModel

    RaciActivityUpdate --|> pydantic.BaseModel

    RaciActivityResponse --|> pydantic.BaseModel

    RaciMatrixCreate --|> pydantic.BaseModel

    RaciMatrixUpdate --|> pydantic.BaseModel

    RaciMatrixResponse --|> pydantic.BaseModel

    RaciGridResponse --|> RaciMatrixResponse

    UserCreate --|> pydantic.BaseModel

    UserUpdate --|> pydantic.BaseModel

    UserResponse --|> pydantic.BaseModel

    UserListResponse --|> pydantic.BaseModel

    ArtifactDefinition *-- ProjectBlock

    TokenPayload *-- datetime

    CurrentUser *-- UserType

    CurrentUser *-- UserStatus

    AuditLog *-- datetime

    TimestampedUUIDModel *-- datetime

    BusinessGlossary *-- datetime

    BusinessGlossaryVersion *-- BusinessGlossary

    ConceptualAttribute *-- ConceptualEntity

    ConceptualComment *-- UserType

    ConceptualComment *-- ConceptualModel

    ConceptualEntity *-- ConceptualModel

    ConceptualModel *-- ProjectBlock

    ConceptualModelVersion *-- ConceptualModel

    ConceptualRelation *-- ConceptualModel

    DFDComment *-- datetime

    DFDComment *-- DFDModel

    DFDModel *-- datetime

    DFDVersion *-- datetime

    DFDVersion *-- DFDModel

    GapAnalysisReport *-- datetime

    GapAnalysisReportVersion *-- GapAnalysisReport

    GapsCRUDMatrix *-- datetime

    GapsCRUDMatrixVersion *-- GapsCRUDMatrix

    IntegrationQualityRules *-- datetime

    IntegrationQualityRulesVersion *-- IntegrationQualityRules

    InventoryMatrix *-- datetime

    InventoryMatrixVersion *-- InventoryMatrix

    Invitation *-- UserType

    Invitation *-- InvitationStatus

    Invitation *-- datetime

    LogicalDataModel *-- datetime

    MaturityAnswer *-- MaturityValidationStatus

    MaturityAnswer *-- MaturityResponse

    MaturityAnswer *-- MaturityQuestion

    MaturityQuestion *-- MaturityQuestionnaire

    MaturityQuestionnaire *-- ProjectBlock

    MaturityResponse *-- MaturityResponseStatus

    MaturityResponse *-- MaturityValidationStatus

    MaturityResponse *-- datetime

    MaturityResponse *-- MaturityQuestionnaire

    MaturitySubdomain *-- MaturityDimension

    Project *-- date

    Project *-- ProjectStatus

    ProjectArtifact *-- ProjectBlock

    ProjectArtifact *-- ProjectArtifactStatus

    ProjectArtifact *-- Project

    ProjectArtifactPermission *-- ProjectArtifact

    RaciMatrix *-- RaciStatus

    RaciAssignment *-- RaciAssignmentType

    RaciComment *-- RaciCommentReferenceType

    RefreshToken *-- datetime

    User *-- UserType

    User *-- UserStatus

    UserRegisterRequest *-- EmailStr

    UserRegisterRequest *-- UserType

    AuthUserResponse *-- UUID

    AuthUserResponse *-- UserType

    AuthUserResponse *-- UserStatus

    TokenPairResponse *-- datetime

    AuthLoginResponse *-- AuthUserResponse

    AuthLoginResponse *-- TokenPairResponse

    AuthRefreshResponse *-- TokenPairResponse

    CRUDComparisonSchema *-- BrechaImpacto

    BrechasVersionResponse *-- datetime

    CRUDMatrixSnapshotRequest *-- CRUDComparisonSchema

    CRUDMatrixResponse *-- UUID

    CRUDMatrixResponse *-- CRUDComparisonSchema

    CRUDMatrixResponse *-- BrechasVersionResponse

    CRUDMatrixResponse *-- datetime

    GapSchema *-- BrechaImpacto

    GapSchema *-- BrechaPrioridad

    GapAnalysisReportSnapshotRequest *-- GapSchema

    GapAnalysisReportResponse *-- UUID

    GapAnalysisReportResponse *-- GapSchema

    GapAnalysisReportResponse *-- BrechasVersionResponse

    GapAnalysisReportResponse *-- datetime

    IntegrationRuleSchema *-- IntegrationRuleType

    IntegrationRuleSchema *-- IntegrationRulePriority

    IntegrationQualityRulesSnapshotRequest *-- IntegrationRuleSchema

    IntegrationQualityRulesResponse *-- UUID

    IntegrationQualityRulesResponse *-- IntegrationRuleSchema

    IntegrationQualityRulesResponse *-- BrechasVersionResponse

    IntegrationQualityRulesResponse *-- datetime

    ExportDocumentRequest *-- ExportFormat

    VersionGlosarioResponse *-- datetime

    BusinessGlossarySnapshotRequest *-- TerminoGlosarioSchema

    BusinessGlossaryResponse *-- UUID

    BusinessGlossaryResponse *-- TerminoGlosarioSchema

    BusinessGlossaryResponse *-- ComentarioGlosarioResponse

    BusinessGlossaryResponse *-- VersionGlosarioResponse

    BusinessGlossaryResponse *-- datetime

    ConceptualEntityPayload *-- ConceptualAttributePayload

    ConceptualModelUpsertRequest *-- ConceptualEntityPayload

    ConceptualModelUpsertRequest *-- ConceptualRelationPayload

    ConceptualCommentResponse *-- UUID

    ConceptualCommentResponse *-- datetime

    ConceptualEntityResponse *-- ConceptualAttributeResponse

    ConceptualModelResponse *-- UUID

    ConceptualModelResponse *-- ProjectBlock

    ConceptualModelResponse *-- ConceptualEntityResponse

    ConceptualModelResponse *-- ConceptualRelationResponse

    ConceptualModelResponse *-- ConceptualCommentResponse

    ConceptualModelResponse *-- datetime

    ConceptualModelVersionItem *-- UUID

    ConceptualModelVersionItem *-- datetime

    ConceptualModelVersionsResponse *-- UUID

    ConceptualModelVersionsResponse *-- ConceptualModelVersionItem

    ConceptualVersionPreviewResponse *-- UUID

    ConceptualVersionPreviewResponse *-- ConceptualModelUpsertRequest

    ConceptualModelCommentsResponse *-- UUID

    ConceptualModelCommentsResponse *-- ConceptualCommentResponse

    DFDCommentResponse *-- UUID

    DFDCommentResponse *-- datetime

    DFDVersionResponse *-- UUID

    DFDVersionResponse *-- datetime

    DFDVersionsResponse *-- UUID

    DFDVersionsResponse *-- DFDVersionResponse

    DFDModelSnapshotRequest *-- DFDNodeSchema

    DFDModelSnapshotRequest *-- DFDFlowSchema

    DFDModelResponse *-- UUID

    DFDModelResponse *-- DFDNodeSchema

    DFDModelResponse *-- DFDFlowSchema

    DFDModelResponse *-- DFDCommentResponse

    DFDModelResponse *-- DFDVersionResponse

    DFDModelResponse *-- datetime

    DFDVersionPreviewResponse *-- UUID

    DFDVersionPreviewResponse *-- DFDModelSnapshotRequest

    SistemaInventarioSchema *-- TipoSistema

    SistemaInventarioSchema *-- NivelCriticidad

    SistemaInventarioSchema *-- EstadoSistema

    VersionInventarioResponse *-- datetime

    InventoryMatrixSnapshotRequest *-- SistemaInventarioSchema

    InventoryMatrixResponse *-- UUID

    InventoryMatrixResponse *-- SistemaInventarioSchema

    InventoryMatrixResponse *-- ComentarioInventarioResponse

    InventoryMatrixResponse *-- VersionInventarioResponse

    InventoryMatrixResponse *-- datetime

    LogicalTableSchema *-- LogicalColumnSchema

    LogicalVersionResponse *-- UUID

    LogicalVersionResponse *-- datetime

    LogicalVersionsResponse *-- UUID

    LogicalVersionsResponse *-- LogicalVersionResponse

    LogicalModelSnapshotRequest *-- LogicalTableSchema

    LogicalVersionPreviewResponse *-- UUID

    LogicalVersionPreviewResponse *-- LogicalModelSnapshotRequest

    LogicalCommentResponse *-- UUID

    LogicalCommentResponse *-- datetime

    LogicalDataModelResponse *-- UUID

    LogicalDataModelResponse *-- LogicalTableSchema

    LogicalDataModelResponse *-- LogicalCommentResponse

    LogicalDataModelResponse *-- datetime

    DimensionWithSubdomainsResponse *-- SubdomainResponse

    QuestionConfigRequest *-- ScoreCriteriaItem

    QuestionnaireConfigUpsertRequest *-- ProjectBlock

    QuestionnaireConfigUpsertRequest *-- QuestionConfigRequest

    QuestionnaireConfigUpsertRequest *-- RoleCatalogUpsertRequest

    QuestionnaireConfigUpsertRequest *-- ScoreCriteriaItem

    QuestionResponse *-- UUID

    QuestionResponse *-- ScoreCriteriaItem

    QuestionnaireConfigResponse *-- UUID

    QuestionnaireConfigResponse *-- ProjectBlock

    QuestionnaireConfigResponse *-- RoleCatalogResponse

    QuestionnaireConfigResponse *-- ScoreCriteriaItem

    QuestionnaireConfigResponse *-- DimensionWithSubdomainsResponse

    QuestionnaireConfigResponse *-- QuestionResponse

    QuestionnaireConfigResponse *-- datetime

    SubmitAnswerRequest *-- UUID

    SubmitResponseRequest *-- SubmitAnswerRequest

    AnswerResponse *-- UUID

    AnswerResponse *-- MaturityValidationStatus

    ResponseDTO *-- UUID

    ResponseDTO *-- AnswerResponse

    ResponseDTO *-- MaturityResponseStatus

    ResponseDTO *-- datetime

    ResponseDTO *-- MaturityValidationStatus

    ResponseListResponse *-- ResponseDTO

    SubmitResponseSuccess *-- UUID

    SubmitResponseSuccess *-- datetime

    QuestionnaireStatusResponse *-- UUID

    QuestionnaireStatusResponse *-- datetime

    DimensionResultResponse *-- SubdomainResultResponse

    QuestionnaireResultsResponse *-- DimensionResultResponse

    QuestionnaireResultsResponse *-- datetime

    PublicQuestionnaireValidationResponse *-- UUID

    PublicQuestionnaireValidationResponse *-- datetime

    ProjectArtifactResponse *-- UUID

    ProjectArtifactResponse *-- ProjectBlock

    ProjectArtifactResponse *-- ProjectArtifactStatus

    ProjectArtifactResponse *-- datetime

    ProjectCompanyResponse *-- EmailStr

    ProjectManagerResponse *-- UUID

    ProjectResponse *-- UUID

    ProjectResponse *-- ProjectCompanyResponse

    ProjectResponse *-- date

    ProjectResponse *-- ProjectStatus

    ProjectResponse *-- ProjectManagerResponse

    ProjectResponse *-- ProjectArtifactSummary

    ProjectResponse *-- datetime

    ProjectListResponse *-- ProjectResponse

    ProjectDetailResponse *-- ProjectArtifactResponse

    CreateProjectRequest *-- EmailStr

    CreateProjectRequest *-- date

    UpdateProjectRequest *-- EmailStr

    UpdateProjectRequest *-- date

    UpdateProjectRequest *-- ProjectStatus

    UpdateArtifactRequest *-- ProjectArtifactStatus

    ProjectArtifactsListResponse *-- ProjectArtifactResponse

    InviteProjectMemberRequest *-- EmailStr

    InviteProjectMemberRequest *-- UserType

    ArtifactPermissionResponse *-- UUID

    ArtifactPermissionResponse *-- datetime

    ProjectMemberResponse *-- UUID

    ProjectMemberResponse *-- EmailStr

    ProjectMemberResponse *-- UserType

    ProjectMemberResponse *-- UserStatus

    ProjectMemberResponse *-- ProjectPermissionLevels

    ProjectMemberResponse *-- datetime

    ProjectMembersListResponse *-- ProjectMemberResponse

    InviteProjectMemberResponse *-- ProjectMemberResponse

    InviteProjectMemberResponse *-- datetime

    RaciVersionHistoryResponse *-- datetime

    RaciCommentCreate *-- UUID

    RaciCommentCreate *-- RaciCommentReferenceType

    RaciCommentResponse *-- UUID

    RaciCommentResponse *-- RaciCommentReferenceType

    RaciCommentResponse *-- datetime

    RaciBulkActivity *-- UUID

    RaciBulkRole *-- UUID

    RaciBulkUpdate *-- RaciBulkRole

    RaciBulkUpdate *-- RaciBulkActivity

    RaciRoleResponse *-- UUID

    RaciAssignmentUpdate *-- UUID

    RaciAssignmentUpdate *-- RaciAssignmentType

    RaciActivityResponse *-- UUID

    RaciMatrixCreate *-- UUID

    RaciMatrixUpdate *-- RaciStatus

    RaciMatrixResponse *-- UUID

    RaciMatrixResponse *-- datetime

    RaciGridResponse *-- RaciRoleResponse

    RaciGridResponse *-- RaciActivityResponse

    RaciGridResponse *-- RaciCommentResponse

    RaciGridResponse *-- RaciVersionHistoryResponse

    UserCreate *-- UserType

    UserCreate *-- UserStatus

    UserUpdate *-- UserStatus

    UserResponse *-- UUID

    UserResponse *-- UserType

    UserResponse *-- UserStatus

    UserResponse *-- datetime

    UserListResponse *-- UserResponse

    _ProjectAccessContext *-- ProjectMembership
```

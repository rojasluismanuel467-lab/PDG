/**
 * Tipos para la API del Cuestionario de Madurez
 * Estos tipos definen la estructura de requests/responses del backend
 */

// ============================================================================
// ENUMS Y CONSTANTES
// ============================================================================

export enum EstadoValidacion {
  PENDIENTE = "PENDIENTE",           // Respondido, esperando validación
  EN_REVISION = "EN_REVISION",       // Consultor está revisando
  APROBADA = "APROBADA",             // Validada y aprobada (cuenta para score)
  RECHAZADA = "RECHAZADA",           // Rechazada (no cuenta para score)
}

export enum EstadoCuestionario {
  ABIERTO = "ABIERTO",
  CERRADO = "CERRADO",
}

// ============================================================================
// REQUESTS (lo que envía el frontend al backend)
// ============================================================================

export interface CreateCuestionarioRequest {
  phase: "AS_IS" | "TO_BE";
  questions: CreateQuestionRequest[];
  dimension_weights?: Record<number, number>;
  roles?: RoleCatalogDTO[];
  score_criteria?: ScoreCriteriaDTO[];
}

export interface CreateQuestionRequest {
  dimension_id: number;
  subdomain_id: number;
  text: string;
  applicable_roles: string[];
  weight?: number;
  score_criteria?: ScoreCriteriaDTO[];
}

export interface SubmitResponseRequest {
  respondent_name: string;
  respondent_email: string;
  role: string;
  answers: SubmitAnswerRequest[];
}

export interface SubmitAnswerRequest {
  question_id: string;
  score: number;
  evidencia_url?: string;
  evidencia_nombre?: string;
  evidencia_tipo?: string;
  evidencia_size?: number;
  respondent_comentarios?: string;
}

export interface ValidateAnswerRequest {
  validacion_comentarios?: string;
  validated_score: number;
}

export interface FinalizeEvaluationRequest {
  confirmation: boolean;
}

export interface AnularResponseRequest {
  reason: string;
}

export interface UpdateCuestionarioEstadoRequest {
  is_closed: boolean;
}

// ============================================================================
// RESPONSES (lo que el backend envía al frontend)
// ============================================================================

export interface CuestionarioConfigResponse {
  project_id: string;
  phase: string;
  roles?: RoleCatalogDTO[];
  score_criteria?: ScoreCriteriaDTO[];
  dimensions: DimensionWithSubdomains[];
  template_questions?: QuestionDTO[];
  questions: QuestionDTO[];
  is_closed: boolean;
  access_code?: string | null;
  access_expires_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GetResponsesResponse {
  responses: ResponseDTO[];
  total: number;
  active: number;
  anuladas: number;
  pendientes_validacion: number;
  validadas: number;
}

export interface MaturityResultsResponse {
  overall_score: number;
  overall_percent: number;
  maturity_level: string;
  dimensions: DimensionResultDTO[];
  respondent_count: number;
  validated_response_count: number;  // Solo respuestas validadas
  calculated_at: string;
}

export interface UpdateEstadoResponse {
  project_id: string;
  is_closed: boolean;
  updated_at: string;
}

export interface EvidenceUploadResponse {
  evidencia_url: string;
  evidencia_nombre: string;
  evidencia_tipo: string;
  evidencia_size: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface DimensionWithSubdomains {
  id: number;
  name: string;
  description: string;
  weight: number;
  subdomains: SubdomainDTO[];
}

export interface RoleCatalogDTO {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
}

export interface ScoreCriteriaDTO {
  score: number;
  name: string;
  description: string;
}

export interface SubdomainDTO {
  id: number;
  name: string;
  description: string;
  weight: number;
}

export interface QuestionDTO {
  id: string;
  dimension_id: number;
  subdomain_id: number;
  text: string;
  applicable_roles: string[];
  weight: number;
  score_criteria?: ScoreCriteriaDTO[];
}

export interface ResponseDTO {
  id: string;
  respondent_name: string;
  respondent_email: string;
  role: string;
  answers: AnswerDTO[];
  status: "active" | "anulada";
  anulation_reason: string | null;
  anulated_at: string | null;
  anulated_by: string | null;
  submitted_at: string;
  
  // Campos de validación
  estado_validacion: EstadoValidacion;
  validado_por: string | null;
  validado_en: string | null;
  validacion_comentarios: string | null;
}

export interface AnswerDTO {
  id?: string;
  question_id: string;
  question_text?: string | null;
  score: number;
  respondent_score?: number;
  validated_score?: number | null;
  
  // Evidencia
  evidencia_url: string | null;
  evidencia_nombre: string | null;
  evidencia_tipo: string | null;
  evidencia_size: number | null;
  respondent_comentarios: string | null;
  
  // Validación
  estado_validacion: EstadoValidacion;
  validacion_comentarios: string | null;
}

export interface DimensionResultDTO {
  dimension_id: number;
  dimension_name: string;
  score: number;
  percent: number;
  weight: number;
  maturity_level: string;
  question_count: number;
  validated_question_count: number;  // Solo preguntas validadas
  subdomains: SubdomainResultDTO[];
}

export interface SubdomainResultDTO {
  subdomain_id: number;
  subdomain_name: string;
  score: number;
  percent: number;
  question_count: number;
  validated_question_count: number;  // Solo preguntas validadas
}

export interface PublicQuestionnaireValidationResponse {
  valid: boolean;
  questionnaire_id?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  is_closed?: boolean | null;
  expires_at?: string | null;
  error?: string | null;
}

// ============================================================================
// Tipos de Utilidad
// ============================================================================

export type CuestionarioStatus = "open" | "closed";
export type ResponseStatus = "active" | "anulada";
export type MaturityLevel = 
  | "Inicial" 
  | "Repetible" 
  | "Definido" 
  | "Gestionado" 
  | "Optimizado"
  | "No evaluado";

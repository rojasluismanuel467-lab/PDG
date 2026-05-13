export type ProjectStatus = "ACTIVO" | "EN_PAUSA" | "CERRADO" | "BLOQUEADO";
export type ArtifactStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "PENDING_COMPANY_APPROVAL"
  | "APPROVED"
  | "NOT_APPLICABLE";

export interface ProjectCompany {
  name: string;
  email: string;
}

export interface ProjectManager {
  id: string;
  name: string;
}

export interface ProjectArtifactSummary {
  total: number;
  approved: number;
  not_applicable: number;
}

export interface ProjectArtifact {
  id: string;
  code: string;
  name: string;
  description: string;
  block: "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP";
  order_index: number;
  block_order: number;
  status: ArtifactStatus;
  is_applicable: boolean;
  consultant_approved: boolean;
  company_approved: boolean;
  consultant_approved_at: string | null;
  company_approved_at: string | null;
  approved_at: string | null;
  approved_by_user_id: string | null;
  review_cycles: number;
  last_rejection_reason: string | null;
  effective_permission_level: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  client_company: ProjectCompany;
  estimated_end_date: string;
  status: ProjectStatus;
  manager: ProjectManager;
  progress: number;
  artifacts: ProjectArtifactSummary;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
  artifact_items: ProjectArtifact[];
}

export interface ProjectListResponse {
  total: number;
  items: ProjectResponse[];
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  company_id: string;
  estimated_end_date: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
  company_id?: string;
  estimated_end_date?: string;
  status?: ProjectStatus;
}

export interface UpdateArtifactRequest {
  status?: ArtifactStatus;
  is_applicable?: boolean;
  consultant_approved?: boolean;
  company_approved?: boolean;
  last_rejection_reason?: string | null;
}

export interface ReviewArtifactRequest {
  approved: boolean;
  reason?: string;
}

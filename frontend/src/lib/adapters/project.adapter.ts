import type {
  ProjectArtifact,
  ProjectDetailResponse,
  ProjectResponse,
} from "@/lib/types/project.types";

export type LegacyProjectStatus = "ACTIVO" | "EN_PAUSA" | "CERRADO" | "BLOQUEADO";

export type LegacyProject = {
  id: string;
  nombre: string;
  descripcion: string;
  empresa_cliente: {
    id: string;
    nombre: string;
    email: string;
  };
  fecha_estimada_cierre: string;
  fecha_creacion: string;
  estado: LegacyProjectStatus;
  consultor_gerente: {
    id: string;
    nombre: string;
  };
  progreso: number;
  entregables: {
    total: number;
    aprobados: number;
    no_aplica: number;
  };
};

export type LegacyArtifact = {
  id: string;
  code: string;
  id_proyecto: string;
  nombre: string;
  descripcion: string;
  etapa: "CUESTIONARIO" | "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP";
  orden: number;
  orden_etapa: number;
  estado: "PENDIENTE" | "EN_PROGRESO" | "PENDIENTE_APROBACION_EMPRESA" | "APROBADO" | "NO_APLICA";
  aprobacion_consultor: boolean;
  aprobacion_empresa: boolean;
  fecha_aprobacion_consultor: string | null;
  fecha_aprobacion_empresa: string | null;
  fecha_aprobacion: string | null;
  aprobado_por: string | null;
  ciclos_revision: number;
  ultimo_motivo_rechazo: string | null;
  effective_permission_level: number;
};

const artifactStatusMap: Record<ProjectArtifact["status"], LegacyArtifact["estado"]> = {
  PENDING: "PENDIENTE",
  IN_PROGRESS: "EN_PROGRESO",
  PENDING_COMPANY_APPROVAL: "PENDIENTE_APROBACION_EMPRESA",
  APPROVED: "APROBADO",
  NOT_APPLICABLE: "NO_APLICA",
};

const artifactNameMap: Partial<Record<ProjectArtifact["code"], string>> = {
  ASIS_MATURITY_QUESTIONNAIRE: "Cuestionario de Madurez",
  ASIS_CONCEPTUAL_DIAGRAM: "Diagrama Conceptual AS-IS",
  ASIS_SYSTEM_INVENTORY_MATRIX: "Matriz de Inventario de Sistemas",
  ASIS_DFD: "DFD AS-IS",
  ASIS_RACI_MATRIX: "Matriz RACI / Roles",
  ASIS_LOGICAL_DATA_MODEL: "Modelo Lógico de Datos AS-IS",
  TOBE_CONCEPTUAL_DIAGRAM: "Diagrama Conceptual TO-BE",
  TOBE_LOGICAL_DATA_MODEL: "Modelo Lógico de Datos TO-BE",
  TOBE_BUSINESS_GLOSSARY: "Glosario de Negocio",
  TOBE_DFD: "DFD TO-BE",
  GAPS_CRUD_MATRIX: "Matriz CRUD Comparativa",
  GAPS_ANALYSIS_REPORT: "Reporte de Análisis de Brechas",
  GAPS_INTEGRATION_QUALITY_RULES: "Reglas de Integración y Calidad",
  ASIS_BUSINESS_GLOSSARY: "Glosario de Negocio AS-IS",
  TOBE_SYSTEM_INVENTORY_MATRIX: "Inventario de Sistemas TO-BE",
  TOBE_RACI_MATRIX: "Matriz RACI / Roles TO-BE",
  ROADMAP_IMPLEMENTATION_PLAN: "Roadmap de Implementación",
  ROADMAP_ARCHITECTURE_STANDARDS: "Estándares de Arquitectura",
  ROADMAP_METRICS_DASHBOARD: "Dashboard de Métricas y KPIs",
};

export function toLegacyProject(project: ProjectResponse): LegacyProject {
  return {
    id: project.id,
    nombre: project.name,
    descripcion: project.description ?? "",
    empresa_cliente: {
      id: project.id,
      nombre: project.client_company.name,
      email: project.client_company.email,
    },
    fecha_estimada_cierre: project.estimated_end_date,
    fecha_creacion: project.created_at,
    estado: project.status,
    consultor_gerente: {
      id: project.manager.id,
      nombre: project.manager.name,
    },
    progreso: project.progress,
    entregables: {
      total: project.artifacts.total,
      aprobados: project.artifacts.approved,
      no_aplica: project.artifacts.not_applicable,
    },
  };
}

export function toLegacyArtifact(artifact: ProjectArtifact): LegacyArtifact {
  return {
    id: artifact.id,
    code: artifact.code,
    id_proyecto: "",
    nombre: artifactNameMap[artifact.code] ?? artifact.name,
    descripcion: artifact.description,
    etapa: artifact.code === "ASIS_MATURITY_QUESTIONNAIRE" ? "CUESTIONARIO" : artifact.block,
    orden: artifact.order_index,
    orden_etapa: artifact.block_order,
    estado: artifactStatusMap[artifact.status],
    aprobacion_consultor: artifact.consultant_approved,
    aprobacion_empresa: artifact.company_approved,
    fecha_aprobacion_consultor: artifact.consultant_approved_at,
    fecha_aprobacion_empresa: artifact.company_approved_at,
    fecha_aprobacion: artifact.approved_at,
    aprobado_por: artifact.approved_by_user_id,
    ciclos_revision: artifact.review_cycles,
    ultimo_motivo_rechazo: artifact.last_rejection_reason,
    effective_permission_level: artifact.effective_permission_level,
  };
}

export function toLegacyProjectDetail(
  project: ProjectDetailResponse
): LegacyProject & { entregable_items: LegacyArtifact[] } {
  return {
    ...toLegacyProject(project),
    entregable_items: project.artifact_items.map(toLegacyArtifact),
  };
}

import type { LegacyArtifact } from "@/lib/adapters/project.adapter";

export type ArtifactEditor =
  | { tipo: "modelo-er"; variante: "as-is" | "to-be" }
  | { tipo: "modelo-logico" }
  | { tipo: "dfd"; variante: "as-is" | "to-be" }
  | { tipo: "matriz-inventario" }
  | { tipo: "matriz-raci" }
  | { tipo: "glosario-negocio" }
  | { tipo: "crud-matrix" }
  | { tipo: "gap-report" }
  | { tipo: "integration-quality-rules" }
  | { tipo: "roadmap-implementation" }
  | { tipo: "architecture-standards" }
  | { tipo: "kpi-dashboard" }
  | null;

const EDITOR_BY_ARTIFACT_CODE: Partial<Record<LegacyArtifact["code"], ArtifactEditor>> = {
  ASIS_CONCEPTUAL_DIAGRAM: { tipo: "modelo-er", variante: "as-is" },
  TOBE_CONCEPTUAL_DIAGRAM: { tipo: "modelo-er", variante: "to-be" },
  ASIS_LOGICAL_DATA_MODEL: { tipo: "modelo-logico" },
  TOBE_LOGICAL_DATA_MODEL: { tipo: "modelo-logico" },
  ASIS_DFD: { tipo: "dfd", variante: "as-is" },
  TOBE_DFD: { tipo: "dfd", variante: "to-be" },
  ASIS_SYSTEM_INVENTORY_MATRIX: { tipo: "matriz-inventario" },
  ASIS_RACI_MATRIX: { tipo: "matriz-raci" },
  TOBE_BUSINESS_GLOSSARY: { tipo: "glosario-negocio" },
  GAPS_CRUD_MATRIX: { tipo: "crud-matrix" },
  GAPS_ANALYSIS_REPORT: { tipo: "gap-report" },
  GAPS_INTEGRATION_QUALITY_RULES: { tipo: "integration-quality-rules" },
  ROADMAP_IMPLEMENTATION_PLAN: { tipo: "roadmap-implementation" },
  ROADMAP_ARCHITECTURE_STANDARDS: { tipo: "architecture-standards" },
  ROADMAP_METRICS_DASHBOARD: { tipo: "kpi-dashboard" },
};

export function detectArtifactEditor(artifact: Pick<LegacyArtifact, "code">): ArtifactEditor {
  return EDITOR_BY_ARTIFACT_CODE[artifact.code] ?? null;
}

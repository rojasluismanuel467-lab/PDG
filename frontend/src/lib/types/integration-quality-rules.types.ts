// ============================================================================
// Tipos de Reglas de Integracion y Calidad - Artefacto 11 (Brechas)
// ============================================================================

export type IntegrationRuleType = "Matching" | "Validacion" | "Consolidacion";

export type IntegrationRulePriority = "Alta" | "Media" | "Baja";

export type IntegrationRulesExportFormat = "markdown" | "word" | "pdf";

export interface IntegrationRule {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: IntegrationRuleType;
  prioridad: IntegrationRulePriority;
  condicion: string;
  accion: string;
}

export interface IntegrationRulesVersion {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
}

export interface IntegrationQualityRules {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  resumen_tecnico: string;
  reglas: IntegrationRule[];
  criterios_aceptacion: string[];
  formato_objetivo: Array<"MARKDOWN" | "WORD" | "PDF">;
  version_actual: string;
  historial_versiones: IntegrationRulesVersion[];
  created_at: string;
  updated_at: string;
}

export interface IntegrationRulesExportFile {
  file_name: string;
  mime_type: string;
  content: string | Uint8Array;
}

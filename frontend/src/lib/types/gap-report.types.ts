// ============================================================================
// Tipos del Reporte de Analisis de Brechas - Artefacto 10 (Brechas)
// Disenados para serializacion JSON y alineados con el esquema funcional
// ============================================================================

export type GapImpacto = "Alto" | "Medio" | "Bajo";

export type GapPrioridad = "Critica" | "Alta" | "Media" | "Baja";

export type GapReportExportFormat = "markdown" | "pdf" | "word";

export interface Gap {
  id: string;
  area: string;
  brecha: string;
  impacto: GapImpacto;
  prioridad: GapPrioridad;
  recomendacion: string;
}

export interface GapAnalysisReportVersion {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
}

export interface GapAnalysisReport {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  resumen_ejecutivo: string;
  brechas: Gap[];
  total_brechas: number;
  brechas_criticas: number;
  recomendaciones_prioritarias: string[];
  formato_objetivo: Array<"PDF" | "WORD" | "MARKDOWN">;
  version_actual: string;
  historial_versiones: GapAnalysisReportVersion[];
  created_at: string;
  updated_at: string;
}

export interface GapReportExportFile {
  file_name: string;
  mime_type: string;
  content: string | Uint8Array;
}

import { apiClient } from "@/lib/api/client";
import type {
  CRUDComparison,
  CRUDMatrix,
  CRUDMatrixVersion,
} from "@/lib/types/crud-matrix.types";
import type {
  Gap,
  GapAnalysisReport,
  GapAnalysisReportVersion,
  GapReportExportFile,
  GapReportExportFormat,
} from "@/lib/types/gap-report.types";
import type {
  IntegrationQualityRules,
  IntegrationRule,
  IntegrationRulesExportFile,
  IntegrationRulesExportFormat,
  IntegrationRulesVersion,
} from "@/lib/types/integration-quality-rules.types";

type BrechasVersionApi = {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string | null;
};

type CRUDMatrixApi = {
  id: string;
  proyecto_id: string;
  entregable_id: string;
  nombre: string;
  descripcion: string;
  comparaciones: CRUDComparison[];
  version_actual: string;
  historial_versiones: BrechasVersionApi[];
  created_at: string;
  updated_at: string;
};

type GapReportApi = {
  id: string;
  proyecto_id: string;
  entregable_id: string;
  nombre: string;
  descripcion: string;
  resumen_ejecutivo: string;
  brechas: Gap[];
  total_brechas: number;
  brechas_criticas: number;
  recomendaciones_prioritarias: string[];
  formato_objetivo: string[];
  version_actual: string;
  historial_versiones: BrechasVersionApi[];
  created_at: string;
  updated_at: string;
};

type IntegrationRulesApi = {
  id: string;
  proyecto_id: string;
  entregable_id: string;
  nombre: string;
  descripcion: string;
  resumen_tecnico: string;
  reglas: IntegrationRule[];
  criterios_aceptacion: string[];
  formato_objetivo: string[];
  version_actual: string;
  historial_versiones: BrechasVersionApi[];
  created_at: string;
  updated_at: string;
};

function mapVersionsToCrud(versions: BrechasVersionApi[]): CRUDMatrixVersion[] {
  return versions.map((version) => ({
    version: version.version,
    fecha: version.fecha,
    autor: version.autor,
    descripcion_cambio: version.descripcion_cambio ?? "",
  }));
}

function mapVersionsToGap(versions: BrechasVersionApi[]): GapAnalysisReportVersion[] {
  return versions.map((version) => ({
    version: version.version,
    fecha: version.fecha,
    autor: version.autor,
    descripcion_cambio: version.descripcion_cambio ?? "",
  }));
}

function mapVersionsToRules(versions: BrechasVersionApi[]): IntegrationRulesVersion[] {
  return versions.map((version) => ({
    version: version.version,
    fecha: version.fecha,
    autor: version.autor,
    descripcion_cambio: version.descripcion_cambio ?? "",
  }));
}

function mapCrudApiToUi(model: CRUDMatrixApi): CRUDMatrix {
  return {
    id: model.id,
    proyecto_id: model.proyecto_id,
    entregable_id: model.entregable_id,
    nombre: model.nombre,
    descripcion: model.descripcion,
    comparaciones: model.comparaciones,
    version_actual: model.version_actual,
    historial_versiones: mapVersionsToCrud(model.historial_versiones),
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

function mapGapApiToUi(model: GapReportApi): GapAnalysisReport {
  return {
    id: model.id,
    proyecto_id: model.proyecto_id,
    entregable_id: model.entregable_id,
    nombre: model.nombre,
    descripcion: model.descripcion,
    resumen_ejecutivo: model.resumen_ejecutivo,
    brechas: model.brechas,
    total_brechas: model.total_brechas,
    brechas_criticas: model.brechas_criticas,
    recomendaciones_prioritarias: model.recomendaciones_prioritarias,
    formato_objetivo: model.formato_objetivo as Array<"PDF" | "WORD" | "MARKDOWN">,
    version_actual: model.version_actual,
    historial_versiones: mapVersionsToGap(model.historial_versiones),
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

function mapRulesApiToUi(model: IntegrationRulesApi): IntegrationQualityRules {
  return {
    id: model.id,
    proyecto_id: model.proyecto_id,
    entregable_id: model.entregable_id,
    nombre: model.nombre,
    descripcion: model.descripcion,
    resumen_tecnico: model.resumen_tecnico,
    reglas: model.reglas,
    criterios_aceptacion: model.criterios_aceptacion,
    formato_objetivo: model.formato_objetivo as Array<"MARKDOWN" | "WORD" | "PDF">,
    version_actual: model.version_actual,
    historial_versiones: mapVersionsToRules(model.historial_versiones),
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

function getFilenameFromHeaders(
  headers: Record<string, string | undefined>,
  fallback: string
): string {
  const disposition = headers["content-disposition"];
  if (!disposition) return fallback;
  const match = disposition.match(/filename="([^"]+)"/i);
  if (!match || !match[1]) return fallback;
  return match[1];
}

async function exportBinary(
  url: string,
  format: string,
  fallbackName: string
): Promise<{ file_name: string; mime_type: string; content: Uint8Array }> {
  const response = await apiClient.post<ArrayBuffer>(
    url,
    { formato: format },
    { responseType: "arraybuffer" }
  );
  const mimeType =
    response.headers["content-type"] ?? "application/octet-stream";
  const fileName = getFilenameFromHeaders(
    response.headers as Record<string, string | undefined>,
    fallbackName
  );
  return {
    file_name: fileName,
    mime_type: mimeType,
    content: new Uint8Array(response.data),
  };
}

export const brechasApi = {
  async getCRUDMatrix(projectId: string, artifactId: string): Promise<CRUDMatrix> {
    const { data } = await apiClient.get<CRUDMatrixApi>(
      `/projects/${projectId}/artifacts/${artifactId}/crud-matrix`
    );
    return mapCrudApiToUi(data);
  },

  async saveCRUDMatrix(
    projectId: string,
    artifactId: string,
    matrix: CRUDMatrix,
    changeSummary?: string
  ): Promise<CRUDMatrix> {
    const { data } = await apiClient.put<CRUDMatrixApi>(
      `/projects/${projectId}/artifacts/${artifactId}/crud-matrix`,
      {
        nombre: matrix.nombre,
        descripcion: matrix.descripcion,
        comparaciones: matrix.comparaciones,
        change_summary: changeSummary ?? null,
      }
    );
    return mapCrudApiToUi(data);
  },

  async generateCRUDMatrix(projectId: string, artifactId: string): Promise<CRUDMatrix> {
    const { data } = await apiClient.post<CRUDMatrixApi>(
      `/projects/${projectId}/artifacts/${artifactId}/crud-matrix/generate`
    );
    return mapCrudApiToUi(data);
  },

  async getGapReport(projectId: string, artifactId: string): Promise<GapAnalysisReport> {
    const { data } = await apiClient.get<GapReportApi>(
      `/projects/${projectId}/artifacts/${artifactId}/gap-analysis-report`
    );
    return mapGapApiToUi(data);
  },

  async saveGapReport(
    projectId: string,
    artifactId: string,
    report: GapAnalysisReport,
    changeSummary?: string
  ): Promise<GapAnalysisReport> {
    const { data } = await apiClient.put<GapReportApi>(
      `/projects/${projectId}/artifacts/${artifactId}/gap-analysis-report`,
      {
        nombre: report.nombre,
        descripcion: report.descripcion,
        resumen_ejecutivo: report.resumen_ejecutivo,
        brechas: report.brechas,
        total_brechas: report.total_brechas,
        brechas_criticas: report.brechas_criticas,
        recomendaciones_prioritarias: report.recomendaciones_prioritarias,
        formato_objetivo: report.formato_objetivo,
        change_summary: changeSummary ?? null,
      }
    );
    return mapGapApiToUi(data);
  },

  async generateGapReport(projectId: string, artifactId: string): Promise<GapAnalysisReport> {
    const { data } = await apiClient.post<GapReportApi>(
      `/projects/${projectId}/artifacts/${artifactId}/gap-analysis-report/generate`
    );
    return mapGapApiToUi(data);
  },

  async exportGapReport(
    projectId: string,
    artifactId: string,
    format: GapReportExportFormat
  ): Promise<GapReportExportFile> {
    return exportBinary(
      `/projects/${projectId}/artifacts/${artifactId}/gap-analysis-report/export`,
      format,
      `gap-analysis-report-${projectId}.${format === "word" ? "docx" : format}`
    );
  },

  async getIntegrationRules(
    projectId: string,
    artifactId: string
  ): Promise<IntegrationQualityRules> {
    const { data } = await apiClient.get<IntegrationRulesApi>(
      `/projects/${projectId}/artifacts/${artifactId}/integration-quality-rules`
    );
    return mapRulesApiToUi(data);
  },

  async saveIntegrationRules(
    projectId: string,
    artifactId: string,
    document: IntegrationQualityRules,
    changeSummary?: string
  ): Promise<IntegrationQualityRules> {
    const { data } = await apiClient.put<IntegrationRulesApi>(
      `/projects/${projectId}/artifacts/${artifactId}/integration-quality-rules`,
      {
        nombre: document.nombre,
        descripcion: document.descripcion,
        resumen_tecnico: document.resumen_tecnico,
        reglas: document.reglas,
        criterios_aceptacion: document.criterios_aceptacion,
        formato_objetivo: document.formato_objetivo,
        change_summary: changeSummary ?? null,
      }
    );
    return mapRulesApiToUi(data);
  },

  async generateIntegrationRules(
    projectId: string,
    artifactId: string
  ): Promise<IntegrationQualityRules> {
    const { data } = await apiClient.post<IntegrationRulesApi>(
      `/projects/${projectId}/artifacts/${artifactId}/integration-quality-rules/generate`
    );
    return mapRulesApiToUi(data);
  },

  async exportIntegrationRules(
    projectId: string,
    artifactId: string,
    format: IntegrationRulesExportFormat
  ): Promise<IntegrationRulesExportFile> {
    return exportBinary(
      `/projects/${projectId}/artifacts/${artifactId}/integration-quality-rules/export`,
      format,
      `integration-quality-rules-${projectId}.${format === "word" ? "docx" : format}`
    );
  },
};

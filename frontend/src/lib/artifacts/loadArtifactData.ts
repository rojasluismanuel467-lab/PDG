import type { LegacyArtifact } from "@/lib/adapters/project.adapter";
import { brechasApi } from "@/lib/api/brechas";
import { businessGlossaryApi } from "@/lib/api/business-glossary";
import { conceptualModelApi } from "@/lib/api/conceptual-model";
import { dfdApi } from "@/lib/api/dfd";
import { inventoryMatrixApi } from "@/lib/api/inventory-matrix";
import { logicalModelApi } from "@/lib/api/logical-model";
import { raciApi } from "@/lib/api/raci";
import { mockGetArchitectureStandards } from "@/lib/mocks/architecture-standards.mock";
import { mockGetKPIDashboard } from "@/lib/mocks/kpi-dashboard.mock";
import { mockGetRoadmapImplementation } from "@/lib/mocks/roadmap-implementation.mock";
import type { CRUDMatrix } from "@/lib/types/crud-matrix.types";
import type { DiagramaFlujoDatos } from "@/lib/types/dfd.types";
import type { GlosarioNegocio } from "@/lib/types/glosario-negocio.types";
import type { IntegrationQualityRules } from "@/lib/types/integration-quality-rules.types";
import type { GapAnalysisReport } from "@/lib/types/gap-report.types";
import type { MatrizInventarioSistemas } from "@/lib/types/matriz-inventario.types";
import type { MatrizRaci } from "@/lib/types/matriz-raci.types";
import type { ModeloER } from "@/lib/types/modelo-er.types";
import type { ModeloLogico } from "@/lib/types/modelo-logico.types";
import type {
  ArchitectureStandards,
  ImplementationRoadmap,
  KPIDashboard,
} from "@/lib/types/roadmap.types";
import { detectArtifactEditor, type ArtifactEditor } from "./editor";

export type ArtifactEditorData = {
  tipoEditor: ArtifactEditor;
  modeloER: ModeloER | null;
  modeloLogico: ModeloLogico | null;
  dfd: DiagramaFlujoDatos | null;
  matrizInventario: MatrizInventarioSistemas | null;
  matrizRaci: MatrizRaci | null;
  glosarioNegocio: GlosarioNegocio | null;
  crudMatrix: CRUDMatrix | null;
  gapReport: GapAnalysisReport | null;
  integrationRules: IntegrationQualityRules | null;
  roadmapImplementation: ImplementationRoadmap | null;
  architectureStandards: ArchitectureStandards | null;
  kpiDashboard: KPIDashboard | null;
};

type LoadArtifactDataOptions = {
  projectId: string;
  artifact: LegacyArtifact;
  createMissingRaciMatrix?: boolean;
};

function emptyArtifactEditorData(tipoEditor: ArtifactEditor): ArtifactEditorData {
  return {
    tipoEditor,
    modeloER: null,
    modeloLogico: null,
    dfd: null,
    matrizInventario: null,
    matrizRaci: null,
    glosarioNegocio: null,
    crudMatrix: null,
    gapReport: null,
    integrationRules: null,
    roadmapImplementation: null,
    architectureStandards: null,
    kpiDashboard: null,
  };
}

export async function loadArtifactEditorData({
  projectId,
  artifact,
  createMissingRaciMatrix = false,
}: LoadArtifactDataOptions): Promise<ArtifactEditorData> {
  const tipoEditor = detectArtifactEditor(artifact);
  const baseData = emptyArtifactEditorData(tipoEditor);

  if (!tipoEditor) {
    return baseData;
  }

  switch (tipoEditor.tipo) {
    case "modelo-er":
      return {
        ...baseData,
        modeloER: await conceptualModelApi.getModel(projectId, artifact.id),
      };
    case "modelo-logico":
      return {
        ...baseData,
        modeloLogico: await logicalModelApi.getModel(projectId, artifact.id),
      };
    case "dfd":
      return {
        ...baseData,
        dfd: await dfdApi.getModel(projectId, artifact.id),
      };
    case "matriz-inventario":
      return {
        ...baseData,
        matrizInventario: await inventoryMatrixApi.getMatrix(projectId, artifact.id),
      };
    case "matriz-raci": {
      try {
        const matrices = await raciApi.listByProject(projectId);
        let matriz = matrices.find((item) => String(item.entregable_id) === String(artifact.id)) ?? null;

        if (!matriz && createMissingRaciMatrix) {
          matriz = await raciApi.createMatrix(projectId, artifact.id);
        }

        return {
          ...baseData,
          matrizRaci: matriz ? await raciApi.getGrid(matriz.id) : null,
        };
      } catch {
        return baseData;
      }
    }
    case "glosario-negocio":
      return {
        ...baseData,
        glosarioNegocio: await businessGlossaryApi.getGlossary(projectId, artifact.id),
      };
    case "crud-matrix":
      return {
        ...baseData,
        crudMatrix: await brechasApi.getCRUDMatrix(projectId, artifact.id),
      };
    case "gap-report":
      return {
        ...baseData,
        gapReport: await brechasApi.getGapReport(projectId, artifact.id),
      };
    case "integration-quality-rules":
      return {
        ...baseData,
        integrationRules: await brechasApi.getIntegrationRules(projectId, artifact.id),
      };
    case "roadmap-implementation":
      return {
        ...baseData,
        roadmapImplementation: await mockGetRoadmapImplementation(projectId),
      };
    case "architecture-standards":
      return {
        ...baseData,
        architectureStandards: await mockGetArchitectureStandards(projectId),
      };
    case "kpi-dashboard":
      return {
        ...baseData,
        kpiDashboard: await mockGetKPIDashboard(projectId),
      };
  }
}

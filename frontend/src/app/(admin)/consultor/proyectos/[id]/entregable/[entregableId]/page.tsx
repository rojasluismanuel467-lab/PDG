"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { projectsApi } from "@/lib/api/projects";
import { conceptualModelApi } from "@/lib/api/conceptual-model";
import { dfdApi } from "@/lib/api/dfd";
import { logicalModelApi } from "@/lib/api/logical-model";
import { brechasApi } from "@/lib/api/brechas";
import {
  toLegacyProjectDetail,
  type LegacyArtifact as Entregable,
} from "@/lib/adapters/project.adapter";
import { raciApi } from "@/lib/api/raci";
import { inventoryMatrixApi } from "@/lib/api/inventory-matrix";
import { businessGlossaryApi } from "@/lib/api/business-glossary";
import {
  aiApi,
  type AIGenerateParams,
  type AIInventorySuggestion,
  type AIConceptualSuggestion,
} from "@/lib/api/ai";
import type { SistemaInventario } from "@/lib/types/matriz-inventario.types";
import type { EntidadER, RelacionER, AtributoER, TipoDato } from "@/lib/types/modelo-er.types";
import {
  mockGuardarRoadmapImplementation,
} from "@/lib/mocks/roadmap-implementation.mock";
import {
  mockGuardarArchitectureStandards,
} from "@/lib/mocks/architecture-standards.mock";
import { mockGuardarKPIDashboard } from "@/lib/mocks/kpi-dashboard.mock";
import type { ModeloER } from "@/lib/types/modelo-er.types";
import type { ModeloLogico } from "@/lib/types/modelo-logico.types";
import type { DiagramaFlujoDatos } from "@/lib/types/dfd.types";
import type { MatrizInventarioSistemas } from "@/lib/types/matriz-inventario.types";
import type { MatrizRaci } from "@/lib/types/matriz-raci.types";
import type { GlosarioNegocio } from "@/lib/types/glosario-negocio.types";
import type { CRUDMatrix } from "@/lib/types/crud-matrix.types";
import type {
  GapAnalysisReport,
  GapReportExportFormat,
} from "@/lib/types/gap-report.types";
import type {
  IntegrationQualityRules,
  IntegrationRulesExportFormat,
} from "@/lib/types/integration-quality-rules.types";
import type {
  ImplementationRoadmap,
  ArchitectureStandards,
  KPIDashboard,
} from "@/lib/types/roadmap.types";
import { type ArtifactEditor as TipoEditor } from "@/lib/artifacts/editor";
import { loadArtifactEditorData } from "@/lib/artifacts/loadArtifactData";
import { useAuth } from "@/context/AuthContext";
import { ModeloEREditor } from "@/components/entregables/er";
import { ModeloLogicoEditor } from "@/components/entregables/logico";
import { DFDEditor } from "@/components/entregables/dfd";
import { MatrizInventarioEditor } from "@/components/entregables/matriz-inventario";
import AvatarAsistente from "@/components/ui/AvatarAsistente";

const MENSAJES_INVENTARIO = [
  "El Inventario de Sistemas cataloga todas las aplicaciones, bases de datos y plataformas del estado actual.",
  "Tip: clasifica cada sistema por criticidad. Los sistemas 'críticos' son los que no pueden tener downtime.",
  "¿El sistema está en estado 'legado'? Anótalo — será un candidato prioritario de reemplazo en el TO-BE.",
  "Registra el propietario técnico Y el de negocio. Sin ambos, los artefactos TO-BE pierden trazabilidad.",
  "Los datos que maneja cada sistema son clave para construir después el DFD y la Matriz RACI.",
  "Usa las notas para documentar deudas técnicas, EOL de licencias o riesgos de seguridad identificados.",
  "Un inventario completo evita sorpresas durante la transición — si no está aquí, no existe en el AS-IS.",
  "Puedes generar el inventario con IA a partir del Diagrama Conceptual AS-IS aprobado.",
];
import { MatrizRACIEditor } from "@/components/entregables/matriz-raci";
import { GlosarioNegocioEditor } from "@/components/entregables/glosario-negocio";
import { CRUDMatrixEditor } from "@/components/entregables/crud";
import { GapAnalysisReportEditor } from "@/components/entregables/gap-report";
import { IntegrationQualityRulesEditor } from "@/components/entregables/integration-quality-rules";
import {
  RoadmapImplementationEditor,
  ArchitectureStandardsEditor,
  KPIDashboardEditor,
} from "@/components/entregables/roadmap";

// ── AI response mappers ──────────────────────────────────────────────────────

const TIPO_SISTEMA_VALID = new Set([
  "aplicacion", "base_de_datos", "plataforma", "servicio_externo", "infraestructura",
]);
const CRITICIDAD_VALID = new Set(["critico", "alto", "medio", "bajo"]);
const ESTADO_VALID = new Set(["produccion", "desarrollo", "mantenimiento", "legado", "deprecado"]);

function mapAIInventoryToSistemas(
  suggestion: AIInventorySuggestion,
): SistemaInventario[] {
  return suggestion.sistemas.map((s) => ({
    id: s.id || crypto.randomUUID(),
    nombre: s.nombre,
    tipo: (TIPO_SISTEMA_VALID.has(s.tipo) ? s.tipo : "aplicacion") as SistemaInventario["tipo"],
    descripcion: s.descripcion,
    tecnologia: s.tecnologia ?? undefined,
    proveedor: s.proveedor ?? undefined,
    propietario_negocio: s.propietario_negocio ?? undefined,
    propietario_tecnico: undefined,
    criticidad: (s.criticidad && CRITICIDAD_VALID.has(s.criticidad)
      ? s.criticidad
      : undefined) as SistemaInventario["criticidad"],
    estado: (s.estado && ESTADO_VALID.has(s.estado)
      ? s.estado
      : undefined) as SistemaInventario["estado"],
    ambientes: [],
    datos_que_maneja: s.datos_que_maneja ?? [],
    areas_estrategicas: undefined,
    notas: s.razon_inclusion || undefined,
  }));
}

const TIPO_DATO_VALID = new Set([
  "VARCHAR", "INT", "BIGINT", "DECIMAL", "BOOLEAN",
  "DATE", "DATETIME", "TEXT", "BLOB", "UUID", "JSON",
]);

function mapAIConceptualToER(
  suggestion: AIConceptualSuggestion,
): { entidades: EntidadER[]; relaciones: RelacionER[] } {
  const entidades: EntidadER[] = suggestion.entidades.map((e, idx) => ({
    id: e.client_id || crypto.randomUUID(),
    nombre: e.nombre,
    descripcion: e.descripcion,
    posicion_x: (idx % 3) * 320 + 80,
    posicion_y: Math.floor(idx / 3) * 260 + 80,
    atributos: e.atributos.map((a): AtributoER => ({
      id: crypto.randomUUID(),
      nombre: a.nombre,
      tipo_dato: (TIPO_DATO_VALID.has(a.tipo_dato.toUpperCase())
        ? a.tipo_dato.toUpperCase()
        : "VARCHAR") as TipoDato,
      es_pk: a.es_clave,
      es_fk: false,
      es_nullable: !a.es_clave,
      descripcion: a.descripcion || undefined,
    })),
  }));

  const relaciones: RelacionER[] = suggestion.relaciones.map((r) => ({
    id: crypto.randomUUID(),
    nombre: r.etiqueta,
    entidad_origen_id: r.desde,
    entidad_destino_id: r.hacia,
    cardinalidad: r.cardinalidad,
    descripcion: r.descripcion || undefined,
  }));

  return { entidades, relaciones };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EntregablePage() {
  const { id, entregableId } = useParams<{ id: string; entregableId: string }>();
  const { user } = useAuth();

  // ── Estado base ──────────────────────────────────────────────────────
  const [entregable, setEntregable] = useState<Entregable | null>(null);
  const [proyectoNombre, setProyectoNombre] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tipoEditor, setTipoEditor] = useState<TipoEditor>(null);

  // ── Estado del Modelo ER (compartido para AS-IS y TO-BE) ────────────
  const [modeloER, setModeloER] = useState<ModeloER | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Estado del Modelo Lógico ────────────────────────────────────────
  const [modeloLogico, setModeloLogico] = useState<ModeloLogico | null>(null);
  const [isSavingLogico, setIsSavingLogico] = useState(false);

  // ── Estado del DFD ──────────────────────────────────────────────────
  const [dfd, setDfd] = useState<DiagramaFlujoDatos | null>(null);
  const [isSavingDFD, setIsSavingDFD] = useState(false);

  // ── Estado de la Matriz de Inventario ───────────────────────────────
  const [matrizInventario, setMatrizInventario] =
    useState<MatrizInventarioSistemas | null>(null);
  const [isSavingMatriz, setIsSavingMatriz] = useState(false);
  const [isGeneratingMatriz, setIsGeneratingMatriz] = useState(false);

  // ── Estado de la Matriz RACI ─────────────────────────────────────────
  const [matrizRaci, setMatrizRaci] = useState<MatrizRaci | null>(null);
  const [isSavingRaci, setIsSavingRaci] = useState(false);
  const [isGeneratingRaci, setIsGeneratingRaci] = useState(false);

  // ── Estado del Glosario de Negocio ───────────────────────────────────
  const [glosarioNegocio, setGlosarioNegocio] = useState<GlosarioNegocio | null>(null);
  const [isSavingGlosario, setIsSavingGlosario] = useState(false);
  const [isGeneratingGlosario, setIsGeneratingGlosario] = useState(false);

  const [crudMatrix, setCrudMatrix] = useState<CRUDMatrix | null>(null);
  const [isSavingCRUD, setIsSavingCRUD] = useState(false);
  const [isGeneratingCRUD, setIsGeneratingCRUD] = useState(false);
  const [gapReport, setGapReport] = useState<GapAnalysisReport | null>(null);
  const [isSavingGapReport, setIsSavingGapReport] = useState(false);
  const [isGeneratingGapReport, setIsGeneratingGapReport] = useState(false);
  const [integrationRules, setIntegrationRules] =
    useState<IntegrationQualityRules | null>(null);
  const [isSavingIntegrationRules, setIsSavingIntegrationRules] = useState(false);
  const [isGeneratingIntegrationRules, setIsGeneratingIntegrationRules] = useState(false);

  // ── Estado Roadmap (Implementación / Estándares / KPIs) ───────────────
  const [roadmapImplementation, setRoadmapImplementation] =
    useState<ImplementationRoadmap | null>(null);
  const [architectureStandards, setArchitectureStandards] =
    useState<ArchitectureStandards | null>(null);
  const [kpiDashboard, setKpiDashboard] = useState<KPIDashboard | null>(null);
  const [isSavingRoadmap, setIsSavingRoadmap] = useState(false);
  const [isSavingStandards, setIsSavingStandards] = useState(false);
  const [isSavingKpis, setIsSavingKpis] = useState(false);

  // ── Carga inicial ────────────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      try {
        let entregables: Entregable[] = [];
        let nombreProyecto = "";

        const proyectoReal = await projectsApi.getById(id);
        const proyectoAdaptado = toLegacyProjectDetail(proyectoReal);
        entregables = proyectoAdaptado.entregable_items.map((artifact) => ({
          ...artifact,
          id_proyecto: id,
        }));
        nombreProyecto = proyectoAdaptado.nombre;

        const ent = entregables.find((e) => e.id === entregableId);
        setEntregable(ent ?? null);
        setProyectoNombre(nombreProyecto);

        setTipoEditor(null);
        setModeloER(null);
        setModeloLogico(null);
        setDfd(null);
        setMatrizInventario(null);
        setMatrizRaci(null);
        setGlosarioNegocio(null);
        setCrudMatrix(null);
        setGapReport(null);
        setIntegrationRules(null);
        setRoadmapImplementation(null);
        setArchitectureStandards(null);
        setKpiDashboard(null);

        if (ent) {
          const data = await loadArtifactEditorData({
            projectId: id,
            artifact: ent,
            createMissingRaciMatrix: true,
          });

          setTipoEditor(data.tipoEditor);
          setModeloER(data.modeloER);
          setModeloLogico(data.modeloLogico);
          setDfd(data.dfd);
          setMatrizInventario(data.matrizInventario);
          setMatrizRaci(data.matrizRaci);
          setGlosarioNegocio(data.glosarioNegocio);
          setCrudMatrix(data.crudMatrix);
          setGapReport(data.gapReport);
          setIntegrationRules(data.integrationRules);
          setRoadmapImplementation(data.roadmapImplementation);
          setArchitectureStandards(data.architectureStandards);
          setKpiDashboard(data.kpiDashboard);
        }
      } catch (err) {
        console.error("Error cargando entregable:", err);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, [id, entregableId]);

  // ── Handlers del Modelo ER ───────────────────────────────────────────

  const handleSaveModeloER = useCallback(
    async (modelo: ModeloER): Promise<ModeloER> => {
      setIsSaving(true);
      try {
        const actualizado = await conceptualModelApi.saveModel(
          id,
          entregableId,
          modelo,
          "Manual update from conceptual diagram editor."
        );
        setModeloER(actualizado);
        return actualizado;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          alert("No tienes permisos para editar este entregable.");
          window.location.reload();
          return modelo;
        }
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [entregableId, id]
  );

  const handleGenerateIAModeloER = useCallback(
    async (params: AIGenerateParams) => {
      if (!modeloER) return;
      const artifactCode = entregable?.code?.startsWith("TOBE")
        ? "TOBE_CONCEPTUAL_DIAGRAM"
        : "ASIS_CONCEPTUAL_DIAGRAM";

      // En modo "complete", añade el contenido actual como contexto adicional.
      const enrichedParams = params.mode === "complete" && (
        modeloER.entidades.length > 0 || modeloER.relaciones.length > 0
      ) ? {
        ...params,
        contextText: [
          params.contextText,
          `\n--- CONTENIDO EXISTENTE (no eliminar, solo completar/mejorar) ---\n` +
          `Entidades actuales: ${modeloER.entidades.map(e => e.nombre).join(", ")}\n` +
          `Relaciones actuales: ${modeloER.relaciones.map(r => `${r.entidad_origen_id} → ${r.entidad_destino_id} (${r.nombre})`).join(", ")}`,
        ].filter(Boolean).join("\n"),
        consultantNote: [
          params.consultantNote,
          "IMPORTANTE: El consultor ya tiene contenido creado. Completa o mejora lo existente; NO elimines entidades ni relaciones que ya están definidas.",
        ].filter(Boolean).join(" "),
      } : params;

      const resp = artifactCode.startsWith("TOBE")
        ? await aiApi.generateTobe(id, artifactCode, enrichedParams)
        : await aiApi.generateAsis(id, artifactCode, enrichedParams);

      const { entidades, relaciones } = mapAIConceptualToER(
        resp.suggestion as AIConceptualSuggestion,
      );
      const newModelo = { ...modeloER, entidades, relaciones };
      setModeloER(newModelo);
      // Guarda inmediatamente — el auto-save no dispara porque hasChanges
      // queda en false tras la sincronización vía prop del editor.
      await handleSaveModeloER(newModelo);
    },
    [id, entregable?.code, modeloER, handleSaveModeloER],
  );

  const handleAddComment = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "entidad" | "relacion" | "general",
      contenido: string
    ) => {
      const created = await conceptualModelApi.createComment(id, entregableId, {
        targetType:
          referenciaTipo === "entidad"
            ? "entity"
            : referenciaTipo === "relacion"
              ? "relation"
              : "general",
        targetClientId: referenciaId,
        content: contenido,
      });
      return created;
    },
    [entregableId, id]
  );

  const handlePreviewVersion = useCallback(
    async (versionNumber: number) => {
      return conceptualModelApi.previewVersion(id, entregableId, versionNumber);
    },
    [entregableId, id]
  );

  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      const restored = await conceptualModelApi.restoreVersion(
        id,
        entregableId,
        versionNumber,
        `Restored from conceptual model version v${versionNumber}.`
      );
      setModeloER(restored);
      return restored;
    },
    [entregableId, id]
  );

  // ── Handlers del Modelo Lógico ───────────────────────────────────────
  const handleSaveModeloLogico = useCallback(
    async (modelo: ModeloLogico) => {
      setIsSavingLogico(true);
      try {
        const actualizado = await logicalModelApi.saveModel(id, entregableId, modelo);
        setModeloLogico(actualizado);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          alert("No tienes permisos para editar este entregable.");
          window.location.reload();
          return;
        }
        throw error;
      } finally {
        setIsSavingLogico(false);
      }
    },
    [id, entregableId]
  );

  const handleAddCommentModeloLogico = useCallback(
    async (targetType: "tabla" | "columna", targetId: string, content: string) => {
      await logicalModelApi.createComment(id, entregableId, {
        targetType,
        targetId,
        content,
      });
      const actualizado = await logicalModelApi.getModel(id, entregableId);
      setModeloLogico(actualizado);
    },
    [id, entregableId]
  );

  const handlePreviewVersionModeloLogico = useCallback(
    async (versionNumber: number) => {
      return logicalModelApi.previewVersion(id, entregableId, versionNumber);
    },
    [id, entregableId]
  );

  const handleRestoreVersionModeloLogico = useCallback(
    async (versionNumber: number) => {
      const actualizado = await logicalModelApi.restoreVersion(id, entregableId, versionNumber);
      setModeloLogico(actualizado);
    },
    [id, entregableId]
  );

  // ── Handlers del DFD ─────────────────────────────────────────────────

  const handleSaveDFD = useCallback(
    async (modelo: DiagramaFlujoDatos) => {
      setIsSavingDFD(true);
      try {
        const actualizado = await dfdApi.saveModel(
          id,
          entregableId,
          modelo,
          "Manual update from DFD editor."
        );
        setDfd(actualizado);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          alert("No tienes permisos para editar este entregable.");
          window.location.reload();
          return;
        }
        throw error;
      } finally {
        setIsSavingDFD(false);
      }
    },
    [id, entregableId]
  );

  const handleAddCommentDFD = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "nodo" | "flujo",
      contenido: string
    ) => {
      return dfdApi.createComment(id, entregableId, {
        referencia_id: referenciaId,
        referencia_tipo: referenciaTipo,
        contenido,
      });
    },
    [id, entregableId]
  );

  const handlePreviewVersionDFD = useCallback(
    async (versionNumber: number) => {
      if (!dfd) {
        throw new Error("DFD_NOT_LOADED");
      }
      return dfdApi.previewVersion(id, entregableId, versionNumber, dfd);
    },
    [dfd, id, entregableId]
  );

  const handleRestoreVersionDFD = useCallback(
    async (versionNumber: number) => {
      const restored = await dfdApi.restoreVersion(
        id,
        entregableId,
        versionNumber,
        `Restored from DFD version v${versionNumber}.`
      );
      setDfd(restored);
      return restored;
    },
    [id, entregableId]
  );

  // ── Handlers de la Matriz de Inventario ─────────────────────────────

  const handleSaveMatrizInventario = useCallback(
    async (matriz: MatrizInventarioSistemas) => {
      setIsSavingMatriz(true);
      try {
        const actualizado = await inventoryMatrixApi.saveMatrix(
          id,
          entregableId,
          matriz,
        );
        setMatrizInventario(actualizado);
      } finally {
        setIsSavingMatriz(false);
      }
    },
    [id, entregableId],
  );

  const handleGenerateIAMatrizInventario = useCallback(
    async (params: AIGenerateParams) => {
      if (!matrizInventario) return;
      setIsGeneratingMatriz(true);
      try {
        const artifactCode = entregable?.code?.startsWith("TOBE")
          ? "TOBE_SYSTEM_INVENTORY_MATRIX"
          : "ASIS_SYSTEM_INVENTORY_MATRIX";

        const enrichedParams = params.mode === "complete" &&
          matrizInventario.sistemas.length > 0 ? {
          ...params,
          contextText: [
            params.contextText,
            `\n--- SISTEMAS YA REGISTRADOS (no eliminar, solo completar) ---\n` +
            matrizInventario.sistemas.map(s => `- ${s.nombre} (${s.tipo}): ${s.descripcion ?? ""}`).join("\n"),
          ].filter(Boolean).join("\n"),
          consultantNote: [
            params.consultantNote,
            "IMPORTANTE: El consultor ya tiene sistemas registrados. Añade sistemas faltantes; NO elimines los existentes.",
          ].filter(Boolean).join(" "),
        } : params;

        const resp = artifactCode.startsWith("TOBE")
          ? await aiApi.generateTobe(id, artifactCode, enrichedParams)
          : await aiApi.generateAsis(id, artifactCode, enrichedParams);

        const sistemas = mapAIInventoryToSistemas(
          resp.suggestion as AIInventorySuggestion,
        );
        const newMatriz = { ...matrizInventario, sistemas };
        setMatrizInventario(newMatriz);
        // Guarda inmediatamente igual que en el diagrama conceptual.
        await handleSaveMatrizInventario(newMatriz);
      } finally {
        setIsGeneratingMatriz(false);
      }
    },
    [id, entregable?.code, matrizInventario, handleSaveMatrizInventario],
  );

  const handleAddCommentMatrizInventario = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "sistema" | "general" | "celda",
      contenido: string,
      campo?: string | null,
    ) => {
      const actualizado = await inventoryMatrixApi.addComment(id, entregableId, {
        referencia_id: referenciaId,
        referencia_tipo: referenciaTipo,
        contenido,
        ...(campo ? { campo } : {}),
      });
      setMatrizInventario(actualizado);
    },
    [id, entregableId],
  );

  // ── Handlers de la Matriz RACI ───────────────────────────────────────

  const handleSaveMatrizRaci = useCallback(
    async (matriz: MatrizRaci) => {
      setIsSavingRaci(true);
      try {
        // Guardamos todo el payload en masa al backend.
        const actualizado = await raciApi.saveFullMatrix(matriz);
        setMatrizRaci(actualizado);
      } finally {
        setIsSavingRaci(false);
      }
    },
    []
  );

  const handleGenerateIAMatrizRaci = useCallback(async () => {
    // Por ahora el backend no tiene endpoint de generación IA para RACI.
    // Podríamos implementarlo en el futuro o mostrar una alerta.
    alert("Funcionalidad de generación IA real para RACI está en desarrollo.");
  }, []);

  const handleAddCommentMatrizRaci = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "actividad" | "rol" | "celda" | "general",
      contenido: string,
      rolId?: string | null
    ) => {
      const matrixId = matrizRaci?.id;
      if (!matrixId) return;

      await raciApi.addComment(matrixId, {
        referencia_id: referenciaId,
        rol_id: rolId ?? null,
        referencia_tipo: referenciaTipo,
        autor_id: user?.id ?? "usr-001",
        autor_nombre: user?.nombre ?? "Usuario",
        autor_perfil: user?.perfil ?? "CONSULTOR",
        contenido,
        estado: "abierto",
      });

      const actualizado = await raciApi.getGrid(matrixId);
      setMatrizRaci(actualizado);
    },
    [matrizRaci, user]
  );

  // ── Handlers del Glosario de Negocio ────────────────────────────────

  const handleSaveGlosario = useCallback(
    async (glosario: GlosarioNegocio) => {
      setIsSavingGlosario(true);
      try {
        const actualizado = await businessGlossaryApi.saveGlossary(
          id,
          entregableId,
          glosario,
        );
        setGlosarioNegocio(actualizado);
      } finally {
        setIsSavingGlosario(false);
      }
    },
    [id, entregableId],
  );

  const handleGenerateIAGlosario = useCallback(async () => {
    setIsGeneratingGlosario(true);
    try {
      const generado = await businessGlossaryApi.generateGlossary(id, entregableId);
      setGlosarioNegocio(generado);
    } finally {
      setIsGeneratingGlosario(false);
    }
  }, [id, entregableId]);

  const handleAddCommentGlosario = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "termino" | "general",
      contenido: string,
    ) => {
      const actualizado = await businessGlossaryApi.addComment(id, entregableId, {
        referencia_id: referenciaId,
        referencia_tipo: referenciaTipo,
        contenido,
      });
      setGlosarioNegocio(actualizado);
    },
    [id, entregableId],
  );

  const handleSaveCRUD = useCallback(async () => {
    if (!crudMatrix) return;
    setIsSavingCRUD(true);
    try {
      const actualizado = await brechasApi.saveCRUDMatrix(id, entregableId, crudMatrix);
      setCrudMatrix(actualizado);
    } finally {
      setIsSavingCRUD(false);
    }
  }, [crudMatrix, entregableId, id]);

  const handleGenerateIACRUD = useCallback(async () => {
    setIsGeneratingCRUD(true);
    try {
      const generado = await brechasApi.generateCRUDMatrix(id, entregableId);
      setCrudMatrix(generado);
    } finally {
      setIsGeneratingCRUD(false);
    }
  }, [entregableId, id]);

  const handleSaveGapReport = useCallback(async () => {
    if (!gapReport) return;
    setIsSavingGapReport(true);
    try {
      const actualizado = await brechasApi.saveGapReport(id, entregableId, gapReport);
      setGapReport(actualizado);
    } finally {
      setIsSavingGapReport(false);
    }
  }, [entregableId, gapReport, id]);

  const handleGenerateIAGapReport = useCallback(async () => {
    setIsGeneratingGapReport(true);
    try {
      const generado = await brechasApi.generateGapReport(id, entregableId);
      setGapReport(generado);
    } finally {
      setIsGeneratingGapReport(false);
    }
  }, [entregableId, id]);

  const handleExportGapReport = useCallback(
    async (formato: GapReportExportFormat) => {
      if (!gapReport) {
        throw new Error("REPORTE_NO_DISPONIBLE");
      }
      return brechasApi.exportGapReport(id, entregableId, formato);
    },
    [entregableId, gapReport, id]
  );

  const handleSaveIntegrationRules = useCallback(async () => {
    if (!integrationRules) return;
    setIsSavingIntegrationRules(true);
    try {
      const actualizado = await brechasApi.saveIntegrationRules(
        id,
        entregableId,
        integrationRules
      );
      setIntegrationRules(actualizado);
    } finally {
      setIsSavingIntegrationRules(false);
    }
  }, [entregableId, id, integrationRules]);

  const handleGenerateIAIntegrationRules = useCallback(async () => {
    setIsGeneratingIntegrationRules(true);
    try {
      const generado = await brechasApi.generateIntegrationRules(id, entregableId);
      setIntegrationRules(generado);
    } finally {
      setIsGeneratingIntegrationRules(false);
    }
  }, [entregableId, id]);

  const handleExportIntegrationRules = useCallback(
    async (formato: IntegrationRulesExportFormat) => {
      if (!integrationRules) {
        throw new Error("REGLAS_NO_DISPONIBLES");
      }
      return brechasApi.exportIntegrationRules(id, entregableId, formato);
    },
    [entregableId, id, integrationRules]
  );

  const handleSaveRoadmapImplementation = useCallback(async () => {
    if (!roadmapImplementation) return;
    setIsSavingRoadmap(true);
    try {
      const actualizado = await mockGuardarRoadmapImplementation(id, roadmapImplementation);
      setRoadmapImplementation(actualizado);
    } finally {
      setIsSavingRoadmap(false);
    }
  }, [id, roadmapImplementation]);

  const handleSaveArchitectureStandards = useCallback(async () => {
    if (!architectureStandards) return;
    setIsSavingStandards(true);
    try {
      const actualizado = await mockGuardarArchitectureStandards(id, architectureStandards);
      setArchitectureStandards(actualizado);
    } finally {
      setIsSavingStandards(false);
    }
  }, [id, architectureStandards]);

  const handleSaveKPIDashboard = useCallback(async () => {
    if (!kpiDashboard) return;
    setIsSavingKpis(true);
    try {
      const actualizado = await mockGuardarKPIDashboard(id, kpiDashboard);
      setKpiDashboard(actualizado);
    } finally {
      setIsSavingKpis(false);
    }
  }, [id, kpiDashboard]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-[#28b8d5]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-gray-500 dark:text-white/40">Cargando entregable...</span>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────
  if (!entregable) {
    return (
      <div className="p-6">
        <p className="text-red-500 mb-4">Entregable no encontrado.</p>
        <Link
          href={`/consultor/proyectos/${id}`}
          className="text-[#28b8d5] hover:underline"
        >
          ← Volver al proyecto
        </Link>
      </div>
    );
  }

  // ── Helper: Badge de etapa ───────────────────────────────────────────
  const etapaBadge = () => {
    const etapa = entregable.etapa;
    const colors: Record<string, string> = {
      AS_IS: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
      TO_BE: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
      BRECHAS: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
      ROADMAP: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    };
    return (
      <span className={`ml-2 text-[9px] px-2 py-0.5 rounded-full font-semibold ${colors[etapa] || "bg-gray-100 text-gray-500"}`}>
        {etapa.replace("_", "-")}
      </span>
    );
  };

  const estadoBadge = () => {
    const estado = entregable.estado;
    const colors: Record<string, string> = {
      APROBADO: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
      EN_PROGRESO: "bg-[#28b8d5]/10 text-[#28b8d5]",
      NO_APLICA: "bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-white/40",
      PENDIENTE: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      EN_REVISION: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    };
    return (
      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${colors[estado] || "bg-gray-100 text-gray-500"}`}>
        {estado.replace("_", " ")}
      </span>
    );
  };

  // ── Breadcrumb compartido ────────────────────────────────────────────
  const Breadcrumb = () => (
    <div className="px-5 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111]">
      <nav className="text-xs text-gray-500 dark:text-white/40 flex items-center gap-1.5 flex-wrap">
        <Link href="/consultor/proyectos" className="hover:text-[#28b8d5] transition-colors">
          Proyectos
        </Link>
        <span className="text-gray-300 dark:text-white/20">→</span>
        <Link
          href={`/consultor/proyectos/${id}`}
          className="hover:text-[#28b8d5] transition-colors truncate max-w-[180px]"
        >
          {proyectoNombre}
        </Link>
        <span className="text-gray-300 dark:text-white/20">→</span>
        <span className="text-gray-800 dark:text-white/80 font-medium truncate max-w-[200px]">
          {entregable.nombre}
        </span>
        {etapaBadge()}
        {estadoBadge()}
      </nav>
    </div>
  );

  // ── Render: Modelo ER (AS-IS o TO-BE) ────────────────────────────────
  if (tipoEditor?.tipo === "modelo-er" && modeloER) {
    const esSoloLecturaPorPermiso =
      user?.perfil === "EMPRESA" || (entregable.effective_permission_level ?? 0) < 3;
    const esSoloLectura = entregable.estado === "APROBADO" || esSoloLecturaPorPermiso;
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <ModeloEREditor
            modelo={modeloER}
            onSave={handleSaveModeloER}
            isSaving={isSaving}
            isGenerating={false}
            allowGenerate={!esSoloLectura}
            allowComments={!esSoloLectura}
            readOnly={esSoloLectura}
            onGenerateIA={!esSoloLectura ? handleGenerateIAModeloER : undefined}
            onAddComment={handleAddComment}
            onPreviewVersion={handlePreviewVersion}
            onRestoreVersion={handleRestoreVersion}
            artifactCode={
              !esSoloLectura
                ? entregable.code?.startsWith("TOBE")
                  ? "TOBE_CONCEPTUAL_DIAGRAM"
                  : "ASIS_CONCEPTUAL_DIAGRAM"
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  // ── Render: Modelo Lógico TO-BE ──────────────────────────────────────
  if (tipoEditor?.tipo === "modelo-logico" && modeloLogico) {
    const esSoloLecturaPorPermiso =
      user?.perfil === "EMPRESA" || (entregable.effective_permission_level ?? 0) < 3;
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden p-4">
          <ModeloLogicoEditor
            modelo={modeloLogico}
            onSave={handleSaveModeloLogico}
            onAddComment={handleAddCommentModeloLogico}
            onPreviewVersion={handlePreviewVersionModeloLogico}
            onRestoreVersion={handleRestoreVersionModeloLogico}
            isSaving={isSavingLogico}
            readOnly={entregable.estado === "APROBADO" || esSoloLecturaPorPermiso}
          />
        </div>
      </div>
    );
  }

  // ── Render: DFD (AS-IS o TO-BE) ──────────────────────────────────────
  if (tipoEditor?.tipo === "dfd" && dfd) {
    const esSoloLecturaPorPermiso =
      user?.perfil === "EMPRESA" || (entregable.effective_permission_level ?? 0) < 3;
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <DFDEditor
            dfd={dfd}
            onSave={handleSaveDFD}
            onAddComment={handleAddCommentDFD}
            onPreviewVersion={handlePreviewVersionDFD}
            onRestoreVersion={handleRestoreVersionDFD}
            isSaving={isSavingDFD}
            readOnly={entregable.estado === "APROBADO" || esSoloLecturaPorPermiso}
          />
        </div>
      </div>
    );
  }

  // ── Render: Matriz de Inventario de Sistemas ─────────────────────────
  if (tipoEditor?.tipo === "matriz-inventario" && matrizInventario) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <MatrizInventarioEditor
            matriz={matrizInventario}
            onSave={handleSaveMatrizInventario}
            onGenerateIA={handleGenerateIAMatrizInventario}
            onAddComment={handleAddCommentMatrizInventario}
            isSaving={isSavingMatriz}
            isGenerating={isGeneratingMatriz}
            readOnly={entregable.estado === "APROBADO"}
            artifactCode={
              entregable.estado !== "APROBADO"
                ? entregable.code?.startsWith("TOBE")
                  ? "TOBE_SYSTEM_INVENTORY_MATRIX"
                  : "ASIS_SYSTEM_INVENTORY_MATRIX"
                : undefined
            }
          />
        </div>
        <AvatarAsistente mensajes={MENSAJES_INVENTARIO} />
      </div>
    );
  }

  // ── Render: Matriz RACI / Roles ──────────────────────────────────────
  if (tipoEditor?.tipo === "matriz-raci" && matrizRaci) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <MatrizRACIEditor
            matriz={matrizRaci}
            onSave={handleSaveMatrizRaci}
            onGenerateIA={handleGenerateIAMatrizRaci}
            onAddComment={handleAddCommentMatrizRaci}
            isSaving={isSavingRaci}
            isGenerating={isGeneratingRaci}
            readOnly={entregable.estado === "APROBADO"}
            artifactCode={entregable.code}
            projectId={id}
          />
        </div>
      </div>
    );
  }

  // ── Render: Glosario de Negocio TO-BE ───────────────────────────────
  if (tipoEditor?.tipo === "glosario-negocio" && glosarioNegocio) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <GlosarioNegocioEditor
            glosario={glosarioNegocio}
            onSave={handleSaveGlosario}
            onGenerateIA={handleGenerateIAGlosario}
            onAddComment={handleAddCommentGlosario}
            isSaving={isSavingGlosario}
            isGenerating={isGeneratingGlosario}
            readOnly={entregable.estado === "APROBADO"}
          />
        </div>
      </div>
    );
  }

  if (tipoEditor?.tipo === "crud-matrix" && crudMatrix) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-auto">
          <CRUDMatrixEditor
            matriz={crudMatrix}
            onMatrizChange={setCrudMatrix}
            onSave={handleSaveCRUD}
            onGenerateIA={handleGenerateIACRUD}
            isSaving={isSavingCRUD}
            isGenerating={isGeneratingCRUD}
            readOnly={entregable.estado === "APROBADO"}
          />
        </div>
      </div>
    );
  }

  if (tipoEditor?.tipo === "gap-report" && gapReport) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-auto">
          <GapAnalysisReportEditor
            reporte={gapReport}
            onReporteChange={setGapReport}
            onSave={handleSaveGapReport}
            onGenerateIA={handleGenerateIAGapReport}
            onExport={handleExportGapReport}
            isSaving={isSavingGapReport}
            isGenerating={isGeneratingGapReport}
            readOnly={entregable.estado === "APROBADO"}
          />
        </div>
      </div>
    );
  }

  if (tipoEditor?.tipo === "integration-quality-rules" && integrationRules) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-auto">
          <IntegrationQualityRulesEditor
            documento={integrationRules}
            onDocumentoChange={setIntegrationRules}
            onSave={handleSaveIntegrationRules}
            onGenerateIA={handleGenerateIAIntegrationRules}
            onExport={handleExportIntegrationRules}
            isSaving={isSavingIntegrationRules}
            isGenerating={isGeneratingIntegrationRules}
            readOnly={entregable.estado === "APROBADO"}
          />
        </div>
      </div>
    );
  }

  if (tipoEditor?.tipo === "roadmap-implementation" && roadmapImplementation) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <RoadmapImplementationEditor
            roadmap={roadmapImplementation}
            onRoadmapChange={setRoadmapImplementation}
            onSave={handleSaveRoadmapImplementation}
            isSaving={isSavingRoadmap}
            readOnly={entregable.estado === "APROBADO"}
          />
        </div>
      </div>
    );
  }

  if (tipoEditor?.tipo === "architecture-standards" && architectureStandards) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <ArchitectureStandardsEditor
            standardsDoc={architectureStandards}
            onStandardsChange={setArchitectureStandards}
            onSave={handleSaveArchitectureStandards}
            isSaving={isSavingStandards}
            readOnly={entregable.estado === "APROBADO"}
          />
        </div>
      </div>
    );
  }

  if (tipoEditor?.tipo === "kpi-dashboard" && kpiDashboard) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <KPIDashboardEditor
            dashboard={kpiDashboard}
            onDashboardChange={setKpiDashboard}
            onSave={handleSaveKPIDashboard}
            isSaving={isSavingKpis}
            readOnly={entregable.estado === "APROBADO"}
          />
        </div>
      </div>
    );
  }

  const missingEditorData =
    (tipoEditor?.tipo === "modelo-er" && !modeloER) ||
    (tipoEditor?.tipo === "modelo-logico" && !modeloLogico) ||
    (tipoEditor?.tipo === "dfd" && !dfd) ||
    (tipoEditor?.tipo === "matriz-inventario" && !matrizInventario) ||
    (tipoEditor?.tipo === "matriz-raci" && !matrizRaci) ||
    (tipoEditor?.tipo === "glosario-negocio" && !glosarioNegocio) ||
    (tipoEditor?.tipo === "crud-matrix" && !crudMatrix) ||
    (tipoEditor?.tipo === "gap-report" && !gapReport) ||
    (tipoEditor?.tipo === "integration-quality-rules" && !integrationRules) ||
    (tipoEditor?.tipo === "roadmap-implementation" && !roadmapImplementation) ||
    (tipoEditor?.tipo === "architecture-standards" && !architectureStandards) ||
    (tipoEditor?.tipo === "kpi-dashboard" && !kpiDashboard);

  if (tipoEditor && missingEditorData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Breadcrumb />
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 p-6 bg-red-50 dark:bg-red-500/10 mt-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
            No se pudo cargar {entregable.nombre}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400/70 mb-4">
            Verifica que el servidor esté disponible e intenta de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Entregable genérico (placeholder para otros tipos) ──────
  return (
    <div className="p-6 max-w-3xl">
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex gap-2 flex-wrap">
        <Link href="/consultor/proyectos" className="hover:underline">
          Proyectos
        </Link>
        <span>→</span>
        <Link
          href={`/consultor/proyectos/${id}`}
          className="hover:underline truncate max-w-[200px]"
        >
          {proyectoNombre}
        </Link>
        <span>→</span>
        <span className="text-gray-900 dark:text-white truncate max-w-[200px]">
          {entregable.nombre}
        </span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {entregable.nombre}
      </h1>
      <p className="text-sm text-gray-500 mb-1">
        Etapa: <span className="font-medium">{entregable.etapa}</span>
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Estado: <span className="font-medium">{entregable.estado}</span>
      </p>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          El editor de este entregable se implementará en una iteración posterior.
        </p>
      </div>

      <Link
        href={`/consultor/proyectos/${id}`}
        className="text-[#28b8d5] hover:underline text-sm"
      >
        ← Volver al proyecto
      </Link>
    </div>
  );
}

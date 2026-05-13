"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api/projects";
import { brechasApi } from "@/lib/api/brechas";
import { toLegacyArtifact } from "@/lib/adapters/project.adapter";
import {
  type ArtifactEditor as TipoEditor,
} from "@/lib/artifacts/editor";
import { loadArtifactEditorData } from "@/lib/artifacts/loadArtifactData";
import {
  type Entregable,
  type EstadoEntregable,
} from "@/lib/mocks/entregables.mock";
import {
  mockGetContenidoEntregable,
  type ContenidoEntregableEmpresa,
  type VisualizacionEntregable,
} from "@/lib/mocks/entregable-contenido.mock";
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
import { ModeloEREditor } from "@/components/entregables/er";
import { ModeloLogicoEditor } from "@/components/entregables/logico";
import { DFDEditor } from "@/components/entregables/dfd";
import { MatrizInventarioEditor } from "@/components/entregables/matriz-inventario";
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
import ComponentCard from "@/components/common/ComponentCard";
import { MaturityEmpresaReadOnlyView } from "@/components/maturity/MaturityEmpresaReadOnlyView";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Tipos locales (se alinearán con el backend) ─────────────────────────────
// En producción: POST /api/v1/proyectos/{id}/entregables/{entregableId}/comentarios
// Body: { contenido: string }
// Response: { id, autor_id, autor_nombre, autor_perfil, contenido, fecha_creacion }
type ComentarioLocal = {
  id: string;
  autor: string;
  perfil: "EMPRESA" | "CONSULTOR";
  contenido: string;
  fecha: string;
};

// En producción: PATCH /api/v1/proyectos/{id}/entregables/{entregableId}/decision-empresa
// Body: { decision: "APROBADO" | "RECHAZADO", motivo?: string }
type DecisionEmpresa = "APROBADO" | "RECHAZADO" | null;

interface EntregableDetalleEmpresaProps {
  entregableId: string;
  projectId: string;
}

const noopAsync = async () => {};

const ESTADO_BADGE: Record<EstadoEntregable, { bg: string; text: string; label: string }> = {
  EN_PROGRESO:                  { bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-800 dark:text-blue-300",   label: "En Progreso" },
  PENDIENTE:                    { bg: "bg-gray-100 dark:bg-white/[0.06]",  text: "text-gray-700 dark:text-white/60",   label: "Pendiente" },
  PENDIENTE_APROBACION_EMPRESA: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", label: "Pend. tu aprobación" },
  APROBADO:                     { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-300", label: "Aprobado" },
  NO_APLICA:                    { bg: "bg-gray-100 dark:bg-white/[0.06]",  text: "text-gray-500 dark:text-white/40",   label: "No Aplica" },
};

// ─── Renderizador de visualizaciones ─────────────────────────────────────────

const VisualizacionItem: React.FC<{ viz: VisualizacionEntregable }> = ({ viz }) => {
  if (viz.tipo === "metricas") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30 mb-3">
          {viz.titulo}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {viz.items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.07] p-3 text-center"
            >
              <p className="text-lg font-bold text-gray-900 dark:text-white">{item.valor}</p>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viz.tipo === "tabla") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30 mb-3">
          {viz.titulo}
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/[0.07]">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-white/[0.04]">
                {viz.columnas.map((col) => (
                  <TableCell
                    key={col}
                    isHeader
                    className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-white/50 whitespace-nowrap"
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {viz.filas.map((fila, i) => (
                <TableRow
                  key={i}
                  className="border-t border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  {fila.map((celda, j) => (
                    <TableCell
                      key={j}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap"
                    >
                      {celda}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // lista
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30 mb-3">
        {viz.titulo}
      </p>
      <ul className="space-y-1.5">
        {viz.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#28b8d5] shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ContenidoEntregableViewer: React.FC<{ contenido: ContenidoEntregableEmpresa }> = ({
  contenido,
}) => (
  <div className="space-y-4">
    {/* Resumen ejecutivo */}
    <ComponentCard title="Resumen ejecutivo" desc={contenido.resumen_ejecutivo}>
      <div className="space-y-4">
        {contenido.secciones.map((sec) => (
          <div key={sec.titulo}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30 mb-1">
              {sec.titulo}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{sec.detalle}</p>
          </div>
        ))}
      </div>
    </ComponentCard>

    {/* Visualizaciones */}
    {contenido.visualizaciones.length > 0 && (
      <ComponentCard title="Datos del entregable">
        <div className="space-y-6">
          {contenido.visualizaciones.map((viz, i) => (
            <VisualizacionItem key={i} viz={viz} />
          ))}
        </div>
      </ComponentCard>
    )}

    <p className="text-xs text-right text-gray-400 dark:text-white/25">
      Última actualización:{" "}
      {new Date(contenido.ultima_actualizacion).toLocaleDateString("es-ES", {
        dateStyle: "medium",
      })}
    </p>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

export const EntregableDetalleEmpresa: React.FC<EntregableDetalleEmpresaProps> = ({
  entregableId,
  projectId,
}) => {
  const [entregable, setEntregable] = useState<Entregable | null>(null);
  const [contenido, setContenido] = useState<ContenidoEntregableEmpresa | null>(null);
  const [esCuestionarioMadurez, setEsCuestionarioMadurez] = useState(false);
  const [tipoEditor, setTipoEditor] = useState<TipoEditor>(null);
  const [modeloER, setModeloER] = useState<ModeloER | null>(null);
  const [modeloLogico, setModeloLogico] = useState<ModeloLogico | null>(null);
  const [dfd, setDfd] = useState<DiagramaFlujoDatos | null>(null);
  const [matrizInventario, setMatrizInventario] =
    useState<MatrizInventarioSistemas | null>(null);
  const [matrizRaci, setMatrizRaci] = useState<MatrizRaci | null>(null);
  const [glosarioNegocio, setGlosarioNegocio] = useState<GlosarioNegocio | null>(null);
  const [crudMatrix, setCrudMatrix] = useState<CRUDMatrix | null>(null);
  const [gapReport, setGapReport] = useState<GapAnalysisReport | null>(null);
  const [integrationRules, setIntegrationRules] =
    useState<IntegrationQualityRules | null>(null);
  const [roadmapImplementation, setRoadmapImplementation] =
    useState<ImplementationRoadmap | null>(null);
  const [architectureStandards, setArchitectureStandards] =
    useState<ArchitectureStandards | null>(null);
  const [kpiDashboard, setKpiDashboard] = useState<KPIDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState<ComentarioLocal[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mostrarFormComentario, setMostrarFormComentario] = useState(false);
  const [decision, setDecision] = useState<DecisionEmpresa>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [mostrarMotivoRechazo, setMostrarMotivoRechazo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const artifacts = await projectsApi.listArtifacts(projectId);
        const artifact = artifacts.find((item) => item.id === entregableId);
        if (!artifact) {
          setEntregable(null);
          return;
        }

        const ent = {
          ...toLegacyArtifact(artifact),
          id_proyecto: projectId,
        } satisfies Entregable;
        setEntregable(ent);
        setContenido(null);
        setEsCuestionarioMadurez(false);
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

        const tieneContenido = ent.estado !== "PENDIENTE" && ent.estado !== "NO_APLICA";
        if (!tieneContenido) return;

        if (ent.nombre === "Cuestionario de Madurez") {
          setEsCuestionarioMadurez(true);
          return;
        }

        const data = await loadArtifactEditorData({
          projectId,
          artifact: ent,
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

        if (!data.tipoEditor) {
          const c = await mockGetContenidoEntregable(ent);
          setContenido(c);
        }
      } catch {
        // Editor data unavailable (e.g. model not yet created) — keep entregable
        // state so approve/reject buttons remain accessible.
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [projectId, entregableId]);

  const handleAgregarComentario = () => {
    if (!nuevoComentario.trim()) return;
    // En producción: POST /api/v1/proyectos/{projectId}/entregables/{entregableId}/comentarios
    const nuevo: ComentarioLocal = {
      id: `com-${Date.now()}`,
      autor: "Representante Empresa",
      perfil: "EMPRESA",
      contenido: nuevoComentario.trim(),
      fecha: new Date().toISOString(),
    };
    setComentarios((prev) => [...prev, nuevo]);
    setNuevoComentario("");
    setMostrarFormComentario(false);
  };

  const handleAprobar = async () => {
    if (!entregable) return;
    setGuardando(true);
    try {
      const updatedArtifact = await projectsApi.reviewArtifactCompany(projectId, entregable.id, {
        approved: true,
      });
      const actualizado = {
        ...toLegacyArtifact(updatedArtifact),
        id_proyecto: projectId,
      } satisfies Entregable;
      setEntregable(actualizado);
      setDecision("APROBADO");
    } finally {
      setGuardando(false);
    }
  };

  const handleRechazar = async () => {
    if (!entregable || !motivoRechazo.trim()) return;
    setGuardando(true);
    try {
      const updatedArtifact = await projectsApi.reviewArtifactCompany(projectId, entregable.id, {
        approved: false,
        reason: motivoRechazo.trim(),
      });
      const actualizado = {
        ...toLegacyArtifact(updatedArtifact),
        id_proyecto: projectId,
      } satisfies Entregable;
      setEntregable(actualizado);
      setDecision("RECHAZADO");
      const comentarioRechazo: ComentarioLocal = {
        id: `com-${Date.now()}`,
        autor: "Representante Empresa",
        perfil: "EMPRESA",
        contenido: `[Rechazo] ${motivoRechazo.trim()}`,
        fecha: new Date().toISOString(),
      };
      setComentarios((prev) => [...prev, comentarioRechazo]);
      setMostrarMotivoRechazo(false);
      setMotivoRechazo("");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-24 rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
      </div>
    );
  }

  if (!entregable) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Entregable no encontrado.</p>
        <Link href={`/empresa/proyectos/${projectId}`} className="text-[#28b8d5] hover:underline text-sm">
          ← Volver al proyecto
        </Link>
      </div>
    );
  }

  const badge = ESTADO_BADGE[entregable.estado] ?? ESTADO_BADGE.PENDIENTE;
  // La empresa solo puede decidir si el consultor ya aprobó su parte
  const consultorAprobado = entregable.aprobacion_consultor;
  const puedeDecidir =
    entregable.estado === "PENDIENTE_APROBACION_EMPRESA" &&
    consultorAprobado &&
    decision === null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <Link
            href={`/empresa/proyectos/${projectId}`}
            className="text-sm text-[#28b8d5] hover:underline mb-2 inline-block"
          >
            ← Volver al Proyecto
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 truncate">
            {entregable.nombre}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{entregable.descripcion}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
          <span className="text-xs text-gray-400 dark:text-white/40">
            Etapa: <span className="font-medium">{entregable.etapa.replace("_", "-")}</span>
          </span>
          {entregable.fecha_aprobacion && (
            <span className="text-xs text-gray-400 dark:text-white/40">
              Aprobado: {new Date(entregable.fecha_aprobacion).toLocaleDateString("es-ES")}
            </span>
          )}
          {entregable.ciclos_revision > 0 && (
            <span className="text-xs text-gray-400 dark:text-white/30">
              {entregable.ciclos_revision} {entregable.ciclos_revision === 1 ? "ciclo de revisión" : "ciclos de revisión"}
            </span>
          )}
        </div>
      </div>

      {/* Contenido del entregable */}
      {esCuestionarioMadurez ? (
        <MaturityEmpresaReadOnlyView
          projectId={projectId}
        />
      ) : tipoEditor &&
        (
          (tipoEditor.tipo === "modelo-er" && !!modeloER) ||
          (tipoEditor.tipo === "modelo-logico" && !!modeloLogico) ||
          (tipoEditor.tipo === "dfd" && !!dfd) ||
          (tipoEditor.tipo === "matriz-inventario" && !!matrizInventario) ||
          (tipoEditor.tipo === "matriz-raci" && !!matrizRaci) ||
          (tipoEditor.tipo === "glosario-negocio" && !!glosarioNegocio) ||
          (tipoEditor.tipo === "crud-matrix" && !!crudMatrix) ||
          (tipoEditor.tipo === "gap-report" && !!gapReport) ||
          (tipoEditor.tipo === "integration-quality-rules" && !!integrationRules) ||
          (tipoEditor.tipo === "roadmap-implementation" && !!roadmapImplementation) ||
          (tipoEditor.tipo === "architecture-standards" && !!architectureStandards) ||
          (tipoEditor.tipo === "kpi-dashboard" && !!kpiDashboard)
        ) ? (
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden" style={{ height: "520px" }}>
          {tipoEditor.tipo === "modelo-er" && modeloER && (
            <ModeloEREditor
              modelo={modeloER}
              readOnly
              onSave={() => Promise.resolve()}
              isSaving={false}
              isGenerating={false}
              allowGenerate={false}
              allowComments={false}
            />
          )}
          {tipoEditor.tipo === "modelo-logico" && modeloLogico && (
            <ModeloLogicoEditor modelo={modeloLogico} readOnly />
          )}
          {tipoEditor.tipo === "dfd" && dfd && (
            <DFDEditor
              dfd={dfd}
              readOnly
              onSave={() => Promise.resolve()}
              onGenerateIA={() => Promise.resolve()}
              onAddComment={() => Promise.resolve()}
              isSaving={false}
              isGenerating={false}
            />
          )}
          {tipoEditor.tipo === "matriz-inventario" && matrizInventario && (
            <MatrizInventarioEditor
              matriz={matrizInventario}
              onSave={noopAsync}
              onGenerateIA={noopAsync}
              onAddComment={noopAsync}
              isSaving={false}
              isGenerating={false}
              readOnly
            />
          )}
          {tipoEditor.tipo === "matriz-raci" && matrizRaci && (
            <MatrizRACIEditor
              matriz={matrizRaci}
              onSave={noopAsync}
              onGenerateIA={noopAsync}
              onAddComment={noopAsync}
              isSaving={false}
              isGenerating={false}
              readOnly
            />
          )}
          {tipoEditor.tipo === "glosario-negocio" && glosarioNegocio && (
            <GlosarioNegocioEditor
              glosario={glosarioNegocio}
              onSave={noopAsync}
              onGenerateIA={noopAsync}
              onAddComment={noopAsync}
              isSaving={false}
              isGenerating={false}
              readOnly
            />
          )}
          {tipoEditor.tipo === "crud-matrix" && crudMatrix && (
            <div className="h-full overflow-auto">
              <CRUDMatrixEditor matriz={crudMatrix} readOnly />
            </div>
          )}
          {tipoEditor.tipo === "gap-report" && gapReport && (
            <div className="h-full overflow-auto">
              <GapAnalysisReportEditor
                reporte={gapReport}
                readOnly
                onExport={(format: GapReportExportFormat) =>
                  brechasApi.exportGapReport(projectId, entregableId, format)
                }
              />
            </div>
          )}
          {tipoEditor.tipo === "integration-quality-rules" && integrationRules && (
            <div className="h-full overflow-auto">
              <IntegrationQualityRulesEditor
                documento={integrationRules}
                readOnly
                onExport={(format: IntegrationRulesExportFormat) =>
                  brechasApi.exportIntegrationRules(projectId, entregableId, format)
                }
              />
            </div>
          )}
          {tipoEditor.tipo === "roadmap-implementation" && roadmapImplementation && (
            <div className="h-full overflow-hidden">
              <RoadmapImplementationEditor roadmap={roadmapImplementation} readOnly />
            </div>
          )}
          {tipoEditor.tipo === "architecture-standards" && architectureStandards && (
            <div className="h-full overflow-hidden">
              <ArchitectureStandardsEditor standardsDoc={architectureStandards} readOnly />
            </div>
          )}
          {tipoEditor.tipo === "kpi-dashboard" && kpiDashboard && (
            <div className="h-full overflow-hidden">
              <KPIDashboardEditor dashboard={kpiDashboard} readOnly />
            </div>
          )}
        </div>
      ) : contenido ? (
        <ContenidoEntregableViewer contenido={contenido} />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/[0.10] p-6 text-center space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {entregable.estado === "NO_APLICA"
              ? "Este entregable no aplica para el proyecto"
              : "El consultor no ha añadido contenido todavía"}
          </p>
          <p className="text-xs text-gray-400 dark:text-white/30">
            {entregable.estado === "NO_APLICA"
              ? "Fue marcado como No Aplica por el equipo consultor."
              : "El contenido estará disponible una vez que el consultor lo cree."}
          </p>
        </div>
      )}

      {/* Decisión de la empresa */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-lg border border-gray-200 dark:border-white/[0.08] p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Valoración de la Empresa
        </h3>

        {decision === "APROBADO" || entregable.estado === "APROBADO" ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-800 dark:text-green-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Has aprobado este entregable.
          </div>
        ) : decision === "RECHAZADO" ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-300">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Has rechazado este entregable. El consultor recibirá tu motivo.
          </div>
        ) : puedeDecidir ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Revisa el contenido del entregable y decide si cumple con lo acordado.
            </p>
            {mostrarMotivoRechazo ? (
              <div className="space-y-2">
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Indica el motivo del rechazo para que el consultor pueda corregirlo..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-900 dark:border-red-700 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRechazar}
                    disabled={!motivoRechazo.trim() || guardando}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium text-sm"
                  >
                    Confirmar Rechazo
                  </button>
                  <button
                    onClick={() => { setMostrarMotivoRechazo(false); setMotivoRechazo(""); }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleAprobar}
                  disabled={guardando}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium text-sm"
                >
                  Aprobar Entregable
                </button>
                <button
                  onClick={() => setMostrarMotivoRechazo(true)}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm"
                >
                  Rechazar
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Este entregable no requiere valoración en su estado actual.
          </p>
        )}
      </div>

      {/* Comentarios */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-lg border border-gray-200 dark:border-white/[0.08] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Comentarios</h3>
          {!mostrarFormComentario && (
            <button
              onClick={() => setMostrarFormComentario(true)}
              className="px-3 py-1.5 text-xs font-medium bg-[#28b8d5] text-white rounded-lg hover:bg-[#22a5bf]"
            >
              + Agregar comentario
            </button>
          )}
        </div>

        {mostrarFormComentario && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.08]">
            <textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe tu comentario..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5] mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAgregarComentario}
                disabled={!nuevoComentario.trim()}
                className="px-4 py-2 bg-[#28b8d5] text-white rounded-lg hover:bg-[#22a5bf] disabled:opacity-50 font-medium text-sm"
              >
                Comentar
              </button>
              <button
                onClick={() => { setMostrarFormComentario(false); setNuevoComentario(""); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.05] text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {comentarios.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-white/30">Sin comentarios aún.</p>
        ) : (
          <div className="space-y-3">
            {comentarios.map((com) => (
              <div key={com.id} className="p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{com.autor}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    Empresa
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{com.contenido}</p>
                <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
                  {new Date(com.fecha).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

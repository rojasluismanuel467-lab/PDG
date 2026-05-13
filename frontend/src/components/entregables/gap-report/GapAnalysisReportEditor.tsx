"use client";

import { useMemo, useState } from "react";
import type {
  Gap,
  GapAnalysisReport,
  GapImpacto,
  GapPrioridad,
  GapReportExportFormat,
  GapReportExportFile,
} from "@/lib/types/gap-report.types";

interface GapAnalysisReportEditorProps {
  reporte: GapAnalysisReport;
  readOnly?: boolean;
  onReporteChange?: (next: GapAnalysisReport) => void;
  onSave?: () => Promise<void>;
  onGenerateIA?: () => Promise<void>;
  onExport?: (format: GapReportExportFormat) => Promise<GapReportExportFile>;
  isSaving?: boolean;
  isGenerating?: boolean;
}

const PRIORIDAD_ORDEN: Record<GapPrioridad, number> = {
  Critica: 0,
  Alta: 1,
  Media: 2,
  Baja: 3,
};

const IMPACTO_ORDEN: Record<GapImpacto, number> = {
  Alto: 0,
  Medio: 1,
  Bajo: 2,
};

const IMPACTO_COLOR: Record<GapImpacto, string> = {
  Alto: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Medio: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Bajo: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
};

const PRIORIDAD_COLOR: Record<GapPrioridad, string> = {
  Critica: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Alta: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  Media: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Baja: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
};

const buildGapVacio = (): Gap => ({
  id: `gap-${Date.now()}`,
  area: "Nueva area",
  brecha: "",
  impacto: "Medio",
  prioridad: "Media",
  recomendacion: "",
});

const ordenarBrechas = (brechas: Gap[]): Gap[] =>
  [...brechas].sort((a, b) => {
    const prioridad = PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad];
    if (prioridad !== 0) return prioridad;
    return IMPACTO_ORDEN[a.impacto] - IMPACTO_ORDEN[b.impacto];
  });

const recalcularCampos = (reporte: GapAnalysisReport): GapAnalysisReport => {
  const brechas = ordenarBrechas(reporte.brechas);
  const recomendaciones: string[] = [];

  brechas.forEach((gap) => {
    const recomendacion = gap.recomendacion.trim();
    if (!recomendacion) return;
    if (!recomendaciones.includes(recomendacion)) {
      recomendaciones.push(recomendacion);
    }
  });

  return {
    ...reporte,
    brechas,
    total_brechas: brechas.length,
    brechas_criticas: brechas.filter((gap) => gap.prioridad === "Critica").length,
    recomendaciones_prioritarias: recomendaciones.slice(0, 5),
    updated_at: new Date().toISOString(),
  };
};

export default function GapAnalysisReportEditor({
  reporte,
  readOnly = false,
  onReporteChange,
  onSave,
  onGenerateIA,
  onExport,
  isSaving = false,
  isGenerating = false,
}: GapAnalysisReportEditorProps) {
  const [exportingFormat, setExportingFormat] =
    useState<GapReportExportFormat | null>(null);

  const updateReporte = (next: GapAnalysisReport) => {
    if (!onReporteChange) return;
    onReporteChange(recalcularCampos(next));
  };

  const updateGap = (gapId: string, updater: (gap: Gap) => Gap) => {
    const nextBrechas = reporte.brechas.map((gap) =>
      gap.id === gapId ? updater(gap) : gap
    );
    updateReporte({ ...reporte, brechas: nextBrechas });
  };

  const handleAgregarBrecha = () => {
    updateReporte({ ...reporte, brechas: [...reporte.brechas, buildGapVacio()] });
  };

  const handleEliminarBrecha = (gapId: string) => {
    updateReporte({
      ...reporte,
      brechas: reporte.brechas.filter((gap) => gap.id !== gapId),
    });
  };

  const handleExport = async (formato: GapReportExportFormat) => {
    if (!onExport) return;

    setExportingFormat(formato);
    try {
      const archivo = await onExport(formato);
      const contentPart =
        typeof archivo.content === "string"
          ? archivo.content
          : new Uint8Array(archivo.content);
      const blob = new Blob([contentPart], { type: archivo.mime_type });
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo.file_name;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportingFormat(null);
    }
  };

  const conteos = useMemo(() => {
    const impactoAlto = reporte.brechas.filter((gap) => gap.impacto === "Alto").length;
    const prioridadAlta = reporte.brechas.filter(
      (gap) => gap.prioridad === "Critica" || gap.prioridad === "Alta"
    ).length;
    return {
      impactoAlto,
      prioridadAlta,
    };
  }, [reporte.brechas]);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {reporte.nombre}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
              {reporte.descripcion}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/45">
              Formatos objetivo: {reporte.formato_objetivo.join(" / ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-white/45">
              Version: <span className="font-semibold">{reporte.version_actual}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-white/45">
              Ultima actualizacion: {new Date(reporte.updated_at).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Total brechas</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{reporte.total_brechas}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Brechas criticas</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{reporte.brechas_criticas}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Impacto alto</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{conteos.impactoAlto}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Prioridad alta/critica</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{conteos.prioridadAlta}</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/45">
            Resumen ejecutivo
          </label>
          {readOnly ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/70">
              {reporte.resumen_ejecutivo}
            </p>
          ) : (
            <textarea
              value={reporte.resumen_ejecutivo}
              onChange={(event) =>
                updateReporte({ ...reporte, resumen_ejecutivo: event.target.value })
              }
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
              placeholder="Sintetiza hallazgos clave, impacto de negocio y prioridad de accion..."
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleAgregarBrecha}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                + Agregar brecha
              </button>
              <button
                type="button"
                onClick={() => {
                  void onGenerateIA?.();
                }}
                disabled={!onGenerateIA || isGenerating}
                className="rounded-lg border border-[#28b8d5] px-3 py-2 text-sm font-medium text-[#28b8d5] hover:bg-[#28b8d5]/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generando..." : "Generar con IA"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void onSave?.();
                }}
                disabled={!onSave || isSaving}
                className="rounded-lg bg-[#28b8d5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#22a5bf] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar reporte"}
              </button>
            </>
          )}

          {onExport && (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleExport("markdown");
                }}
                disabled={!!exportingFormat}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                {exportingFormat === "markdown" ? "Exportando..." : "Exportar .md"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleExport("pdf");
                }}
                disabled={!!exportingFormat}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                {exportingFormat === "pdf" ? "Exportando..." : "Exportar .pdf"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleExport("word");
                }}
                disabled={!!exportingFormat}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                {exportingFormat === "word" ? "Exportando..." : "Exportar .doc"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/[0.03]">
            <tr>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Area
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Brecha
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Impacto
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Prioridad
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Recomendacion
              </th>
              {!readOnly && (
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {reporte.brechas.map((gap) => (
              <tr
                key={gap.id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 dark:border-white/[0.05] dark:hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <span className="text-sm text-gray-800 dark:text-white/85">{gap.area}</span>
                  ) : (
                    <input
                      type="text"
                      value={gap.area}
                      onChange={(event) =>
                        updateGap(gap.id, (current) => ({ ...current, area: event.target.value }))
                      }
                      className="w-full min-w-[180px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                    />
                  )}
                </td>

                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <p className="max-w-[340px] text-sm text-gray-700 dark:text-white/70">{gap.brecha}</p>
                  ) : (
                    <textarea
                      value={gap.brecha}
                      onChange={(event) =>
                        updateGap(gap.id, (current) => ({ ...current, brecha: event.target.value }))
                      }
                      rows={2}
                      className="w-full min-w-[320px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                    />
                  )}
                </td>

                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${IMPACTO_COLOR[gap.impacto]}`}>
                      {gap.impacto}
                    </span>
                  ) : (
                    <select
                      value={gap.impacto}
                      onChange={(event) =>
                        updateGap(gap.id, (current) => ({
                          ...current,
                          impacto: event.target.value as GapImpacto,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                    >
                      <option value="Alto">Alto</option>
                      <option value="Medio">Medio</option>
                      <option value="Bajo">Bajo</option>
                    </select>
                  )}
                </td>

                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${PRIORIDAD_COLOR[gap.prioridad]}`}>
                      {gap.prioridad}
                    </span>
                  ) : (
                    <select
                      value={gap.prioridad}
                      onChange={(event) =>
                        updateGap(gap.id, (current) => ({
                          ...current,
                          prioridad: event.target.value as GapPrioridad,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                    >
                      <option value="Critica">Critica</option>
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  )}
                </td>

                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <p className="max-w-[340px] text-sm text-gray-700 dark:text-white/70">{gap.recomendacion}</p>
                  ) : (
                    <textarea
                      value={gap.recomendacion}
                      onChange={(event) =>
                        updateGap(gap.id, (current) => ({
                          ...current,
                          recomendacion: event.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full min-w-[340px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                    />
                  )}
                </td>

                {!readOnly && (
                  <td className="px-3 py-3 text-center align-top">
                    <button
                      type="button"
                      onClick={() => handleEliminarBrecha(gap.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recomendaciones prioritarias</h3>
        {reporte.recomendaciones_prioritarias.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-white/45">
            No hay recomendaciones priorizadas todavia.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reporte.recomendaciones_prioritarias.map((recomendacion, index) => (
              <li key={`${index}-${recomendacion.slice(0, 12)}`} className="flex items-start gap-2 text-sm text-gray-700 dark:text-white/70">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#28b8d5]" />
                {recomendacion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

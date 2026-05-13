"use client";

import { useMemo, useState } from "react";
import type {
  IntegrationQualityRules,
  IntegrationRule,
  IntegrationRulePriority,
  IntegrationRuleType,
  IntegrationRulesExportFile,
  IntegrationRulesExportFormat,
} from "@/lib/types/integration-quality-rules.types";

interface IntegrationQualityRulesEditorProps {
  documento: IntegrationQualityRules;
  readOnly?: boolean;
  onDocumentoChange?: (next: IntegrationQualityRules) => void;
  onSave?: () => Promise<void>;
  onGenerateIA?: () => Promise<void>;
  onExport?: (format: IntegrationRulesExportFormat) => Promise<IntegrationRulesExportFile>;
  isSaving?: boolean;
  isGenerating?: boolean;
}

const PRIORIDAD_ORDEN: Record<IntegrationRulePriority, number> = {
  Alta: 0,
  Media: 1,
  Baja: 2,
};

const TIPO_ORDEN: Record<IntegrationRuleType, number> = {
  Matching: 0,
  Validacion: 1,
  Consolidacion: 2,
};

const PRIORIDAD_COLOR: Record<IntegrationRulePriority, string> = {
  Alta: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Media: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Baja: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
};

const TIPO_COLOR: Record<IntegrationRuleType, string> = {
  Matching: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  Validacion: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  Consolidacion: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300",
};

const FIELD_CLASS =
  "w-full rounded-xl border border-gray-300/90 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-[#28b8d5] focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/20 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85 dark:focus:ring-[#28b8d5]/30";

const buildRuleEmpty = (): IntegrationRule => ({
  id: `int-rule-${Date.now()}`,
  nombre: "Nueva regla",
  descripcion: "",
  tipo: "Validacion",
  prioridad: "Media",
  condicion: "",
  accion: "",
});

const ordenarReglas = (reglas: IntegrationRule[]): IntegrationRule[] =>
  [...reglas].sort((a, b) => {
    const prioridad = PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad];
    if (prioridad !== 0) return prioridad;
    return TIPO_ORDEN[a.tipo] - TIPO_ORDEN[b.tipo];
  });

const recalcularDocumento = (documento: IntegrationQualityRules): IntegrationQualityRules => ({
  ...documento,
  reglas: ordenarReglas(documento.reglas),
  updated_at: new Date().toISOString(),
});

export default function IntegrationQualityRulesEditor({
  documento,
  readOnly = false,
  onDocumentoChange,
  onSave,
  onGenerateIA,
  onExport,
  isSaving = false,
  isGenerating = false,
}: IntegrationQualityRulesEditorProps) {
  const [exportingFormat, setExportingFormat] =
    useState<IntegrationRulesExportFormat | null>(null);

  const updateDocumento = (next: IntegrationQualityRules) => {
    if (!onDocumentoChange) return;
    onDocumentoChange(recalcularDocumento(next));
  };

  const updateRule = (ruleId: string, updater: (rule: IntegrationRule) => IntegrationRule) => {
    updateDocumento({
      ...documento,
      reglas: documento.reglas.map((rule) =>
        rule.id === ruleId ? updater(rule) : rule
      ),
    });
  };

  const handleExport = async (formato: IntegrationRulesExportFormat) => {
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

  const metrics = useMemo(() => {
    const total = documento.reglas.length;
    const matching = documento.reglas.filter((rule) => rule.tipo === "Matching").length;
    const validaciones = documento.reglas.filter((rule) => rule.tipo === "Validacion").length;
    const consolidacion = documento.reglas.filter((rule) => rule.tipo === "Consolidacion").length;
    const prioridadAlta = documento.reglas.filter((rule) => rule.prioridad === "Alta").length;
    return { total, matching, validaciones, consolidacion, prioridadAlta };
  }, [documento.reglas]);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm dark:border-white/[0.08] dark:from-[#111111] dark:to-[#0b0b0b]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {documento.nombre}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-white/60">
              {documento.descripcion}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/45">
              Formatos objetivo: {documento.formato_objetivo.join(" / ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-white/45">
              Version: <span className="font-semibold">{documento.version_actual}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-white/45">
              Ultima actualizacion: {new Date(documento.updated_at).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Total reglas</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.total}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Matching</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.matching}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Validacion</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.validaciones}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Consolidacion</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.consolidacion}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Prioridad alta</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{metrics.prioridadAlta}</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/45">
            Resumen tecnico
          </label>
          {readOnly ? (
            <p className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/70">
              {documento.resumen_tecnico}
            </p>
          ) : (
            <textarea
              value={documento.resumen_tecnico}
              onChange={(event) =>
                updateDocumento({ ...documento, resumen_tecnico: event.target.value })
              }
              rows={4}
              className={`${FIELD_CLASS} min-h-[110px]`}
              placeholder="Describe el enfoque de integracion, calidad y umbrales de aceptacion..."
            />
          )}
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/45">
            Criterios de aceptacion
          </label>
          <ul className="space-y-1">
            {documento.criterios_aceptacion.map((item, index) => (
              <li key={`${index}-${item.slice(0, 15)}`} className="text-sm text-gray-700 dark:text-white/70">
                - {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() =>
                  updateDocumento({
                    ...documento,
                    reglas: [...documento.reglas, buildRuleEmpty()],
                  })
                }
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-[1px] hover:bg-gray-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                + Agregar regla
              </button>
              <button
                type="button"
                onClick={() => {
                  void onGenerateIA?.();
                }}
                disabled={!onGenerateIA || isGenerating}
                className="rounded-xl border border-[#28b8d5] px-4 py-2.5 text-sm font-semibold text-[#28b8d5] shadow-sm transition hover:-translate-y-[1px] hover:bg-[#28b8d5]/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generando..." : "Generar con IA"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void onSave?.();
                }}
                disabled={!onSave || isSaving}
                className="rounded-xl bg-[#28b8d5] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-[#22a5bf] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar reglas"}
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
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                {exportingFormat === "markdown" ? "Exportando..." : "Exportar .md"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleExport("pdf");
                }}
                disabled={!!exportingFormat}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                {exportingFormat === "pdf" ? "Exportando..." : "Exportar .pdf"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleExport("word");
                }}
                disabled={!!exportingFormat}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
              >
                {exportingFormat === "word" ? "Exportando..." : "Exportar .doc"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <table className="min-w-[1400px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/[0.03]">
            <tr>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Regla
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Tipo
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Prioridad
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Descripcion
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Condicion
              </th>
              <th className="border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Accion
              </th>
              {!readOnly && (
                <th className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {documento.reglas.map((regla) => (
              <tr
                key={regla.id}
                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 dark:border-white/[0.05] dark:hover:bg-white/[0.02]"
              >
                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <p className="max-w-[240px] text-sm font-medium text-gray-800 dark:text-white/85">
                      {regla.nombre}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={regla.nombre}
                      onChange={(event) =>
                        updateRule(regla.id, (current) => ({
                          ...current,
                          nombre: event.target.value,
                        }))
                      }
                      className={`${FIELD_CLASS} min-w-[220px]`}
                    />
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${TIPO_COLOR[regla.tipo]}`}>
                      {regla.tipo}
                    </span>
                  ) : (
                    <select
                      value={regla.tipo}
                      onChange={(event) =>
                        updateRule(regla.id, (current) => ({
                          ...current,
                          tipo: event.target.value as IntegrationRuleType,
                        }))
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="Matching">Matching</option>
                      <option value="Validacion">Validacion</option>
                      <option value="Consolidacion">Consolidacion</option>
                    </select>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${PRIORIDAD_COLOR[regla.prioridad]}`}>
                      {regla.prioridad}
                    </span>
                  ) : (
                    <select
                      value={regla.prioridad}
                      onChange={(event) =>
                        updateRule(regla.id, (current) => ({
                          ...current,
                          prioridad: event.target.value as IntegrationRulePriority,
                        }))
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <p className="max-w-[260px] text-sm text-gray-700 dark:text-white/70">{regla.descripcion}</p>
                  ) : (
                    <textarea
                      value={regla.descripcion}
                      onChange={(event) =>
                        updateRule(regla.id, (current) => ({
                          ...current,
                          descripcion: event.target.value,
                        }))
                      }
                      rows={2}
                      className={`${FIELD_CLASS} min-w-[240px]`}
                    />
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <p className="max-w-[320px] text-sm text-gray-700 dark:text-white/70">{regla.condicion}</p>
                  ) : (
                    <textarea
                      value={regla.condicion}
                      onChange={(event) =>
                        updateRule(regla.id, (current) => ({
                          ...current,
                          condicion: event.target.value,
                        }))
                      }
                      rows={3}
                      className={`${FIELD_CLASS} min-w-[300px]`}
                    />
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <p className="max-w-[320px] text-sm text-gray-700 dark:text-white/70">{regla.accion}</p>
                  ) : (
                    <textarea
                      value={regla.accion}
                      onChange={(event) =>
                        updateRule(regla.id, (current) => ({
                          ...current,
                          accion: event.target.value,
                        }))
                      }
                      rows={3}
                      className={`${FIELD_CLASS} min-w-[300px]`}
                    />
                  )}
                </td>
                {!readOnly && (
                  <td className="px-3 py-3 text-center align-top">
                    <button
                      type="button"
                      onClick={() =>
                        updateDocumento({
                          ...documento,
                          reglas: documento.reglas.filter((rule) => rule.id !== regla.id),
                        })
                      }
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
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
    </div>
  );
}

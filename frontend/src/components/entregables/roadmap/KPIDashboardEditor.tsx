"use client";

import { useMemo, useState } from "react";
import type { KPIDashboard, KPI, KPITrend } from "@/lib/types/roadmap.types";
import { Modal } from "@/components/ui/modal";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const TREND_BADGE: Record<KPITrend, string> = {
  Mejorando: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
  Estable: "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70",
  Empeorando: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300",
};

interface KPIDashboardEditorProps {
  dashboard: KPIDashboard;
  readOnly?: boolean;
  onDashboardChange?: (next: KPIDashboard) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

export default function KPIDashboardEditor({
  dashboard,
  readOnly = false,
  onDashboardChange,
  onSave,
  isSaving = false,
}: KPIDashboardEditorProps) {
  const [query, setQuery] = useState("");
  const [trendFilter, setTrendFilter] = useState<KPITrend | "ALL">("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<"ALL" | "Mensual" | "Trimestral" | "Semestral">(
    "ALL"
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateDashboard = (next: KPIDashboard) => {
    if (!onDashboardChange) return;
    onDashboardChange({ ...next, updated_at: new Date().toISOString() });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dashboard.kpis.filter((k) => {
      if (trendFilter !== "ALL" && k.trend !== trendFilter) return false;
      if (frequencyFilter !== "ALL" && k.frequency !== frequencyFilter) return false;
      const blob = `${k.name} ${k.description} ${k.owner} ${k.unit}`.toLowerCase();
      return q ? blob.includes(q) : true;
    });
  }, [dashboard.kpis, query, trendFilter, frequencyFilter]);

  const editing = useMemo(() => {
    if (!editingId) return null;
    return dashboard.kpis.find((k) => k.id === editingId) ?? null;
  }, [dashboard.kpis, editingId]);

  const setEditingField = (updater: (k: KPI) => KPI) => {
    if (!editing) return;
    updateDashboard({
      ...dashboard,
      kpis: dashboard.kpis.map((k) => (k.id === editing.id ? updater(k) : k)),
    });
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setEditOpen(true);
  };

  const completionPct = (k: KPI) => {
    if (!k.target_value) return 0;
    return Math.max(0, Math.min(100, (k.current_value / k.target_value) * 100));
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f0f0f]">
      <div className="border-b border-gray-200 dark:border-white/[0.08] px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dashboard de Métricas y KPIs
            </h1>
            <p className="text-sm text-gray-500 dark:text-white/40">
              Indicadores de éxito y monitoreo del avance del programa de arquitectura de datos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void onSave?.()}
              disabled={readOnly || !onSave || isSaving}
              className="px-4 py-2 rounded-lg bg-[#28b8d5] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#1ea7c3]"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs text-gray-500 dark:text-white/40">
            Período: <span className="font-medium text-gray-800 dark:text-white/80">{dashboard.report_period}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-white/40">
            Última actualización:{" "}
            <span className="font-medium text-gray-800 dark:text-white/80">
              {new Date(dashboard.updated_at).toLocaleString("es-CO")}
            </span>
          </div>
          <div className="grow" />
          <select
            value={trendFilter}
            onChange={(e) => setTrendFilter(e.target.value as any)}
            className="h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white"
          >
            <option value="ALL">Tendencia: Todas</option>
            <option value="Mejorando">Mejorando</option>
            <option value="Estable">Estable</option>
            <option value="Empeorando">Empeorando</option>
          </select>
          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value as any)}
            className="h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white"
          >
            <option value="ALL">Frecuencia: Todas</option>
            <option value="Mensual">Mensual</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Semestral">Semestral</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar KPI..."
            className="h-10 w-full sm:w-[320px] px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((kpi) => (
            <div
              key={kpi.id}
              className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {kpi.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-white/40 line-clamp-2">
                    {kpi.description}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full ${TREND_BADGE[kpi.trend]}`}>
                    {kpi.trend}
                  </span>
                  <button
                    onClick={() => openEdit(kpi.id)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70 text-xs hover:bg-gray-200 dark:hover:bg-white/[0.10]"
                  >
                    Ver / Editar
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-white/40">Actual</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {kpi.current_value} {kpi.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-white/40">Objetivo</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {kpi.target_value} {kpi.unit}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-[#28b8d5]"
                      style={{ width: `${completionPct(kpi)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-white/40">
                    Avance: {completionPct(kpi).toFixed(0)}% · Frecuencia: {kpi.frequency} · Owner: {kpi.owner}
                  </div>
                </div>

                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpi.history}>
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#28b8d5" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {(kpi.traceability?.initiatives?.length || kpi.traceability?.standards?.length) ? (
                  <div className="pt-2 border-t border-gray-200 dark:border-white/[0.08]">
                    <div className="text-xs text-gray-500 dark:text-white/40 mb-1">Trazabilidad</div>
                    <div className="flex flex-wrap gap-2">
                      {kpi.traceability?.initiatives?.map((i) => (
                        <span
                          key={i.id}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          Iniciativa: {i.name}
                        </span>
                      ))}
                      {kpi.traceability?.standards?.map((s) => (
                        <span
                          key={s.id}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70"
                        >
                          Estándar: {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-white/40">
              No hay KPIs que coincidan con la búsqueda.
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        className="max-w-3xl w-full mx-4 p-0 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Editar KPI</div>
              <div className="text-xs text-gray-500 dark:text-white/40">
                Este mock permite validar con cliente qué métricas son relevantes.
              </div>
            </div>
            <button
              onClick={() => setEditOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#0f0f0f] space-y-4">
          {editing ? (
            <>
              <Field label="Nombre">
                <input
                  value={editing.name}
                  onChange={(e) => setEditingField((k) => ({ ...k, name: e.target.value }))}
                  disabled={readOnly}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                />
              </Field>
              <Field label="Descripción">
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditingField((k) => ({ ...k, description: e.target.value }))}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Valor actual">
                  <input
                    type="number"
                    value={editing.current_value}
                    onChange={(e) =>
                      setEditingField((k) => ({ ...k, current_value: Number(e.target.value || 0) }))
                    }
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </Field>
                <Field label="Objetivo">
                  <input
                    type="number"
                    value={editing.target_value}
                    onChange={(e) =>
                      setEditingField((k) => ({ ...k, target_value: Number(e.target.value || 0) }))
                    }
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Unidad">
                  <input
                    value={editing.unit}
                    onChange={(e) => setEditingField((k) => ({ ...k, unit: e.target.value }))}
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </Field>
                <Field label="Tendencia">
                  <select
                    value={editing.trend}
                    onChange={(e) => setEditingField((k) => ({ ...k, trend: e.target.value as any }))}
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="Mejorando">Mejorando</option>
                    <option value="Estable">Estable</option>
                    <option value="Empeorando">Empeorando</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Owner">
                  <input
                    value={editing.owner}
                    onChange={(e) => setEditingField((k) => ({ ...k, owner: e.target.value }))}
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </Field>
                <Field label="Frecuencia">
                  <select
                    value={editing.frequency}
                    onChange={(e) => setEditingField((k) => ({ ...k, frequency: e.target.value as any }))}
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="Mensual">Mensual</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Semestral">Semestral</option>
                  </select>
                </Field>
              </div>

              {(editing.traceability?.initiatives?.length || editing.traceability?.standards?.length) ? (
                <Field label="Trazabilidad (placeholder para backend)">
                  <div className="space-y-2">
                    {editing.traceability?.initiatives?.length ? (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                          Iniciativas relacionadas
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editing.traceability.initiatives.map((i) => (
                            <span
                              key={i.id}
                              className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300"
                            >
                              {i.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {editing.traceability?.standards?.length ? (
                      <div>
                        <div className="text-xs text-gray-500 dark:text-white/40 mb-1">
                          Estándares relacionados
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editing.traceability.standards.map((s) => (
                            <span
                              key={s.id}
                              className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Field>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-white/40">Selecciona un KPI.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">{label}</div>
      {children}
    </label>
  );
}

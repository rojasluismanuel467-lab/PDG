"use client";
import React, { useState, useCallback, useEffect } from "react";
import type {
  MatrizRaci,
  ActividadRaci,
  RolRaci,
  AsignacionRaci,
  ComentarioMatrizRaci,
  CategoriaActividad,
} from "@/lib/types/matriz-raci.types";
import PanelActividad, {
  CATEGORIA_COLORS,
  CATEGORIA_LABELS,
  RACI_COLORS,
  RACI_LABELS,
} from "./PanelActividad";
import PanelRol from "./PanelRol";
import { v4 as uuidv4 } from "uuid";

interface MatrizRACIEditorProps {
  matriz: MatrizRaci;
  onSave: (matriz: MatrizRaci) => Promise<void>;
  onGenerateIA: () => Promise<void>;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "actividad" | "rol" | "general",
    contenido: string
  ) => Promise<void>;
  isSaving: boolean;
  isGenerating: boolean;
  readOnly?: boolean;
}

type TabActiva = "matriz" | "comentarios" | "versiones";
type Density = "compact" | "comfortable";

const RACI_ORDER: AsignacionRaci[] = ["R", "A", "C", "I"];
const RACI_CYCLE: (AsignacionRaci | undefined)[] = ["R", "A", "C", "I", undefined];

const CELL_SIZE: Record<Density, string> = {
  compact: "w-7 h-7",
  comfortable: "w-8 h-8",
};
const ROW_PY: Record<Density, string> = {
  compact: "py-1",
  comfortable: "py-2.5",
};

function getRowIssues(actividad: ActividadRaci) {
  const vals = Object.values(actividad.asignaciones);
  return {
    missingR: !vals.includes("R"),
    missingA: !vals.includes("A"),
    multipleA: vals.filter((v) => v === "A").length > 1,
  };
}

export default function MatrizRACIEditor({
  matriz: matrizProp,
  onSave,
  onGenerateIA,
  onAddComment,
  isSaving,
  isGenerating,
  readOnly = false,
}: MatrizRACIEditorProps) {
  const [matriz, setMatriz] = useState<MatrizRaci>(matrizProp);
  useEffect(() => { setMatriz(matrizProp); }, [matrizProp]);

  const [tabActiva, setTabActiva] = useState<TabActiva>("matriz");
  const [actividadSeleccionada, setActividadSeleccionada] = useState<ActividadRaci | null>(null);
  const [rolSeleccionado, setRolSeleccionado] = useState<RolRaci | null>(null);
  const [nuevoComentarioGeneral, setNuevoComentarioGeneral] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaActividad | "todas">("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");

  // ── Columnas dinámicas ─────────────────────────────────────────────────────
  const storageKey = `raci-columnas-${matrizProp.id || "default"}`;
  const [columnasDinamicas, setColumnasDinamicas] = useState<{ id: string; label: string }[]>([]);
  const [showAddCol, setShowAddCol] = useState(false);
  const [nuevaColLabel, setNuevaColLabel] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setColumnasDinamicas(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnasDinamicas));
  }, [columnasDinamicas, storageKey]);

  const handleAddColumn = () => {
    const label = nuevaColLabel.trim();
    if (!label) return;
    const id = `col_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    if (!columnasDinamicas.some((c) => c.id === id)) {
      setColumnasDinamicas((prev) => [...prev, { id, label }]);
    }
    setNuevaColLabel("");
    setShowAddCol(false);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const mutate = useCallback((patch: Partial<MatrizRaci>) => {
    setMatriz((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  }, []);

  // ── Actividades filtradas ──────────────────────────────────────────────────
  const actividadesFiltradas = matriz.actividades
    .filter((a) => filtroCategoria === "todas" || a.categoria === filtroCategoria)
    .filter(
      (a) =>
        !searchQuery ||
        a.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ── Clic-para-ciclar celda RACI ────────────────────────────────────────────
  const handleCellCycle = useCallback(
    (actividadId: string, rolId: string) => {
      if (readOnly) return;
      setMatriz((prev) => {
        const actividades = prev.actividades.map((a) => {
          if (a.id !== actividadId) return a;
          const current = a.asignaciones[rolId] as AsignacionRaci | undefined;
          const next = RACI_CYCLE[(RACI_CYCLE.indexOf(current) + 1) % RACI_CYCLE.length];
          const nuevas = { ...a.asignaciones };
          if (next === undefined) delete nuevas[rolId];
          else nuevas[rolId] = next;
          return { ...a, asignaciones: nuevas };
        });
        return { ...prev, actividades };
      });
      setHasChanges(true);
      // Sync panel lateral si está abierto para esta actividad
      setActividadSeleccionada((prev) => {
        if (!prev || prev.id !== actividadId) return prev;
        const current = prev.asignaciones[rolId] as AsignacionRaci | undefined;
        const next = RACI_CYCLE[(RACI_CYCLE.indexOf(current) + 1) % RACI_CYCLE.length];
        const nuevas = { ...prev.asignaciones };
        if (next === undefined) delete nuevas[rolId];
        else nuevas[rolId] = next;
        return { ...prev, asignaciones: nuevas };
      });
    },
    [readOnly]
  );

  // ── Empezar desde cero ────────────────────────────────────────────────────
  const handleClearMatrix = () => {
    if (!confirm("¿Estás seguro de querer limpiar la matriz? Se borrarán todas las actividades y roles.")) return;
    mutate({ actividades: [], roles: [] });
    setActividadSeleccionada(null);
    setRolSeleccionado(null);
  };

  // ── Actividades ───────────────────────────────────────────────────────────
  const handleAddActividad = () => {
    const nueva: ActividadRaci = {
      id: uuidv4(),
      nombre: "Nueva actividad",
      descripcion: "",
      categoria: "otro",
      asignaciones: {},
      notas: "",
    };
    mutate({ actividades: [...matriz.actividades, nueva] });
    setRolSeleccionado(null);
    setActividadSeleccionada(nueva);
  };

  const handleUpdateActividad = useCallback((updated: ActividadRaci) => {
    setMatriz((prev) => ({
      ...prev,
      actividades: prev.actividades.map((a) => (a.id === updated.id ? updated : a)),
    }));
    setActividadSeleccionada(updated);
    setHasChanges(true);
  }, []);

  const handleDeleteActividad = useCallback((id: string) => {
    setMatriz((prev) => ({
      ...prev,
      actividades: prev.actividades.filter((a) => a.id !== id),
    }));
    setActividadSeleccionada(null);
    setHasChanges(true);
  }, []);

  // ── Roles ─────────────────────────────────────────────────────────────────
  const handleAddRol = () => {
    const nuevo: RolRaci = { id: uuidv4(), nombre: "Nuevo rol", area: "", descripcion: "" };
    mutate({ roles: [...matriz.roles, nuevo] });
  };

  const handleUpdateRol = useCallback((updated: RolRaci) => {
    setMatriz((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === updated.id ? updated : r)),
    }));
    setRolSeleccionado(updated);
    setHasChanges(true);
  }, []);

  const handleDeleteRol = useCallback((id: string) => {
    setMatriz((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== id),
      actividades: prev.actividades.map((a) => {
        const nuevas = { ...a.asignaciones };
        delete nuevas[id];
        return { ...a, asignaciones: nuevas };
      }),
    }));
    setRolSeleccionado(null);
    setHasChanges(true);
  }, []);

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    await onSave(matriz);
    setHasChanges(false);
  };

  // ── Comentario general ────────────────────────────────────────────────────
  const handleAddComentarioGeneral = async () => {
    if (!nuevoComentarioGeneral.trim()) return;
    await onAddComment(null, "general", nuevoComentarioGeneral.trim());
    setNuevoComentarioGeneral("");
  };

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["Actividad", "Categoría", ...matriz.roles.map((r) => r.nombre)];
    const rows = matriz.actividades.map((a) => [
      a.nombre,
      CATEGORIA_LABELS[a.categoria],
      ...matriz.roles.map((r) => a.asignaciones[r.id] || ""),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matriz-raci-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalAsignaciones = matriz.actividades.reduce(
    (sum, a) => sum + Object.keys(a.asignaciones).length,
    0
  );
  const actividadesSinR = matriz.actividades.filter(
    (a) => !Object.values(a.asignaciones).includes("R")
  ).length;
  const actividadesSinA = matriz.actividades.filter(
    (a) => !Object.values(a.asignaciones).includes("A")
  ).length;
  const comentariosGenerales = matriz.comentarios.filter((c) => c.referencia_tipo === "general");

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111111]">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-white/[0.08] flex-shrink-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 mr-2">
          {(
            [
              { key: "matriz", label: `Actividades (${matriz.actividades.length})` },
              { key: "comentarios", label: `Comentarios (${matriz.comentarios.length})` },
              { key: "versiones", label: `v${matriz.version_actual}` },
            ] as { key: TabActiva; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTabActiva(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tabActiva === key
                  ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                  : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Density toggle */}
        <button
          onClick={() => setDensity((d) => (d === "compact" ? "comfortable" : "compact"))}
          title={density === "compact" ? "Vista cómoda" : "Vista compacta"}
          className="p-1.5 rounded text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          {density === "comfortable" ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 9h16M4 13h16M4 17h16M4 21h4M4 1h4" />
            </svg>
          )}
        </button>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          title="Exportar a CSV"
          className="p-1.5 rounded text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {!readOnly && (
          <>
            {/* Agregar columna dinámica */}
            <div className="relative">
              <button
                onClick={() => setShowAddCol(!showAddCol)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                + Columna
              </button>
              {showAddCol && (
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] rounded shadow-lg z-50">
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                    Atributo de Actividad
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevaColLabel}
                      onChange={(e) => setNuevaColLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                      placeholder="Ej. Entregable esperado"
                      className="flex-1 rounded border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5]"
                    />
                    <button
                      onClick={handleAddColumn}
                      className="px-3 py-1.5 rounded bg-[#28b8d5] text-white text-xs font-medium"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAddRol}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-[#28b8d5]/30 text-[#28b8d5] hover:bg-[#28b8d5]/5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar rol
            </button>

            <button
              onClick={handleAddActividad}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar actividad
            </button>

            <button
              onClick={handleClearMatrix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ml-2"
            >
              Empezar desde cero
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#28b8d5] text-white hover:bg-[#28b8d5]/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </button>
          </>
        )}
      </div>

      {/* ── Tab: Matriz ──────────────────────────────────────────────────── */}
      {tabActiva === "matriz" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Grid RACI */}
          <div className="flex-1 overflow-auto">
            {/* Barra de búsqueda + categorías */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-white/25 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar actividad..."
                  className="pl-6 pr-2 py-0.5 rounded border border-gray-200 dark:border-white/[0.08] bg-transparent text-[10px] text-gray-700 dark:text-white/60 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-[#28b8d5]/50 w-36"
                />
              </div>

              <div className="w-px h-4 bg-gray-200 dark:bg-white/[0.06]" />

              {/* Filtro categorías */}
              <button
                onClick={() => setFiltroCategoria("todas")}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                  filtroCategoria === "todas"
                    ? "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/70"
                    : "text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/40"
                }`}
              >
                Todas ({matriz.actividades.length})
              </button>
              {(Object.keys(CATEGORIA_LABELS) as CategoriaActividad[])
                .filter((cat) => matriz.actividades.some((a) => a.categoria === cat))
                .map((cat) => {
                  const count = matriz.actividades.filter((a) => a.categoria === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFiltroCategoria(cat)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                        filtroCategoria === cat
                          ? CATEGORIA_COLORS[cat]
                          : "text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/40"
                      }`}
                    >
                      {CATEGORIA_LABELS[cat]} ({count})
                    </button>
                  );
                })}
            </div>

            {/* Leyenda RACI */}
            <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0 bg-gray-50/50 dark:bg-white/[0.01]">
              <span className="text-[10px] text-gray-400 dark:text-white/25 font-medium">Leyenda:</span>
              {RACI_ORDER.map((r) => (
                <div key={r} className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${RACI_COLORS[r]}`}>
                    {r}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-white/30">{RACI_LABELS[r]}</span>
                </div>
              ))}
              {!readOnly && (
                <span className="ml-auto text-[10px] text-gray-300 dark:text-white/20 italic">
                  Clic en celda para ciclar · Clic en encabezado de rol para editar
                </span>
              )}
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                    {/* Columna actividad */}
                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-[#0d0d0d] text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-white/30 min-w-[220px] border-r border-gray-200 dark:border-white/[0.08]">
                      Actividad / Proceso
                    </th>
                    {/* Columnas dinámicas */}
                    {columnasDinamicas.map((col) => (
                      <th key={col.id} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 dark:text-white/40 min-w-[120px] max-w-[150px] border-r border-gray-200 dark:border-white/[0.08]">
                        <div className="truncate" title={col.label}>{col.label}</div>
                      </th>
                    ))}
                    {/* Columnas de roles */}
                    {matriz.roles.map((rol) => (
                      <th
                        key={rol.id}
                        className="px-3 py-2 text-center text-[10px] min-w-[100px] max-w-[130px] border-l border-gray-100 dark:border-white/[0.05]"
                      >
                        <button
                          onClick={() => {
                            setActividadSeleccionada(null);
                            setRolSeleccionado((prev) => (prev?.id === rol.id ? null : rol));
                          }}
                          className={`group/rol w-full text-center transition-colors rounded py-0.5 px-1 ${
                            rolSeleccionado?.id === rol.id
                              ? "text-[#28b8d5]"
                              : "text-gray-600 dark:text-white/60 hover:text-[#28b8d5] hover:bg-[#28b8d5]/5"
                          }`}
                          title={rol.descripcion || undefined}
                        >
                          <span className="text-[11px] font-semibold leading-tight block truncate">
                            {rol.nombre}
                          </span>
                          {rol.area && (
                            <span className="text-[9px] text-gray-400 dark:text-white/25 font-normal block truncate">
                              {rol.area}
                            </span>
                          )}
                          {!readOnly && (
                            <span className="text-[9px] text-gray-300 dark:text-white/15 opacity-0 group-hover/rol:opacity-100 transition-opacity block">
                              Editar →
                            </span>
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actividadesFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={matriz.roles.length + columnasDinamicas.length + 1}
                        className="px-4 py-8 text-center text-xs text-gray-400 dark:text-white/25"
                      >
                        {searchQuery
                          ? `Sin resultados para "${searchQuery}"`
                          : "No hay actividades para esta categoría."}
                      </td>
                    </tr>
                  )}
                  {actividadesFiltradas.map((actividad, idx) => {
                    const isSelected = actividadSeleccionada?.id === actividad.id;
                    const comentariosCount = matriz.comentarios.filter(
                      (c) => c.referencia_id === actividad.id
                    ).length;
                    const issues = getRowIssues(actividad);
                    const validationShadow = issues.multipleA
                      ? "inset 3px 0 0 rgb(239 68 68)"
                      : issues.missingA
                      ? "inset 3px 0 0 rgb(245 158 11)"
                      : issues.missingR
                      ? "inset 3px 0 0 rgb(249 115 22)"
                      : "none";

                    return (
                      <tr
                        key={actividad.id}
                        className={`border-b border-gray-100 dark:border-white/[0.04] transition-colors group ${
                          isSelected
                            ? "bg-[#28b8d5]/[0.04] dark:bg-[#28b8d5]/[0.06]"
                            : idx % 2 === 0
                            ? "bg-white dark:bg-transparent"
                            : "bg-gray-50/50 dark:bg-white/[0.01]"
                        } hover:bg-[#28b8d5]/[0.03] dark:hover:bg-[#28b8d5]/[0.04]`}
                      >
                        {/* Columna actividad (sticky) */}
                        <td
                          className={`sticky left-0 z-10 border-r border-gray-200 dark:border-white/[0.08] px-4 ${ROW_PY[density]} cursor-pointer ${
                            isSelected
                              ? "bg-[#28b8d5]/[0.04] dark:bg-[#28b8d5]/[0.06]"
                              : idx % 2 === 0
                              ? "bg-white dark:bg-[#111111]"
                              : "bg-gray-50/40 dark:bg-[#111111]"
                          }`}
                          style={{ boxShadow: validationShadow }}
                          onClick={() => {
                            setRolSeleccionado(null);
                            setActividadSeleccionada(isSelected ? null : actividad);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`flex-1 truncate font-medium text-gray-800 dark:text-white/80 ${density === "compact" ? "text-[11px]" : "text-xs"}`}>
                                  {actividad.nombre}
                                </span>
                                {comentariosCount > 0 && (
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold flex items-center justify-center">
                                    {comentariosCount}
                                  </span>
                                )}
                                {(issues.missingR || issues.missingA || issues.multipleA) && (
                                  <span
                                    title={[
                                      issues.multipleA && "Múltiples Aprobadores (A)",
                                      issues.missingA && "Sin Aprobador (A)",
                                      issues.missingR && "Sin Responsable (R)",
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                    className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                      issues.multipleA
                                        ? "bg-red-500 text-white"
                                        : "bg-amber-500 text-white"
                                    }`}
                                  >
                                    !
                                  </span>
                                )}
                              </div>
                              <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${CATEGORIA_COLORS[actividad.categoria]}`}>
                                {CATEGORIA_LABELS[actividad.categoria]}
                              </span>
                            </div>
                            <svg
                              className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-transform ${
                                isSelected
                                  ? "text-[#28b8d5] rotate-90"
                                  : "text-gray-300 dark:text-white/20 group-hover:text-gray-400"
                              }`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </td>

                        {/* Columnas dinámicas */}
                        {columnasDinamicas.map((col) => (
                          <td key={col.id} className={`px-3 ${ROW_PY[density]} text-xs text-gray-600 dark:text-white/50 border-r border-gray-200 dark:border-white/[0.08] truncate max-w-[150px]`}>
                            {(actividad as unknown as Record<string, unknown>)[col.id] ? (
                              String((actividad as unknown as Record<string, unknown>)[col.id])
                            ) : (
                              <span className="text-gray-300 dark:text-white/20">—</span>
                            )}
                          </td>
                        ))}

                        {/* Celdas RACI por rol */}
                        {matriz.roles.map((rol) => {
                          const asig = actividad.asignaciones[rol.id] as AsignacionRaci | undefined;
                          return (
                            <td
                              key={rol.id}
                              className={`px-1.5 ${ROW_PY[density]} text-center border-l border-gray-100 dark:border-white/[0.04]`}
                            >
                              <button
                                onClick={() => handleCellCycle(actividad.id, rol.id)}
                                disabled={readOnly}
                                title={
                                  asig
                                    ? `${asig} — ${RACI_LABELS[asig]}. Clic para cambiar.`
                                    : readOnly
                                    ? "Sin asignación"
                                    : "Sin asignación · Clic para asignar"
                                }
                                className={`${CELL_SIZE[density]} rounded-md text-[11px] font-bold mx-auto flex items-center justify-center transition-all select-none ${
                                  asig
                                    ? `${RACI_COLORS[asig]} shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/5`
                                    : readOnly
                                    ? "text-gray-200 dark:text-white/10"
                                    : "border border-dashed border-gray-200 dark:border-white/[0.08] text-gray-300 dark:text-white/15 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer"
                                }`}
                              >
                                {asig ?? ""}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel lateral actividad */}
          {actividadSeleccionada && !rolSeleccionado && (
            <PanelActividad
              actividad={actividadSeleccionada}
              roles={matriz.roles}
              comentarios={matriz.comentarios}
              columnasDinamicas={columnasDinamicas}
              onUpdate={handleUpdateActividad}
              onDelete={handleDeleteActividad}
              onClose={() => setActividadSeleccionada(null)}
              onAddComment={onAddComment}
              readOnly={readOnly}
            />
          )}

          {/* Panel lateral rol */}
          {rolSeleccionado && !actividadSeleccionada && (
            <PanelRol
              rol={rolSeleccionado}
              onUpdate={handleUpdateRol}
              onDelete={handleDeleteRol}
              onClose={() => setRolSeleccionado(null)}
              readOnly={readOnly}
            />
          )}
        </div>
      )}

      {/* ── Tab: Comentarios ─────────────────────────────────────────────── */}
      {tabActiva === "comentarios" && (
        <div className="flex-1 overflow-y-auto px-6 py-4 max-w-3xl">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/70 mb-4">
            Comentarios generales ({comentariosGenerales.length})
          </h3>
          <div className="space-y-3 mb-6">
            {comentariosGenerales.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-white/25">Sin comentarios generales.</p>
            )}
            {comentariosGenerales.map((c) => (
              <div key={c.id} className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3 border border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/60">{c.autor_nombre}</span>
                    <span className="text-[10px] text-gray-400 dark:text-white/25">{c.autor_perfil}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    c.estado === "abierto"
                      ? "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      : "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                  }`}>
                    {c.estado}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-white/50 leading-relaxed">{c.contenido}</p>
                <p className="text-[10px] text-gray-300 dark:text-white/20 mt-1">
                  {new Date(c.created_at).toLocaleDateString("es-CO", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <textarea
                value={nuevoComentarioGeneral}
                onChange={(e) => setNuevoComentarioGeneral(e.target.value)}
                placeholder="Agregar comentario general sobre la matriz RACI..."
                rows={3}
                className="flex-1 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-3 py-2 text-xs text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-[#28b8d5]/50 resize-none"
              />
              <button
                onClick={handleAddComentarioGeneral}
                disabled={!nuevoComentarioGeneral.trim()}
                className="self-end px-4 py-2 rounded text-xs font-semibold bg-[#28b8d5] text-white hover:bg-[#28b8d5]/90 disabled:opacity-40 transition-colors"
              >
                Agregar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Versiones ───────────────────────────────────────────────── */}
      {tabActiva === "versiones" && (
        <div className="flex-1 overflow-y-auto px-6 py-4 max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/70 mb-4">
            Historial de versiones
          </h3>
          {matriz.historial_versiones.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-white/25">
              El historial se registra a partir del primer guardado.
            </p>
          ) : (
            <div className="space-y-3">
              {[...matriz.historial_versiones].reverse().map((v, i) => (
                <div
                  key={v.version}
                  className={`flex gap-4 pb-3 ${i < matriz.historial_versiones.length - 1 ? "border-b border-gray-100 dark:border-white/[0.04]" : ""}`}
                >
                  <div className="flex-shrink-0 text-right w-12">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      i === 0
                        ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                        : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/30"
                    }`}>
                      v{v.version}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-white/70 mb-0.5">
                      {v.descripcion_cambio}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-white/25">
                      <span>{v.autor}</span>
                      <span>·</span>
                      <span>{v.total_actividades} actividades, {v.total_roles} roles</span>
                      <span>·</span>
                      <span>
                        {new Date(v.fecha).toLocaleDateString("es-CO", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.08] px-4 py-2 flex items-center gap-3 text-[10px] text-gray-400 dark:text-white/25">
        <span>
          <span className="font-semibold text-gray-600 dark:text-white/50">{matriz.actividades.length}</span> actividades
        </span>
        <span>·</span>
        <span>
          <span className="font-semibold text-gray-600 dark:text-white/50">{matriz.roles.length}</span> roles
        </span>
        <span>·</span>
        <span>
          <span className="font-semibold text-gray-600 dark:text-white/50">{totalAsignaciones}</span> asignaciones
        </span>
        {actividadesSinR > 0 && (
          <>
            <span>·</span>
            <span className="text-orange-500 dark:text-orange-400 font-medium">
              {actividadesSinR} sin Responsable (R)
            </span>
          </>
        )}
        {actividadesSinA > 0 && (
          <>
            <span>·</span>
            <span className="text-amber-500 dark:text-amber-400 font-medium">
              {actividadesSinA} sin Aprobador (A)
            </span>
          </>
        )}
        <div className="flex-1" />
        <span>Actualizado {new Date(matriz.updated_at).toLocaleDateString("es-CO")}</span>
      </div>
    </div>
  );
}

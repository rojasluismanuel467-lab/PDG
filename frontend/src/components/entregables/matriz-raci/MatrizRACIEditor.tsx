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
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MatrizRACIEditor — Editor principal de la Matriz RACI / Roles AS-IS
// ============================================================================

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

const RACI_ORDER: AsignacionRaci[] = ["R", "A", "C", "I"];
const RACI_CYCLE: (AsignacionRaci | undefined)[] = ["R", "A", "C", "I", undefined];

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

  // Sync cuando matrizProp cambia desde arriba
  useEffect(() => {
    setMatriz(matrizProp);
  }, [matrizProp]);
  const [tabActiva, setTabActiva] = useState<TabActiva>("matriz");
  const [actividadSeleccionada, setActividadSeleccionada] = useState<ActividadRaci | null>(null);
  const [nuevoComentarioGeneral, setNuevoComentarioGeneral] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaActividad | "todas">("todas");
  const [hasChanges, setHasChanges] = useState(false);

  // ── Columnas dinámicas ─────────────────────────────────────────────────
  const storageKey = `raci-columnas-${matrizProp.id || "default"}`;
  const [columnasDinamicas, setColumnasDinamicas] = useState<{ id: string; label: string }[]>([]);
  const [showAddCol, setShowAddCol] = useState(false);
  const [nuevaColLabel, setNuevaColLabel] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setColumnasDinamicas(JSON.parse(saved));
      } catch (e) {}
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

  // Ya no usamos storage local, se ha quitado el hook useEffect de carga aquí.

  // ── Helpers ──────────────────────────────────────────────────────────
  const mutate = useCallback((patch: Partial<MatrizRaci>) => {
    setMatriz((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  }, []);

  // ── Actividades filtradas ─────────────────────────────────────────────
  const actividadesFiltradas =
    filtroCategoria === "todas"
      ? matriz.actividades
      : matriz.actividades.filter((a) => a.categoria === filtroCategoria);

  // ── Cambiar celda RACI (Select) ───────────────────────────────────────
  const handleCellChange = useCallback(
    (actividadId: string, rolId: string, value: string) => {
      if (readOnly) return;
      const next = value === "" ? undefined : (value as AsignacionRaci);
      setMatriz((prev) => {
        const actividades = prev.actividades.map((a) => {
          if (a.id !== actividadId) return a;
          const nuevas = { ...a.asignaciones };
          if (next === undefined) delete nuevas[rolId];
          else nuevas[rolId] = next;
          return { ...a, asignaciones: nuevas };
        });
        return { ...prev, actividades };
      });
      setHasChanges(true);
      // Actualizar panel si está abierto
      setActividadSeleccionada((prev) => {
        if (!prev || prev.id !== actividadId) return prev;
        const nuevas = { ...prev.asignaciones };
        if (next === undefined) delete nuevas[rolId];
        else nuevas[rolId] = next;
        return { ...prev, asignaciones: nuevas };
      });
    },
    [readOnly]
  );
  
  // ── Empezar desde cero ────────────────────────────────────────────────
  const handleClearMatrix = () => {
    if (!confirm("¿Estás seguro de querer limpiar la matriz? Se borrarán todas las actividades y roles.")) return;
    mutate({ actividades: [], roles: [] });
  };

  // ── Agregar actividad ────────────────────────────────────────────────
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
    setActividadSeleccionada(nueva);
  };

  // ── Actualizar actividad desde panel ─────────────────────────────────
  const handleUpdateActividad = useCallback((updated: ActividadRaci) => {
    setMatriz((prev) => ({
      ...prev,
      actividades: prev.actividades.map((a) => (a.id === updated.id ? updated : a)),
    }));
    setActividadSeleccionada(updated);
    setHasChanges(true);
  }, []);

  // ── Eliminar actividad ────────────────────────────────────────────────
  const handleDeleteActividad = useCallback((id: string) => {
    setMatriz((prev) => ({
      ...prev,
      actividades: prev.actividades.filter((a) => a.id !== id),
    }));
    setActividadSeleccionada(null);
    setHasChanges(true);
  }, []);

  // ── Agregar rol ──────────────────────────────────────────────────────
  const handleAddRol = () => {
    const nuevo: RolRaci = {
      id: uuidv4(),
      nombre: "Nuevo rol",
      area: "",
      descripcion: "",
    };
    mutate({ roles: [...matriz.roles, nuevo] });
  };

  // ── Guardar ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    await onSave(matriz);
    setHasChanges(false);
  };

  // ── Comentario general ────────────────────────────────────────────────
  const handleAddComentarioGeneral = async () => {
    if (!nuevoComentarioGeneral.trim()) return;
    await onAddComment(null, "general", nuevoComentarioGeneral.trim());
    setNuevoComentarioGeneral("");
  };

  // ── Stats ─────────────────────────────────────────────────────────────
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

  const comentariosGenerales = matriz.comentarios.filter(
    (c) => c.referencia_tipo === "general"
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111111]">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
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

      {/* ── Contenido por tab ─────────────────────────────────────────── */}
      {tabActiva === "matriz" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Grid RACI */}
          <div className="flex-1 overflow-auto">
            {/* Filtro categorías */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0 flex-wrap">
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
            <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0">
              <span className="text-[10px] text-gray-400 dark:text-white/25 font-medium">Leyenda:</span>
              {RACI_ORDER.map((r) => (
                <div key={r} className="flex items-center gap-1">
                  <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${RACI_COLORS[r]}`}>
                    {r}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-white/30">{RACI_LABELS[r]}</span>
                </div>
              ))}
              {!readOnly && (
                <span className="ml-auto text-[10px] text-gray-300 dark:text-white/20 italic">
                  Clic en celda para asignar
                </span>
              )}
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/[0.08]">
                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-[#0d0d0d] text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-white/30 min-w-[220px] border-r border-gray-200 dark:border-white/[0.08]">
                      Actividad / Proceso
                    </th>
                    {columnasDinamicas.map((col) => (
                      <th key={col.id} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 dark:text-white/40 min-w-[120px] max-w-[150px] border-r border-gray-200 dark:border-white/[0.08]">
                        <div className="truncate" title={col.label}>{col.label}</div>
                      </th>
                    ))}
                    {matriz.roles.map((rol) => (
                      <th
                        key={rol.id}
                        title={rol.descripcion}
                        className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-500 dark:text-white/40 min-w-[100px] max-w-[130px]"
                      >
                        <div className="leading-tight">
                          <input
                            type="text"
                            value={rol.nombre}
                            onChange={(e) => {
                              mutate({
                                roles: matriz.roles.map((r) => 
                                  r.id === rol.id ? { ...r, nombre: e.target.value } : r
                                )
                              });
                            }}
                            disabled={readOnly}
                            className={`w-full bg-transparent text-center text-gray-700 dark:text-white/70 font-semibold focus:outline-none focus:border-b border-[#28b8d5] ${readOnly ? "cursor-default" : ""}`}
                          />
                          {rol.area && (
                            <div className="text-[9px] text-gray-400 dark:text-white/25 truncate font-normal">
                              {rol.area}
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actividadesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={matriz.roles.length + columnasDinamicas.length + 1} className="px-4 py-8 text-center text-xs text-gray-400 dark:text-white/25">
                        No hay actividades para esta categoría.
                      </td>
                    </tr>
                  )}
                  {actividadesFiltradas.map((actividad, idx) => {
                    const isSelected = actividadSeleccionada?.id === actividad.id;
                    const comentariosCount = matriz.comentarios.filter(
                      (c) => c.referencia_id === actividad.id
                    ).length;
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
                        {/* Actividad info */}
                        <td
                          className="sticky left-0 z-10 border-r border-gray-200 dark:border-white/[0.08] px-4 py-2.5 cursor-pointer"
                          style={{
                            background: isSelected
                              ? "rgba(40, 184, 213, 0.04)"
                              : idx % 2 === 0
                              ? "white"
                              : "rgba(249,250,251,0.5)",
                          }}
                          onClick={() =>
                            setActividadSeleccionada(
                              isSelected ? null : actividad
                            )
                          }
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <input
                                  type="text"
                                  value={actividad.nombre}
                                  onChange={(e) => {
                                    mutate({
                                      actividades: matriz.actividades.map((a) =>
                                        a.id === actividad.id ? { ...a, nombre: e.target.value } : a
                                      )
                                    });
                                  }}
                                  disabled={readOnly}
                                  className={`w-full bg-transparent text-xs font-medium text-gray-800 dark:text-white/80 focus:outline-none focus:border-b border-[#28b8d5] ${readOnly ? "cursor-default" : ""}`}
                                />
                                {comentariosCount > 0 && (
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold flex items-center justify-center">
                                    {comentariosCount}
                                  </span>
                                )}
                              </div>
                              <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${CATEGORIA_COLORS[actividad.categoria]}`}>
                                {CATEGORIA_LABELS[actividad.categoria]}
                              </span>
                            </div>
                            <svg
                              className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 transition-transform ${isSelected ? "text-[#28b8d5] rotate-90" : "text-gray-300 dark:text-white/20 group-hover:text-gray-400"}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </td>

                        {/* Columnas dinámicas de actividad */}
                        {columnasDinamicas.map((col) => (
                          <td key={col.id} className="px-3 py-2 text-xs text-gray-600 dark:text-white/50 border-r border-gray-200 dark:border-white/[0.08] truncate max-w-[150px]">
                            {(actividad as any)[col.id] || (
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
                              className="px-2 py-2 text-center"
                            >
                              <select
                                value={asig || ""}
                                onChange={(e) => handleCellChange(actividad.id, rol.id, e.target.value)}
                                disabled={readOnly}
                                className={`w-10 h-8 rounded text-xs font-bold mx-auto appearance-none text-center outline-none cursor-pointer transition-all ${
                                  asig
                                    ? `${RACI_COLORS[asig]} shadow-sm`
                                    : "bg-transparent text-gray-400 dark:text-white/30 border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                }`}
                                style={{ textAlignLast: "center" }}
                              >
                                <option value="" className="text-gray-500 bg-white dark:bg-[#1a1a1a]">·</option>
                                {RACI_ORDER.map((r) => (
                                  <option key={r} value={r} className="text-gray-800 bg-white dark:bg-[#1a1a1a]">
                                    {r}
                                  </option>
                                ))}
                              </select>
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
          {actividadSeleccionada && (
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
        </div>
      )}

      {/* ── Tab: Comentarios ─────────────────────────────────────────── */}
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
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
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

      {/* ── Tab: Versiones ───────────────────────────────────────────── */}
      {tabActiva === "versiones" && (
        <div className="flex-1 overflow-y-auto px-6 py-4 max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/70 mb-4">
            Historial de versiones
          </h3>
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
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.08] px-4 py-2 flex items-center gap-4 text-[10px] text-gray-400 dark:text-white/25">
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
            <span className="text-amber-500 dark:text-amber-400 font-medium">
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

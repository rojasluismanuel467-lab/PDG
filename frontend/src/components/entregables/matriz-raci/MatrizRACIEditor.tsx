"use client";
import React, { useState, useCallback, useEffect } from "react";
import type {
  MatrizRaci,
  ActividadRaci,
  RolRaci,
  AsignacionRaci,
  CategoriaActividad,
} from "@/lib/types/matriz-raci.types";
import PanelActividad, {
  CATEGORIA_COLORS,
  CATEGORIA_LABELS,
  RACI_COLORS,
  RACI_LABELS,
} from "./PanelActividad";
import PanelRol from "./PanelRol";
import CeldaCommentPopover from "./CeldaCommentPopover";
import ContextMenuRaci, { type ContextMenuRaciState } from "./ContextMenuRaci";
import { v4 as uuidv4 } from "uuid";
import { raciApi } from "@/lib/api/raci";

interface MatrizRACIEditorProps {
  matriz: MatrizRaci;
  onSave: (matriz: MatrizRaci) => Promise<void>;
  onGenerateIA: () => Promise<void>;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "actividad" | "rol" | "celda" | "general",
    contenido: string,
    rolId?: string | null
  ) => Promise<void>;
  isSaving: boolean;
  isGenerating: boolean;
  readOnly?: boolean;
  artifactCode?: string;
  projectId?: string;
}

type TabActiva = "matriz" | "versiones";
type Density = "compact" | "comfortable";

const RACI_ORDER: AsignacionRaci[] = ["R", "A", "C", "I"];
const RACI_CYCLE: (AsignacionRaci | undefined)[] = ["R", "A", "C", "I", undefined];
const CATEGORY_ORDER: CategoriaActividad[] = [
  "gobernanza", "calidad", "seguridad", "integracion",
  "reportes", "operaciones", "arquitectura", "otro",
];

const CELL_W: Record<Density, string> = {
  compact: "w-9 h-9",
  comfortable: "w-11 h-11",
};
const ROW_PY: Record<Density, string> = {
  compact: "py-1.5",
  comfortable: "py-3",
};

function getRowIssues(actividad: ActividadRaci) {
  const vals = Object.values(actividad.asignaciones);
  return {
    missingR: !vals.includes("R"),
    missingA: !vals.includes("A"),
    multipleA: vals.filter((v) => v === "A").length > 1,
  };
}

function getRoleStats(actividades: ActividadRaci[], rolId: string) {
  const counts: Record<AsignacionRaci, number> = { R: 0, A: 0, C: 0, I: 0 };
  actividades.forEach((a) => {
    const asig = a.asignaciones[rolId] as AsignacionRaci | undefined;
    if (asig) counts[asig]++;
  });
  return counts;
}

export default function MatrizRACIEditor({
  matriz: matrizProp,
  onSave,
  onGenerateIA,
  onAddComment,
  isSaving,
  isGenerating,
  readOnly = false,
  artifactCode,
  projectId,
}: MatrizRACIEditorProps) {
  const [matriz, setMatriz] = useState<MatrizRaci>(matrizProp);
  useEffect(() => { setMatriz(matrizProp); }, [matrizProp]);
  const [isCopying, setIsCopying] = useState(false);

  const [tabActiva, setTabActiva] = useState<TabActiva>("matriz");
  const [actividadSeleccionada, setActividadSeleccionada] = useState<ActividadRaci | null>(null);
  const [rolSeleccionado, setRolSeleccionado] = useState<RolRaci | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaActividad | "todas">("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuRaciState | null>(null);

  const openContextMenu = useCallback((e: React.MouseEvent, target: ContextMenuRaciState["target"]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, target });
    setCeldaPopover(null);
  }, []);

  // Cell comment popover state
  const [celdaPopover, setCeldaPopover] = useState<{
    actividadId: string;
    rolId: string;
    x: number;
    y: number;
  } | null>(null);

  const mutate = useCallback((patch: Partial<MatrizRaci>) => {
    setMatriz((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  }, []);

  const handleCopyFromAsis = useCallback(async () => {
    if (!projectId) return;
    setIsCopying(true);
    try {
      const matrices = await raciApi.listByProject(projectId);
      const asIsMatrix = matrices.find((m) => m.entregable_id !== matriz.entregable_id);
      if (!asIsMatrix) return;

      const asIsGrid = await raciApi.getGrid(asIsMatrix.id);

      const roleIdMap: Record<string, string> = {};
      const newRoles: RolRaci[] = asIsGrid.roles.map((role) => {
        const newId = uuidv4();
        roleIdMap[role.id] = newId;
        return { ...role, id: newId };
      });

      const newActividades: ActividadRaci[] = asIsGrid.actividades.map((act) => {
        const newAsignaciones: Record<string, AsignacionRaci> = {};
        for (const [oldRoleId, asig] of Object.entries(act.asignaciones)) {
          const newRoleId = roleIdMap[oldRoleId];
          if (newRoleId) newAsignaciones[newRoleId] = asig;
        }
        return { ...act, id: uuidv4(), asignaciones: newAsignaciones };
      });

      await onSave({ ...matriz, roles: newRoles, actividades: newActividades });
    } finally {
      setIsCopying(false);
    }
  }, [projectId, matriz, onSave]);

  const actividadesFiltradas = matriz.actividades
    .filter((a) => filtroCategoria === "todas" || a.categoria === filtroCategoria)
    .filter(
      (a) =>
        !searchQuery ||
        a.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.descripcion?.toLowerCase() ?? "").includes(searchQuery.toLowerCase())
    );

  const actividadesPorCategoria = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = actividadesFiltradas.filter((a) => a.categoria === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<CategoriaActividad, ActividadRaci[]>);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Cell direct assign (from context menu) ───────────────────────────────
  const handleSetAsig = useCallback(
    (actividadId: string, rolId: string, asig: AsignacionRaci | null) => {
      if (readOnly) return;
      setMatriz((prev) => {
        const actividades = prev.actividades.map((a) => {
          if (a.id !== actividadId) return a;
          const nuevas = { ...a.asignaciones };
          if (asig === null) delete nuevas[rolId];
          else nuevas[rolId] = asig;
          return { ...a, asignaciones: nuevas };
        });
        return { ...prev, actividades };
      });
      setHasChanges(true);
    },
    [readOnly]
  );

  // ── Cell cycle ────────────────────────────────────────────────────────────
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

  const handleDuplicateActividad = useCallback((actividad: ActividadRaci) => {
    const copia: ActividadRaci = {
      ...actividad,
      id: uuidv4(),
      nombre: `${actividad.nombre} (copia)`,
      asignaciones: { ...actividad.asignaciones },
    };
    setMatriz((prev) => {
      const idx = prev.actividades.findIndex((a) => a.id === actividad.id);
      const newList = [...prev.actividades];
      newList.splice(idx + 1, 0, copia);
      return { ...prev, actividades: newList };
    });
    setHasChanges(true);
    setActividadSeleccionada(copia);
  }, []);

  const handleMoveActividad = useCallback((id: string, direction: "up" | "down") => {
    setMatriz((prev) => {
      const idx = prev.actividades.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.actividades.length) return prev;
      const newList = [...prev.actividades];
      [newList[idx], newList[newIdx]] = [newList[newIdx], newList[idx]];
      return { ...prev, actividades: newList };
    });
    setHasChanges(true);
  }, []);

  const handleUpdateActividad = useCallback((updated: ActividadRaci) => {
    setMatriz((prev) => ({
      ...prev,
      actividades: prev.actividades.map((a) => (a.id === updated.id ? updated : a)),
    }));
    setActividadSeleccionada(updated);
    setHasChanges(true);
  }, []);

  const handleDeleteActividad = useCallback((id: string) => {
    setMatriz((prev) => ({ ...prev, actividades: prev.actividades.filter((a) => a.id !== id) }));
    setActividadSeleccionada(null);
    setHasChanges(true);
  }, []);

  // ── Roles ─────────────────────────────────────────────────────────────────
  const handleAddRol = () => {
    const nuevo: RolRaci = { id: uuidv4(), nombre: "Nuevo rol", area: "", descripcion: "" };
    mutate({ roles: [...matriz.roles, nuevo] });
    setActividadSeleccionada(null);
    setRolSeleccionado(nuevo);
  };

  const handleUpdateRol = useCallback((updated: RolRaci) => {
    setMatriz((prev) => ({ ...prev, roles: prev.roles.map((r) => (r.id === updated.id ? updated : r)) }));
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

  const handleClearMatrix = () => {
    if (!confirm("¿Eliminar todas las actividades y roles de la matriz?")) return;
    mutate({ actividades: [], roles: [] });
    setActividadSeleccionada(null);
    setRolSeleccionado(null);
  };

  const handleSave = async () => {
    await onSave(matriz);
    setHasChanges(false);
  };

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
    (sum, a) => sum + Object.keys(a.asignaciones).length, 0
  );
  const actividadesSinR = matriz.actividades.filter(
    (a) => matriz.roles.length > 0 && !Object.values(a.asignaciones).includes("R")
  ).length;
  const actividadesSinA = matriz.actividades.filter(
    (a) => matriz.roles.length > 0 && !Object.values(a.asignaciones).includes("A")
  ).length;
  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-[#0f0f0f]"
      onClick={() => { setShowMoreMenu(false); setContextMenu(null); }}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0f0f0f] flex-shrink-0 shadow-sm dark:shadow-none">
        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {(
            [
              { key: "matriz", label: "Matriz" },
              { key: "versiones", label: `v${matriz.version_actual}` },
            ] as { key: TabActiva; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTabActiva(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tabActiva === key
                  ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                  : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Right: action buttons */}
        {!readOnly ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAddActividad}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-200 dark:border-white/[0.10] text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:border-gray-300 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Actividad
            </button>

            <button
              onClick={handleAddRol}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#28b8d5]/40 text-[#28b8d5] hover:bg-[#28b8d5]/8 hover:border-[#28b8d5]/60 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Rol
            </button>

            {/* More options menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMoreMenu((p) => !p)}
                title="Más opciones"
                className={`p-1.5 rounded-md transition-colors ${
                  showMoreMenu
                    ? "bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60"
                    : "text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-lg shadow-black/10 dark:shadow-black/50 z-50 py-1.5 overflow-hidden">
                  <button
                    onClick={() => { setDensity((d) => (d === "compact" ? "comfortable" : "compact")); setShowMoreMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    {density === "compact" ? "Vista cómoda" : "Vista compacta"}
                  </button>
                  <button
                    onClick={() => { handleExportCSV(); setShowMoreMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar CSV
                  </button>
                  <div className="my-1 mx-2 border-t border-gray-100 dark:border-white/[0.06]" />
                  <button
                    onClick={() => { handleClearMatrix(); setShowMoreMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Empezar desde cero
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-white/[0.06] mx-0.5" />

            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-[#28b8d5] text-white hover:bg-[#1fa3be] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#28b8d5]/25"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  {hasChanges && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                  )}
                  Guardar
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
        )}
      </div>

      {/* ── Tab: Matriz ──────────────────────────────────────────────────── */}
      {tabActiva === "matriz" && (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {/* Search + category filter bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/60 dark:bg-white/[0.01] flex-shrink-0 flex-wrap">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-white/25 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar actividad…"
                  className="pl-7 pr-3 py-1 rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-transparent text-xs text-gray-700 dark:text-white/60 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-[#28b8d5]/50 w-44"
                />
              </div>

              <div className="w-px h-4 bg-gray-200 dark:bg-white/[0.06]" />

              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFiltroCategoria("todas")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    filtroCategoria === "todas"
                      ? "bg-gray-700 text-white dark:bg-white/20 dark:text-white"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50"
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
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                          filtroCategoria === cat
                            ? CATEGORIA_COLORS[cat]
                            : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50"
                        }`}
                      >
                        {CATEGORIA_LABELS[cat]} ({count})
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Empty state */}
            {matriz.actividades.length === 0 && matriz.roles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/[0.06] dark:to-white/[0.02] flex items-center justify-center mb-5 shadow-inner">
                  <svg className="w-7 h-7 text-gray-300 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-.375a1.125 1.125 0 011.125-1.125h.375M3.375 6.375h17.25m-17.25 0a1.125 1.125 0 01-1.125 1.125m0-1.125c0-.621.504-1.125 1.125-1.125M21 6.375v12c0 .621-.504 1.125-1.125 1.125M21 6.375a1.125 1.125 0 00-1.125-1.125H4.125A1.125 1.125 0 003 6.375" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-white/50 mb-1.5">
                  Matriz vacía
                </p>
                <p className="text-xs text-gray-400 dark:text-white/25 max-w-xs leading-relaxed mb-6">
                  Agrega los roles del equipo responsable y las actividades o procesos de datos que necesitan asignación RACI.
                </p>
                {!readOnly && (
                  <div className="flex flex-col items-center gap-3">
                    {artifactCode === "TOBE_RACI_MATRIX" && projectId && (
                      <button
                        onClick={handleCopyFromAsis}
                        disabled={isCopying || isSaving}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {isCopying ? "Copiando…" : "Copiar desde AS-IS"}
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddRol}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[#28b8d5]/40 text-[#28b8d5] hover:bg-[#28b8d5]/8 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Agregar rol
                      </button>
                      <button
                        onClick={handleAddActividad}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#28b8d5] text-white hover:bg-[#1fa3be] transition-all shadow-sm shadow-[#28b8d5]/20"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar actividad
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            {(matriz.actividades.length > 0 || matriz.roles.length > 0) && (
              <>
                {/* RACI legend */}
                <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 dark:border-white/[0.04] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {RACI_ORDER.map((r) => (
                      <div key={r} className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shadow-sm ${RACI_COLORS[r]}`}>
                          {r}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-white/25">{RACI_LABELS[r]}</span>
                      </div>
                    ))}
                  </div>
                  {!readOnly && (
                    <span className="ml-auto text-[10px] text-gray-300 dark:text-white/20 italic">
                      Clic en celda para ciclar · Clic en cabecera de rol para editar
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200 dark:border-white/[0.08] bg-gray-50/80 dark:bg-white/[0.02]">
                        {/* Activity column header */}
                        <th className="sticky left-0 z-20 bg-gray-50 dark:bg-[#111] text-left px-4 py-3 min-w-[240px] border-r border-gray-200 dark:border-white/[0.08]" style={{ boxShadow: "2px 0 4px -1px rgba(0,0,0,0.06)" }}>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Actividad / Proceso
                          </div>
                        </th>

                        {/* Role column headers */}
                        {matriz.roles.map((rol) => {
                          const stats = getRoleStats(matriz.actividades, rol.id);
                          const total = Object.values(stats).reduce((a, b) => a + b, 0);
                          const isActive = rolSeleccionado?.id === rol.id;
                          return (
                            <th
                              key={rol.id}
                              className="px-2 py-2 text-center min-w-[110px] max-w-[140px] border-l border-gray-100 dark:border-white/[0.05]"
                              onContextMenu={(e) => openContextMenu(e, { type: "rol", rolId: rol.id, rolNombre: rol.nombre })}
                            >
                              <button
                                onClick={() => {
                                  setActividadSeleccionada(null);
                                  setRolSeleccionado((prev) => (prev?.id === rol.id ? null : rol));
                                }}
                                className={`w-full flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all ${
                                  isActive
                                    ? "bg-[#28b8d5]/10 ring-1 ring-[#28b8d5]/30"
                                    : "hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                                }`}
                              >
                                {/* Avatar circle */}
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold uppercase transition-all ${
                                  isActive
                                    ? "bg-[#28b8d5] text-white shadow-md shadow-[#28b8d5]/30"
                                    : "bg-gray-200 dark:bg-white/[0.10] text-gray-600 dark:text-white/50"
                                }`}>
                                  {rol.nombre.slice(0, 2)}
                                </div>

                                <span className={`text-[11px] font-semibold leading-tight block w-full truncate text-center ${
                                  isActive ? "text-[#28b8d5]" : "text-gray-700 dark:text-white/70"
                                }`}>
                                  {rol.nombre}
                                </span>

                                {rol.area && (
                                  <span className="text-[9px] text-gray-400 dark:text-white/25 block w-full truncate text-center">
                                    {rol.area}
                                  </span>
                                )}

                                {/* Assignment count badges */}
                                {total > 0 && (
                                  <div className="flex items-center gap-0.5 flex-wrap justify-center mt-0.5">
                                    {(Object.entries(stats) as [AsignacionRaci, number][])
                                      .filter(([, c]) => c > 0)
                                      .map(([letter, count]) => (
                                        <span
                                          key={letter}
                                          className={`text-[8px] font-bold px-1 py-0.5 rounded-md leading-none ${RACI_COLORS[letter]}`}
                                        >
                                          {letter}{count}
                                        </span>
                                      ))}
                                  </div>
                                )}

                                {!readOnly && (
                                  <span className={`text-[9px] transition-opacity ${isActive ? "text-[#28b8d5]/60 opacity-100" : "text-gray-300 dark:text-white/15 opacity-0 group-hover:opacity-100"}`}>
                                    editar
                                  </span>
                                )}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {actividadesFiltradas.length === 0 && (
                        <tr>
                          <td
                            colSpan={matriz.roles.length + 1}
                            className="px-4 py-12 text-center text-xs text-gray-400 dark:text-white/25"
                          >
                            {searchQuery
                              ? `Sin resultados para "${searchQuery}"`
                              : "No hay actividades en esta categoría."}
                          </td>
                        </tr>
                      )}

                      {/* Grouped category rows */}
                      {Object.entries(actividadesPorCategoria).map(([cat, items]) => {
                        const isCollapsed = collapsedCategories.has(cat);
                        return (
                          <React.Fragment key={cat}>
                            {/* Category group header */}
                            <tr className="bg-gray-50/80 dark:bg-white/[0.025] border-y border-gray-100 dark:border-white/[0.05]">
                              <td colSpan={matriz.roles.length + 1} className="px-4 py-1.5">
                                <button
                                  onClick={() => toggleCategory(cat)}
                                  className="flex items-center gap-2 text-left group/cat"
                                >
                                  <svg
                                    className={`w-3 h-3 text-gray-400 dark:text-white/30 transition-transform duration-150 ${isCollapsed ? "-rotate-90" : ""}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORIA_COLORS[cat as CategoriaActividad]}`}>
                                    {CATEGORIA_LABELS[cat as CategoriaActividad]}
                                  </span>
                                  <span className="text-[10px] text-gray-400 dark:text-white/25">
                                    {items.length} {items.length === 1 ? "actividad" : "actividades"}
                                  </span>
                                </button>
                              </td>
                            </tr>

                            {/* Activity rows */}
                            {!isCollapsed && items.map((actividad) => {
                              const isSelected = actividadSeleccionada?.id === actividad.id;
                              const comentariosCount = matriz.comentarios.filter(
                                (c) => c.referencia_id === actividad.id
                              ).length;
                              const issues = getRowIssues(actividad);
                              const globalIdx = matriz.actividades.findIndex((a) => a.id === actividad.id);
                              const hasIssue = issues.missingR || issues.missingA || issues.multipleA;

                              return (
                                <tr
                                  key={actividad.id}
                                  className={`border-b border-gray-100 dark:border-white/[0.03] transition-colors group/row ${
                                    isSelected
                                      ? "bg-[#28b8d5]/[0.05] dark:bg-[#28b8d5]/[0.07]"
                                      : "bg-white dark:bg-transparent hover:bg-gray-50/60 dark:hover:bg-white/[0.02]"
                                  }`}
                                >
                                  {/* Activity cell (sticky) */}
                                  <td
                                    className={`sticky left-0 z-10 border-r border-gray-200 dark:border-white/[0.07] px-3 ${ROW_PY[density]} cursor-pointer ${
                                      isSelected
                                        ? "bg-[#28b8d5]/[0.05] dark:bg-[#28b8d5]/[0.06]"
                                        : "bg-white dark:bg-[#0f0f0f] group-hover/row:bg-gray-50/60 dark:group-hover/row:bg-[#161616]"
                                    }`}
                                    style={{
                                      boxShadow: "2px 0 4px -1px rgba(0,0,0,0.05)",
                                      borderLeft: hasIssue
                                        ? `3px solid ${issues.multipleA ? "rgb(239,68,68)" : "rgb(245,158,11)"}`
                                        : "3px solid transparent",
                                    }}
                                    onClick={() => {
                                      setRolSeleccionado(null);
                                      setActividadSeleccionada(isSelected ? null : actividad);
                                    }}
                                    onContextMenu={(e) =>
                                      openContextMenu(e, {
                                        type: "actividad",
                                        actividadId: actividad.id,
                                        actividadNombre: actividad.nombre,
                                        globalIdx,
                                        totalActividades: matriz.actividades.length,
                                      })
                                    }
                                  >
                                    <div className="flex items-center gap-2">
                                      {/* Up/down reorder */}
                                      {!readOnly && (
                                        <div className="flex flex-col gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveActividad(actividad.id, "up"); }}
                                            disabled={globalIdx === 0}
                                            className="w-4 h-4 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-[#28b8d5] disabled:pointer-events-none disabled:opacity-0 transition-colors"
                                          >
                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveActividad(actividad.id, "down"); }}
                                            disabled={globalIdx === matriz.actividades.length - 1}
                                            className="w-4 h-4 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-[#28b8d5] disabled:pointer-events-none disabled:opacity-0 transition-colors"
                                          >
                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                        </div>
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`flex-1 font-medium text-gray-800 dark:text-white/80 truncate ${
                                            density === "compact" ? "text-[11px]" : "text-xs"
                                          }`}>
                                            {actividad.nombre}
                                          </span>
                                          {comentariosCount > 0 && (
                                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold flex items-center justify-center">
                                              {comentariosCount}
                                            </span>
                                          )}
                                          {hasIssue && (
                                            <span
                                              title={[
                                                issues.multipleA && "Múltiples Aprobadores (A)",
                                                issues.missingA && "Sin Aprobador (A)",
                                                issues.missingR && "Sin Responsable (R)",
                                              ].filter(Boolean).join(" · ")}
                                              className={`flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold cursor-help ${
                                                issues.multipleA ? "bg-red-500 text-white" : "bg-amber-400 text-white"
                                              }`}
                                            >
                                              !
                                            </span>
                                          )}
                                        </div>
                                        {density !== "compact" && actividad.descripcion && (
                                          <p className="text-[10px] text-gray-400 dark:text-white/25 truncate mt-0.5">
                                            {actividad.descripcion}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        {/* Duplicate button */}
                                        {!readOnly && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleDuplicateActividad(actividad); }}
                                            title="Duplicar actividad"
                                            className="w-5 h-5 rounded flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-[#28b8d5] hover:bg-[#28b8d5]/10 opacity-0 group-hover/row:opacity-100 transition-all"
                                          >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                          </button>
                                        )}
                                        <svg
                                          className={`w-3.5 h-3.5 transition-transform ${
                                            isSelected ? "text-[#28b8d5] rotate-90" : "text-gray-300 dark:text-white/15"
                                          }`}
                                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>
                                    </div>
                                  </td>

                                  {/* RACI cells */}
                                  {matriz.roles.map((rol) => {
                                    const asig = actividad.asignaciones[rol.id] as AsignacionRaci | undefined;
                                    const cellComments = matriz.comentarios.filter(
                                      (c) => c.referencia_tipo === "celda" &&
                                        c.referencia_id === actividad.id &&
                                        c.rol_id === rol.id
                                    );
                                    const openCount = cellComments.filter((c) => c.estado === "abierto").length;
                                    const isPopoverOpen =
                                      celdaPopover?.actividadId === actividad.id &&
                                      celdaPopover?.rolId === rol.id;
                                    return (
                                      <td
                                        key={rol.id}
                                        className="px-2 text-center border-l border-gray-100 dark:border-white/[0.04]"
                                        onContextMenu={(e) =>
                                          openContextMenu(e, {
                                            type: "celda",
                                            actividadId: actividad.id,
                                            actividadNombre: actividad.nombre,
                                            rolId: rol.id,
                                            rolNombre: rol.nombre,
                                            currentAsig: asig,
                                          })
                                        }
                                      >
                                        <div className="relative inline-flex items-center justify-center group/cell">
                                          <button
                                            onClick={() => handleCellCycle(actividad.id, rol.id)}
                                            disabled={readOnly}
                                            title={
                                              asig
                                                ? `${asig} — ${RACI_LABELS[asig]}${readOnly ? "" : " · Clic para cambiar"}`
                                                : readOnly
                                                ? "Sin asignación"
                                                : "Sin asignación · Clic para asignar"
                                            }
                                            className={`${CELL_W[density]} rounded-xl text-[12px] font-bold flex items-center justify-center transition-all select-none ${
                                              asig
                                                ? `${RACI_COLORS[asig]} shadow-sm`
                                                : readOnly
                                                ? ""
                                                : "text-gray-200 dark:text-white/[0.08] hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-400 dark:hover:text-white/30 cursor-pointer"
                                            }`}
                                          >
                                            {asig ?? (readOnly ? "" : "·")}
                                          </button>

                                          {/* Comment indicator triangle + hover button */}
                                          {openCount > 0 ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = (e.currentTarget as HTMLElement)
                                                  .closest("td")!
                                                  .getBoundingClientRect();
                                                setCeldaPopover(
                                                  isPopoverOpen
                                                    ? null
                                                    : { actividadId: actividad.id, rolId: rol.id, x: rect.left, y: rect.bottom }
                                                );
                                              }}
                                              title={`${openCount} comentario${openCount !== 1 ? "s" : ""}`}
                                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 dark:bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
                                            >
                                              {openCount}
                                            </button>
                                          ) : (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = (e.currentTarget as HTMLElement)
                                                  .closest("td")!
                                                  .getBoundingClientRect();
                                                setCeldaPopover({ actividadId: actividad.id, rolId: rol.id, x: rect.left, y: rect.bottom });
                                              }}
                                              title="Agregar comentario a esta celda"
                                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-200 dark:bg-white/[0.12] text-gray-500 dark:text-white/40 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 hover:bg-[#28b8d5] hover:text-white transition-all z-10"
                                            >
                                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Panel lateral: actividad */}
          {actividadSeleccionada && !rolSeleccionado && (
            <PanelActividad
              actividad={actividadSeleccionada}
              roles={matriz.roles}
              comentarios={matriz.comentarios}
              onUpdate={handleUpdateActividad}
              onDelete={handleDeleteActividad}
              onClose={() => setActividadSeleccionada(null)}
              onAddComment={onAddComment}
              readOnly={readOnly}
            />
          )}

          {/* Panel lateral: rol */}
          {rolSeleccionado && !actividadSeleccionada && (
            <PanelRol
              rol={rolSeleccionado}
              actividades={matriz.actividades}
              onUpdate={handleUpdateRol}
              onDelete={handleDeleteRol}
              onClose={() => setRolSeleccionado(null)}
              readOnly={readOnly}
            />
          )}
        </div>
      )}

      {/* ── Tab: Versiones ───────────────────────────────────────────────── */}
      {tabActiva === "versiones" && (
        <div className="flex-1 overflow-y-auto px-6 py-5 max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white/70 mb-4">
            Historial de versiones
          </h3>
          {matriz.historial_versiones.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-white/25 py-4 text-center">
              El historial se registra a partir del primer guardado.
            </p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gray-100 dark:bg-white/[0.06]" />
              <div className="space-y-4">
                {[...matriz.historial_versiones].reverse().map((v, i) => (
                  <div key={v.version} className="flex gap-4 items-start">
                    <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-bold z-10 border-2 ${
                      i === 0
                        ? "bg-[#28b8d5] text-white border-[#28b8d5] shadow-md shadow-[#28b8d5]/20"
                        : "bg-white dark:bg-[#0f0f0f] text-gray-400 dark:text-white/30 border-gray-200 dark:border-white/[0.08]"
                    }`}>
                      v{v.version}
                    </div>
                    <div className="flex-1 pt-2 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-white/70 mb-0.5">
                        {v.descripcion_cambio}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-white/30 flex-wrap">
                        <span className="font-medium">{v.autor}</span>
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
            </div>
          )}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-white/[0.07] px-4 py-2 flex items-center gap-3 bg-gray-50/60 dark:bg-white/[0.01] text-[10px] text-gray-400 dark:text-white/25">
        <span>
          <span className="font-semibold text-gray-600 dark:text-white/50">{matriz.actividades.length}</span>
          {" "}actividades
        </span>
        <span className="text-gray-200 dark:text-white/10">·</span>
        <span>
          <span className="font-semibold text-gray-600 dark:text-white/50">{matriz.roles.length}</span>
          {" "}roles
        </span>
        <span className="text-gray-200 dark:text-white/10">·</span>
        <span>
          <span className="font-semibold text-gray-600 dark:text-white/50">{totalAsignaciones}</span>
          {" "}asignaciones
        </span>

        {actividadesSinR > 0 && (
          <>
            <span className="text-gray-200 dark:text-white/10">·</span>
            <span className="flex items-center gap-1 text-orange-500 dark:text-orange-400 font-medium">
              <span className="w-3.5 h-3.5 rounded-full bg-orange-500 text-white text-[7px] font-bold flex items-center justify-center">!</span>
              {actividadesSinR} sin R
            </span>
          </>
        )}
        {actividadesSinA > 0 && (
          <>
            <span className="text-gray-200 dark:text-white/10">·</span>
            <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-medium">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-white text-[7px] font-bold flex items-center justify-center">!</span>
              {actividadesSinA} sin A
            </span>
          </>
        )}

        <div className="flex-1" />
        <span>Actualizado {new Date(matriz.updated_at).toLocaleDateString("es-CO")}</span>
      </div>

      {/* ── Right-click context menu ─────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenuRaci
          {...contextMenu}
          readOnly={readOnly}
          onClose={() => setContextMenu(null)}
          onSetAsig={handleSetAsig}
          onCommentCell={(actividadId, rolId, x, y) => {
            setCeldaPopover({ actividadId, rolId, x, y });
          }}
          onEditActividad={(id) => {
            const a = matriz.actividades.find((a) => a.id === id);
            if (a) { setRolSeleccionado(null); setActividadSeleccionada(a); }
          }}
          onDuplicateActividad={(id) => {
            const a = matriz.actividades.find((a) => a.id === id);
            if (a) handleDuplicateActividad(a);
          }}
          onMoveActividad={handleMoveActividad}
          onCommentActividad={(id) => {
            const a = matriz.actividades.find((a) => a.id === id);
            if (a) { setRolSeleccionado(null); setActividadSeleccionada(a); }
          }}
          onDeleteActividad={(id) => {
            if (confirm("¿Eliminar esta actividad y sus asignaciones?")) handleDeleteActividad(id);
          }}
          onEditRol={(id) => {
            const r = matriz.roles.find((r) => r.id === id);
            if (r) { setActividadSeleccionada(null); setRolSeleccionado(r); }
          }}
          onDeleteRol={(id) => {
            if (confirm("¿Eliminar este rol y todas sus asignaciones en la matriz?")) handleDeleteRol(id);
          }}
        />
      )}

      {/* ── Cell comment popover (Google Docs style) ─────────────────────── */}
      {celdaPopover && (() => {
        const actividad = matriz.actividades.find((a) => a.id === celdaPopover.actividadId);
        const rol = matriz.roles.find((r) => r.id === celdaPopover.rolId);
        if (!actividad || !rol) return null;
        const cellComments = matriz.comentarios.filter(
          (c) =>
            c.referencia_tipo === "celda" &&
            c.referencia_id === celdaPopover.actividadId &&
            c.rol_id === celdaPopover.rolId
        );
        return (
          <CeldaCommentPopover
            x={celdaPopover.x}
            y={celdaPopover.y}
            actividadNombre={actividad.nombre}
            rolNombre={rol.nombre}
            comentarios={cellComments}
            readOnly={readOnly}
            onClose={() => setCeldaPopover(null)}
            onAdd={async (contenido) => {
              await onAddComment(celdaPopover.actividadId, "celda", contenido, celdaPopover.rolId);
            }}
            onResolve={(id) => {
              setMatriz((prev) => ({
                ...prev,
                comentarios: prev.comentarios.map((c) =>
                  c.id === id ? { ...c, estado: "resuelto" } : c
                ),
              }));
            }}
            onReopen={(id) => {
              setMatriz((prev) => ({
                ...prev,
                comentarios: prev.comentarios.map((c) =>
                  c.id === id ? { ...c, estado: "abierto" } : c
                ),
              }));
            }}
          />
        );
      })()}
    </div>
  );
}

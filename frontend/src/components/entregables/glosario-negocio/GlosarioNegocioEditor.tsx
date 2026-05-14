"use client";
import React, {
  useState, useCallback, useEffect, useRef, useMemo,
} from "react";
import {
  Pencil, Copy, Trash2, MessageSquare, ClipboardCopy,
  ChevronUp, ChevronDown, ChevronsUpDown,
  Rows3, ListOrdered, Columns3, BookOpen, GripVertical,
} from "lucide-react";
import type {
  GlosarioNegocio,
  TerminoGlosario,
  ComentarioGlosario,
  CategoriaTermino,
  EstadoTermino,
} from "@/lib/types/glosario-negocio.types";
import PanelTermino from "./PanelTermino";

// ── Constants ──────────────────────────────────────────────────────────────

export const CATEGORIA_CONFIG: Record<CategoriaTermino, { label: string; color: string }> = {
  entidad:       { label: "Entidad",        color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  atributo:      { label: "Atributo",       color: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" },
  proceso:       { label: "Proceso",        color: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" },
  regla_negocio: { label: "Regla",          color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400" },
  kpi:           { label: "KPI",            color: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400" },
  otro:          { label: "Otro",           color: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-white/40" },
};

export const ESTADO_CONFIG: Record<EstadoTermino, {
  label: string; badge: string; dot: string; border: string;
}> = {
  borrador:    { label: "Borrador",     badge: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-white/40",          dot: "bg-gray-400 dark:bg-white/30",    border: "border-l-gray-300 dark:border-l-white/20" },
  en_revision: { label: "En revisión", badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",          dot: "bg-amber-400",                   border: "border-l-amber-400" },
  aprobado:    { label: "Aprobado",    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",   dot: "bg-emerald-400",                 border: "border-l-emerald-400" },
  obsoleto:    { label: "Obsoleto",    badge: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",                  dot: "bg-red-400",                     border: "border-l-red-400" },
};

type ColId = "categoria" | "definicion" | "propietario" | "estado" | "entidades" | "sinonimos" | "comentarios";
type SortKey = "termino" | "propietario" | "estado" | "categoria";
type SortConfig = { key: SortKey; dir: "asc" | "desc" } | null;
type Density = "compact" | "comfortable";
type Agrupacion = "flat" | "alfabetico";
type TabActiva = "tabla" | "comentarios" | "versiones";
type ContextMenuState = { x: number; y: number; terminoId: string } | null;

const ALL_COLUMNS: { id: ColId; label: string }[] = [
  { id: "categoria",   label: "Categoría" },
  { id: "definicion",  label: "Definición" },
  { id: "propietario", label: "Propietario" },
  { id: "estado",      label: "Estado" },
  { id: "entidades",   label: "Entidades" },
  { id: "sinonimos",   label: "Sinónimos" },
  { id: "comentarios", label: "Comentarios" },
];

const ROW_PY: Record<Density, string> = {
  compact:     "py-2",
  comfortable: "py-3",
};

// ── Context menu ──────────────────────────────────────────────────────────

interface CtxMenuProps {
  x: number; y: number;
  readOnly: boolean;
  onClose: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onCopiarNombre: () => void;
  onAgregarComentario: () => void;
  onEliminar: () => void;
}

function ContextMenuGlosario({
  x, y, readOnly, onClose,
  onEditar, onDuplicar, onCopiarNombre, onAgregarComentario, onEliminar,
}: CtxMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: x + rect.width > window.innerWidth  ? window.innerWidth  - rect.width  - 8 : x,
      y: y + rect.height > window.innerHeight ? window.innerHeight - rect.height - 8 : y,
    });
  }, [x, y]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const item = (
    icon: React.ReactNode,
    label: string,
    action: () => void,
    danger = false,
    disabled = false,
  ) => (
    <button
      disabled={disabled}
      onClick={() => { action(); onClose(); }}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-left rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          : "text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.y, left: pos.x, zIndex: 9999 }}
      className="w-52 py-1.5 px-1.5 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-white/[0.1] shadow-2xl shadow-black/10 dark:shadow-black/40"
      onContextMenu={(e) => e.preventDefault()}
    >
      {item(<Pencil className="w-3.5 h-3.5" />, "Editar", onEditar)}
      {item(<Copy className="w-3.5 h-3.5" />, "Duplicar", onDuplicar, false, readOnly)}
      {item(<ClipboardCopy className="w-3.5 h-3.5" />, "Copiar nombre", onCopiarNombre)}
      {item(<MessageSquare className="w-3.5 h-3.5" />, "Agregar comentario", onAgregarComentario)}
      <div className="my-1 mx-1 border-t border-gray-100 dark:border-white/[0.06]" />
      {item(<Trash2 className="w-3.5 h-3.5" />, "Eliminar", onEliminar, true, readOnly)}
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────

function SortIcon({ colKey, sortConfig }: { colKey: SortKey; sortConfig: SortConfig }) {
  if (!sortConfig || sortConfig.key !== colKey)
    return <ChevronsUpDown className="w-3 h-3 ml-1 text-gray-300 dark:text-white/20 shrink-0" />;
  return sortConfig.dir === "asc"
    ? <ChevronUp   className="w-3 h-3 ml-1 text-[#28b8d5] shrink-0" />
    : <ChevronDown className="w-3 h-3 ml-1 text-[#28b8d5] shrink-0" />;
}

// ── Main component ────────────────────────────────────────────────────────

interface GlosarioNegocioEditorProps {
  glosario: GlosarioNegocio;
  onSave: (glosario: GlosarioNegocio) => Promise<void>;
  onGenerateIA: () => Promise<void>;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "termino" | "general",
    contenido: string
  ) => Promise<void>;
  isSaving: boolean;
  isGenerating: boolean;
  readOnly?: boolean;
}

export default function GlosarioNegocioEditor({
  glosario: glosarioInicial,
  onSave,
  onGenerateIA,
  onAddComment,
  isSaving,
  isGenerating,
  readOnly = false,
}: GlosarioNegocioEditorProps) {
  const [glosario, setGlosario] = useState<GlosarioNegocio>(glosarioInicial);
  const [terminoSeleccionadoId, setTerminoSeleccionadoId] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<TabActiva>("tabla");
  const [nuevoComentarioGeneral, setNuevoComentarioGeneral] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // View options
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("flat");
  const [density, setDensity] = useState<Density>("comfortable");
  const [columnasOcultas, setColumnasOcultas] = useState<Set<ColId>>(new Set());
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const colOrderKey = `glosario-col-order-${glosarioInicial.id || "default"}`;
  const [colOrder, setColOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(colOrderKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ALL_COLUMNS.map((c) => c.id);
  });
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Col/row resize
  const colWidthsKey = `glosario-col-widths-${glosarioInicial.id || "default"}`;
  const rowHeightsKey = `glosario-row-heights-${glosarioInicial.id || "default"}`;
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try { const s = localStorage.getItem(colWidthsKey); if (s) return JSON.parse(s); } catch {}
    return {};
  });
  const [rowHeights, setRowHeights] = useState<Record<string, number>>(() => {
    try { const s = localStorage.getItem(rowHeightsKey); if (s) return JSON.parse(s); } catch {}
    return {};
  });

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [focusComentario, setFocusComentario] = useState(false);

  // Dynamic columns (persisted locally)
  const storageKey = `glosario-columnas-${glosarioInicial.id || "default"}`;
  const [columnasDinamicas, setColumnasDinamicas] = useState<{ id: string; label: string }[]>([]);
  const [showAddCol, setShowAddCol] = useState(false);
  const [nuevaColLabel, setNuevaColLabel] = useState("");

  const columnMenuRef = useRef<HTMLDivElement>(null);
  const addColRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { try { setColumnasDinamicas(JSON.parse(saved)); } catch (_) {} }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnasDinamicas));
  }, [columnasDinamicas, storageKey]);

  useEffect(() => {
    setColOrder((prev) => {
      const staticIds = new Set(ALL_COLUMNS.map((c) => c.id));
      const dynamicIds = columnasDinamicas.map((c) => c.id);
      const newDynamic = dynamicIds.filter((id) => !prev.includes(id));
      const validIds = new Set([...staticIds, ...dynamicIds]);
      const filtered = prev.filter((id) => validIds.has(id));
      return [...filtered, ...newDynamic];
    });
  }, [columnasDinamicas]);

  useEffect(() => {
    localStorage.setItem(colOrderKey, JSON.stringify(colOrder));
  }, [colOrder, colOrderKey]);

  useEffect(() => { localStorage.setItem(colWidthsKey, JSON.stringify(colWidths)); }, [colWidths, colWidthsKey]);
  useEffect(() => { localStorage.setItem(rowHeightsKey, JSON.stringify(rowHeights)); }, [rowHeights, rowHeightsKey]);

  // Close dropdowns on outside click
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node))
        setShowColumnMenu(false);
      if (addColRef.current && !addColRef.current.contains(e.target as Node))
        setShowAddCol(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, []);

  // Keyboard: Esc closes panel
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setTerminoSeleccionadoId(null); setContextMenu(null); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  const terminoSeleccionado = terminoSeleccionadoId
    ? glosario.terminos.find((t) => t.id === terminoSeleccionadoId)
    : undefined;

  const terminosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return glosario.terminos;
    const q = busqueda.toLowerCase();
    return glosario.terminos.filter(
      (t) =>
        t.termino.toLowerCase().includes(q) ||
        t.definicion.toLowerCase().includes(q) ||
        t.propietario.toLowerCase().includes(q) ||
        t.sinonimos.some((s) => s.toLowerCase().includes(q)) ||
        t.entidades_relacionadas.some((e) => e.toLowerCase().includes(q))
    );
  }, [glosario.terminos, busqueda]);

  const terminosOrdenados = useMemo(() => {
    const base = [...terminosFiltrados];
    if (!sortConfig) return base.sort((a, b) => a.termino.localeCompare(b.termino));
    return base.sort((a, b) => {
      const av = (a[sortConfig.key] ?? "") as string;
      const bv = (b[sortConfig.key] ?? "") as string;
      return sortConfig.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [terminosFiltrados, sortConfig]);

  const terminosAgrupados = useMemo(() => {
    if (agrupacion !== "alfabetico") return null;
    const map: Record<string, TerminoGlosario[]> = {};
    for (const t of terminosOrdenados) {
      const letter = t.termino[0]?.toUpperCase() ?? "#";
      if (!map[letter]) map[letter] = [];
      map[letter].push(t);
    }
    return map;
  }, [terminosOrdenados, agrupacion]);

  const comentariosGenerales = glosario.comentarios.filter((c) => c.referencia_tipo === "general");

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const mutateGlosario = useCallback((updater: (prev: GlosarioNegocio) => GlosarioNegocio) => {
    setGlosario(updater);
    setHasChanges(true);
  }, []);

  const handleAddTermino = useCallback(() => {
    const nuevo: TerminoGlosario = {
      id: `ter-${Date.now()}`,
      termino: `Nuevo Término ${glosario.terminos.length + 1}`,
      definicion: "",
      propietario: "",
      entidades_relacionadas: [],
      sinonimos: [],
      notas: "",
      estado: "borrador",
    };
    mutateGlosario((prev) => ({ ...prev, terminos: [...prev.terminos, nuevo] }));
    setTerminoSeleccionadoId(nuevo.id);
  }, [glosario.terminos.length, mutateGlosario]);

  const handleUpdateTermino = useCallback((updated: TerminoGlosario) => {
    mutateGlosario((prev) => ({
      ...prev,
      terminos: prev.terminos.map((t) => (t.id === updated.id ? updated : t)),
    }));
  }, [mutateGlosario]);

  const handleDeleteTermino = useCallback((id: string) => {
    mutateGlosario((prev) => ({ ...prev, terminos: prev.terminos.filter((t) => t.id !== id) }));
    setTerminoSeleccionadoId((prev) => (prev === id ? null : prev));
  }, [mutateGlosario]);

  const handleDuplicar = useCallback((id: string) => {
    const original = glosario.terminos.find((t) => t.id === id);
    if (!original) return;
    const copia: TerminoGlosario = {
      ...original,
      id: `ter-${Date.now()}`,
      termino: `${original.termino} (copia)`,
      estado: "borrador",
    };
    mutateGlosario((prev) => {
      const idx = prev.terminos.findIndex((t) => t.id === id);
      const next = [...prev.terminos];
      next.splice(idx + 1, 0, copia);
      return { ...prev, terminos: next };
    });
    setTerminoSeleccionadoId(copia.id);
  }, [glosario.terminos, mutateGlosario]);

  const handleCopiarNombre = useCallback((id: string) => {
    const t = glosario.terminos.find((x) => x.id === id);
    if (t) navigator.clipboard.writeText(t.termino).catch(() => {});
  }, [glosario.terminos]);

  // ── Sort + columns ────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const toggleColumna = (id: ColId) => {
    setColumnasOcultas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Dynamic columns ────────────────────────────────────────────────────

  const handleAddColumn = () => {
    const label = nuevaColLabel.trim();
    if (!label) return;
    const id = `col_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    if (!columnasDinamicas.some((c) => c.id === id))
      setColumnasDinamicas((prev) => [...prev, { id, label }]);
    setNuevaColLabel("");
    setShowAddCol(false);
  };

  // ── Context menu ──────────────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent, terminoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, terminoId });
    setTerminoSeleccionadoId(terminoId);
  }, []);

  // ── Comments ──────────────────────────────────────────────────────────────

  const handleAddCommentLocal = useCallback(
    async (referenciaId: string | null, referenciaTipo: "termino" | "general", contenido: string) => {
      const nuevo: ComentarioGlosario = {
        id: `com-glos-${Date.now()}`,
        referencia_id: referenciaId,
        referencia_tipo: referenciaTipo,
        autor_id: "usr-001",
        autor_nombre: "Carlos Méndez",
        autor_perfil: "CONSULTOR",
        contenido,
        estado: "abierto",
        created_at: new Date().toISOString(),
      };
      setGlosario((prev) => ({ ...prev, comentarios: [...prev.comentarios, nuevo] }));
      await onAddComment(referenciaId, referenciaTipo, contenido);
    },
    [onAddComment]
  );

  const handleAddComentarioGeneral = async () => {
    if (!nuevoComentarioGeneral.trim()) return;
    await handleAddCommentLocal(null, "general", nuevoComentarioGeneral.trim());
    setNuevoComentarioGeneral("");
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    await onSave(glosario);
    setHasChanges(false);
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleColDragStart = (e: React.DragEvent, colId: string) => {
    setDragColId(colId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleColDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) setDragOverColId(colId);
  };
  const handleColDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragColId || dragColId === targetId) return;
    setColOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(dragColId);
      const toIdx = next.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragColId);
      return next;
    });
    setDragColId(null);
    setDragOverColId(null);
  };
  const handleColDragEnd = () => {
    setDragColId(null);
    setDragOverColId(null);
  };

  const handleColResizeStart = (e: React.MouseEvent, colId: string, defaultW: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startW = colWidths[colId] ?? defaultW;
    const startX = e.clientX;
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(60, startW + ev.clientX - startX);
      setColWidths((prev) => ({ ...prev, [colId]: newW }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleRowResizeStart = (e: React.MouseEvent, rowId: string, defaultH: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startH = rowHeights[rowId] ?? defaultH;
    const startY = e.clientY;
    const onMove = (ev: MouseEvent) => {
      const newH = Math.max(36, startH + ev.clientY - startY);
      setRowHeights((prev) => ({ ...prev, [rowId]: newH }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  // ── Sortable column header helper ─────────────────────────────────────────

  const SortableTh = ({
    colKey, label, className = "",
    draggable: isDraggable, colId, defaultW = 160,
  }: {
    colKey: SortKey; label: string; className?: string;
    draggable?: boolean; colId?: string; defaultW?: number;
  }) => {
    const id = colId ?? colKey;
    const isDragging = isDraggable && dragColId === id;
    const isDragOver = isDraggable && dragOverColId === id;
    return (
      <th
        onClick={() => handleSort(colKey)}
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => handleColDragStart(e, id) : undefined}
        onDragOver={isDraggable ? (e) => handleColDragOver(e, id) : undefined}
        onDrop={isDraggable ? (e) => handleColDrop(e, id) : undefined}
        onDragEnd={isDraggable ? handleColDragEnd : undefined}
        className={`relative text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-gray-700 dark:hover:text-white/60 transition-colors bg-gray-50 dark:bg-[#111] group/th
          ${isDragOver ? "border-l-[3px] border-l-[#28b8d5] shadow-[-4px_0_8px_rgba(40,184,213,0.4)]" : ""}
          ${isDragging ? "opacity-40" : ""}
          ${className}`}
      >
        <div className="flex items-center">
          {isDraggable && (
            <GripVertical className="w-3 h-3 text-gray-300 dark:text-white/20 shrink-0 mr-1 opacity-0 group-hover/th:opacity-100 transition-opacity" />
          )}
          {label}
          <SortIcon colKey={colKey} sortConfig={sortConfig} />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#28b8d5]/60 z-10 transition-colors" onMouseDown={(e) => handleColResizeStart(e, id, defaultW)} onClick={(e) => e.stopPropagation()} />
      </th>
    );
  };

  // ── Ordered visible columns ────────────────────────────────────────────────

  const orderedVisibleCols = colOrder.filter((id) => {
    if (ALL_COLUMNS.some((c) => c.id === id)) return !columnasOcultas.has(id as ColId);
    return columnasDinamicas.some((c) => c.id === id);
  });

  // ── Row render ────────────────────────────────────────────────────────────

  const py = ROW_PY[density];

  const renderRow = (termino: TerminoGlosario, globalIdx: number) => {
    const isSelected = terminoSeleccionadoId === termino.id;
    const estadoCfg = termino.estado ? ESTADO_CONFIG[termino.estado] : null;
    const catCfg    = termino.categoria ? CATEGORIA_CONFIG[termino.categoria] : null;
    const comentCount = glosario.comentarios.filter((c) => c.referencia_id === termino.id).length;

    const borderClass = isSelected
      ? "border-l-[#28b8d5]"
      : estadoCfg?.border ?? "border-l-transparent";

    const bgClass = isSelected
      ? "bg-[#28b8d5]/5 dark:bg-[#28b8d5]/8"
      : "hover:bg-gray-50/80 dark:hover:bg-white/[0.025]";

    return (
      <tr
        key={termino.id}
        onClick={() => setTerminoSeleccionadoId(isSelected ? null : termino.id)}
        onContextMenu={(e) => handleContextMenu(e, termino.id)}
        className={`group relative cursor-pointer border-l-[3px] transition-colors ${borderClass} ${bgClass} divide-x divide-gray-100 dark:divide-white/[0.04]`}
        style={rowHeights[termino.id] ? { height: rowHeights[termino.id] } : undefined}
      >
        {/* # */}
        <td className={`${py} px-3 text-[11px] font-mono text-gray-300 dark:text-white/20 whitespace-nowrap select-none w-10 relative`}>
          {String(globalIdx + 1).padStart(2, "0")}
          <div className="absolute bottom-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#28b8d5]/40 z-10 transition-colors" onMouseDown={(e) => handleRowResizeStart(e, termino.id, 44)} onClick={(e) => e.stopPropagation()} />
        </td>

        {/* Término — sticky */}
        <td className={`${py} sticky left-0 z-[5] px-4 min-w-[180px] max-w-[220px]`}
          style={{ backgroundColor: isSelected ? "rgba(40,184,213,0.04)" : "inherit" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-white/85 leading-snug flex-1 min-w-0 truncate">
              {termino.termino}
            </span>
            {/* Row hover actions */}
            {!readOnly && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setTerminoSeleccionadoId(termino.id); }}
                  data-no-elevation="true"
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicar(termino.id); }}
                  data-no-elevation="true"
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
                  title="Duplicar"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTermino(termino.id); }}
                  data-no-elevation="true"
                  className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </td>

        {orderedVisibleCols.map((colId) => {
          switch (colId) {
            case "categoria":
              return (
                <td key="categoria" className={`${py} px-4 whitespace-nowrap`}>
                  {catCfg ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catCfg.color}`}>
                      {catCfg.label}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-white/20 text-xs">—</span>
                  )}
                </td>
              );
            case "definicion":
              return (
                <td key="definicion" className={`${py} px-4 text-xs text-gray-500 dark:text-white/40 max-w-[300px]`}>
                  <span className="line-clamp-2 leading-relaxed">
                    {termino.definicion || (
                      <span className="text-gray-300 dark:text-white/20 italic">Sin definición</span>
                    )}
                  </span>
                </td>
              );
            case "propietario":
              return (
                <td key="propietario" className={`${py} px-4 text-xs text-gray-500 dark:text-white/50 whitespace-nowrap max-w-[180px] truncate`}>
                  {termino.propietario || <span className="text-gray-300 dark:text-white/20">—</span>}
                </td>
              );
            case "estado":
              return (
                <td key="estado" className={`${py} px-4 whitespace-nowrap`}>
                  {estadoCfg ? (
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${estadoCfg.dot}`} />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estadoCfg.badge}`}>
                        {estadoCfg.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-300 dark:text-white/20 text-xs">—</span>
                  )}
                </td>
              );
            case "entidades":
              return (
                <td key="entidades" className={`${py} px-4`}>
                  <div className="flex flex-wrap gap-1">
                    {termino.entidades_relacionadas.slice(0, 2).map((ent) => (
                      <span key={ent} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium whitespace-nowrap">
                        {ent}
                      </span>
                    ))}
                    {termino.entidades_relacionadas.length > 2 && (
                      <span className="text-[9px] text-gray-400 dark:text-white/25">
                        +{termino.entidades_relacionadas.length - 2}
                      </span>
                    )}
                    {termino.entidades_relacionadas.length === 0 && (
                      <span className="text-gray-300 dark:text-white/20 text-xs">—</span>
                    )}
                  </div>
                </td>
              );
            case "sinonimos":
              return (
                <td key="sinonimos" className={`${py} px-4`}>
                  <div className="flex flex-wrap gap-1">
                    {termino.sinonimos.slice(0, 2).map((sin) => (
                      <span key={sin} className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 font-medium whitespace-nowrap">
                        {sin}
                      </span>
                    ))}
                    {termino.sinonimos.length > 2 && (
                      <span className="text-[9px] text-gray-400 dark:text-white/25">
                        +{termino.sinonimos.length - 2}
                      </span>
                    )}
                    {termino.sinonimos.length === 0 && (
                      <span className="text-gray-300 dark:text-white/20 text-xs">—</span>
                    )}
                  </div>
                </td>
              );
            case "comentarios":
              return (
                <td key="comentarios" className={`${py} px-4 text-center`}>
                  {comentCount > 0 ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      {comentCount}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-white/20 text-xs">—</span>
                  )}
                </td>
              );
            default: {
              const dynCol = columnasDinamicas.find((c) => c.id === colId);
              if (!dynCol) return null;
              return (
                <td key={colId} className={`${py} px-4 text-xs text-gray-500 dark:text-white/50 max-w-[160px] truncate`}>
                  {((termino as unknown as Record<string, unknown>)[dynCol.id] as string) || (
                    <span className="text-gray-300 dark:text-white/20">—</span>
                  )}
                </td>
              );
            }
          }
        })}
      </tr>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const visibleColCount = ALL_COLUMNS.filter((c) => !columnasOcultas.has(c.id)).length
    + columnasDinamicas.length + 2; // +2 for # and Término

  return (
    <div
      className="flex h-full flex-col rounded-2xl border border-[#d8e8ef] bg-gradient-to-b from-[#edf5f9] via-[#f5f9fc] to-[#f9fcff] shadow-[0_14px_40px_rgba(11,59,84,0.08)] dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-[#0a1118] dark:via-[#0a0f16] dark:to-[#070c12]"
      onClick={() => { setShowColumnMenu(false); setShowAddCol(false); }}
    >

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-200 bg-white/95 px-4 py-2.5 shadow-[0_4px_16px_rgba(15,54,78,0.08)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#111]/95 dark:shadow-black/35 shrink-0">
        {/* Izquierda: navegación + estado */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex rounded-lg bg-gray-100 dark:bg-white/[0.04] p-0.5">
            {(["tabla", "comentarios", "versiones"] as TabActiva[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setTabActiva(tab)}
                className={`no-btn-shadow px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tabActiva === tab
                    ? "bg-white dark:bg-white/[0.1] text-gray-800 dark:text-white/90 shadow-sm"
                    : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                }`}
              >
                {tab === "tabla"       && `Términos (${glosario.terminos.length})`}
                {tab === "comentarios" && `Comentarios (${comentariosGenerales.length})`}
                {tab === "versiones"   && `v${glosario.version_actual}`}
              </button>
            ))}
          </div>

          {!readOnly && hasChanges && (
            <span className="hidden sm:inline-flex text-[10px] font-medium text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              Cambios sin guardar
            </span>
          )}
          {readOnly && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full">
              Solo lectura
            </span>
          )}
        </div>

        {/* Derecha: controles de vista + acciones */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {tabActiva === "tabla" && (
            <>
              {/* View toggle group */}
              <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-white/[0.08] p-0.5">
                <button
                  onClick={() => setDensity((d) => d === "comfortable" ? "compact" : "comfortable")}
                  title={density === "comfortable" ? "Vista compacta" : "Vista cómoda"}
                  className={`p-1.5 rounded-md transition-colors ${
                    density === "compact"
                      ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50"
                  }`}
                >
                  <Rows3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setAgrupacion((a) => a === "flat" ? "alfabetico" : "flat")}
                  title={agrupacion === "flat" ? "Agrupar A–Z" : "Vista plana"}
                  className={`p-1.5 rounded-md transition-colors ${
                    agrupacion === "alfabetico"
                      ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                      : "text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50"
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column visibility */}
              <div className="relative" ref={columnMenuRef}>
                <button
                  onClick={() => setShowColumnMenu((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    showColumnMenu
                      ? "border-[#28b8d5]/50 text-[#28b8d5] bg-[#28b8d5]/5"
                      : "border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Columnas</span>
                  {columnasOcultas.size > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#28b8d5] text-white text-[9px] font-bold flex items-center justify-center">
                      {columnasOcultas.size}
                    </span>
                  )}
                </button>
                {showColumnMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-white/[0.1] shadow-xl shadow-black/8 dark:shadow-black/30 p-1.5 z-50">
                    <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-wider">
                      Columnas visibles
                    </p>
                    {ALL_COLUMNS.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={!columnasOcultas.has(col.id)}
                          onChange={() => toggleColumna(col.id)}
                          className="w-3.5 h-3.5 accent-[#28b8d5] rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-white/70">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-5 bg-gray-200 dark:bg-white/[0.08] mx-0.5" />

              {/* Add dynamic column */}
              {!readOnly && (
                <div className="relative" ref={addColRef}>
                  <button
                    onClick={() => setShowAddCol((v) => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    + Columna
                  </button>
                  {showAddCol && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/[0.1] rounded-xl shadow-xl z-50">
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1.5">
                        Nombre de columna
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={nuevaColLabel}
                          onChange={(e) => setNuevaColLabel(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                          placeholder="Ej. Validaciones"
                          autoFocus
                          className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-2.5 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5]"
                        />
                        <button
                          onClick={handleAddColumn}
                          className="px-3 py-1.5 rounded-lg bg-[#28b8d5] text-white text-xs font-medium hover:bg-[#1fa3be] transition-colors"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!readOnly && (
            <>
              {/* Agregar término */}
              <button
                onClick={handleAddTermino}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#28b8d5]/30 text-xs font-medium text-[#28b8d5] hover:bg-[#28b8d5]/5 transition-colors"
              >
                <span className="text-base leading-none -mt-px">+</span>
                Agregar
              </button>

              <div className="w-px h-5 bg-gray-200 dark:bg-white/[0.08] mx-0.5" />

              {/* Generar con IA (énfasis medio-accent) */}
              <button
                onClick={onGenerateIA}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#28b8d5]/25 bg-[#28b8d5]/5 text-[#28b8d5] text-xs font-semibold hover:bg-[#28b8d5]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? (
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                )}
                {isGenerating ? "Generando…" : "Generar con IA"}
              </button>

              {/* Guardar (énfasis primario) */}
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0f3f74] text-white text-xs font-semibold hover:bg-[#0d3563] disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-[#1b7ca5] dark:hover:bg-[#186d92] whitespace-nowrap"
              >
                {isSaving ? (
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                ) : null}
                {isSaving ? "Guardando…" : "Guardar cambios"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Tab: Tabla ────────────────────────────────────────────────────── */}
        {tabActiva === "tabla" && (
          <>
            <div className="flex flex-1 flex-col overflow-hidden">

              {/* Search bar */}
              <div className="shrink-0 border-b border-gray-100 bg-white/60 px-4 py-2 backdrop-blur-sm dark:border-white/[0.05] dark:bg-[#0d1218]/80">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25"
                    >
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar término, sinónimo, propietario…"
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-xs text-gray-700 dark:text-white/70 placeholder-gray-400 outline-none focus:border-[#28b8d5] transition-colors"
                    />
                    {busqueda && (
                      <button
                        onClick={() => setBusqueda("")}
                        data-no-elevation="true"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white/50"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {busqueda && (
                    <p className="text-[10px] text-gray-400 dark:text-white/25 shrink-0">
                      {terminosFiltrados.length} resultado{terminosFiltrados.length !== 1 ? "s" : ""}
                    </p>
                  )}
                  {/* Status legend */}
                  <div className="hidden md:flex items-center gap-3 ml-auto">
                    {(Object.entries(ESTADO_CONFIG) as [EstadoTermino, typeof ESTADO_CONFIG[EstadoTermino]][]).map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className="text-[10px] text-gray-400 dark:text-white/25">{cfg.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto px-3 pt-3 pb-3">
                {glosario.terminos.length === 0 ? (
                  // ── Empty state ──────────────────────────────────────────
                  <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-[#dbe8ef] bg-white/90 px-6 text-center shadow-[0_10px_26px_rgba(17,54,77,0.08)] dark:border-white/[0.08] dark:bg-[#0f151c]/85 dark:shadow-black/25">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center shadow-inner">
                      <BookOpen className="w-7 h-7 text-gray-300 dark:text-white/20" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600 dark:text-white/50 mb-1">
                        Sin términos registrados
                      </p>
                      <p className="text-xs text-gray-400 dark:text-white/25 max-w-xs leading-relaxed">
                        Agrega términos manualmente o usa IA para generar el glosario a partir del diagrama conceptual.
                      </p>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddTermino}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#28b8d5]/40 text-xs font-semibold text-[#28b8d5] hover:bg-[#28b8d5]/5 transition-colors"
                        >
                          + Agregar término
                        </button>
                        <button
                          onClick={onGenerateIA}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#28b8d5] to-purple-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                        >
                          Generar con IA
                        </button>
                      </div>
                    )}
                  </div>
                ) : terminosOrdenados.length === 0 ? (
                  // ── No results ────────────────────────────────────────────
                  <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-[#dbe8ef] bg-white/90 shadow-[0_10px_26px_rgba(17,54,77,0.08)] dark:border-white/[0.08] dark:bg-[#0f151c]/85 dark:shadow-black/25">
                    <p className="text-sm text-gray-500 dark:text-white/40">
                      Sin resultados para &ldquo;{busqueda}&rdquo;
                    </p>
                    <button onClick={() => setBusqueda("")} className="text-xs text-[#28b8d5] hover:underline">
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  // ── Table ─────────────────────────────────────────────────
                  <div className="overflow-hidden rounded-2xl border border-[#dbe8ef] bg-white/95 shadow-[0_12px_30px_rgba(17,54,77,0.1)] dark:border-white/[0.08] dark:bg-[#0f151c]/90 dark:shadow-black/35">
                    <table className="min-w-[640px] w-full border-collapse text-sm table-fixed">
                      <colgroup>
                        <col style={{ width: 40 }} />
                        <col style={{ width: colWidths["termino"] ?? 200 }} />
                        {orderedVisibleCols.map((colId) => (
                          <col key={colId} style={{ width: colWidths[colId] ?? 160 }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="divide-x divide-gray-200 border-b-2 border-gray-200 dark:divide-white/[0.06] dark:border-white/[0.08]">
                        {/* # */}
                        <th className="sticky top-0 z-20 bg-gray-50 dark:bg-[#111] px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-wide w-10 select-none">
                          #
                        </th>
                        {/* Término */}
                        <SortableTh colKey="termino" label="Término" className="sticky left-0 top-0 z-30 min-w-[180px]" defaultW={200} />
                        {orderedVisibleCols.map((colId) => {
                          const staticCol = ALL_COLUMNS.find((c) => c.id === colId);
                          const dynCol = columnasDinamicas.find((c) => c.id === colId);
                          const isDragging = dragColId === colId;
                          const isDragOver = dragOverColId === colId;

                          if (staticCol) {
                            const sortKey = (["termino", "propietario", "estado", "categoria"] as SortKey[]).includes(colId as SortKey)
                              ? colId as SortKey : undefined;
                            if (sortKey) {
                              return (
                                <SortableTh
                                  key={colId}
                                  colKey={sortKey}
                                  label={staticCol.label}
                                  draggable
                                  colId={colId}
                                  className={colId === "definicion" ? "min-w-[200px]" : ""}
                                />
                              );
                            }
                            // Non-sortable static column
                            return (
                              <th
                                key={colId}
                                draggable
                                onDragStart={(e) => handleColDragStart(e, colId)}
                                onDragOver={(e) => handleColDragOver(e, colId)}
                                onDrop={(e) => handleColDrop(e, colId)}
                                onDragEnd={handleColDragEnd}
                                className={`sticky top-0 z-10 text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap select-none cursor-grab active:cursor-grabbing hover:text-gray-700 dark:hover:text-white/60 transition-colors bg-gray-50 dark:bg-[#111] group/th relative
                                  ${isDragOver ? "border-l-[3px] border-l-[#28b8d5] shadow-[-4px_0_8px_rgba(40,184,213,0.4)]" : ""}
                                  ${isDragging ? "opacity-40" : ""}
                                `}
                              >
                                <div className="flex items-center gap-1">
                                  <GripVertical className="w-3 h-3 text-gray-300 dark:text-white/20 shrink-0 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                                  {staticCol.label}
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#28b8d5]/60 z-10 transition-colors" onMouseDown={(e) => handleColResizeStart(e, colId, 160)} onClick={(e) => e.stopPropagation()} />
                              </th>
                            );
                          }

                          // Dynamic column
                          return (
                            <th
                              key={colId}
                              draggable
                              onDragStart={(e) => handleColDragStart(e, colId)}
                              onDragOver={(e) => handleColDragOver(e, colId)}
                              onDrop={(e) => handleColDrop(e, colId)}
                              onDragEnd={handleColDragEnd}
                              className={`sticky top-0 z-10 text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap select-none cursor-grab active:cursor-grabbing bg-gray-50 dark:bg-[#111] group/th relative
                                ${isDragOver ? "border-l-[3px] border-l-[#28b8d5] shadow-[-4px_0_8px_rgba(40,184,213,0.4)]" : ""}
                                ${isDragging ? "opacity-40" : ""}
                              `}
                            >
                              <div className="flex items-center gap-1">
                                <GripVertical className="w-3 h-3 text-gray-300 dark:text-white/20 shrink-0 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                                {dynCol?.label ?? colId}
                              </div>
                              <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#28b8d5]/60 z-10 transition-colors" onMouseDown={(e) => handleColResizeStart(e, colId, 160)} onClick={(e) => e.stopPropagation()} />
                            </th>
                          );
                        })}
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                      {agrupacion === "alfabetico" && terminosAgrupados
                        ? Object.entries(terminosAgrupados)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([letter, items]) => (
                              <React.Fragment key={letter}>
                                {/* Letter group header */}
                                <tr>
                                  <td
                                    colSpan={visibleColCount}
                                    className="px-4 py-1.5 bg-gray-100/60 dark:bg-white/[0.03] border-y border-gray-200 dark:border-white/[0.06]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-gray-500 dark:text-white/35 uppercase tracking-widest">
                                        {letter}
                                      </span>
                                      <span className="text-[10px] text-gray-400 dark:text-white/20">
                                        {items.length}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {items.map((t, i) => renderRow(t, i))}
                              </React.Fragment>
                            ))
                        : terminosOrdenados.map((t, i) => renderRow(t, i))
                      }
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── Side panel ──────────────────────────────────────────────── */}
            {terminoSeleccionado && (
              <PanelTermino
                termino={terminoSeleccionado}
                comentarios={glosario.comentarios}
                columnasDinamicas={columnasDinamicas}
                focusComentario={focusComentario}
                onFocusComentarioHandled={() => setFocusComentario(false)}
                onUpdate={handleUpdateTermino}
                onDelete={handleDeleteTermino}
                onClose={() => setTerminoSeleccionadoId(null)}
                onAddComment={handleAddCommentLocal}
                readOnly={readOnly}
              />
            )}
          </>
        )}

        {/* ── Tab: Comentarios ──────────────────────────────────────────────── */}
        {tabActiva === "comentarios" && (
          <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">
              Comentarios generales del glosario
            </h3>
            <div className="mb-6 space-y-3 rounded-2xl border border-[#dbe8ef] bg-white/85 p-4 shadow-[0_10px_24px_rgba(17,54,77,0.08)] dark:border-white/[0.08] dark:bg-[#0f151c]/80 dark:shadow-black/30">
              {comentariosGenerales.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-white/30 italic">No hay comentarios generales aún.</p>
              )}
              {comentariosGenerales.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{c.autor_nombre}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${c.autor_perfil === "CONSULTOR" ? "bg-[#28b8d5]/10 text-[#28b8d5]" : "bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"}`}>
                      {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-white/40">General</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-white/60">{c.contenido}</p>
                  <span className="text-[10px] text-gray-400 dark:text-white/25 mt-2 block">
                    {new Date(c.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoComentarioGeneral}
                  onChange={(e) => setNuevoComentarioGeneral(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComentarioGeneral()}
                  placeholder="Agregar comentario general…"
                  className="flex-1 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-4 py-2.5 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
                />
                <button
                  onClick={handleAddComentarioGeneral}
                  disabled={!nuevoComentarioGeneral.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Versiones ────────────────────────────────────────────────── */}
        {tabActiva === "versiones" && (
          <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">Historial de Versiones</h3>
            <div className="space-y-0 rounded-2xl border border-[#dbe8ef] bg-white/85 p-4 shadow-[0_10px_24px_rgba(17,54,77,0.08)] dark:border-white/[0.08] dark:bg-[#0f151c]/80 dark:shadow-black/30">
              {[...glosario.historial_versiones].reverse().map((v, i) => (
                <div key={v.version} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${i === 0 ? "bg-[#28b8d5]" : "bg-gray-300 dark:bg-white/[0.15]"}`} />
                    {i < glosario.historial_versiones.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-white/[0.08]" />
                    )}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${i === 0 ? "text-[#28b8d5]" : "text-gray-600 dark:text-white/50"}`}>
                        v{v.version}
                      </span>
                      {i === 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">Actual</span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-white/25">· {v.total_terminos} términos</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-white/60 mb-1">{v.descripcion_cambio}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-white/25">
                      <span>{v.autor}</span><span>·</span>
                      <span>{new Date(v.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white/85 px-4 py-2 shadow-[0_-6px_16px_rgba(20,57,79,0.06)] dark:border-white/[0.08] dark:bg-[#0a0f15]/90 shrink-0">
        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-white/35">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#28b8d5]" />
            {glosario.terminos.length} {glosario.terminos.length === 1 ? "término" : "términos"}
          </span>
          {glosario.terminos.filter((t) => t.estado === "aprobado").length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {glosario.terminos.filter((t) => t.estado === "aprobado").length} aprobados
            </span>
          )}
          {glosario.terminos.filter((t) => t.estado === "en_revision").length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {glosario.terminos.filter((t) => t.estado === "en_revision").length} en revisión
            </span>
          )}
          <span className="text-gray-300 dark:text-white/20">·</span>
          <span>{glosario.comentarios.length} comentarios</span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-white/25">
          Actualizado {new Date(glosario.updated_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {/* ── Context menu ─────────────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenuGlosario
          x={contextMenu.x}
          y={contextMenu.y}
          readOnly={readOnly}
          onClose={() => setContextMenu(null)}
          onEditar={() => setTerminoSeleccionadoId(contextMenu.terminoId)}
          onDuplicar={() => handleDuplicar(contextMenu.terminoId)}
          onCopiarNombre={() => handleCopiarNombre(contextMenu.terminoId)}
          onAgregarComentario={() => {
            setTerminoSeleccionadoId(contextMenu.terminoId);
            setFocusComentario(true);
          }}
          onEliminar={() => handleDeleteTermino(contextMenu.terminoId)}
        />
      )}
    </div>
  );
}

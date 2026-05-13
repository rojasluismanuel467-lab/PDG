"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import type {
  MatrizInventarioSistemas,
  SistemaInventario,
  ComentarioMatrizInventario,
  TipoSistema,
  NivelCriticidad,
  EstadoSistema,
} from "@/lib/types/matriz-inventario.types";
import PanelSistema, {
  CRITICIDAD_COLORS,
  CRITICIDAD_LABELS,
  TIPO_LABELS,
  ESTADO_LABELS,
} from "./PanelSistema";

// ============================================================================
// MatrizInventarioEditor — Editor principal de la Matriz de Inventario
// Formato: Tabla editable con panel lateral de detalle
// Reutilizable para AS-IS (única instancia en esta versión)
// ============================================================================

interface MatrizInventarioEditorProps {
  matriz: MatrizInventarioSistemas;
  onSave: (matriz: MatrizInventarioSistemas) => Promise<void>;
  onGenerateIA: () => Promise<void>;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "sistema" | "general" | "celda",
    contenido: string,
    campo?: string | null
  ) => Promise<void>;
  isSaving: boolean;
  isGenerating: boolean;
  readOnly?: boolean;
}

type TabActiva = "tabla" | "comentarios" | "versiones";

const TIPO_COLORES: Record<TipoSistema, string> = {
  aplicacion: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  base_de_datos: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  plataforma: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  servicio_externo: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  infraestructura: "bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-white/40",
};

const ESTADO_COLORES: Record<EstadoSistema, string> = {
  produccion: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  desarrollo: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  mantenimiento: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  legado: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  deprecado: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

// ============================================================================
// CeldaComentario — <td> con indicador Excel-style y popover de comentarios
// ============================================================================

const CAMPO_LABELS: Record<string, string> = {
  nombre: "Nombre",
  areas_estrategicas: "Área Estratégica",
  tipo: "Tipo",
  tecnologia: "Tecnología",
  criticidad: "Criticidad",
  estado: "Estado",
  propietario_tecnico: "Propietario TI",
};

function CeldaComentario({
  sistemaId,
  campo,
  comentarios,
  onAddComment,
  readOnly,
  children,
  className = "",
}: {
  sistemaId: string;
  campo: string;
  comentarios: ComentarioMatrizInventario[];
  onAddComment: (sistemaId: string, campo: string, contenido: string) => Promise<void>;
  readOnly: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const tdRef = useRef<HTMLTableCellElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const celComents = comentarios.filter(
    (c) => c.referencia_id === sistemaId && c.campo === campo && c.referencia_tipo === "celda"
  );
  const hasComents = celComents.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && tdRef.current) {
      const rect = tdRef.current.getBoundingClientRect();
      const popoverW = 256;
      const left = rect.left + popoverW > window.innerWidth - 8
        ? rect.right - popoverW
        : rect.left;
      setPos({ top: rect.bottom + 4, left });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        !popoverRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await onAddComment(sistemaId, campo, texto.trim());
      setTexto("");
    } finally {
      setEnviando(false);
    }
  };

  const popover = open && mounted
    ? ReactDOM.createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-64 rounded-xl border border-gray-200 dark:border-white/[0.12] bg-white dark:bg-[#1e1e1e] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
            <p className="text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide">
              {CAMPO_LABELS[campo] ?? campo} · {celComents.length} comentario{celComents.length !== 1 ? "s" : ""}
            </p>
          </div>

          {celComents.length > 0 && (
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto border-b border-gray-100 dark:border-white/[0.06]">
              {celComents.map((c) => (
                <div key={c.id} className="rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] p-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-white/60">{c.autor_nombre}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                      {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700 dark:text-white/60 leading-relaxed">{c.contenido}</p>
                  <span className="text-[9px] text-gray-400 dark:text-white/25 mt-1 block">
                    {new Date(c.created_at).toLocaleDateString("es-CO", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!readOnly && (
            <div className="p-3 flex gap-1.5">
              <input
                autoFocus
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSubmit();
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Agregar comentario..."
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder:text-gray-400 outline-none focus:border-[#28b8d5]"
              />
              <button
                onClick={() => void handleSubmit()}
                disabled={!texto.trim() || enviando}
                className="px-2.5 py-1.5 rounded-lg bg-[#28b8d5] text-white text-xs font-medium disabled:opacity-40 hover:bg-[#23a7c2] transition-colors"
              >
                {enviando ? "…" : "+"}
              </button>
            </div>
          )}

          {readOnly && celComents.length === 0 && (
            <p className="px-3 py-3 text-[11px] text-gray-400 dark:text-white/25 italic">Sin comentarios.</p>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <td ref={tdRef} className={`relative group/celd ${className}`}>
      {children}

      {/* Triángulo indicador estilo Excel */}
      {hasComents && (
        <span className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-amber-400 pointer-events-none" />
      )}

      {/* Botón comentario */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        title={hasComents ? `${celComents.length} comentario${celComents.length !== 1 ? "s" : ""}` : "Agregar comentario"}
        className={`absolute bottom-0.5 right-0.5 flex items-center justify-center w-4 h-4 rounded transition-all
          ${hasComents
            ? "opacity-100 bg-amber-100 dark:bg-amber-500/15 text-amber-500"
            : readOnly
              ? "hidden"
              : "opacity-0 group-hover/celd:opacity-100 bg-gray-100 dark:bg-white/[0.06] text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-500/15 hover:text-amber-500"
          }`}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>

      {popover}
    </td>
  );
}

// ============================================================================

export default function MatrizInventarioEditor({
  matriz: matrizInicial,
  onSave,
  onGenerateIA,
  onAddComment,
  isSaving,
  isGenerating,
  readOnly = false,
}: MatrizInventarioEditorProps) {
  const [matriz, setMatriz] = useState<MatrizInventarioSistemas>(matrizInicial);
  const [sistemaSeleccionadoId, setSistemaSeleccionadoId] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<TabActiva>("tabla");
  const [nuevoComentarioGeneral, setNuevoComentarioGeneral] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // ── Columnas dinámicas ─────────────────────────────────────────────────
  const storageKey = `inventario-columnas-${matrizInicial.id || "default"}`;
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

  // ── Sistema seleccionado ─────────────────────────────────────────────────
  const sistemaSeleccionado = sistemaSeleccionadoId
    ? matriz.sistemas.find((s) => s.id === sistemaSeleccionadoId)
    : undefined;

  // ── CRUD Sistemas ────────────────────────────────────────────────────────
  const handleAddSistema = useCallback(() => {
    const conteo = matriz.sistemas.length;
    const nuevo: SistemaInventario = {
      id: `sis-${Date.now()}`,
      nombre: `Nuevo Sistema ${conteo + 1}`,
      tipo: "aplicacion",
      descripcion: "",
      areas_estrategicas: [],
      ambientes: [],
      datos_que_maneja: [],
    };
    setMatriz((prev) => ({
      ...prev,
      sistemas: [...prev.sistemas, nuevo],
    }));
    setSistemaSeleccionadoId(nuevo.id);
    setHasChanges(true);
  }, [matriz.sistemas.length]);

  const handleUpdateSistema = useCallback((updated: SistemaInventario) => {
    setMatriz((prev) => ({
      ...prev,
      sistemas: prev.sistemas.map((s) => (s.id === updated.id ? updated : s)),
    }));
    setHasChanges(true);
  }, []);

  const handleDeleteSistema = useCallback((id: string) => {
    setMatriz((prev) => ({
      ...prev,
      sistemas: prev.sistemas.filter((s) => s.id !== id),
    }));
    setSistemaSeleccionadoId(null);
    setHasChanges(true);
  }, []);

  // ── Comentarios ──────────────────────────────────────────────────────────
  const handleAddCommentLocal = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "sistema" | "general" | "celda",
      contenido: string,
      campo?: string | null
    ) => {
      const nuevoComentario: ComentarioMatrizInventario = {
        id: `com-mat-${Date.now()}`,
        referencia_id: referenciaId,
        referencia_tipo: referenciaTipo,
        campo: campo ?? null,
        autor_id: "usr-001",
        autor_nombre: "Carlos Méndez",
        autor_perfil: "CONSULTOR",
        contenido,
        estado: "abierto",
        created_at: new Date().toISOString(),
      };
      setMatriz((prev) => ({
        ...prev,
        comentarios: [...prev.comentarios, nuevoComentario],
      }));
      await onAddComment(referenciaId, referenciaTipo, contenido, campo);
    },
    [onAddComment]
  );

  const handleAddCeldaComment = useCallback(
    async (sistemaId: string, campo: string, contenido: string) => {
      await handleAddCommentLocal(sistemaId, "celda", contenido, campo);
    },
    [handleAddCommentLocal]
  );

  const handleAddComentarioGeneral = async () => {
    if (!nuevoComentarioGeneral.trim()) return;
    await handleAddCommentLocal(null, "general", nuevoComentarioGeneral.trim());
    setNuevoComentarioGeneral("");
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    await onSave(matriz);
    setHasChanges(false);
  };

  // ── Conteos ──────────────────────────────────────────────────────────────
  const conteos = {
    aplicacion: matriz.sistemas.filter((s) => s.tipo === "aplicacion").length,
    base_de_datos: matriz.sistemas.filter((s) => s.tipo === "base_de_datos").length,
    plataforma: matriz.sistemas.filter((s) => s.tipo === "plataforma").length,
    servicio_externo: matriz.sistemas.filter((s) => s.tipo === "servicio_externo").length,
    infraestructura: matriz.sistemas.filter((s) => s.tipo === "infraestructura").length,
  };

  const comentariosGenerales = matriz.comentarios.filter(
    (c) => c.referencia_tipo === "general"
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar superior ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111]">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-white/[0.04] p-0.5">
            {(["tabla", "comentarios", "versiones"] as TabActiva[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setTabActiva(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tabActiva === tab
                    ? "bg-white dark:bg-white/[0.1] text-gray-800 dark:text-white/90 shadow-sm"
                    : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                }`}
              >
                {tab === "tabla" && `Sistemas (${matriz.sistemas.length})`}
                {tab === "comentarios" && `Comentarios (${comentariosGenerales.length})`}
                {tab === "versiones" && `v${matriz.version_actual}`}
              </button>
            ))}
          </div>

          {/* Indicadores */}
          {!readOnly && hasChanges && (
            <span className="text-[10px] font-medium text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
              Cambios sin guardar
            </span>
          )}
          {readOnly && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full">
              Solo lectura
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {/* Agregar columna dinámica */}
            {showAddCol ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  type="text"
                  value={nuevaColLabel}
                  onChange={(e) => setNuevaColLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn();
                    if (e.key === "Escape") { setShowAddCol(false); setNuevaColLabel(""); }
                  }}
                  placeholder="Nombre de columna"
                  className="w-40 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-2.5 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5]"
                />
                <button
                  onClick={handleAddColumn}
                  className="px-3 py-1.5 rounded-lg bg-[#28b8d5] text-white text-xs font-medium hover:bg-[#23a7c2] transition-colors"
                >
                  Añadir
                </button>
                <button
                  onClick={() => { setShowAddCol(false); setNuevaColLabel(""); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddCol(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-xs font-medium text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
              >
                + Columna
              </button>
            )}

            {/* Agregar sistema */}
            <button
              onClick={handleAddSistema}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#28b8d5]/30 text-xs font-medium text-[#28b8d5] hover:bg-[#28b8d5]/5 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Agregar sistema
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08]" />

            {/* Generar con IA */}
            <button
              onClick={onGenerateIA}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#28b8d5] to-[#1e9bb5] text-white text-xs font-semibold hover:from-[#23a7c2] hover:to-[#1a8da5] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  Generar con IA
                </>
              )}
            </button>

            {/* Guardar */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
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
          </div>
        )}
      </div>

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab: Tabla */}
        {tabActiva === "tabla" && (
          <>
            {/* Tabla de sistemas */}
            <div className="flex-1 overflow-auto">
              {matriz.sistemas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-white/20">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M3 15h18M9 3v18" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-white/50 mb-1">
                      Sin sistemas registrados
                    </p>
                    <p className="text-xs text-gray-400 dark:text-white/25">
                      Agrega sistemas manualmente o usa IA para generarlos.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-white/[0.05] shadow-sm">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap border border-gray-300 dark:border-white/[0.12]">
                        #
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide border border-gray-300 dark:border-white/[0.12]">
                        Nombre del Sistema
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap border border-gray-300 dark:border-white/[0.12]">
                        Área Estratégica
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap border border-gray-300 dark:border-white/[0.12]">
                        Tipo
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide border border-gray-300 dark:border-white/[0.12]">
                        Tecnología
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap border border-gray-300 dark:border-white/[0.12]">
                        Criticidad
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap border border-gray-300 dark:border-white/[0.12]">
                        Estado
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide border border-gray-300 dark:border-white/[0.12]">
                        Propietario TI
                      </th>
                      {columnasDinamicas.map((col) => (
                        <th key={col.id} className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide border border-gray-300 dark:border-white/[0.12]">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matriz.sistemas.map((sistema, idx) => {
                      const isSelected = sistemaSeleccionadoId === sistema.id;
                      const rowBase = isSelected
                        ? "bg-[#28b8d5]/5 dark:bg-[#28b8d5]/10"
                        : idx % 2 === 0
                        ? "bg-white dark:bg-transparent"
                        : "bg-gray-50/70 dark:bg-white/[0.02]";
                      const tdBase = "px-4 py-3 border border-gray-200 dark:border-white/[0.08]";
                      return (
                        <tr
                          key={sistema.id}
                          onClick={() => setSistemaSeleccionadoId(isSelected ? null : sistema.id)}
                          className={`cursor-pointer transition-colors hover:brightness-95 dark:hover:bg-white/[0.04] ${rowBase}`}
                        >
                          {/* # */}
                          <td className={`${tdBase} text-[11px] font-mono text-gray-400 dark:text-white/25 whitespace-nowrap`}>
                            {String(idx + 1).padStart(2, "0")}
                          </td>

                          {/* Nombre */}
                          <CeldaComentario
                            sistemaId={sistema.id}
                            campo="nombre"
                            comentarios={matriz.comentarios}
                            onAddComment={handleAddCeldaComment}
                            readOnly={readOnly}
                            className={tdBase}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#28b8d5] shrink-0" />}
                              <span className="text-sm font-medium text-gray-800 dark:text-white/80 truncate max-w-[200px]">
                                {sistema.nombre}
                              </span>
                            </div>
                            {sistema.version && (
                              <span className="text-[10px] text-gray-400 dark:text-white/25 font-mono">
                                v{sistema.version}
                              </span>
                            )}
                          </CeldaComentario>

                          {/* Área Estratégica */}
                          <CeldaComentario
                            sistemaId={sistema.id}
                            campo="areas_estrategicas"
                            comentarios={matriz.comentarios}
                            onAddComment={handleAddCeldaComment}
                            readOnly={readOnly}
                            className={`${tdBase} text-xs text-gray-600 dark:text-white/50 max-w-[160px] whitespace-normal`}
                          >
                            {sistema.areas_estrategicas && sistema.areas_estrategicas.length > 0
                              ? sistema.areas_estrategicas.join(", ")
                              : <span className="text-gray-300 dark:text-white/20">—</span>}
                          </CeldaComentario>

                          {/* Tipo */}
                          <CeldaComentario
                            sistemaId={sistema.id}
                            campo="tipo"
                            comentarios={matriz.comentarios}
                            onAddComment={handleAddCeldaComment}
                            readOnly={readOnly}
                            className={`${tdBase} whitespace-nowrap`}
                          >
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORES[sistema.tipo]}`}>
                              {TIPO_LABELS[sistema.tipo]}
                            </span>
                          </CeldaComentario>

                          {/* Tecnología */}
                          <CeldaComentario
                            sistemaId={sistema.id}
                            campo="tecnologia"
                            comentarios={matriz.comentarios}
                            onAddComment={handleAddCeldaComment}
                            readOnly={readOnly}
                            className={tdBase}
                          >
                            <span className="block truncate max-w-[160px] text-xs text-gray-600 dark:text-white/50">
                              {sistema.tecnologia || <span className="text-gray-300 dark:text-white/20">—</span>}
                            </span>
                          </CeldaComentario>

                          {/* Criticidad */}
                          <CeldaComentario
                            sistemaId={sistema.id}
                            campo="criticidad"
                            comentarios={matriz.comentarios}
                            onAddComment={handleAddCeldaComment}
                            readOnly={readOnly}
                            className={`${tdBase} whitespace-nowrap`}
                          >
                            {sistema.criticidad
                              ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CRITICIDAD_COLORS[sistema.criticidad]}`}>{CRITICIDAD_LABELS[sistema.criticidad]}</span>
                              : <span className="text-gray-300 dark:text-white/20">—</span>}
                          </CeldaComentario>

                          {/* Estado */}
                          <CeldaComentario
                            sistemaId={sistema.id}
                            campo="estado"
                            comentarios={matriz.comentarios}
                            onAddComment={handleAddCeldaComment}
                            readOnly={readOnly}
                            className={`${tdBase} whitespace-nowrap`}
                          >
                            {sistema.estado
                              ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORES[sistema.estado]}`}>{ESTADO_LABELS[sistema.estado]}</span>
                              : <span className="text-gray-300 dark:text-white/20">—</span>}
                          </CeldaComentario>

                          {/* Propietario TI */}
                          <CeldaComentario
                            sistemaId={sistema.id}
                            campo="propietario_tecnico"
                            comentarios={matriz.comentarios}
                            onAddComment={handleAddCeldaComment}
                            readOnly={readOnly}
                            className={tdBase}
                          >
                            <span className="block truncate max-w-[180px] text-xs text-gray-500 dark:text-white/40">
                              {sistema.propietario_tecnico || <span className="text-gray-300 dark:text-white/20">—</span>}
                            </span>
                          </CeldaComentario>

                          {/* Columnas dinámicas */}
                          {columnasDinamicas.map((col) => (
                            <CeldaComentario
                              key={col.id}
                              sistemaId={sistema.id}
                              campo={col.id}
                              comentarios={matriz.comentarios}
                              onAddComment={handleAddCeldaComment}
                              readOnly={readOnly}
                              className={tdBase}
                            >
                              <span className="block truncate max-w-[160px] text-xs text-gray-600 dark:text-white/50">
                                {(sistema as any)[col.id] || <span className="text-gray-300 dark:text-white/20">—</span>}
                              </span>
                            </CeldaComentario>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Panel lateral de detalle */}
            {sistemaSeleccionado && (
              <PanelSistema
                sistema={sistemaSeleccionado}
                comentarios={matriz.comentarios}
                columnasDinamicas={columnasDinamicas}
                onUpdate={handleUpdateSistema}
                onDelete={handleDeleteSistema}
                onClose={() => setSistemaSeleccionadoId(null)}
                onAddComment={handleAddCommentLocal}
                readOnly={readOnly}
              />
            )}
          </>
        )}

        {/* Tab: Comentarios generales */}
        {tabActiva === "comentarios" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">
              Comentarios generales del inventario
            </h3>

            <div className="space-y-3 mb-6">
              {comentariosGenerales.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-white/30 italic">
                  No hay comentarios generales aún.
                </p>
              )}
              {comentariosGenerales.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/70">
                      {c.autor_nombre}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        c.autor_perfil === "CONSULTOR"
                          ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                          : "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                      }`}
                    >
                      {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-white/40">
                      General
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-white/60">{c.contenido}</p>
                  <span className="text-[10px] text-gray-400 dark:text-white/25 mt-2 block">
                    {new Date(c.created_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddComentarioGeneral()
                  }
                  placeholder="Agregar comentario general sobre el inventario..."
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

        {/* Tab: Versiones */}
        {tabActiva === "versiones" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">
              Historial de Versiones
            </h3>

            <div className="space-y-0">
              {[...matriz.historial_versiones].reverse().map((v, i) => (
                <div key={v.version} className="flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        i === 0 ? "bg-[#28b8d5]" : "bg-gray-300 dark:bg-white/[0.15]"
                      }`}
                    />
                    {i < matriz.historial_versiones.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-white/[0.08]" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold ${
                          i === 0 ? "text-[#28b8d5]" : "text-gray-600 dark:text-white/50"
                        }`}
                      >
                        v{v.version}
                      </span>
                      {i === 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                          Actual
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-white/25">
                        · {v.total_sistemas} sistemas
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-white/60 mb-1">
                      {v.descripcion_cambio}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-white/25">
                      <span>{v.autor}</span>
                      <span>·</span>
                      <span>
                        {new Date(v.fecha).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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

      {/* ── Footer: Resumen ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-white/35">
          {conteos.aplicacion > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {conteos.aplicacion} {conteos.aplicacion === 1 ? "aplicación" : "aplicaciones"}
            </span>
          )}
          {conteos.base_de_datos > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              {conteos.base_de_datos} {conteos.base_de_datos === 1 ? "base de datos" : "bases de datos"}
            </span>
          )}
          {conteos.plataforma > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {conteos.plataforma} {conteos.plataforma === 1 ? "plataforma" : "plataformas"}
            </span>
          )}
          {conteos.servicio_externo > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {conteos.servicio_externo} {conteos.servicio_externo === 1 ? "servicio ext." : "servicios ext."}
            </span>
          )}
          {conteos.infraestructura > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {conteos.infraestructura} infraestructura
            </span>
          )}
          <span className="text-gray-300 dark:text-white/20">·</span>
          <span>{matriz.comentarios.length} comentarios</span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-white/25">
          Última modificación:{" "}
          {new Date(matriz.updated_at).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

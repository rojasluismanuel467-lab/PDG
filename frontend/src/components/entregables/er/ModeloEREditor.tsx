"use client";
import React, { useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Eye,
  GitBranch,
  History,
  Info,
  MessageSquare,
  MousePointer2,
  RotateCcw,
  Save,
  Sparkles,
  SquarePlus,
  ThumbsUp,
  X,
} from "lucide-react";
import type {
  ModeloER,
  EntidadER,
  RelacionER,
  ComentarioER,
  Cardinalidad,
} from "@/lib/types/modelo-er.types";
import ERCanvas from "./ERCanvas";
import PanelEntidad from "./PanelEntidad";
import PanelRelacion from "./PanelRelacion";
import type { EdgeRouting } from "./RelacionEdge";
import ContextMenu, { type ContextMenuState } from "./ContextMenu";
import CommentPopover, { type CommentPopoverState } from "./CommentPopover";

// ============================================================================
// ModeloEREditor — Componente principal del editor de Modelo ER
// Integra: canvas, paneles de edición, comentarios, versionamiento, IA
// ============================================================================

interface ModeloEREditorProps {
  modelo: ModeloER;
  onSave: (modelo: ModeloER) => Promise<ModeloER | void>;
  onGenerateIA?: () => Promise<void>;
  onPreviewVersion?: (versionNumber: number) => Promise<ModeloER>;
  onRestoreVersion?: (versionNumber: number) => Promise<ModeloER>;
  onAddComment?: (
    referenciaId: string | null,
    referenciaTipo: "entidad" | "relacion" | "general",
    contenido: string
  ) => Promise<ComentarioER>;
  isSaving: boolean;
  isGenerating: boolean;
  readOnly?: boolean;
  allowGenerate?: boolean;
  allowComments?: boolean;
}

type PanelActivo =
  | { tipo: "entidad"; id: string }
  | { tipo: "relacion"; id: string }
  | null;

type TabActiva = "diagrama" | "versiones";
type CommentFilter = "all" | "active" | "outdated" | "resolved";

const COLORES_ENTIDAD = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
  "#EF4444", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

function parseVersionNumber(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isFinite(direct)) return direct;
  const digits = trimmed.match(/\d+/);
  if (!digits) return null;
  const parsed = Number(digits[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ModeloEREditor({
  modelo: modeloInicial,
  onSave,
  onGenerateIA,
  onPreviewVersion,
  onRestoreVersion,
  onAddComment,
  isSaving,
  isGenerating,
  readOnly = false,
  allowGenerate = true,
  allowComments = true,
}: ModeloEREditorProps) {
  const [modelo, setModelo] = useState<ModeloER>(modeloInicial);
  const [panelActivo, setPanelActivo] = useState<PanelActivo>(null);
  const [tabActiva, setTabActiva] = useState<TabActiva>("diagrama");
  const [nuevoComentarioGeneral, setNuevoComentarioGeneral] = useState("");
  const [showGeneralComments, setShowGeneralComments] = useState(false);
  const [commentFilter, setCommentFilter] = useState<CommentFilter>("all");
  const [previewModelo, setPreviewModelo] = useState<ModeloER | null>(null);
  const [previewingVersion, setPreviewingVersion] = useState<number | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [edgeRouting, setEdgeRouting] = useState<EdgeRouting>("ortogonal");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [commentPopover, setCommentPopover] = useState<CommentPopoverState | null>(null);

  // ── Selección ──────────────────────────────────────────────────────────
  const handleSelectEntidad = useCallback((id: string) => {
    setPanelActivo({ tipo: "entidad", id });
  }, []);

  const handleSelectRelacion = useCallback((id: string) => {
    setPanelActivo({ tipo: "relacion", id });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setPanelActivo(null);
  }, []);

  // ── Actualización de posición de nodos ─────────────────────────────────
  const handleNodeDragStop = useCallback((id: string, x: number, y: number) => {
    setModelo((prev) => ({
      ...prev,
      entidades: prev.entidades.map((ent) =>
        ent.id === id ? { ...ent, posicion_x: x, posicion_y: y } : ent
      ),
    }));
    setHasChanges(true);
  }, []);

  // ── CRUD Entidades ─────────────────────────────────────────────────────
  const handleUpdateEntidad = useCallback((updated: EntidadER) => {
    setModelo((prev) => ({
      ...prev,
      entidades: prev.entidades.map((ent) =>
        ent.id === updated.id ? updated : ent
      ),
    }));
    setHasChanges(true);
  }, []);

  const handleDeleteEntidad = useCallback((id: string) => {
    setModelo((prev) => ({
      ...prev,
      entidades: prev.entidades.filter((ent) => ent.id !== id),
      relaciones: prev.relaciones.filter(
        (rel) => rel.entidad_origen_id !== id && rel.entidad_destino_id !== id
      ),
    }));
    setPanelActivo(null);
    setHasChanges(true);
  }, []);

  const handleAddEntidad = useCallback(() => {
    // Encuentra el menor número disponible para "EntidadN"
    const usados = new Set(
      modelo.entidades
        .map((e) => { const m = e.nombre.match(/^Entidad(\d+)$/); return m ? Number(m[1]) : null; })
        .filter((n): n is number => n !== null)
    );
    let n = 1;
    while (usados.has(n)) n++;

    const nuevaEntidad: EntidadER = {
      id: `ent-${Date.now()}`,
      nombre: `Entidad${n}`,
      descripcion: "",
      atributos: [
        {
          id: `attr-${Date.now()}-pk`,
          nombre: "id",
          tipo_dato: "UUID",
          es_pk: true,
          es_fk: false,
          es_nullable: false,
        },
      ],
      posicion_x: 250 + Math.random() * 200,
      posicion_y: 150 + Math.random() * 200,
      color: COLORES_ENTIDAD[modelo.entidades.length % COLORES_ENTIDAD.length],
    };
    setModelo((prev) => ({
      ...prev,
      entidades: [...prev.entidades, nuevaEntidad],
    }));
    setPanelActivo({ tipo: "entidad", id: nuevaEntidad.id });
    setHasChanges(true);
  }, [modelo.entidades]);

  // ── Conexión por arrastre de handle ───────────────────────────────────
  const handleConnectNodes = useCallback(
    (
      sourceId: string,
      targetId: string,
      sourceHandleId?: string | null,
      targetHandleId?: string | null
    ) => {
      if (readOnly || sourceId === targetId) return;
      const nuevaRelacion: RelacionER = {
        id: `rel-${Date.now()}`,
        nombre: "nueva_relacion",
        entidad_origen_id: sourceId,
        entidad_destino_id: targetId,
        source_handle_id: sourceHandleId ?? undefined,
        target_handle_id: targetHandleId ?? undefined,
        cardinalidad: "1:N" as Cardinalidad,
        routing: "ortogonal",
      };
      setModelo((prev) => ({
        ...prev,
        relaciones: [...prev.relaciones, nuevaRelacion],
      }));
      setPanelActivo({ tipo: "relacion", id: nuevaRelacion.id });
      setHasChanges(true);
    },
    [readOnly]
  );

  const handleUpdateRelacionHandles = useCallback(
    (relacionId: string, sourceHandleId?: string, targetHandleId?: string) => {
      setModelo((prev) => ({
        ...prev,
        relaciones: prev.relaciones.map((r) =>
          r.id === relacionId
            ? { ...r, source_handle_id: sourceHandleId, target_handle_id: targetHandleId }
            : r
        ),
      }));
      setHasChanges(true);
    },
    []
  );

  // ── CRUD Relaciones ────────────────────────────────────────────────────
  const handleUpdateRelacion = useCallback((updated: RelacionER) => {
    setModelo((prev) => ({
      ...prev,
      relaciones: prev.relaciones.map((rel) =>
        rel.id === updated.id ? updated : rel
      ),
    }));
    setHasChanges(true);
  }, []);

  const handleDeleteRelacion = useCallback((id: string) => {
    setModelo((prev) => ({
      ...prev,
      relaciones: prev.relaciones.filter((rel) => rel.id !== id),
    }));
    setPanelActivo(null);
    setHasChanges(true);
  }, []);

  const handleDuplicateEntidad = useCallback((id: string) => {
    const source = modelo.entidades.find((ent) => ent.id === id);
    if (!source) return;

    const duplicated: EntidadER = {
      ...source,
      id: `ent-${Date.now()}`,
      nombre: `${source.nombre}_copia`,
      posicion_x: source.posicion_x + 36,
      posicion_y: source.posicion_y + 36,
      atributos: source.atributos.map((attr, idx) => ({
        ...attr,
        id: `attr-${Date.now()}-${idx}`,
      })),
    };

    setModelo((prev) => ({
      ...prev,
      entidades: [...prev.entidades, duplicated],
    }));
    setPanelActivo({ tipo: "entidad", id: duplicated.id });
    setHasChanges(true);
  }, [modelo.entidades]);

  const handleDuplicateRelacion = useCallback((id: string) => {
    const source = modelo.relaciones.find((rel) => rel.id === id);
    if (!source) return;

    const duplicated: RelacionER = {
      ...source,
      id: `rel-${Date.now()}`,
      nombre: `${source.nombre}_copia`,
    };

    setModelo((prev) => ({
      ...prev,
      relaciones: [...prev.relaciones, duplicated],
    }));
    setPanelActivo({ tipo: "relacion", id: duplicated.id });
    setHasChanges(true);
  }, [modelo.relaciones]);

  const handleAddRelacion = useCallback(() => {
    if (modelo.entidades.length < 2) return;
    const nuevaRelacion: RelacionER = {
      id: `rel-${Date.now()}`,
      nombre: "nueva_relacion",
      entidad_origen_id: modelo.entidades[0].id,
      entidad_destino_id: modelo.entidades[1].id,
      cardinalidad: "1:N" as Cardinalidad,
      routing: "ortogonal",
    };
    setModelo((prev) => ({
      ...prev,
      relaciones: [...prev.relaciones, nuevaRelacion],
    }));
    setPanelActivo({ tipo: "relacion", id: nuevaRelacion.id });
    setHasChanges(true);
  }, [modelo.entidades]);

  // ── Comentarios ────────────────────────────────────────────────────────
  const handleAddCommentLocal = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "entidad" | "relacion" | "general",
      contenido: string
    ) => {
      if (!allowComments || !onAddComment) {
        return;
      }
      const nuevoComentario = await onAddComment(referenciaId, referenciaTipo, contenido);
      setModelo((prev) => ({
        ...prev,
        comentarios: [...prev.comentarios, nuevoComentario],
      }));
    },
    [allowComments, onAddComment]
  );

  const handleAddComentarioGeneral = async () => {
    if (!nuevoComentarioGeneral.trim()) return;
    await handleAddCommentLocal(null, "general", nuevoComentarioGeneral.trim());
    setNuevoComentarioGeneral("");
  };

  const handleContextMenu = useCallback((id: string, tipo: "entidad" | "relacion", x: number, y: number) => {
    if (readOnly) return;
    const item = tipo === "entidad"
      ? modelo.entidades.find(e => e.id === id)
      : modelo.relaciones.find(r => r.id === id);
    if (!item) return;
    const comentariosCount = modelo.comentarios.filter(
      c => c.referencia_id === id && c.referencia_tipo === tipo
    ).length;
    setContextMenu({ x, y, tipo, id, nombre: item.nombre, comentariosCount });
  }, [readOnly, modelo]);

  const handleCommentPinClick = useCallback((id: string, tipo: "entidad" | "relacion", x: number, y: number) => {
    const item = tipo === "entidad"
      ? modelo.entidades.find(e => e.id === id)
      : modelo.relaciones.find(r => r.id === id);
    if (!item) return;
    const popoverWidth = 320;
    const popoverHeight = 420;
    const adjX = typeof window !== "undefined" && x + popoverWidth + 16 > window.innerWidth
      ? Math.max(8, x - popoverWidth - 8)
      : x + 12;
    const adjY = typeof window !== "undefined"
      ? Math.min(y, Math.max(8, window.innerHeight - popoverHeight - 8))
      : y;
    setCommentPopover({ x: adjX, y: adjY, referenciaId: id, referenciaTipo: tipo, nombre: item.nombre });
  }, [modelo]);

  const handleResolveComment = useCallback((commentId: string) => {
    setModelo(prev => ({
      ...prev,
      comentarios: prev.comentarios.map(c =>
        c.id === commentId ? { ...c, estado: "resuelto" as const } : c
      ),
    }));
    setHasChanges(true);
  }, []);

  const handleReopenComment = useCallback((commentId: string) => {
    setModelo(prev => ({
      ...prev,
      comentarios: prev.comentarios.map(c =>
        c.id === commentId ? { ...c, estado: "abierto" as const } : c
      ),
    }));
    setHasChanges(true);
  }, []);

  const handleReverseRelation = useCallback((id: string) => {
    setModelo(prev => ({
      ...prev,
      relaciones: prev.relaciones.map(r =>
        r.id === id ? { ...r, entidad_origen_id: r.entidad_destino_id, entidad_destino_id: r.entidad_origen_id } : r
      ),
    }));
    setHasChanges(true);
  }, []);

  const handleAddCommentFromPopover = useCallback(async (contenido: string) => {
    if (!commentPopover) return;

    // Auto-save silently if there are unsaved changes so the server recognizes all elements
    if (hasChanges) {
      try {
        const updated = await onSave(modelo);
        if (updated) setModelo(updated);
        setHasChanges(false);
      } catch {
        setFeedbackMessage("No se pudo guardar el diagrama. Guárdalo manualmente e intenta de nuevo.");
        return;
      }
    }

    try {
      await handleAddCommentLocal(commentPopover.referenciaId, commentPopover.referenciaTipo, contenido);
    } catch {
      setFeedbackMessage("Ocurrió un error al agregar el comentario. Inténtalo de nuevo.");
    }
  }, [commentPopover, hasChanges, modelo, onSave, handleAddCommentLocal]);

  const closePreviewModal = useCallback(() => {
    setPreviewModelo(null);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    setFeedbackMessage(null);
  }, []);

  // ── Guardar ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const updated = await onSave(modelo);
    if (updated) setModelo(updated);
    setHasChanges(false);
  };

  const handlePreviewVersion = useCallback(
    async (versionNumber: number) => {
      if (!onPreviewVersion) return;
      setPreviewingVersion(versionNumber);
      try {
        const preview = await onPreviewVersion(versionNumber);
        setPreviewModelo(preview);
      } catch (error) {
        const message =
          axios.isAxiosError(error) && error.response?.status === 404
            ? `No se encontró la versión v${versionNumber} para previsualizar.`
            : "No fue posible previsualizar la versión seleccionada.";
        setFeedbackMessage(message);
      } finally {
        setPreviewingVersion(null);
      }
    },
    [onPreviewVersion]
  );

  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      if (readOnly) return;
      if (!onRestoreVersion) return;
      setRestoringVersion(versionNumber);
      try {
        const restored = await onRestoreVersion(versionNumber);
        setModelo(restored);
        setHasChanges(false);
        setPreviewModelo(null);
        setConfirmRestoreVersion(null);
      } catch {
        setFeedbackMessage("No fue posible restaurar la versión seleccionada.");
      } finally {
        setRestoringVersion(null);
      }
    },
    [onRestoreVersion, readOnly]
  );

  // ── Datos derivados ────────────────────────────────────────────────────
  const entidadSeleccionada =
    panelActivo?.tipo === "entidad"
      ? modelo.entidades.find((e) => e.id === panelActivo.id)
      : undefined;

  const relacionSeleccionada =
    panelActivo?.tipo === "relacion"
      ? modelo.relaciones.find((r) => r.id === panelActivo.id)
      : undefined;

  const comentariosFiltrados = useMemo(() => {
    return modelo.comentarios.filter((comment) => {
      if (commentFilter === "all") return true;
      if (commentFilter === "active") return comment.estado === "abierto" && !comment.es_desactualizado;
      if (commentFilter === "outdated") return !!comment.es_desactualizado;
      return comment.estado === "resuelto";
    });
  }, [commentFilter, modelo.comentarios]);

  const comentariosPopover = commentPopover
    ? modelo.comentarios.filter(
        c => c.referencia_id === commentPopover.referenciaId && c.referencia_tipo === commentPopover.referenciaTipo
      )
    : [];

  const comentariosGenerales = comentariosFiltrados.filter(
    (c) => c.referencia_tipo === "general"
  );
  const versionesOrdenadas = useMemo(
    () =>
      [...modelo.historial_versiones].sort(
        (a, b) =>
          (parseVersionNumber(b.version) ?? Number.MIN_SAFE_INTEGER) -
          (parseVersionNumber(a.version) ?? Number.MIN_SAFE_INTEGER)
      ),
    [modelo.historial_versiones]
  );
  const tabs = ["diagrama", "versiones"] as TabActiva[];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar superior ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111]">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-white/[0.04] p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setTabActiva(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tabActiva === tab
                    ? "bg-white dark:bg-white/[0.1] text-gray-800 dark:text-white/90 shadow-sm"
                    : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                }`}
              >
                {tab === "diagrama" && (
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3" />
                    Diagrama
                  </span>
                )}
                {tab === "versiones" && (
                  <span className="flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    v{modelo.version_actual}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Indicador de cambios */}
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

        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              {/* Agregar entidad */}
              <button
                onClick={handleAddEntidad}
                title="Agregar entidad"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <SquarePlus className="h-3.5 w-3.5" />
                Entidad
              </button>

              {/* Agregar relación */}
              <button
                onClick={handleAddRelacion}
                disabled={modelo.entidades.length < 2}
                title={modelo.entidades.length < 2 ? "Necesitas al menos 2 entidades" : "Agregar relación"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.03] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Relación
              </button>

              {/* Separador */}
              <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08]" />

              {allowComments && (
                <>
                  <select
                    value={commentFilter}
                    onChange={(e) => setCommentFilter(e.target.value as CommentFilter)}
                    title="Filtrar comentarios"
                    className="px-2.5 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-xs font-medium text-gray-600 dark:text-white/60 outline-none focus:border-[#28b8d5]"
                  >
                    <option value="all">Comentarios: Todos</option>
                    <option value="active">Comentarios: Activos</option>
                    <option value="outdated">Comentarios: Desactualizados</option>
                    <option value="resolved">Comentarios: Resueltos</option>
                  </select>
                  <button
                    onClick={() => setShowGeneralComments((prev) => !prev)}
                    title="Ver comentarios generales"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                      showGeneralComments
                        ? "border-[#28b8d5]/40 bg-[#28b8d5]/10 text-[#28b8d5] dark:border-[#28b8d5]/30 dark:bg-[#28b8d5]/10"
                        : "border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {comentariosGenerales.length > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#28b8d5] text-[9px] font-bold text-white">
                        {comentariosGenerales.length}
                      </span>
                    )}
                  </button>
                </>
              )}

              {allowGenerate && onGenerateIA && (
                <button
                  onClick={onGenerateIA}
                  disabled={isGenerating}
                  title="Generar diagrama con inteligencia artificial"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#28b8d5] to-[#1e9bb5] text-white text-xs font-semibold hover:from-[#23a7c2] hover:to-[#1a8da5] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
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
                      <Sparkles className="h-3.5 w-3.5" />
                      Generar con IA
                    </>
                  )}
                </button>
              )}

              {/* Guardar */}
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                title={hasChanges ? "Guardar cambios" : "No hay cambios por guardar"}
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
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Guardar
                  </>
                )}
              </button>

              {/* Separador */}
              <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08]" />
            </>
          )}

          {/* Routing de aristas */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-white/[0.04] p-0.5" title="Estilo de líneas">
            {(
              [
                {
                  value: "ortogonal" as const,
                  title: "Líneas ortogonales",
                  icon: (
                    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,11 2,5 8,5 8,3" />
                    </svg>
                  ),
                },
                {
                  value: "lineal" as const,
                  title: "Líneas rectas",
                  icon: (
                    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <line x1="2" y1="11" x2="12" y2="3" />
                    </svg>
                  ),
                },
                {
                  value: "libre" as const,
                  title: "Líneas curvas",
                  icon: (
                    <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M2 11 C4 4, 10 10, 12 3" />
                    </svg>
                  ),
                },
              ] as const
            ).map(({ value, title, icon }) => (
              <button
                key={value}
                onClick={() => setEdgeRouting(value)}
                title={title}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  edgeRouting === value
                    ? "bg-white dark:bg-white/[0.1] text-[#28b8d5] shadow-sm"
                    : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08]" />

          {/* Ayuda — siempre visible */}
          <button
            onClick={() => setShowHelpPanel((v) => !v)}
            title="Guía del editor"
            className={`p-2 rounded-xl border transition-colors ${
              showHelpPanel
                ? "border-[#28b8d5]/40 bg-[#28b8d5]/10 text-[#28b8d5]"
                : "border-gray-200 dark:border-white/[0.08] text-gray-400 dark:text-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-600 dark:hover:text-white/50"
            }`}
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Contenido principal ───────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab: Diagrama */}
        {tabActiva === "diagrama" && (
          <>
            {/* Canvas */}
            <div className="relative flex-1 p-4">
              <ERCanvas
                modelo={modelo}
                entidadSeleccionadaId={panelActivo?.tipo === "entidad" ? panelActivo.id : null}
                relacionSeleccionadaId={panelActivo?.tipo === "relacion" ? panelActivo.id : null}
                onSelectEntidad={readOnly ? () => {} : handleSelectEntidad}
                onSelectRelacion={readOnly ? () => {} : handleSelectRelacion}
                onDeselectAll={readOnly ? () => {} : handleDeselectAll}
                onNodeDragStop={readOnly ? () => {} : handleNodeDragStop}
                onConnectNodes={readOnly ? undefined : handleConnectNodes}
                onUpdateRelacionHandles={readOnly ? undefined : handleUpdateRelacionHandles}
                edgeRouting={edgeRouting}
                onContextMenu={readOnly ? undefined : handleContextMenu}
                onCommentPinClick={handleCommentPinClick}
              />

              {/* ── Empty state ─────────────────────────────────── */}
              {modelo.entidades.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center max-w-xs px-6">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/[0.12]">
                      <SquarePlus className="h-7 w-7 text-gray-300 dark:text-white/20" />
                    </div>
                    <h3 className="mb-1.5 text-sm font-semibold text-gray-500 dark:text-white/50">
                      El diagrama está vacío
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-400 dark:text-white/30">
                      Usa <strong className="text-gray-500 dark:text-white/40">«+ Entidad»</strong> en la barra superior para comenzar, o genera el diagrama automáticamente con IA.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Help panel ──────────────────────────────────── */}
              {showHelpPanel && (
                <div className="absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#111111]">
                  <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <CircleHelp className="h-4 w-4 text-[#28b8d5]" />
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white/90">Guía del editor</h4>
                    </div>
                    <button
                      onClick={() => setShowHelpPanel(false)}
                      className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-white/60"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto">
                    {/* Cómo usar */}
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
                      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">
                        Cómo usar
                      </p>
                      <ol className="space-y-2">
                        {[
                          "Haz clic en «+ Entidad» para agregar una nueva tabla al diagrama.",
                          "Arrastra las entidades para organizarlas en el canvas.",
                          "Haz clic en una entidad para editar su nombre y atributos.",
                          "Usa «⇄ Relación» para definir la relación entre dos entidades.",
                          "Haz clic en una relación para cambiar su cardinalidad o nombre.",
                          "Guarda con el botón «Guardar» cuando termines los cambios.",
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#28b8d5]/15 text-[9px] font-bold text-[#28b8d5]">
                              {i + 1}
                            </span>
                            <span className="text-[11px] leading-relaxed text-gray-600 dark:text-white/60">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Notación Crow's Foot */}
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
                      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">
                        Notación Crow&apos;s Foot
                      </p>
                      <div className="space-y-2">
                        {[
                          { symbol: "O|",  label: "Cero o uno (0..1)",   desc: "Relación opcional singular" },
                          { symbol: "||",  label: "Exactamente uno (1)", desc: "Relación obligatoria singular" },
                          { symbol: "O<",  label: "Cero o muchos (0..N)",desc: "Relación opcional plural" },
                          { symbol: "|<",  label: "Uno o muchos (1..N)", desc: "Relación obligatoria plural" },
                        ].map((n) => (
                          <div key={n.symbol} className="flex items-center gap-3">
                            <code className="w-6 shrink-0 text-center text-[11px] font-mono font-bold text-[#28b8d5]">
                              {n.symbol}
                            </code>
                            <div>
                              <p className="text-[11px] font-medium text-gray-700 dark:text-white/70">{n.label}</p>
                              <p className="text-[10px] text-gray-400 dark:text-white/30">{n.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cardinalidades */}
                    <div className="border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
                      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">
                        Cardinalidades disponibles
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {["1:1","1:N","N:1","N:M","0..1:1","0..1:N","1:0..N","0..N:0..N"].map((c) => (
                          <span
                            key={c}
                            className="rounded px-1.5 py-0.5 text-[10px] font-mono font-medium bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-white/50"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Buenas prácticas */}
                    <div className="px-4 py-3">
                      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">
                        Buenas prácticas
                      </p>
                      <ul className="space-y-1.5">
                        {[
                          "Nombra entidades en singular (Cliente, Pedido).",
                          "Cada entidad debe tener una clave primaria (PK).",
                          "Las claves foráneas (FK) modelan las relaciones.",
                          "Evita atributos redundantes entre entidades.",
                          "Usa nombres descriptivos en las relaciones.",
                        ].map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                            <span className="text-[11px] leading-relaxed text-gray-600 dark:text-white/55">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {allowComments && showGeneralComments && (
                <div className="absolute z-20 top-20 right-8 w-[360px] max-h-[60vh] overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] shadow-lg">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-700 dark:text-white/80">
                      Comentarios generales
                    </h4>
                    <button
                      onClick={() => setShowGeneralComments(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white/70"
                    >
                      Cerrar
                    </button>
                  </div>
                  <div className="px-4 py-3 space-y-2 max-h-[38vh] overflow-y-auto">
                    {comentariosGenerales.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-white/30 italic">
                        No hay comentarios generales.
                      </p>
                    )}
                    {comentariosGenerales.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] px-3 py-2"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-gray-700 dark:text-white/70">
                            {c.autor_nombre}
                          </span>
                          {c.es_desactualizado && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                              Desactualizado
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400 dark:text-white/30">
                            {new Date(c.created_at).toLocaleString("es-CO", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-white/60">{c.contenido}</p>
                        {c.created_in_version_number && (
                          <p className="mt-1 text-[10px] text-gray-400 dark:text-white/30">
                            Creado en versión {c.created_in_version_number}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06] flex gap-2">
                    <input
                      type="text"
                      value={nuevoComentarioGeneral}
                      onChange={(e) => setNuevoComentarioGeneral(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComentarioGeneral()}
                      placeholder="Agregar comentario general..."
                      className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
                    />
                    <button
                      onClick={handleAddComentarioGeneral}
                      disabled={!nuevoComentarioGeneral.trim()}
                      className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Panel lateral */}
            {entidadSeleccionada && (
              <PanelEntidad
                entidad={entidadSeleccionada}
                comentarios={comentariosFiltrados}
                onUpdate={handleUpdateEntidad}
                onDelete={handleDeleteEntidad}
                onClose={handleDeselectAll}
                enableComments={allowComments && !!onAddComment}
                onAddComment={handleAddCommentLocal}
                onResolveComment={handleResolveComment}
                onReopenComment={handleReopenComment}
              />
            )}
            {relacionSeleccionada && (
              <PanelRelacion
                relacion={relacionSeleccionada}
                entidades={modelo.entidades}
                comentarios={comentariosFiltrados}
                onUpdate={handleUpdateRelacion}
                onDelete={handleDeleteRelacion}
                onClose={handleDeselectAll}
                enableComments={allowComments && !!onAddComment}
                onAddComment={handleAddCommentLocal}
                onResolveComment={handleResolveComment}
                onReopenComment={handleReopenComment}
              />
            )}
          </>
        )}

        {/* Tab: Versiones */}
        {tabActiva === "versiones" && (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-6 py-6">
              {/* Header info */}
              <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#28b8d5]/10">
                    <History className="h-4 w-4 text-[#28b8d5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      Historial de versiones
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-white/40">
                      {versionesOrdenadas.length} versión{versionesOrdenadas.length !== 1 ? "es" : ""} registrada{versionesOrdenadas.length !== 1 ? "s" : ""} · Versión actual:{" "}
                      <span className="font-semibold text-[#28b8d5]">v{modelo.version_actual}</span>
                    </p>
                  </div>
                </div>
                {!readOnly && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300/80">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Restaurar una versión crea una nueva versión con el contenido histórico, sin eliminar el historial actual.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-0">
                {versionesOrdenadas.length === 0 && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-10 dark:border-white/[0.08]">
                    <History className="h-8 w-8 text-gray-300 dark:text-white/15" />
                    <p className="text-xs text-gray-400 dark:text-white/30">No hay versiones registradas aún.</p>
                  </div>
                )}
                {versionesOrdenadas.map((v, i) => {
                const versionNumber = parseVersionNumber(v.version);
                const currentVersion = parseVersionNumber(modelo.version_actual);
                const isCurrent =
                  versionNumber !== null &&
                  currentVersion !== null &&
                  versionNumber === currentVersion;
                  return (
                  <div key={`${v.version}-${i}`} className="flex gap-4">
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${
                        isCurrent ? "bg-[#28b8d5]" : "bg-gray-300 dark:bg-white/[0.15]"
                      }`} />
                      {i < versionesOrdenadas.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-white/[0.08]" />
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="pb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${
                          isCurrent ? "text-[#28b8d5]" : "text-gray-600 dark:text-white/50"
                        }`}>
                          v{v.version}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                            Actual
                          </span>
                        )}
                        {!isCurrent && onPreviewVersion && versionNumber !== null && (
                          <button
                            onClick={() => handlePreviewVersion(versionNumber)}
                            disabled={previewingVersion === versionNumber}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-50"
                          >
                            <Eye className="h-3 w-3" />
                            {previewingVersion === versionNumber ? "Cargando..." : "Previsualizar"}
                          </button>
                        )}
                        {!isCurrent && onRestoreVersion && !readOnly && versionNumber !== null && (
                          <button
                            onClick={() => setConfirmRestoreVersion(versionNumber)}
                            disabled={restoringVersion === versionNumber}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {restoringVersion === versionNumber ? "Restaurando..." : "Restaurar"}
                          </button>
                        )}
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
                  )})}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer: Resumen del modelo ────────────────────────────────── */}
      {previewModelo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#111111] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">
                  Vista previa de versión v{previewModelo.version_actual}
                </h4>
                <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                  {previewModelo.entidades.length} entidades · {previewModelo.relaciones.length} relaciones
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && onRestoreVersion && parseVersionNumber(previewModelo.version_actual) !== null && (
                  <button
                    onClick={() => {
                      const versionNumber = parseVersionNumber(previewModelo.version_actual);
                      if (versionNumber !== null) {
                        setConfirmRestoreVersion(versionNumber);
                      }
                    }}
                    disabled={
                      restoringVersion === parseVersionNumber(previewModelo.version_actual)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {restoringVersion === parseVersionNumber(previewModelo.version_actual)
                      ? "Restaurando..."
                      : "Restaurar versión"}
                  </button>
                )}
                <button
                  onClick={closePreviewModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Cerrar
                </button>
              </div>
            </div>

            <div className="p-5 h-[68vh] min-h-[420px]">
              <ERCanvas
                modelo={previewModelo}
                entidadSeleccionadaId={null}
                relacionSeleccionadaId={null}
                onSelectEntidad={() => {}}
                onSelectRelacion={() => {}}
                onDeselectAll={() => {}}
                onNodeDragStop={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {confirmRestoreVersion !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#111111] shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">
                Confirmar restauración
              </h4>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                Se restaurará la versión v{confirmRestoreVersion} y se creará una nueva versión con ese contenido.
              </p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmRestoreVersion(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
              <button
                onClick={() => void handleRestoreVersion(confirmRestoreVersion)}
                disabled={restoringVersion === confirmRestoreVersion}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {restoringVersion === confirmRestoreVersion ? "Restaurando..." : "Restaurar versión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#111111] shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">Aviso</h4>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-1">{feedbackMessage}</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end">
              <button
                onClick={closeFeedbackModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-2.5 dark:border-white/[0.08] dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-white/30">
          <span className="font-medium text-gray-600 dark:text-white/50">
            {modelo.entidades.length} entidad{modelo.entidades.length !== 1 ? "es" : ""}
          </span>
          <span>·</span>
          <span className="font-medium text-gray-600 dark:text-white/50">
            {modelo.relaciones.length} relación{modelo.relaciones.length !== 1 ? "es" : ""}
          </span>
          {allowComments && (
            <>
              <span>·</span>
              <span>{comentariosFiltrados.length} comentario{comentariosFiltrados.length !== 1 ? "s" : ""} visibles</span>
            </>
          )}
          <span className="hidden lg:flex items-center gap-1.5">
            <span>·</span>
            <MousePointer2 className="h-3 w-3" />
            <span>Clic para seleccionar · Arrastra para mover</span>
          </span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-white/25">
          Modificado:{" "}
          {new Date(modelo.updated_at).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {contextMenu && (
        <ContextMenu
          {...contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            if (contextMenu.tipo === "entidad") handleSelectEntidad(contextMenu.id);
            else handleSelectRelacion(contextMenu.id);
          }}
          onAddAttribute={() => handleSelectEntidad(contextMenu.id)}
          onAddComment={() => handleCommentPinClick(contextMenu.id, contextMenu.tipo, contextMenu.x, contextMenu.y)}
          onViewComments={() => handleCommentPinClick(contextMenu.id, contextMenu.tipo, contextMenu.x, contextMenu.y)}
          onDelete={() => {
            if (contextMenu.tipo === "entidad") handleDeleteEntidad(contextMenu.id);
            else handleDeleteRelacion(contextMenu.id);
          }}
          onDuplicate={() => {
            if (contextMenu.tipo === "entidad") handleDuplicateEntidad(contextMenu.id);
            else handleDuplicateRelacion(contextMenu.id);
          }}
          onReverseDirection={contextMenu.tipo === "relacion" ? () => handleReverseRelation(contextMenu.id) : undefined}
        />
      )}

      {commentPopover && (
        <CommentPopover
          {...commentPopover}
          comentarios={comentariosPopover}
          onClose={() => setCommentPopover(null)}
          onAddComment={handleAddCommentFromPopover}
          onResolve={handleResolveComment}
          onReopen={handleReopenComment}
        />
      )}
    </div>
  );
}

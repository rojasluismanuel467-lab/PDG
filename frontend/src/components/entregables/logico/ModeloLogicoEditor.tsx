"use client";
import React, { useCallback, useMemo, useState } from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  Table2, Link2, Save, Sparkles, LayoutGrid, AlignLeft, History, FileText,
  Database, MessageSquare as MsgSq, Plus,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type {
  ColumnaLogica,
  ModeloLogico,
  TablaLogica,
} from "@/lib/types/modelo-logico.types";
import ERDLogicoCanvas from "./ERDLogicoCanvas";
import PanelColumna from "./PanelColumna";
import type { FKEdgeRouting } from "./FKEdge";
import PanelTabla from "./PanelTabla";
import TablaCard from "./TablaCard";
import ContextMenuLogico, { type ContextMenuLogicoState } from "./ContextMenuLogico";
import CommentPopoverLogico, { type CommentPopoverLogicoState } from "./CommentPopoverLogico";

interface ModeloLogicoEditorProps {
  modelo: ModeloLogico;
  onSave?: (modelo: ModeloLogico) => Promise<ModeloLogico | void> | void;
  onGenerateIA?: () => Promise<ModeloLogico | void> | ModeloLogico | void;
  onAddComment?: (
    targetType: "tabla" | "columna",
    targetId: string,
    content: string
  ) => Promise<void>;
  onPreviewVersion?: (versionNumber: number) => Promise<ModeloLogico>;
  onRestoreVersion?: (versionNumber: number) => Promise<void>;
  isSaving?: boolean;
  isGenerating?: boolean;
  readOnly?: boolean;
}

type ActiveTab = "diagrama" | "tablas" | "versiones" | "notas";
type PanelMode =
  | { type: "none" }
  | { type: "tabla"; tablaId: string }
  | { type: "columna"; tablaId: string; columnaId: string };

function parseVersionNumber(raw: string): number | null {
  const clean = raw.trim().replace(/^v/i, "").replace(/\.0$/, "");
  const parsed = Number.parseInt(clean, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ModeloLogicoEditor({
  modelo: modeloInicial,
  onSave,
  onGenerateIA,
  onAddComment,
  onPreviewVersion,
  onRestoreVersion,
  isSaving = false,
  isGenerating = false,
  readOnly = false,
}: ModeloLogicoEditorProps) {
  const [modelo, setModelo] = useState<ModeloLogico>(modeloInicial);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("diagrama");
  const [panelMode, setPanelMode] = useState<PanelMode>({ type: "none" });
  const [selectedTablaId, setSelectedTablaId] = useState<string | null>(null);
  const [selectedFKId, setSelectedFKId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVersionLabel, setPreviewVersionLabel] = useState("");
  const [previewModel, setPreviewModel] = useState<ModeloLogico | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuLogicoState | null>(null);
  const [commentPopover, setCommentPopover] = useState<CommentPopoverLogicoState | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [edgeRouting, setEdgeRouting] = useState<FKEdgeRouting>("ortogonal");

  React.useEffect(() => { setModelo(modeloInicial); }, [modeloInicial]);

  // ── Feedback auto-dismiss ─────────────────────────────────────────
  React.useEffect(() => {
    if (!feedbackMessage) return;
    const t = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(t);
  }, [feedbackMessage]);

  const tablasFiltradas = useMemo(
    () =>
      modelo.tablas.filter(
        (t) =>
          t.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.esquema.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [modelo.tablas, searchQuery]
  );

  const tablasDisponibles = modelo.tablas.map((t) => t.nombre);

  // ── Selección ─────────────────────────────────────────────────────
  const handleSelectTabla = useCallback((tablaId: string) => {
    setSelectedTablaId(tablaId);
    setSelectedFKId(null);
    setPanelMode({ type: "tabla", tablaId });
  }, []);

  const handleSelectFK = useCallback((fkId: string) => {
    const isDeselecting = selectedFKId === fkId;
    const next = isDeselecting ? null : fkId;

    setSelectedFKId(next);
    setSelectedTablaId(null);

    if (!next) {
      setPanelMode({ type: "none" });
      return;
    }

    for (const tabla of modelo.tablas) {
      const col = tabla.columnas.find((c) => `fk-${tabla.id}-${c.id}` === fkId);
      if (!col) continue;
      setPanelMode({ type: "columna", tablaId: tabla.id, columnaId: col.id });
      break;
    }
  }, [modelo.tablas, selectedFKId]);

  const handleDeselectAll = useCallback(() => {
    setSelectedTablaId(null);
    setSelectedFKId(null);
  }, []);

  // ── CRUD tablas y columnas ────────────────────────────────────────
  const handleEditTabla = useCallback((tablaId: string) => {
    setPanelMode({ type: "tabla", tablaId });
  }, []);

  const handleSaveTabla = useCallback((tablaActualizada: TablaLogica) => {
    setModelo((prev) => ({
      ...prev,
      tablas: prev.tablas.map((t) => (t.id === tablaActualizada.id ? tablaActualizada : t)),
    }));
    setHasChanges(true);
    setPanelMode({ type: "none" });
  }, []);

  const handleEditColumna = useCallback((tablaId: string, columnaId: string) => {
    setPanelMode({ type: "columna", tablaId, columnaId });
  }, []);

  const handleSaveColumna = useCallback(
    (columnaActualizada: ColumnaLogica) => {
      if (panelMode.type !== "columna") return;
      setModelo((prev) => ({
        ...prev,
        tablas: prev.tablas.map((t) =>
          t.id === panelMode.tablaId
            ? { ...t, columnas: t.columnas.map((c) => (c.id === columnaActualizada.id ? columnaActualizada : c)) }
            : t
        ),
      }));
      setHasChanges(true);
      setPanelMode({ type: "none" });
    },
    [panelMode]
  );

  const handleAddColumna = useCallback((tablaId: string) => {
    const newCol: ColumnaLogica = {
      id: `col-${Date.now()}`,
      nombre: "nueva_columna",
      tipo_dato: "VARCHAR",
      longitud: "255",
      es_pk: false,
      es_fk: false,
      es_nullable: true,
      es_unique: false,
      descripcion: "Nueva columna",
      orden: 999,
    };
    setModelo((prev) => ({
      ...prev,
      tablas: prev.tablas.map((t) => (t.id === tablaId ? { ...t, columnas: [...t.columnas, newCol] } : t)),
    }));
    setHasChanges(true);
    setPanelMode({ type: "columna", tablaId, columnaId: newCol.id });
  }, []);

  const handleDeleteColumna = useCallback((tablaId: string, columnaId: string) => {
    setModelo((prev) => ({
      ...prev,
      tablas: prev.tablas.map((t) =>
        t.id === tablaId ? { ...t, columnas: t.columnas.filter((c) => c.id !== columnaId) } : t
      ),
    }));
    setHasChanges(true);
  }, []);

  const handleAddTabla = useCallback(() => {
    const newTabla: TablaLogica = {
      id: `tbl-${Date.now()}`,
      nombre: "nueva_tabla",
      descripcion: "Descripcion de la nueva tabla",
      esquema: "public",
      columnas: [
        {
          id: `col-${Date.now()}-1`,
          nombre: "id",
          tipo_dato: "UUID",
          es_pk: true,
          es_fk: false,
          es_nullable: false,
          es_unique: true,
          valor_default: "gen_random_uuid()",
          descripcion: "Identificador unico",
          orden: 1,
        },
      ],
      indices: [],
      constraints: [],
    };
    setModelo((prev) => ({ ...prev, tablas: [...prev.tablas, newTabla] }));
    setHasChanges(true);
    setPanelMode({ type: "tabla", tablaId: newTabla.id });
  }, []);

  const handleDeleteTabla = useCallback((tablaId: string) => {
    setModelo((prev) => ({
      ...prev,
      tablas: prev.tablas.filter((t) => t.id !== tablaId),
    }));
    setHasChanges(true);
    setPanelMode((prev) =>
      prev.type !== "none" && prev.tablaId === tablaId ? { type: "none" } : prev
    );
    if (selectedTablaId === tablaId) setSelectedTablaId(null);
  }, [selectedTablaId]);

  // ── Shortcuts ─────────────────────────────────────────────────────
  React.useEffect(() => {
    if (readOnly) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isTypingField = Boolean(
        target &&
          (target.isContentEditable ||
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            tagName === "SELECT")
      );
      if (isTypingField) return;

      if (selectedTablaId) {
        event.preventDefault();
        handleDeleteTabla(selectedTablaId);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleDeleteTabla, readOnly, selectedTablaId]);

  const handleConnectTablas = useCallback(
    (sourceTablaId: string, targetTablaId: string, sourceHandleId?: string, targetHandleId?: string) => {
      if (readOnly) return;
      const sourceTable = modelo.tablas.find((t) => t.id === sourceTablaId);
      const targetTable = modelo.tablas.find((t) => t.id === targetTablaId);
      if (!sourceTable || !targetTable) return;

      const targetPk = targetTable.columnas.find((c) => c.es_pk) ?? targetTable.columnas[0];
      if (!targetPk) return;

      const baseName = `${targetTable.nombre}_id`;
      let candidate = baseName;
      let suffix = 2;
      while (sourceTable.columnas.some((c) => c.nombre === candidate)) {
        candidate = `${baseName}_${suffix}`;
        suffix++;
      }

      const newFkColumn: ColumnaLogica = {
        id: `col-${Date.now()}`,
        nombre: candidate,
        tipo_dato: targetPk.tipo_dato,
        longitud: targetPk.longitud,
        es_pk: false,
        es_fk: true,
        es_nullable: true,
        es_unique: false,
        descripcion: `Relación hacia ${targetTable.nombre}.${targetPk.nombre}`,
        fk_tabla_ref: targetTable.nombre,
        fk_columna_ref: targetPk.nombre,
        fk_on_delete: "RESTRICT",
        fk_on_update: "CASCADE",
        orden: sourceTable.columnas.length + 1,
        fk_source_handle_id: sourceHandleId,
        fk_target_handle_id: targetHandleId,
      };

      setModelo((prev) => ({
        ...prev,
        tablas: prev.tablas.map((t) =>
          t.id === sourceTablaId ? { ...t, columnas: [...t.columnas, newFkColumn] } : t
        ),
      }));
      setHasChanges(true);
      setSelectedTablaId(sourceTablaId);
      setPanelMode({ type: "columna", tablaId: sourceTablaId, columnaId: newFkColumn.id });
    },
    [modelo.tablas, readOnly]
  );

  const handleUpdateFKHandles = useCallback(
    (columnaId: string, sourceHandleId?: string, targetHandleId?: string) => {
      setModelo((prev) => ({
        ...prev,
        tablas: prev.tablas.map((t) => ({
          ...t,
          columnas: t.columnas.map((c) =>
            c.id === columnaId
              ? { ...c, fk_source_handle_id: sourceHandleId, fk_target_handle_id: targetHandleId }
              : c
          ),
        })),
      }));
      setHasChanges(true);
    },
    []
  );

  const handleUpdateTablaPosition = useCallback(
    (tablaId: string, x: number, y: number) => {
      if (readOnly) return;
      setModelo((prev) => ({
        ...prev,
        tablas: prev.tablas.map((t) =>
          t.id === tablaId ? { ...t, ui_pos_x: x, ui_pos_y: y } : t
        ),
      }));
      setHasChanges(true);
    },
    [readOnly]
  );

  const handleDuplicateTabla = useCallback((tablaId: string) => {
    const tabla = modelo.tablas.find((t) => t.id === tablaId);
    if (!tabla) return;
    const ts = Date.now();
    const newTabla: TablaLogica = {
      ...tabla,
      id: `tbl-${ts}`,
      nombre: `${tabla.nombre}_copia`,
      columnas: tabla.columnas.map((c, i) => ({ ...c, id: `col-${ts}-${i}` })),
      indices: tabla.indices.map((idx, i) => ({ ...idx, id: `idx-${ts}-${i}` })),
      constraints: tabla.constraints.map((con, i) => ({ ...con, id: `con-${ts}-${i}` })),
    };
    setModelo((prev) => ({ ...prev, tablas: [...prev.tablas, newTabla] }));
    setHasChanges(true);
    setPanelMode({ type: "tabla", tablaId: newTabla.id });
  }, [modelo.tablas]);

  const handleAddRelacion = useCallback(() => {
    if (readOnly || modelo.tablas.length < 2) return;

    const sourceTable = modelo.tablas.find((t) => t.id === selectedTablaId) ?? modelo.tablas[0];
    const targetTable = modelo.tablas.find((t) => t.id !== sourceTable.id) ?? modelo.tablas[1];
    if (!sourceTable || !targetTable) return;

    const targetPk = targetTable.columnas.find((c) => c.es_pk) ?? targetTable.columnas[0];
    if (!targetPk) return;

    const baseName = `${targetTable.nombre}_id`;
    let candidate = baseName;
    let suffix = 2;
    while (sourceTable.columnas.some((c) => c.nombre === candidate)) {
      candidate = `${baseName}_${suffix}`;
      suffix += 1;
    }

    const newFkColumn: ColumnaLogica = {
      id: `col-${Date.now()}`,
      nombre: candidate,
      tipo_dato: targetPk.tipo_dato,
      longitud: targetPk.longitud,
      es_pk: false,
      es_fk: true,
      es_nullable: true,
      es_unique: false,
      descripcion: `Relacion hacia ${targetTable.nombre}.${targetPk.nombre}`,
      fk_tabla_ref: targetTable.nombre,
      fk_columna_ref: targetPk.nombre,
      fk_on_delete: "RESTRICT",
      fk_on_update: "CASCADE",
      orden: sourceTable.columnas.length + 1,
    };

    setModelo((prev) => ({
      ...prev,
      tablas: prev.tablas.map((t) =>
        t.id === sourceTable.id ? { ...t, columnas: [...t.columnas, newFkColumn] } : t
      ),
    }));
    setHasChanges(true);
    setSelectedTablaId(sourceTable.id);
    setPanelMode({ type: "columna", tablaId: sourceTable.id, columnaId: newFkColumn.id });
  }, [modelo.tablas, readOnly, selectedTablaId]);

  // ── Save ──────────────────────────────────────────────────────────
  const handleGuardar = useCallback(async () => {
    if (!onSave) return;
    const updated = await onSave(modelo);
    if (updated) setModelo(updated);
    setHasChanges(false);
  }, [modelo, onSave]);

  useAutoSave({
    state: modelo,
    hasChanges,
    onSave: handleGuardar,
    enabled: !readOnly,
  });

  const handleGenerateIA = useCallback(async () => {
    if (!onGenerateIA) return;
    const generated = await onGenerateIA();
    if (generated) setModelo(generated);
  }, [onGenerateIA]);

  // ── Comments ──────────────────────────────────────────────────────
  const handleAddCommentLocal = useCallback(
    async (targetType: "tabla" | "columna", targetId: string, content: string) => {
      if (!onAddComment) return;
      await onAddComment(targetType, targetId, content);
    },
    [onAddComment]
  );

  const handleResolveComment = useCallback((commentId: string) => {
    setModelo((prev) => ({
      ...prev,
      comentarios: prev.comentarios.map((c) =>
        c.id === commentId ? { ...c, estado: "resuelto" as const } : c
      ),
    }));
  }, []);

  const handleReopenComment = useCallback((commentId: string) => {
    setModelo((prev) => ({
      ...prev,
      comentarios: prev.comentarios.map((c) =>
        c.id === commentId ? { ...c, estado: "abierto" as const } : c
      ),
    }));
  }, []);

  const handleAddCommentFromPopover = useCallback(
    async (contenido: string) => {
      if (!commentPopover) return;
      if (hasChanges) {
        try {
          const updated = await onSave?.(modelo);
          if (updated) setModelo(updated);
          setHasChanges(false);
        } catch {
          setFeedbackMessage("No se pudo guardar el diagrama. Guárdalo manualmente e intenta de nuevo.");
          return;
        }
      }
      try {
        const tipo = commentPopover.referenciaTipo === "tabla" ? "tabla" : "columna";
        await handleAddCommentLocal(tipo as "tabla" | "columna", commentPopover.referenciaId, contenido);
      } catch {
        setFeedbackMessage("Ocurrió un error al agregar el comentario. Inténtalo de nuevo.");
      }
    },
    [commentPopover, hasChanges, modelo, onSave, handleAddCommentLocal]
  );

  // ── Context menu ──────────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (id: string, tipo: "tabla" | "fk", x: number, y: number) => {
      if (tipo === "tabla") {
        const tabla = modelo.tablas.find((t) => t.id === id);
        if (!tabla) return;
        const count = modelo.comentarios.filter(
          (c) => c.referencia_tipo === "tabla" && c.referencia_id === id
        ).length;
        setContextMenu({ x, y, tipo: "tabla", id, nombre: tabla.nombre, comentariosCount: count });
      } else {
        // fk: id = columnaFKId
        const tablaOwner = modelo.tablas.find((t) => t.columnas.some((c) => c.id === id));
        const columna = tablaOwner?.columnas.find((c) => c.id === id);
        if (!tablaOwner || !columna) return;
        const count = modelo.comentarios.filter(
          (c) => c.referencia_tipo === "columna" && c.referencia_id === id
        ).length;
        setContextMenu({
          x, y, tipo: "fk", id,
          tablaId: tablaOwner.id,
          nombre: `${tablaOwner.nombre}.${columna.nombre}`,
          comentariosCount: count,
        });
      }
    },
    [modelo.tablas, modelo.comentarios]
  );

  // ── Comment popover ───────────────────────────────────────────────
  const handleCommentPinClick = useCallback(
    (id: string, tipo: "tabla" | "columna", x: number, y: number) => {
      let nombre = id;
      if (tipo === "tabla") {
        nombre = modelo.tablas.find((t) => t.id === id)?.nombre ?? id;
      } else {
        const tablaOwner = modelo.tablas.find((t) => t.columnas.some((c) => c.id === id));
        const col = tablaOwner?.columnas.find((c) => c.id === id);
        if (tablaOwner && col) nombre = `${tablaOwner.nombre}.${col.nombre}`;
      }
      const popoverW = 320;
      const popoverH = 420;
      const safeX = Math.min(x, window.innerWidth - popoverW - 16);
      const safeY = Math.min(y, window.innerHeight - popoverH - 16);
      setCommentPopover({ x: safeX, y: safeY, referenciaId: id, referenciaTipo: tipo, nombre });
    },
    [modelo.tablas]
  );

  // ── Context menu actions ──────────────────────────────────────────
  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu) return;
    if (contextMenu.tipo === "tabla") {
      setPanelMode({ type: "tabla", tablaId: contextMenu.id });
    } else {
      setPanelMode({ type: "columna", tablaId: contextMenu.tablaId!, columnaId: contextMenu.id });
    }
    setContextMenu(null);
  }, [contextMenu]);

  const handleContextMenuAddColumna = useCallback(() => {
    if (!contextMenu || contextMenu.tipo !== "tabla") return;
    handleAddColumna(contextMenu.id);
    setContextMenu(null);
  }, [contextMenu, handleAddColumna]);

  const handleContextMenuAddComment = useCallback(() => {
    if (!contextMenu) return;
    const tipo: "tabla" | "columna" = contextMenu.tipo === "tabla" ? "tabla" : "columna";
    const nombre = contextMenu.nombre;
    const safeX = Math.min(contextMenu.x, window.innerWidth - 336);
    const safeY = Math.min(contextMenu.y, window.innerHeight - 436);
    setCommentPopover({ x: safeX, y: safeY, referenciaId: contextMenu.id, referenciaTipo: tipo, nombre });
    setContextMenu(null);
  }, [contextMenu]);

  const handleContextMenuViewComments = useCallback(() => {
    if (!contextMenu) return;
    const tipo: "tabla" | "columna" = contextMenu.tipo === "tabla" ? "tabla" : "columna";
    const nombre = contextMenu.nombre;
    const safeX = Math.min(contextMenu.x, window.innerWidth - 336);
    const safeY = Math.min(contextMenu.y, window.innerHeight - 436);
    setCommentPopover({ x: safeX, y: safeY, referenciaId: contextMenu.id, referenciaTipo: tipo, nombre });
    setContextMenu(null);
  }, [contextMenu]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu || contextMenu.tipo !== "tabla") return;
    handleDeleteTabla(contextMenu.id);
    setContextMenu(null);
  }, [contextMenu, handleDeleteTabla]);

  const handleContextMenuDuplicate = useCallback(() => {
    if (!contextMenu || contextMenu.tipo !== "tabla") return;
    handleDuplicateTabla(contextMenu.id);
    setContextMenu(null);
  }, [contextMenu, handleDuplicateTabla]);

  // ── Versiones ─────────────────────────────────────────────────────
  const handlePreviewVersion = useCallback(
    async (versionLabel: string) => {
      if (!onPreviewVersion) return;
      const versionNumber = parseVersionNumber(versionLabel);
      if (!versionNumber) return;
      setIsPreviewing(true);
      try {
        const preview = await onPreviewVersion(versionNumber);
        setPreviewModel(preview);
        setPreviewVersionLabel(`v${versionNumber}`);
        setRestoreVersion(versionNumber);
        setPreviewOpen(true);
      } finally {
        setIsPreviewing(false);
      }
    },
    [onPreviewVersion]
  );

  const openRestoreConfirm = (versionLabel: string) => {
    const versionNumber = parseVersionNumber(versionLabel);
    if (!versionNumber) return;
    setRestoreVersion(versionNumber);
    setRestoreOpen(true);
  };

  const confirmRestore = async () => {
    if (!onRestoreVersion || !restoreVersion) return;
    setIsRestoring(true);
    try {
      await onRestoreVersion(restoreVersion);
      setRestoreOpen(false);
      setPreviewOpen(false);
      setRestoreVersion(null);
    } finally {
      setIsRestoring(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────
  const tablaActiva =
    panelMode.type === "tabla" || panelMode.type === "columna"
      ? modelo.tablas.find((t) => t.id === panelMode.tablaId)
      : null;

  const columnaActiva =
    panelMode.type === "columna" && tablaActiva
      ? tablaActiva.columnas.find((c) => c.id === panelMode.columnaId)
      : null;

  const comentariosPopover = commentPopover
    ? modelo.comentarios.filter(
        (c) => c.referencia_id === commentPopover.referenciaId && c.referencia_tipo === commentPopover.referenciaTipo
      )
    : [];

  const totalColumnas = modelo.tablas.reduce((acc, t) => acc + t.columnas.length, 0);
  const totalFKs = modelo.tablas.reduce((acc, t) => acc + t.columnas.filter((c) => c.es_fk).length, 0);
  const totalIndices = modelo.tablas.reduce((acc, t) => acc + t.indices.length, 0);
  const totalOpenComments = modelo.comentarios.filter((c) => c.estado !== "resuelto").length;

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400">
              <Table2 className="h-3 w-3" />{modelo.tablas.length} tablas
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400">
              <AlignLeft className="h-3 w-3" />{totalColumnas} cols
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
              <Link2 className="h-3 w-3" />{totalFKs} FKs
            </span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400">
              <Database className="h-3 w-3" />{totalIndices} índices
            </span>
            {totalOpenComments > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <MsgSq className="h-3 w-3" />{totalOpenComments} comentario{totalOpenComments !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={handleAddTabla}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /><Table2 className="h-3.5 w-3.5" /> Tabla
              </button>
            )}
            {!readOnly && (
              <button
                onClick={handleAddRelacion}
                disabled={modelo.tablas.length < 2}
                title="Agrega una columna FK desde la tabla seleccionada hacia otra"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" /><Link2 className="h-3.5 w-3.5" /> FK
              </button>
            )}
            {!readOnly && onGenerateIA && (
              <button
                onClick={handleGenerateIA}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0F172A] text-white hover:bg-[#1e293b] disabled:opacity-50 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isGenerating ? "Generando..." : "Generar IA"}
              </button>
            )}
            {/* Routing selector — solo visible en pestaña Diagrama */}
            {activeTab === "diagrama" && (
              <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/[0.1] overflow-hidden" title="Tipo de conector">
                {(
                  [
                    {
                      key: "ortogonal" as const,
                      label: "Ortogonal",
                      icon: (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 12 L2 4 L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          <circle cx="14" cy="4" r="1.5" fill="currentColor"/>
                        </svg>
                      ),
                    },
                    {
                      key: "lineal" as const,
                      label: "Lineal",
                      icon: (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <line x1="2" y1="12" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="14" cy="4" r="1.5" fill="currentColor"/>
                        </svg>
                      ),
                    },
                    {
                      key: "personalizado" as const,
                      label: "Personalizado (curva)",
                      icon: (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 12 C2 4, 14 12, 14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <circle cx="14" cy="4" r="1.5" fill="currentColor"/>
                        </svg>
                      ),
                    },
                  ] as const
                ).map(({ key, label, icon }) => (
                  <button
                    key={key}
                    title={label}
                    onClick={() => setEdgeRouting(key)}
                    className={`px-2.5 py-1.5 transition-colors ${
                      edgeRouting === key
                        ? "bg-[#28b8d5] text-white"
                        : "text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            {!readOnly && isSaving && (
              <svg className="animate-spin w-3.5 h-3.5 text-[#28b8d5]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
              </svg>
            )}
            {!readOnly && (
              <button
                onClick={handleGuardar}
                disabled={isSaving}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors disabled:opacity-50 ${
                  hasChanges ? "bg-[#28b8d5] hover:bg-[#23a7c2] ring-2 ring-[#28b8d5]/30" : "bg-[#28b8d5]/70 hover:bg-[#28b8d5]"
                }`}
              >
                {isSaving ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSaving ? "Guardando..." : hasChanges ? "Guardar *" : "Guardar"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-white/[0.06] px-4">
          {(
            [
              { key: "diagrama" as const, label: "Diagrama", count: null, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
              { key: "tablas" as const, label: "Tablas", count: modelo.tablas.length, icon: <Table2 className="h-3.5 w-3.5" /> },
              { key: "versiones" as const, label: "Versiones", count: modelo.versiones.length, icon: <History className="h-3.5 w-3.5" /> },
              { key: "notas" as const, label: "Notas", count: null, icon: <FileText className="h-3.5 w-3.5" /> },
            ] satisfies Array<{ key: ActiveTab; label: string; count: number | null; icon: React.ReactNode }>
          ).map(({ key, label, count, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-[#28b8d5] text-[#28b8d5]"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {icon}
              {label}
              {count !== null && <span className="ml-0.5 text-[10px] text-gray-400">({count})</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "diagrama" && (
            <div className="h-full p-2">
              <ERDLogicoCanvas
                modelo={modelo}
                tablaSeleccionadaId={selectedTablaId}
                fkSeleccionadaId={selectedFKId}
                onSelectTabla={handleSelectTabla}
                onSelectColumna={handleEditColumna}
                onSelectFK={handleSelectFK}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onCommentPinClick={handleCommentPinClick}
                onUpdateTablaPosition={readOnly ? undefined : handleUpdateTablaPosition}
                onConnectTablas={handleConnectTablas}
                onUpdateFKHandles={readOnly ? undefined : handleUpdateFKHandles}
                edgeRouting={edgeRouting}
              />
            </div>
          )}

          {activeTab === "tablas" && (
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tablas por nombre, descripcion o esquema..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5]"
              />
              {tablasFiltradas.map((tabla) => (
                <TablaCard
                  key={tabla.id}
                  tabla={tabla}
                  isSelected={selectedTablaId === tabla.id}
                  onSelect={handleSelectTabla}
                  onEditTabla={handleEditTabla}
                  onEditColumna={handleEditColumna}
                  onAddColumna={handleAddColumna}
                  onDeleteColumna={handleDeleteColumna}
                  readOnly={readOnly}
                />
              ))}
            </div>
          )}

          {activeTab === "versiones" && (
            <div className="p-4 space-y-3">
              {modelo.versiones.length === 0 ? (
                <p className="text-sm text-gray-400">Sin historial de versiones.</p>
              ) : (
                modelo.versiones.map((version, index) => (
                  <div
                    key={`${version.version}-${version.fecha}-${index}`}
                    className="p-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          v{version.version}
                          {index === 0 && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5]">Actual</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{version.descripcion_cambio}</p>
                        <p className="text-[11px] text-gray-400">
                          {version.autor} - {new Date(version.fecha).toLocaleString("es-CO")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreviewVersion(version.version)}
                          disabled={isPreviewing}
                          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                        >
                          Vista previa
                        </button>
                        {!readOnly && (
                          <button
                            onClick={() => openRestoreConfirm(version.version)}
                            className="px-2.5 py-1.5 text-xs rounded-lg bg-[#0F172A] text-white hover:bg-[#1e293b] transition-colors"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "notas" && (
            <div className="p-4">
              <textarea
                value={modelo.notas_markdown}
                onChange={(e) => {
                  setModelo((prev) => ({ ...prev, notas_markdown: e.target.value }));
                  setHasChanges(true);
                }}
                disabled={readOnly}
                rows={20}
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white resize-none font-mono focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Side panels */}
      {panelMode.type === "tabla" && tablaActiva && (
        <PanelTabla
          tabla={tablaActiva}
          comentarios={modelo.comentarios}
          onSave={handleSaveTabla}
          onAddComment={(tableId, content) => handleAddCommentLocal("tabla", tableId, content)}
          onResolveComment={handleResolveComment}
          onReopenComment={handleReopenComment}
          onClose={() => setPanelMode({ type: "none" })}
          readOnly={readOnly}
        />
      )}

      {panelMode.type === "columna" && tablaActiva && columnaActiva && (
        <PanelColumna
          columna={columnaActiva}
          tablaNombre={tablaActiva.nombre}
          tablasDisponibles={tablasDisponibles}
          comentarios={modelo.comentarios}
          onSave={handleSaveColumna}
          onAddComment={(columnId, content) => handleAddCommentLocal("columna", columnId, content)}
          onResolveComment={handleResolveComment}
          onReopenComment={handleReopenComment}
          onClose={() => setPanelMode({ type: "none" })}
          readOnly={readOnly}
        />
      )}

      {/* Context menu overlay */}
      {contextMenu && (
        <ContextMenuLogico
          {...contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={handleContextMenuEdit}
          onAddComment={handleContextMenuAddComment}
          onViewComments={handleContextMenuViewComments}
          onDelete={handleContextMenuDelete}
          onAddColumna={contextMenu.tipo === "tabla" ? handleContextMenuAddColumna : undefined}
          onDuplicate={contextMenu.tipo === "tabla" ? handleContextMenuDuplicate : undefined}
        />
      )}

      {/* Comment popover overlay */}
      {commentPopover && (
        <CommentPopoverLogico
          {...commentPopover}
          comentarios={comentariosPopover}
          onClose={() => setCommentPopover(null)}
          onAddComment={handleAddCommentFromPopover}
          onResolve={handleResolveComment}
          onReopen={handleReopenComment}
        />
      )}

      {/* Feedback toast */}
      {feedbackMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] px-4 py-3 rounded-xl bg-red-500 text-white text-xs font-medium shadow-xl">
          {feedbackMessage}
        </div>
      )}

      {/* Version preview modal */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} className="max-w-4xl p-6" showCloseButton>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vista previa de version {previewVersionLabel}
            </h3>
            {restoreVersion && !readOnly && (
              <button onClick={() => setRestoreOpen(true)} className="px-3 py-1.5 text-xs rounded-lg bg-[#0F172A] text-white hover:bg-[#1e293b] transition-colors">
                Restaurar esta version
              </button>
            )}
          </div>
          {previewModel ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">{previewModel.descripcion}</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-500">Tablas</p>
                  <p className="text-lg font-semibold">{previewModel.tablas.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-500">Columnas</p>
                  <p className="text-lg font-semibold">{previewModel.tablas.reduce((acc, t) => acc + t.columnas.length, 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-500">FKs</p>
                  <p className="text-lg font-semibold">{previewModel.tablas.reduce((acc, t) => acc + t.columnas.filter((c) => c.es_fk).length, 0)}</p>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto border border-gray-200 dark:border-white/[0.08] rounded-lg">
                {previewModel.tablas.map((tabla) => (
                  <div key={tabla.id} className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06] text-sm">
                    {tabla.esquema}.{tabla.nombre}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Diagrama de la version</p>
                <div className="h-[420px] border border-gray-200 dark:border-white/[0.08] rounded-lg overflow-hidden">
                  <ERDLogicoCanvas
                    modelo={previewModel}
                    tablaSeleccionadaId={null}
                    fkSeleccionadaId={null}
                    onSelectTabla={() => undefined}
                    onSelectColumna={() => undefined}
                    onSelectFK={() => undefined}
                    onDeselectAll={() => undefined}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin datos para vista previa.</p>
          )}
        </div>
      </Modal>

      {/* Restore confirm modal */}
      <Modal isOpen={restoreOpen} onClose={() => setRestoreOpen(false)} className="max-w-md p-6" showCloseButton={false}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirmar restauracion</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Esta accion creara una nueva version restaurando el contenido de v{restoreVersion}. Deseas continuar?
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setRestoreOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
              Cancelar
            </button>
            <button onClick={confirmRestore} disabled={isRestoring} className="px-3 py-2 text-sm rounded-lg bg-[#0F172A] text-white hover:bg-[#1e293b] disabled:opacity-50 transition-colors">
              {isRestoring ? "Restaurando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

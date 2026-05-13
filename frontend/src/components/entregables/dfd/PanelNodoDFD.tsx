"use client";
import React, { useState } from "react";
import type { NodoDFD, ComentarioDFD } from "@/lib/types/dfd.types";

// ============================================================================
// Panel lateral para editar un nodo del DFD (Proceso, Almacén, Entidad Externa)
// ============================================================================

interface PanelNodoDFDProps {
  nodo: NodoDFD;
  comentarios: ComentarioDFD[];
  onUpdate: (nodo: NodoDFD) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "nodo" | "flujo",
    contenido: string
  ) => Promise<void>;
}

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  proceso: { label: "Process", color: "text-[#28b8d5] bg-[#28b8d5]/10" },
  almacen: {
    label: "Data Store",
    color:
      "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  entidad_externa: {
    label: "External Entity",
    color:
      "text-slate-600 bg-slate-100 dark:bg-slate-500/10 dark:text-slate-400",
  },
};

export default function PanelNodoDFD({
  nodo,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  onAddComment,
}: PanelNodoDFDProps) {
  const [nuevoComentario, setNuevoComentario] = useState("");
  const tipoInfo = TIPO_LABELS[nodo.tipo] ?? TIPO_LABELS.proceso;
  const nombreLabel =
    nodo.tipo === "proceso"
      ? "Process Name"
      : nodo.tipo === "almacen"
        ? "Data Store Name"
        : "External Entity Name";

  const comentariosNodo = comentarios.filter(
    (c) => c.referencia_id === nodo.id && c.referencia_tipo === "nodo"
  );

  const handleAddComment = async () => {
    if (!nuevoComentario.trim()) return;
    await onAddComment(nodo.id, "nodo", nuevoComentario.trim());
    setNuevoComentario("");
  };

  return (
    <div className="w-80 border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${tipoInfo.color}`}>
            {tipoInfo.label}
          </span>
          {nodo.tipo === "proceso" && nodo.numero_proceso && (
            <span className="text-[10px] font-mono text-gray-400 dark:text-white/30">
              ID {nodo.numero_proceso}
            </span>
          )}
          {nodo.tipo === "almacen" && nodo.prefijo_almacen && (
            <span className="text-[10px] font-mono text-gray-400 dark:text-white/30">
              [{nodo.prefijo_almacen}]
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Campos editables */}
      <div className="p-4 space-y-4">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Element ID
          </label>
          <input
            type="text"
            value={nodo.id}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-white/45"
          />
        </div>

        {/* Nombre */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            {nombreLabel}
          </label>
          <input
            type="text"
            value={nodo.nombre}
            onChange={(e) => onUpdate({ ...nodo, nombre: e.target.value })}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
          />
        </div>

        {/* Número de proceso (solo para procesos) */}
        {nodo.tipo === "proceso" && (
          <div>
            <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
              Process ID
            </label>
            <input
              type="text"
              value={nodo.numero_proceso ?? ""}
              onChange={(e) =>
                onUpdate({ ...nodo, numero_proceso: e.target.value })
              }
              placeholder="Ej: 1, 1.1, 2"
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
            />
          </div>
        )}

        {nodo.tipo === "proceso" && (
          <div>
            <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
              Process Location
            </label>
            <input
              type="text"
              value={nodo.ubicacion_proceso ?? ""}
              onChange={(e) =>
                onUpdate({ ...nodo, ubicacion_proceso: e.target.value })
              }
              placeholder="Ej: Oficina de Operaciones"
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
            />
          </div>
        )}

        {/* Prefijo almacén (solo para almacenes) */}
        {nodo.tipo === "almacen" && (
          <div>
            <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
              Data Store Prefix
            </label>
            <select
              value={nodo.prefijo_almacen ?? "D"}
              onChange={(e) =>
                onUpdate({
                  ...nodo,
                  prefijo_almacen: e.target.value as "D" | "T" | "M",
                })
              }
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
            >
              <option value="D">D — Persistente (Data Store)</option>
              <option value="T">T — Temporal (Transient)</option>
              <option value="M">M — Manual (Archivos físicos)</option>
            </select>
          </div>
        )}

        {nodo.tipo === "almacen" && (
          <div>
            <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
              Data Store Type
            </label>
            <input
              type="text"
              value={nodo.tipo_dato_almacen ?? ""}
              onChange={(e) =>
                onUpdate({ ...nodo, tipo_dato_almacen: e.target.value })
              }
              placeholder="Ej: Transaccional, Maestro, Histórico"
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
            />
          </div>
        )}

        {/* Descripción */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Documentation
          </label>
          <textarea
            value={nodo.descripcion}
            onChange={(e) => onUpdate({ ...nodo, descripcion: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#0EA5E9] resize-none"
          />
        </div>

        {/* Eliminar */}
        <button
          onClick={() => onDelete(nodo.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/20 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Eliminar nodo
        </button>
      </div>

      {/* Comentarios del nodo */}
      <div className="border-t border-gray-200 dark:border-white/[0.08] p-4">
        <h4 className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
          Comentarios ({comentariosNodo.length})
        </h4>

        <div className="space-y-2 mb-3">
          {comentariosNodo.length === 0 && (
            <p className="text-[11px] text-gray-400 dark:text-white/25 italic">
              Sin comentarios en este nodo.
            </p>
          )}
          {comentariosNodo.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-2.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-semibold text-gray-600 dark:text-white/60">
                  {c.autor_nombre}
                </span>
                <span
                  className={`text-[8px] px-1 py-0.5 rounded-full font-medium ${
                    c.autor_perfil === "CONSULTOR"
                      ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                      : "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                  }`}
                >
                  {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-white/50 leading-relaxed">
                {c.contenido}
              </p>
              <span className="text-[9px] text-gray-400 dark:text-white/20 mt-1 block">
                {new Date(c.created_at).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>

        {/* Agregar comentario */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            placeholder="Comentar..."
            className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
          />
          <button
            onClick={handleAddComment}
            disabled={!nuevoComentario.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState } from "react";
import type {
  FlujoDatos,
  NodoDFD,
  ComentarioDFD,
  EstiloLineaDFD,
  TipoRelacionDFD,
} from "@/lib/types/dfd.types";
import {
  DEFAULT_DFD_LINE_STYLE,
  DEFAULT_DFD_RELATION,
  DFD_LINE_STYLE_OPTIONS,
  DFD_RELATION_OPTIONS,
  buildNodeOptionLabel,
  getInvalidConnectionMessage,
  isValidDFDConnection,
} from "./dfdNotation";

// ============================================================================
// Panel lateral para editar un flujo de datos del DFD
// ============================================================================

interface PanelFlujoDFDProps {
  flujo: FlujoDatos;
  nodos: NodoDFD[];
  comentarios: ComentarioDFD[];
  onUpdate: (flujo: FlujoDatos) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "nodo" | "flujo",
    contenido: string
  ) => Promise<void>;
}

export default function PanelFlujoDFD({
  flujo,
  nodos,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  onAddComment,
}: PanelFlujoDFDProps) {
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [nuevoCampo, setNuevoCampo] = useState("");
  const [mensajeRegla, setMensajeRegla] = useState<string | null>(null);

  const nodoOrigen = nodos.find((n) => n.id === flujo.origen_id);
  const nodoDestino = nodos.find((n) => n.id === flujo.destino_id);
  const conexionInvalida = getInvalidConnectionMessage(
    nodos,
    flujo.origen_id,
    flujo.destino_id
  );

  const comentariosFlujo = comentarios.filter(
    (c) => c.referencia_id === flujo.id && c.referencia_tipo === "flujo"
  );

  const handleAddComment = async () => {
    if (!nuevoComentario.trim()) return;
    await onAddComment(flujo.id, "flujo", nuevoComentario.trim());
    setNuevoComentario("");
  };

  const handleAddCampo = () => {
    if (!nuevoCampo.trim()) return;
    onUpdate({
      ...flujo,
      datos_campos: [...(flujo.datos_campos ?? []), nuevoCampo.trim()],
    });
    setNuevoCampo("");
  };

  const handleRemoveCampo = (index: number) => {
    const campos = [...(flujo.datos_campos ?? [])];
    campos.splice(index, 1);
    onUpdate({ ...flujo, datos_campos: campos });
  };

  return (
    <div className="w-80 border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08]">
        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold text-[#28b8d5] bg-[#28b8d5]/10">
          Data Flow
        </span>
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
        {/* Etiqueta */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Flow Label
          </label>
          <input
            type="text"
            value={flujo.etiqueta}
            onChange={(e) => onUpdate({ ...flujo, etiqueta: e.target.value })}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Connector Style
          </label>
          <select
            value={flujo.estilo_linea ?? DEFAULT_DFD_LINE_STYLE}
            onChange={(e) =>
              onUpdate({
                ...flujo,
                estilo_linea: e.target.value as EstiloLineaDFD,
              })
            }
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
          >
            {DFD_LINE_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Relation Type
          </label>
          <select
            value={flujo.tipo_relacion ?? DEFAULT_DFD_RELATION}
            onChange={(e) =>
              onUpdate({
                ...flujo,
                tipo_relacion: e.target.value as TipoRelacionDFD,
              })
            }
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
          >
            {DFD_RELATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {`${option.symbol} ${option.label}`}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-600 dark:text-white/60">
            Regla de conexión DFD
          </p>
          <p className="mt-1 text-[10px] text-gray-500 dark:text-white/45">
            Todo Data Flow debe iniciar o terminar en un Process.
          </p>
          {(mensajeRegla || conexionInvalida) && (
            <p className="mt-1.5 text-[10px] font-medium text-red-600 dark:text-red-400">
              {mensajeRegla ?? conexionInvalida}
            </p>
          )}
        </div>

        {/* Origen → Destino */}
        <div className="rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-white/40">Origen:</span>
            <span className="font-medium text-gray-700 dark:text-white/70">
              {nodoOrigen?.nombre ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-center my-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 dark:text-white/20">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-white/40">Destino:</span>
            <span className="font-medium text-gray-700 dark:text-white/70">
              {nodoDestino?.nombre ?? "—"}
            </span>
          </div>
        </div>

        {/* Seleccionar origen y destino */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Source Node
          </label>
          <select
            value={flujo.origen_id}
            onChange={(e) => {
              const nextSourceId = e.target.value;
              const invalidMessage = getInvalidConnectionMessage(
                nodos,
                nextSourceId,
                flujo.destino_id
              );
              if (invalidMessage) {
                setMensajeRegla(invalidMessage);
                return;
              }
              setMensajeRegla(null);
              onUpdate({ ...flujo, origen_id: nextSourceId });
            }}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
          >
            {nodos.map((n) => (
              <option
                key={n.id}
                value={n.id}
                disabled={!isValidDFDConnection(nodos, n.id, flujo.destino_id)}
              >
                {buildNodeOptionLabel(n)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Target Node
          </label>
          <select
            value={flujo.destino_id}
            onChange={(e) => {
              const nextTargetId = e.target.value;
              const invalidMessage = getInvalidConnectionMessage(
                nodos,
                flujo.origen_id,
                nextTargetId
              );
              if (invalidMessage) {
                setMensajeRegla(invalidMessage);
                return;
              }
              setMensajeRegla(null);
              onUpdate({ ...flujo, destino_id: nextTargetId });
            }}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
          >
            {nodos.map((n) => (
              <option
                key={n.id}
                value={n.id}
                disabled={!isValidDFDConnection(nodos, flujo.origen_id, n.id)}
              >
                {buildNodeOptionLabel(n)}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Descripción del Flujo
          </label>
          <textarea
            value={flujo.datos_descripcion ?? ""}
            onChange={(e) =>
              onUpdate({ ...flujo, datos_descripcion: e.target.value })
            }
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5] resize-none"
          />
        </div>

        {/* Campos de datos */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1 block">
            Campos / Atributos ({flujo.datos_campos?.length ?? 0})
          </label>
          <div className="space-y-1 mb-2">
            {(flujo.datos_campos ?? []).map((campo, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] px-2.5 py-1.5"
              >
                <span className="flex-1 text-[11px] font-mono text-gray-600 dark:text-white/50">
                  {campo}
                </span>
                <button
                  onClick={() => handleRemoveCampo(i)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={nuevoCampo}
              onChange={(e) => setNuevoCampo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCampo()}
              placeholder="nombre_campo"
              className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-mono text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
            />
            <button
              onClick={handleAddCampo}
              disabled={!nuevoCampo.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-white/50 text-[11px] font-medium hover:bg-gray-200 dark:hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Eliminar */}
        <button
          onClick={() => onDelete(flujo.id)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-500/20 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Eliminar flujo
        </button>
      </div>

      {/* Comentarios del flujo */}
      <div className="border-t border-gray-200 dark:border-white/[0.08] p-4">
        <h4 className="text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
          Comentarios ({comentariosFlujo.length})
        </h4>

        <div className="space-y-2 mb-3">
          {comentariosFlujo.length === 0 && (
            <p className="text-[11px] text-gray-400 dark:text-white/25 italic">
              Sin comentarios en este flujo.
            </p>
          )}
          {comentariosFlujo.map((c) => (
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

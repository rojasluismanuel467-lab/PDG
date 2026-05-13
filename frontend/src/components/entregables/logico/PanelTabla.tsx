"use client";
import React, { useState, useEffect } from "react";
import { Check, RotateCcw, HelpCircle } from "lucide-react";
import type { ComentarioLogico, TablaLogica } from "@/lib/types/modelo-logico.types";

interface PanelTablaProps {
  tabla: TablaLogica;
  comentarios: ComentarioLogico[];
  onSave: (tabla: TablaLogica) => void;
  onAddComment: (tableId: string, content: string) => Promise<void>;
  onResolveComment?: (id: string) => void;
  onReopenComment?: (id: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export default function PanelTabla({
  tabla,
  comentarios,
  onSave,
  onAddComment,
  onResolveComment,
  onReopenComment,
  onClose,
  readOnly = false,
}: PanelTablaProps) {
  const [nombre, setNombre] = useState(tabla.nombre);
  const [descripcion, setDescripcion] = useState(tabla.descripcion);
  const [esquema, setEsquema] = useState(tabla.esquema);
  const [volumen, setVolumen] = useState(tabla.volumen_estimado || "");
  const [frecuencia, setFrecuencia] = useState(tabla.frecuencia_actualizacion || "");
  const [entidadOrigen, setEntidadOrigen] = useState(tabla.entidad_origen || "");
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    setNombre(tabla.nombre);
    setDescripcion(tabla.descripcion);
    setEsquema(tabla.esquema);
    setVolumen(tabla.volumen_estimado || "");
    setFrecuencia(tabla.frecuencia_actualizacion || "");
    setEntidadOrigen(tabla.entidad_origen || "");
  }, [tabla]);

  const handleSave = () => {
    onSave({
      ...tabla,
      nombre,
      descripcion,
      esquema,
      volumen_estimado: volumen || undefined,
      frecuencia_actualizacion: frecuencia || undefined,
      entidad_origen: entidadOrigen || undefined,
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || readOnly) return;
    setIsCommenting(true);
    try {
      await onAddComment(tabla.id, newComment.trim());
      setNewComment("");
    } finally {
      setIsCommenting(false);
    }
  };

  const tableComments = comentarios
    .filter((item) => item.referencia_tipo === "tabla" && item.referencia_id === tabla.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const openComments = tableComments.filter((c) => c.estado !== "resuelto");
  const resolvedComments = tableComments.filter((c) => c.estado === "resuelto");

  return (
    <div className="w-96 border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Editar tabla</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Esquema</label>
          <input
            type="text"
            value={esquema}
            onChange={(e) => setEsquema(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripcion</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={readOnly}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Volumen estimado
              <span title="Número estimado de registros que tendrá esta tabla. Útil para planificación de almacenamiento y rendimiento."><HelpCircle className="h-3 w-3 text-gray-300 dark:text-white/20 cursor-help" /></span>
            </label>
            <input
              type="text"
              value={volumen}
              onChange={(e) => setVolumen(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Frecuencia
              <span title="Con qué frecuencia se actualiza esta tabla. Ej: 'Alta (tiempo real)', 'Media (diaria)', 'Baja (mensual)'."><HelpCircle className="h-3 w-3 text-gray-300 dark:text-white/20 cursor-help" /></span>
            </label>
            <input
              type="text"
              value={frecuencia}
              onChange={(e) => setFrecuencia(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Entidad origen
            <span title="Entidad del diagrama conceptual (AS-IS) de la que deriva esta tabla. Permite trazabilidad entre modelos."><HelpCircle className="h-3 w-3 text-gray-300 dark:text-white/20 cursor-help" /></span>
          </label>
          <input
            type="text"
            value={entidadOrigen}
            onChange={(e) => setEntidadOrigen(e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50"
          />
        </div>

        {/* Comments */}
        <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Comentarios de la tabla</h4>
            <div className="flex items-center gap-1.5">
              {openComments.length > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  {openComments.length} abierto{openComments.length !== 1 ? "s" : ""}
                </span>
              )}
              <span className="text-[10px] text-gray-400">{tableComments.length}</span>
            </div>
          </div>

          {!readOnly && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                placeholder="Agregar comentario..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5]"
              />
              <button
                onClick={handleAddComment}
                disabled={isCommenting || !newComment.trim()}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-[#28b8d5] text-white hover:bg-[#1fa3be] disabled:opacity-50 transition-colors"
              >
                {isCommenting ? "..." : "Enviar"}
              </button>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {tableComments.length === 0 && (
              <p className="text-xs text-gray-400">Sin comentarios para esta tabla.</p>
            )}
            {openComments.map((comment) => (
              <div
                key={comment.id}
                className="p-2 rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200">{comment.autor}</span>
                    <span className="text-[10px] text-gray-400">{new Date(comment.fecha).toLocaleString("es-CO")}</span>
                  </div>
                  {onResolveComment && (
                    <button
                      onClick={() => onResolveComment(comment.id)}
                      title="Resolver"
                      className="shrink-0 p-1 rounded-md text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300">{comment.texto}</p>
              </div>
            ))}

            {resolvedComments.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-wide pt-1">
                  Resueltos ({resolvedComments.length})
                </p>
                {resolvedComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-2 rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] opacity-55"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{comment.autor}</span>
                      {onReopenComment && (
                        <button
                          onClick={() => onReopenComment(comment.id)}
                          title="Reabrir"
                          className="shrink-0 p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 line-through">{comment.texto}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06] flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-[#28b8d5] text-white hover:bg-[#1fa3be] transition-colors"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}

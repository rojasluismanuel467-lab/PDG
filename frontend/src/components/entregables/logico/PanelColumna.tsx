"use client";
import React, { useState, useEffect } from "react";
import { Check, RotateCcw, HelpCircle, Link2 as Link2Icon } from "lucide-react";
import type { ColumnaLogica, ComentarioLogico } from "@/lib/types/modelo-logico.types";

// ============================================================================
// PanelColumna — Panel lateral para editar los detalles de una columna
// ============================================================================

interface PanelColumnaProps {
  columna: ColumnaLogica;
  tablaNombre: string;
  tablasDisponibles: string[];
  comentarios: ComentarioLogico[];
  onSave: (columna: ColumnaLogica) => void;
  onAddComment: (columnId: string, content: string) => Promise<void>;
  onResolveComment?: (id: string) => void;
  onReopenComment?: (id: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const TIPOS_DATO = [
  "UUID", "VARCHAR", "CHAR", "TEXT", "INT", "BIGINT", "SMALLINT",
  "DECIMAL", "FLOAT", "DOUBLE", "BOOLEAN", "DATE", "TIME", "DATETIME",
  "TIMESTAMP", "JSON", "JSONB", "BLOB", "ARRAY", "ENUM",
];

export default function PanelColumna({
  columna,
  tablaNombre,
  tablasDisponibles,
  comentarios,
  onSave,
  onAddComment,
  onResolveComment,
  onReopenComment,
  onClose,
  readOnly = false,
}: PanelColumnaProps) {
  const [form, setForm] = useState<ColumnaLogica>({ ...columna });
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => { setForm({ ...columna }); }, [columna]);

  const handleChange = (field: keyof ColumnaLogica, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => { onSave(form); };

  const handleAddComment = async () => {
    if (!newComment.trim() || readOnly) return;
    setIsCommenting(true);
    try {
      await onAddComment(columna.id, newComment.trim());
      setNewComment("");
    } finally {
      setIsCommenting(false);
    }
  };

  const columnComments = comentarios
    .filter((item) => item.referencia_tipo === "columna" && item.referencia_id === columna.id)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const openComments = columnComments.filter((c) => c.estado !== "resuelto");
  const resolvedComments = columnComments.filter((c) => c.estado === "resuelto");

  return (
    <div className="w-80 border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Editar Columna</h3>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{tablaNombre}.{columna.nombre}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50 font-mono"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Tipo de dato
            <span title="UUID: identificadores únicos · VARCHAR/CHAR/TEXT: texto · INT/BIGINT/DECIMAL: números · BOOLEAN: verdadero/falso · DATE/TIMESTAMP: fechas · JSON/JSONB: datos estructurados · ARRAY: listas"><HelpCircle className="h-3 w-3 text-gray-300 dark:text-white/20 cursor-help" /></span>
          </label>
          <select
            value={form.tipo_dato}
            onChange={(e) => handleChange("tipo_dato", e.target.value)}
            disabled={readOnly}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50 font-mono"
          >
            {TIPOS_DATO.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Longitud
            <span title="Para VARCHAR/CHAR: máximo de caracteres. Para DECIMAL: precisión total. Dejar vacío para tipos sin longitud fija (INT, BOOLEAN, UUID, etc.)."><HelpCircle className="h-3 w-3 text-gray-300 dark:text-white/20 cursor-help" /></span>
          </label>
          <input
            type="number"
            value={form.longitud || ""}
            onChange={(e) => handleChange("longitud", e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={readOnly}
            placeholder="Ej: 255"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => handleChange("descripcion", e.target.value)}
            disabled={readOnly}
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50 resize-none"
          />
        </div>

        {/* Flags */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Propiedades</h4>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.es_pk} onChange={(e) => handleChange("es_pk", e.target.checked)} disabled={readOnly} className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Primary Key (PK)</span>
            {form.es_pk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">PK</span>}
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.es_fk} onChange={(e) => handleChange("es_fk", e.target.checked)} disabled={readOnly} className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Foreign Key (FK)</span>
            {form.es_fk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">FK</span>}
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.es_nullable} onChange={(e) => handleChange("es_nullable", e.target.checked)} disabled={readOnly} className="w-4 h-4 rounded border-gray-300 text-gray-500 focus:ring-gray-500" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Nullable (permite NULL)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.es_unique} onChange={(e) => handleChange("es_unique", e.target.checked)} disabled={readOnly} className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500" />
            <span className="text-xs text-gray-700 dark:text-gray-300">Unique</span>
            {form.es_unique && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">UQ</span>}
          </label>
        </div>

        {/* FK Reference */}
        {form.es_fk && (
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
            <h4 className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
              <Link2Icon className="h-3 w-3" />
              Referencia Foreign Key
              <span title="Define la relación hacia otra tabla. La columna referenciada debe ser PK o UNIQUE en la tabla destino."><HelpCircle className="h-3 w-3 text-blue-300 dark:text-blue-500/50 cursor-help" /></span>
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tabla referenciada</label>
              <select
                value={form.fk_tabla_ref || ""}
                onChange={(e) => handleChange("fk_tabla_ref", e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 font-mono"
              >
                <option value="">Seleccionar tabla...</option>
                {tablasDisponibles.filter((t) => t !== tablaNombre).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Columna referenciada</label>
              <input
                type="text"
                value={form.fk_columna_ref || ""}
                onChange={(e) => handleChange("fk_columna_ref", e.target.value)}
                disabled={readOnly}
                placeholder="Ej: id, codigo..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 font-mono"
              />
            </div>
          </div>
        )}

        {/* Default value */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Valor por defecto
            <span title="Expresión SQL que se usará si no se provee un valor. Ej: gen_random_uuid(), NOW(), true, 0, 'activo'."><HelpCircle className="h-3 w-3 text-gray-300 dark:text-white/20 cursor-help" /></span>
          </label>
          <input
            type="text"
            value={form.valor_default || ""}
            onChange={(e) => handleChange("valor_default", e.target.value || undefined)}
            disabled={readOnly}
            placeholder="Ej: gen_random_uuid(), NOW(), 0..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Orden en la tabla</label>
          <input
            type="number"
            value={form.orden}
            onChange={(e) => handleChange("orden", parseInt(e.target.value) || 1)}
            disabled={readOnly}
            min={1}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/50 focus:border-[#28b8d5] disabled:opacity-50 font-mono"
          />
        </div>

        {/* Comments */}
        <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200">Comentarios de la columna</h4>
            <div className="flex items-center gap-1.5">
              {openComments.length > 0 && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  {openComments.length} abierto{openComments.length !== 1 ? "s" : ""}
                </span>
              )}
              <span className="text-[10px] text-gray-400">{columnComments.length}</span>
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

          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {columnComments.length === 0 && (
              <p className="text-xs text-gray-400">Sin comentarios para esta columna.</p>
            )}
            {openComments.map((comment) => (
              <div key={comment.id} className="p-2 rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03]">
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
                  <div key={comment.id} className="p-2 rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] opacity-55">
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
                    <p className="text-xs text-gray-500 line-through">{comment.texto}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06] flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/[0.1] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
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

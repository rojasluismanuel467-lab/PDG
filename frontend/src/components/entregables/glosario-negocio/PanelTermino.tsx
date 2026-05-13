"use client";
import React, { useState, useEffect } from "react";
import type {
  TerminoGlosario,
  ComentarioGlosario,
} from "@/lib/types/glosario-negocio.types";

// ============================================================================
// PanelTermino — Panel lateral para ver y editar un término del glosario
// ============================================================================

interface PanelTerminoProps {
  termino: TerminoGlosario;
  comentarios: ComentarioGlosario[];
  columnasDinamicas?: { id: string; label: string }[];
  onUpdate: (updated: TerminoGlosario) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAddComment: (
    referenciaId: string,
    referenciaTipo: "termino",
    contenido: string
  ) => Promise<void>;
  readOnly?: boolean;
}

export default function PanelTermino({
  termino,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  onAddComment,
  readOnly = false,
  columnasDinamicas = [],
}: PanelTerminoProps) {
  const [form, setForm] = useState<TerminoGlosario>(termino);
  const [nuevoSinonimo, setNuevoSinonimo] = useState("");
  const [nuevaEntidad, setNuevaEntidad] = useState("");
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync cuando cambia el término seleccionado
  useEffect(() => {
    setForm(termino);
    setHasChanges(false);
    setShowDeleteConfirm(false);
  }, [termino.id]);

  const comentariosTermino = comentarios.filter(
    (c) => c.referencia_id === termino.id
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const update = (partial: Partial<TerminoGlosario>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(form);
    setHasChanges(false);
  };

  const handleAddSinonimo = () => {
    const valor = nuevoSinonimo.trim();
    if (!valor || form.sinonimos.includes(valor)) return;
    update({ sinonimos: [...form.sinonimos, valor] });
    setNuevoSinonimo("");
  };

  const handleRemoveSinonimo = (s: string) => {
    update({ sinonimos: form.sinonimos.filter((x) => x !== s) });
  };

  const handleAddEntidad = () => {
    const valor = nuevaEntidad.trim();
    if (!valor || form.entidades_relacionadas.includes(valor)) return;
    update({ entidades_relacionadas: [...form.entidades_relacionadas, valor] });
    setNuevaEntidad("");
  };

  const handleRemoveEntidad = (e: string) => {
    update({ entidades_relacionadas: form.entidades_relacionadas.filter((x) => x !== e) });
  };

  const handleAddComment = async () => {
    if (!nuevoComentario.trim()) return;
    await onAddComment(termino.id, "termino", nuevoComentario.trim());
    setNuevoComentario("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-80 flex flex-col border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08]">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[10px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wide mb-0.5">
            Término
          </p>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 truncate">
            {termino.termino}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!readOnly && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Eliminar término"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Confirm delete */}
      {showDeleteConfirm && (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5">
          <p className="text-xs text-red-700 dark:text-red-400 mb-2">
            ¿Eliminar <strong>{termino.termino}</strong> del glosario?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(termino.id)}
              className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Término */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
            Término
          </label>
          <input
            type="text"
            value={form.termino}
            onChange={(e) => update({ termino: e.target.value })}
            disabled={readOnly}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Definición */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
            Definición
          </label>
          <textarea
            value={form.definicion}
            onChange={(e) => update({ definicion: e.target.value })}
            disabled={readOnly}
            rows={4}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] resize-none disabled:opacity-60"
          />
        </div>

        {/* Propietario */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
            Propietario
          </label>
          <input
            type="text"
            value={form.propietario}
            onChange={(e) => update({ propietario: e.target.value })}
            disabled={readOnly}
            placeholder="ej. Vicepresidencia Comercial"
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5] disabled:opacity-60"
          />
        </div>

        {/* Entidades relacionadas */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
            Entidades relacionadas
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.entidades_relacionadas.map((ent) => (
              <span
                key={ent}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#28b8d5]/10 text-[#28b8d5]"
              >
                {ent}
                {!readOnly && (
                  <button
                    onClick={() => handleRemoveEntidad(ent)}
                    className="ml-0.5 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {!readOnly && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={nuevaEntidad}
                onChange={(e) => setNuevaEntidad(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddEntidad()}
                placeholder="ej. Cuenta"
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
              />
              <button
                onClick={handleAddEntidad}
                disabled={!nuevaEntidad.trim()}
                className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Sinónimos */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
            Sinónimos
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.sinonimos.map((sin) => (
              <span
                key={sin}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
              >
                {sin}
                {!readOnly && (
                  <button
                    onClick={() => handleRemoveSinonimo(sin)}
                    className="ml-0.5 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {form.sinonimos.length === 0 && (
              <span className="text-[11px] text-gray-400 dark:text-white/25 italic">Sin sinónimos.</span>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={nuevoSinonimo}
                onChange={(e) => setNuevoSinonimo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSinonimo()}
                placeholder="ej. Golden Record"
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
              />
              <button
                onClick={handleAddSinonimo}
                disabled={!nuevoSinonimo.trim()}
                className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
            Notas
          </label>
          <textarea
            value={form.notas}
            onChange={(e) => update({ notas: e.target.value })}
            disabled={readOnly}
            rows={2}
            placeholder="Observaciones adicionales..."
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5] resize-none disabled:opacity-60"
          />
        </div>

        {/* Columnas dinámicas */}
        {columnasDinamicas.map((col) => (
          <div key={col.id}>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              {col.label}
            </label>
            <input
              type="text"
              value={(form as any)[col.id] || ""}
              onChange={(e) => update({ [col.id]: e.target.value } as any)}
              disabled={readOnly}
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60"
            />
          </div>
        ))}

        {/* Comentarios del término */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-2">
            Comentarios ({comentariosTermino.length})
          </label>
          <div className="space-y-2 mb-2">
            {comentariosTermino.length === 0 && (
              <p className="text-[11px] text-gray-400 dark:text-white/25 italic">
                Sin comentarios.
              </p>
            )}
            {comentariosTermino.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-2.5"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-white/60">
                    {c.autor_nombre}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                    {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-700 dark:text-white/60">{c.contenido}</p>
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Agregar comentario..."
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
              />
              <button
                onClick={handleAddComment}
                disabled={!nuevoComentario.trim()}
                className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer: botón guardar */}
      {!readOnly && hasChanges && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-white/[0.08]">
          <button
            onClick={handleSave}
            className="w-full py-2 rounded-xl bg-gray-900 dark:bg-white/[0.1] text-white text-xs font-semibold hover:bg-gray-800 dark:hover:bg-white/[0.15] transition-colors"
          >
            Aplicar cambios
          </button>
        </div>
      )}
    </div>
  );
}

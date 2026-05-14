"use client";
import React, { useState, useEffect, useRef } from "react";
import type {
  TerminoGlosario,
  ComentarioGlosario,
  CategoriaTermino,
  EstadoTermino,
} from "@/lib/types/glosario-negocio.types";
import { CATEGORIA_CONFIG, ESTADO_CONFIG } from "./GlosarioNegocioEditor";

interface PanelTerminoProps {
  termino: TerminoGlosario;
  comentarios: ComentarioGlosario[];
  columnasDinamicas?: { id: string; label: string }[];
  focusComentario?: boolean;
  onFocusComentarioHandled?: () => void;
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

const CATEGORIAS: CategoriaTermino[] = ["entidad", "atributo", "proceso", "regla_negocio", "kpi", "otro"];
const ESTADOS: EstadoTermino[] = ["borrador", "en_revision", "aprobado", "obsoleto"];

export default function PanelTermino({
  termino,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  onAddComment,
  readOnly = false,
  columnasDinamicas = [],
  focusComentario = false,
  onFocusComentarioHandled,
}: PanelTerminoProps) {
  const [form, setForm] = useState<TerminoGlosario>(termino);
  const [nuevoSinonimo, setNuevoSinonimo] = useState("");
  const [nuevaEntidad, setNuevaEntidad] = useState("");
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const comentarioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(termino);
    setHasChanges(false);
    setShowDeleteConfirm(false);
  }, [termino.id]);

  useEffect(() => {
    if (focusComentario && comentarioInputRef.current) {
      comentarioInputRef.current.focus();
      comentarioInputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      onFocusComentarioHandled?.();
    }
  }, [focusComentario, onFocusComentarioHandled]);

  const comentariosTermino = comentarios.filter((c) => c.referencia_id === termino.id);

  const update = (partial: Partial<TerminoGlosario>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const handleSave = () => { onUpdate(form); setHasChanges(false); };

  const handleAddSinonimo = () => {
    const v = nuevoSinonimo.trim();
    if (!v || form.sinonimos.includes(v)) return;
    update({ sinonimos: [...form.sinonimos, v] });
    setNuevoSinonimo("");
  };

  const handleRemoveSinonimo = (s: string) =>
    update({ sinonimos: form.sinonimos.filter((x) => x !== s) });

  const handleAddEntidad = () => {
    const v = nuevaEntidad.trim();
    if (!v || form.entidades_relacionadas.includes(v)) return;
    update({ entidades_relacionadas: [...form.entidades_relacionadas, v] });
    setNuevaEntidad("");
  };

  const handleRemoveEntidad = (e: string) =>
    update({ entidades_relacionadas: form.entidades_relacionadas.filter((x) => x !== e) });

  const handleAddComment = async () => {
    if (!nuevoComentario.trim()) return;
    await onAddComment(termino.id, "termino", nuevoComentario.trim());
    setNuevoComentario("");
  };

  const estadoCfg = form.estado ? ESTADO_CONFIG[form.estado] : null;

  return (
    <div
      className="w-80 flex flex-col border-l border-gray-200 dark:border-white/[0.08] bg-gradient-to-b from-white via-[#fbfdff] to-[#f3f8fc] dark:from-[#111822] dark:via-[#0f151e] dark:to-[#0b1017] h-full overflow-hidden shrink-0"
      style={{ boxShadow: "-10px 0 30px rgba(6, 36, 56, 0.14)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#111822]/90 shadow-[0_4px_12px_rgba(11,53,77,0.08)] shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          {estadoCfg && (
            <div className="flex items-center gap-1.5 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${estadoCfg.badge}`}>
                {estadoCfg.label}
              </span>
              {form.categoria && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORIA_CONFIG[form.categoria].color}`}>
                  {CATEGORIA_CONFIG[form.categoria].label}
                </span>
              )}
            </div>
          )}
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 truncate leading-snug">
            {termino.termino}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!readOnly && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Eliminar término"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
            title="Cerrar (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 shrink-0">
          <p className="text-xs text-red-700 dark:text-red-400 mb-2">
            ¿Eliminar <strong>{termino.termino}</strong>?
          </p>
          <div className="flex gap-2">
            <button onClick={() => onDelete(termino.id)} className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors">
              Eliminar
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/45 dark:bg-transparent">

        {/* Término */}
        <div>
          <label className="field-label">Término</label>
          <input
            type="text"
            value={form.termino}
            onChange={(e) => update({ termino: e.target.value })}
            disabled={readOnly}
            className="field-input"
          />
        </div>

        {/* Categoría + Estado — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Categoría</label>
            <select
              value={form.categoria ?? ""}
              onChange={(e) => update({ categoria: (e.target.value as CategoriaTermino) || undefined })}
              disabled={readOnly}
              className="field-input appearance-none pr-6"
            >
              <option value="">— Ninguna</option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{CATEGORIA_CONFIG[c].label}</option>
              ))}
            </select>
            {form.categoria && (
              <div className="mt-1">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORIA_CONFIG[form.categoria].color}`}>
                  {CATEGORIA_CONFIG[form.categoria].label}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="field-label">Estado</label>
            <select
              value={form.estado ?? ""}
              onChange={(e) => update({ estado: (e.target.value as EstadoTermino) || undefined })}
              disabled={readOnly}
              className="field-input appearance-none pr-6"
            >
              <option value="">— Ninguno</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
              ))}
            </select>
            {form.estado && (
              <div className="mt-1 flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${ESTADO_CONFIG[form.estado].dot}`} />
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ESTADO_CONFIG[form.estado].badge}`}>
                  {ESTADO_CONFIG[form.estado].label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Definición */}
        <div>
          <label className="field-label">Definición</label>
          <textarea
            value={form.definicion}
            onChange={(e) => update({ definicion: e.target.value })}
            disabled={readOnly}
            rows={4}
            className="field-input resize-none"
          />
        </div>

        {/* Propietario */}
        <div>
          <label className="field-label">Propietario</label>
          <input
            type="text"
            value={form.propietario}
            onChange={(e) => update({ propietario: e.target.value })}
            disabled={readOnly}
            placeholder="ej. Vicepresidencia Comercial"
            className="field-input"
          />
        </div>

        {/* Entidades relacionadas */}
        <div>
          <label className="field-label">Entidades relacionadas</label>
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[22px]">
            {form.entidades_relacionadas.map((ent) => (
              <span key={ent} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#28b8d5]/10 text-[#28b8d5]">
                {ent}
                {!readOnly && (
                  <button onClick={() => handleRemoveEntidad(ent)} className="ml-0.5 hover:text-red-500 transition-colors leading-none">×</button>
                )}
              </span>
            ))}
            {form.entidades_relacionadas.length === 0 && (
              <span className="text-[11px] text-gray-400 dark:text-white/25 italic">Sin entidades.</span>
            )}
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
              <button onClick={handleAddEntidad} disabled={!nuevaEntidad.trim()} className="tag-add-btn">+</button>
            </div>
          )}
        </div>

        {/* Sinónimos */}
        <div>
          <label className="field-label">Sinónimos</label>
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[22px]">
            {form.sinonimos.map((sin) => (
              <span key={sin} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                {sin}
                {!readOnly && (
                  <button onClick={() => handleRemoveSinonimo(sin)} className="ml-0.5 hover:text-red-500 transition-colors leading-none">×</button>
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
              <button onClick={handleAddSinonimo} disabled={!nuevoSinonimo.trim()} className="tag-add-btn">+</button>
            </div>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="field-label">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => update({ notas: e.target.value })}
            disabled={readOnly}
            rows={2}
            placeholder="Observaciones adicionales…"
            className="field-input resize-none"
          />
        </div>

        {/* Dynamic columns */}
        {columnasDinamicas.map((col) => (
          <div key={col.id}>
            <label className="field-label">{col.label}</label>
            <input
              type="text"
              value={((form as unknown as Record<string, unknown>)[col.id] as string) ?? ""}
              onChange={(e) => update({ [col.id]: e.target.value } as Partial<TerminoGlosario>)}
              disabled={readOnly}
              className="field-input"
            />
          </div>
        ))}

        {/* Separator */}
        <div className="border-t border-gray-100 dark:border-white/[0.06]" />

        {/* Comentarios del término */}
        <div>
          <label className="field-label">
            Comentarios
            {comentariosTermino.length > 0 && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 font-bold">
                {comentariosTermino.length}
              </span>
            )}
          </label>
          <div className="space-y-2 mb-2">
            {comentariosTermino.length === 0 && (
              <p className="text-[11px] text-gray-400 dark:text-white/25 italic">Sin comentarios.</p>
            )}
            {comentariosTermino.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-gray-600 dark:text-white/60">{c.autor_nombre}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                    {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-700 dark:text-white/60 leading-relaxed">{c.contenido}</p>
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="flex gap-1.5">
              <input
                ref={comentarioInputRef}
                type="text"
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Agregar comentario…"
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
              />
              <button onClick={handleAddComment} disabled={!nuevoComentario.trim()} className="tag-add-btn">+</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer: save ───────────────────────────────────────────────── */}
      {!readOnly && hasChanges && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111] shrink-0">
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

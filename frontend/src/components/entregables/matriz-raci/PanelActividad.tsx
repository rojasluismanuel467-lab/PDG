"use client";
import React, { useState, useEffect } from "react";
import type {
  ActividadRaci,
  RolRaci,
  AsignacionRaci,
  CategoriaActividad,
  ComentarioMatrizRaci,
} from "@/lib/types/matriz-raci.types";

// ============================================================================
// PanelActividad — Panel lateral para ver y editar una actividad RACI
// ============================================================================

interface PanelActividadProps {
  actividad: ActividadRaci;
  roles: RolRaci[];
  comentarios: ComentarioMatrizRaci[];
  onUpdate: (updated: ActividadRaci) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAddComment: (
    referenciaId: string,
    referenciaTipo: "actividad",
    contenido: string
  ) => Promise<void>;
  readOnly?: boolean;
}

export const CATEGORIA_LABELS: Record<CategoriaActividad, string> = {
  gobernanza: "Gobernanza",
  calidad: "Calidad de Datos",
  seguridad: "Seguridad",
  integracion: "Integración",
  reportes: "Reportes",
  operaciones: "Operaciones",
  arquitectura: "Arquitectura",
  otro: "Otro",
};

export const CATEGORIA_COLORS: Record<CategoriaActividad, string> = {
  gobernanza: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  calidad: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  seguridad: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  integracion: "bg-[#28b8d5]/10 text-[#28b8d5]",
  reportes: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  operaciones: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  arquitectura: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  otro: "bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-white/40",
};

export const RACI_COLORS: Record<AsignacionRaci, string> = {
  R: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  A: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
  I: "bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-white/40",
};

export const RACI_LABELS: Record<AsignacionRaci, string> = {
  R: "Responsable",
  A: "Aprobador",
  C: "Consultado",
  I: "Informado",
};

const RACI_CYCLE: (AsignacionRaci | undefined)[] = ["R", "A", "C", "I", undefined];

export default function PanelActividad({
  actividad,
  roles,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  onAddComment,
  readOnly = false,
}: PanelActividadProps) {
  const [form, setForm] = useState<ActividadRaci>(actividad);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setForm(actividad);
    setHasChanges(false);
    setShowDeleteConfirm(false);
  }, [actividad.id]);

  const update = (patch: Partial<ActividadRaci>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const cycleRaci = (rolId: string) => {
    if (readOnly) return;
    const current = form.asignaciones[rolId] as AsignacionRaci | undefined;
    const currentIdx = RACI_CYCLE.indexOf(current);
    const next = RACI_CYCLE[(currentIdx + 1) % RACI_CYCLE.length];
    const nuevas = { ...form.asignaciones };
    if (next === undefined) {
      delete nuevas[rolId];
    } else {
      nuevas[rolId] = next;
    }
    update({ asignaciones: nuevas });
  };

  const handleSave = () => {
    onUpdate(form);
    setHasChanges(false);
  };

  const handleAddComment = async () => {
    if (!nuevoComentario.trim()) return;
    await onAddComment(actividad.id, "actividad", nuevoComentario.trim());
    setNuevoComentario("");
  };

  const comentariosActividad = comentarios.filter(
    (c) => c.referencia_id === actividad.id
  );

  return (
    <aside className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08]">
        <span className="text-xs font-semibold text-gray-700 dark:text-white/70 uppercase tracking-wide">
          Actividad
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
        {/* Nombre */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1">
            Nombre
          </label>
          {readOnly ? (
            <p className="text-gray-800 dark:text-white/80 font-medium">{form.nombre}</p>
          ) : (
            <input
              value={form.nombre}
              onChange={(e) => update({ nombre: e.target.value })}
              className="w-full bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-gray-800 dark:text-white/80 focus:outline-none focus:border-[#28b8d5]/50 text-xs"
            />
          )}
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1">
            Categoría
          </label>
          {readOnly ? (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORIA_COLORS[form.categoria]}`}>
              {CATEGORIA_LABELS[form.categoria]}
            </span>
          ) : (
            <select
              value={form.categoria}
              onChange={(e) => update({ categoria: e.target.value as CategoriaActividad })}
              className="w-full bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-gray-800 dark:text-white/80 focus:outline-none focus:border-[#28b8d5]/50 text-xs dark:bg-[#111111]"
            >
              {(Object.keys(CATEGORIA_LABELS) as CategoriaActividad[]).map((k) => (
                <option key={k} value={k}>{CATEGORIA_LABELS[k]}</option>
              ))}
            </select>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1">
            Descripción
          </label>
          {readOnly ? (
            <p className="text-gray-600 dark:text-white/50 leading-relaxed">{form.descripcion || "—"}</p>
          ) : (
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => update({ descripcion: e.target.value })}
              rows={3}
              className="w-full bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-gray-800 dark:text-white/80 focus:outline-none focus:border-[#28b8d5]/50 text-xs resize-none"
            />
          )}
        </div>

        {/* Asignaciones RACI */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-2">
            Asignaciones RACI
          </label>
          <div className="space-y-1.5">
            {roles.map((rol) => {
              const asig = form.asignaciones[rol.id] as AsignacionRaci | undefined;
              return (
                <div key={rol.id} className="flex items-center justify-between gap-2">
                  <span className="text-gray-600 dark:text-white/50 truncate flex-1 text-[11px]">
                    {rol.nombre}
                  </span>
                  <button
                    onClick={() => cycleRaci(rol.id)}
                    disabled={readOnly}
                    title={asig ? `${asig} — ${RACI_LABELS[asig]}. Clic para cambiar.` : "Sin asignación. Clic para asignar."}
                    className={`w-7 h-7 rounded text-[11px] font-bold transition-colors flex-shrink-0 ${
                      asig
                        ? RACI_COLORS[asig]
                        : "bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-white/20 hover:bg-gray-200 dark:hover:bg-white/[0.09]"
                    } ${readOnly ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
                  >
                    {asig ?? "—"}
                  </button>
                </div>
              );
            })}
          </div>
          {!readOnly && (
            <p className="mt-2 text-[10px] text-gray-400 dark:text-white/25">
              Clic en la celda para rotar: R → A → C → I → vacío
            </p>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1">
            Notas / Brechas
          </label>
          {readOnly ? (
            <p className="text-gray-600 dark:text-white/50 leading-relaxed">{form.notas || "—"}</p>
          ) : (
            <textarea
              value={form.notas ?? ""}
              onChange={(e) => update({ notas: e.target.value })}
              rows={2}
              placeholder="Observaciones, brechas o riesgos identificados..."
              className="w-full bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-[#28b8d5]/50 text-xs resize-none"
            />
          )}
        </div>

        {/* Comentarios */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-2">
            Comentarios ({comentariosActividad.length})
          </label>
          <div className="space-y-2 mb-2">
            {comentariosActividad.length === 0 && (
              <p className="text-gray-400 dark:text-white/25 text-[11px]">Sin comentarios.</p>
            )}
            {comentariosActividad.map((c) => (
              <div key={c.id} className="bg-gray-50 dark:bg-white/[0.03] rounded p-2 border border-gray-100 dark:border-white/[0.05]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[10px] text-gray-700 dark:text-white/60">{c.autor_nombre}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    c.estado === "abierto"
                      ? "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      : "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                  }`}>{c.estado}</span>
                </div>
                <p className="text-gray-600 dark:text-white/50 leading-relaxed text-[11px]">{c.contenido}</p>
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="flex gap-1.5">
              <input
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                placeholder="Agregar comentario..."
                className="flex-1 bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-[#28b8d5]/50"
              />
              <button
                onClick={handleAddComment}
                disabled={!nuevoComentario.trim()}
                className="px-2 py-1.5 rounded bg-[#28b8d5]/10 text-[#28b8d5] hover:bg-[#28b8d5]/20 disabled:opacity-40 text-[11px] font-semibold transition-colors"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="border-t border-gray-200 dark:border-white/[0.08] px-4 py-3 flex items-center gap-2">
          {!showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-shrink-0 px-3 py-1.5 rounded text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="flex-1 py-1.5 rounded text-xs font-semibold bg-[#28b8d5] text-white hover:bg-[#28b8d5]/90 disabled:opacity-40 transition-colors"
              >
                Guardar cambios
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-gray-500 dark:text-white/40 flex-1">¿Eliminar?</span>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded text-xs border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                No
              </button>
              <button
                onClick={() => onDelete(actividad.id)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import type {
  SistemaInventario,
  TipoSistema,
  EstadoSistema,
  NivelCriticidad,
  ComentarioMatrizInventario,
} from "@/lib/types/matriz-inventario.types";

// ============================================================================
// PanelSistema — Panel lateral para ver y editar un sistema del inventario
// ============================================================================

interface PanelSistemaProps {
  sistema: SistemaInventario;
  comentarios: ComentarioMatrizInventario[];
  columnasDinamicas?: { id: string; label: string }[];
  onUpdate: (updated: SistemaInventario) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onAddComment: (
    referenciaId: string,
    referenciaTipo: "sistema",
    contenido: string
  ) => Promise<void>;
  readOnly?: boolean;
}

const TIPO_LABELS: Record<TipoSistema, string> = {
  aplicacion: "Aplicación",
  base_de_datos: "Base de Datos",
  plataforma: "Plataforma",
  servicio_externo: "Servicio Externo",
  infraestructura: "Infraestructura",
};

const ESTADO_LABELS: Record<EstadoSistema, string> = {
  produccion: "Producción",
  desarrollo: "Desarrollo",
  mantenimiento: "Mantenimiento",
  legado: "Legado",
  deprecado: "Deprecado",
};

const CRITICIDAD_LABELS: Record<NivelCriticidad, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
};

const CRITICIDAD_COLORS: Record<NivelCriticidad, string> = {
  critico: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  alto: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  medio: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  bajo: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
};

export default function PanelSistema({
  sistema,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  onAddComment,
  readOnly = false,
  columnasDinamicas = [],
}: PanelSistemaProps) {
  const [form, setForm] = useState<SistemaInventario>(sistema);
  const [nuevoAmbiente, setNuevoAmbiente] = useState("");
  const [nuevoDato, setNuevoDato] = useState("");
  const [nuevoArea, setNuevoArea] = useState("");
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync cuando cambia el sistema seleccionado
  useEffect(() => {
    setForm(sistema);
    setHasChanges(false);
    setShowDeleteConfirm(false);
  }, [sistema.id]);

  const comentariosSistema = comentarios.filter(
    (c) => c.referencia_id === sistema.id
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const update = (partial: Partial<SistemaInventario>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdate(form);
    setHasChanges(false);
  };

  const handleAddAmbiente = () => {
    const valor = nuevoAmbiente.trim();
    if (!valor || form.ambientes.includes(valor)) return;
    update({ ambientes: [...form.ambientes, valor] });
    setNuevoAmbiente("");
  };

  const handleRemoveAmbiente = (amb: string) => {
    update({ ambientes: form.ambientes.filter((a) => a !== amb) });
  };

  const handleAddDato = () => {
    const valor = nuevoDato.trim();
    if (!valor || form.datos_que_maneja.includes(valor)) return;
    update({ datos_que_maneja: [...form.datos_que_maneja, valor] });
    setNuevoDato("");
  };

  const handleRemoveDato = (dato: string) => {
    update({ datos_que_maneja: form.datos_que_maneja.filter((d) => d !== dato) });
  };

  const handleAddArea = () => {
    const valor = nuevoArea.trim();
    if (!valor || (form.areas_estrategicas || []).includes(valor)) return;
    update({ areas_estrategicas: [...(form.areas_estrategicas || []), valor] });
    setNuevoArea("");
  };

  const handleRemoveArea = (area: string) => {
    update({ areas_estrategicas: (form.areas_estrategicas || []).filter((a) => a !== area) });
  };

  const handleAddComment = async () => {
    if (!nuevoComentario.trim()) return;
    await onAddComment(sistema.id, "sistema", nuevoComentario.trim());
    setNuevoComentario("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-80 flex flex-col border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-medium text-gray-400 dark:text-white/30 uppercase tracking-wide">
              {TIPO_LABELS[sistema.tipo]}
            </p>
            {sistema.criticidad && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${CRITICIDAD_COLORS[sistema.criticidad]}`}>
                {CRITICIDAD_LABELS[sistema.criticidad]}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 truncate leading-tight">
            {sistema.nombre}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!readOnly && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Eliminar sistema"
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
            ¿Eliminar <strong>{sistema.nombre}</strong> del inventario?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(sistema.id)}
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
      <div className="flex-1 overflow-y-auto">
        {/* ── Sección: Identificación ──────────────────────────────────── */}
        <div className="p-4 space-y-3">
          <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest">
            Identificación
          </p>

          {/* Nombre */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => update({ nombre: e.target.value })}
              disabled={readOnly}
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Tipo + Criticidad */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                Tipo
              </label>
              <select
                value={form.tipo}
                onChange={(e) => update({ tipo: e.target.value as TipoSistema })}
                disabled={readOnly}
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60"
              >
                {(Object.keys(TIPO_LABELS) as TipoSistema[]).map((t) => (
                  <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                Criticidad
              </label>
              <select
                value={form.criticidad || ""}
                onChange={(e) => update({ criticidad: (e.target.value as NivelCriticidad) || undefined })}
                disabled={readOnly}
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60"
              >
                <option value="">Sin especificar</option>
                {(Object.keys(CRITICIDAD_LABELS) as NivelCriticidad[]).map((c) => (
                  <option key={c} value={c}>{CRITICIDAD_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tecnología + Estado */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                Tecnología
              </label>
              <input
                type="text"
                value={form.tecnologia || ""}
                onChange={(e) => update({ tecnologia: e.target.value || undefined })}
                disabled={readOnly}
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                Estado
              </label>
              <select
                value={form.estado || ""}
                onChange={(e) => update({ estado: (e.target.value as EstadoSistema) || undefined })}
                disabled={readOnly}
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60"
              >
                <option value="">Sin especificar</option>
                {(Object.keys(ESTADO_LABELS) as EstadoSistema[]).map((e) => (
                  <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Sección: Versión / Proveedor ─────────────────────────────── */}
        <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-3 space-y-3">
          <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest">
            Versión y proveedor
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                Versión
              </label>
              <input
                type="text"
                value={form.version ?? ""}
                onChange={(e) => update({ version: e.target.value || undefined })}
                disabled={readOnly}
                placeholder="ej. 11.2"
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5] disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                Proveedor
              </label>
              <input
                type="text"
                value={form.proveedor ?? ""}
                onChange={(e) => update({ proveedor: e.target.value || undefined })}
                disabled={readOnly}
                placeholder="ej. Oracle"
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5] disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* ── Sección: Responsables ─────────────────────────────────────── */}
        <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-3 space-y-3">
          <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest">
            Responsables
          </p>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              Propietario Negocio
            </label>
            <input
              type="text"
              value={form.propietario_negocio ?? ""}
              onChange={(e) => update({ propietario_negocio: e.target.value || undefined })}
              disabled={readOnly}
              placeholder="ej. Vicepresidencia Comercial"
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5] disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              Propietario Técnico (TI)
            </label>
            <input
              type="text"
              value={form.propietario_tecnico ?? ""}
              onChange={(e) => update({ propietario_tecnico: e.target.value || undefined })}
              disabled={readOnly}
              placeholder="ej. Gerencia de Datos"
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5] disabled:opacity-60"
            />
          </div>
        </div>

        {/* ── Sección: Contexto ─────────────────────────────────────────── */}
        <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-3 space-y-3">
          <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest">
            Contexto
          </p>

          {/* Descripción */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              Descripción
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => update({ descripcion: e.target.value })}
              disabled={readOnly}
              rows={3}
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] resize-none disabled:opacity-60"
            />
          </div>

          {/* Áreas Estratégicas */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              Áreas Estratégicas / Procesos
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.areas_estrategicas || []).map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                >
                  {area}
                  {!readOnly && (
                    <button onClick={() => handleRemoveArea(area)} className="ml-0.5 hover:text-red-500 transition-colors">×</button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-1.5">
                <input
                  type="text" value={nuevoArea} onChange={(e) => setNuevoArea(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
                  placeholder="ej. Gestión Humana"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
                />
                <button onClick={handleAddArea} disabled={!nuevoArea.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors">
                  +
                </button>
              </div>
            )}
          </div>

          {/* Ambientes */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              Ambientes
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.ambientes.map((amb) => (
                <span key={amb} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#28b8d5]/10 text-[#28b8d5]">
                  {amb}
                  {!readOnly && (
                    <button onClick={() => handleRemoveAmbiente(amb)} className="ml-0.5 hover:text-red-500 transition-colors">×</button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-1.5">
                <input
                  type="text" value={nuevoAmbiente} onChange={(e) => setNuevoAmbiente(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAmbiente()}
                  placeholder="ej. Producción"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
                />
                <button onClick={handleAddAmbiente} disabled={!nuevoAmbiente.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors">
                  +
                </button>
              </div>
            )}
          </div>

          {/* Datos que maneja */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
              Datos que maneja
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.datos_que_maneja.map((dato) => (
                <span key={dato} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                  {dato}
                  {!readOnly && (
                    <button onClick={() => handleRemoveDato(dato)} className="ml-0.5 hover:text-red-500 transition-colors">×</button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="flex gap-1.5">
                <input
                  type="text" value={nuevoDato} onChange={(e) => setNuevoDato(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddDato()}
                  placeholder="ej. Datos personales"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
                />
                <button onClick={handleAddDato} disabled={!nuevoDato.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors">
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Sección: Notas ────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-3 space-y-3">
          <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest">
            Notas
          </p>
          <textarea
            value={form.notas ?? ""}
            onChange={(e) => update({ notas: e.target.value || undefined })}
            disabled={readOnly}
            rows={3}
            placeholder="Observaciones adicionales..."
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5] resize-none disabled:opacity-60"
          />
        </div>

        {/* ── Sección: Columnas adicionales ────────────────────────────── */}
        {columnasDinamicas.length > 0 && (
          <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-3 space-y-3">
            <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest">
              Campos adicionales
            </p>
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
                  className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5] disabled:opacity-60"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Sección: Comentarios ──────────────────────────────────────── */}
        <div className="border-t border-gray-100 dark:border-white/[0.05] px-4 py-3 space-y-2">
          <p className="text-[9px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-widest">
            Comentarios ({comentariosSistema.length})
          </p>
          {comentariosSistema.length === 0 && (
            <p className="text-[11px] text-gray-400 dark:text-white/25 italic">Sin comentarios.</p>
          )}
          {comentariosSistema.map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-semibold text-gray-600 dark:text-white/60">{c.autor_nombre}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                  {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                </span>
              </div>
              <p className="text-[11px] text-gray-700 dark:text-white/60">{c.contenido}</p>
            </div>
          ))}
          {!readOnly && (
            <div className="flex gap-1.5 pt-1">
              <input
                type="text" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Agregar comentario..."
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
              />
              <button onClick={handleAddComment} disabled={!nuevoComentario.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-600 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.1] disabled:opacity-40 transition-colors">
                +
              </button>
            </div>
          )}
        </div>

        {/* Espaciado inferior para no quedar pegado al footer */}
        <div className="h-2" />
      </div>

      {/* Footer: botón guardar — siempre visible en modo edición */}
      {!readOnly && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111]">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="w-full py-2 rounded-xl bg-[#0f3f74] dark:bg-[#1b7ca5] text-white text-xs font-semibold hover:bg-[#0d3563] dark:hover:bg-[#186d92] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
          >
            {hasChanges ? "Aplicar cambios" : "Sin cambios pendientes"}
          </button>
        </div>
      )}
    </div>
  );
}

export { CRITICIDAD_COLORS, CRITICIDAD_LABELS, TIPO_LABELS, ESTADO_LABELS };

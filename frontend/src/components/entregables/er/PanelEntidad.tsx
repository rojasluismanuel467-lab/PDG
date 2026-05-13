"use client";
import React, { useState } from "react";
import { Check, CircleHelp, RotateCcw, X } from "lucide-react";
import type {
  EntidadER,
  AtributoER,
  TipoDato,
  ComentarioER,
} from "@/lib/types/modelo-er.types";

interface PanelEntidadProps {
  entidad: EntidadER;
  comentarios: ComentarioER[];
  onUpdate: (entidad: EntidadER) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  enableComments?: boolean;
  onAddComment: (
    referenciaId: string,
    referenciaTipo: "entidad" | "relacion" | "general",
    contenido: string
  ) => void;
  onResolveComment?: (id: string) => void;
  onReopenComment?: (id: string) => void;
}

const TIPOS_DATO: TipoDato[] = [
  "VARCHAR", "INT", "BIGINT", "DECIMAL", "BOOLEAN",
  "DATE", "DATETIME", "TEXT", "BLOB", "UUID", "JSON",
];

const TIPO_DATO_HINTS: Partial<Record<TipoDato, string>> = {
  VARCHAR:  "Texto de longitud variable. Ideal para nombres, correos, descripciones cortas.",
  INT:      "Número entero. Útil para contadores, cantidades, IDs numéricos.",
  BIGINT:   "Número entero de gran tamaño. Útil para IDs en tablas masivas.",
  DECIMAL:  "Número con decimales de precisión exacta. Ideal para valores monetarios.",
  BOOLEAN:  "Valor verdadero/falso. Útil para estados binarios (activo, visible).",
  DATE:     "Fecha (sin hora). Ej: fecha de nacimiento, fecha de creación.",
  DATETIME: "Fecha y hora combinadas. Ej: timestamp de una transacción.",
  TEXT:     "Texto largo sin límite fijo. Ideal para comentarios o descripciones.",
  UUID:     "Identificador único universal. Recomendado para claves primarias distribuidas.",
  JSON:     "Objeto JSON semiestructurado. Útil para datos flexibles o de configuración.",
};

function formatCommentDate(value: string): string {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function nuevoAtributo(): AtributoER {
  return {
    id: `attr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nombre: "",
    tipo_dato: "VARCHAR",
    es_pk: false,
    es_fk: false,
    es_nullable: true,
  };
}

function InfoTooltip({ text, wide }: { text: string; wide?: boolean }) {
  return (
    <span className="group relative inline-flex shrink-0">
      <CircleHelp className="h-3.5 w-3.5 cursor-help text-gray-300 transition-colors group-hover:text-[#28b8d5] dark:text-white/20 dark:group-hover:text-[#28b8d5]" />
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:border-white/[0.1] dark:bg-[#1c1c1c] dark:text-white/70 ${wide ? "w-60" : "w-48"}`}
      >
        {text}
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-[#1c1c1c]" />
      </span>
    </span>
  );
}

export default function PanelEntidad({
  entidad,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  enableComments = true,
  onAddComment,
  onResolveComment,
  onReopenComment,
}: PanelEntidadProps) {
  const [nombre, setNombre] = useState(entidad.nombre);
  const [descripcion, setDescripcion] = useState(entidad.descripcion);
  const [atributos, setAtributos] = useState<AtributoER[]>(entidad.atributos);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onUpdate({
      ...entidad,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      atributos,
    });
  };

  const updateAtributo = (index: number, field: keyof AtributoER, value: unknown) => {
    const updated = [...atributos];
    updated[index] = { ...updated[index], [field]: value };
    setAtributos(updated);
  };

  const removeAtributo = (index: number) => {
    setAtributos(atributos.filter((_, i) => i !== index));
  };

  const addAtributo = () => {
    setAtributos([...atributos, nuevoAtributo()]);
  };

  const handleAddComment = () => {
    if (!nuevoComentario.trim()) return;
    onAddComment(entidad.id, "entidad", nuevoComentario.trim());
    setNuevoComentario("");
  };

  const comentariosEntidad = comentarios.filter(
    (c) => c.referencia_id === entidad.id && c.referencia_tipo === "entidad"
  );

  return (
    <div className="w-[400px] h-full flex flex-col border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: entidad.color ?? "#28b8d5" }}
          />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90">
            Editar Entidad
          </h3>
        </div>
        <button
          onClick={onClose}
          title="Cerrar panel"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-white/70 dark:hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Nombre */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">
              Nombre de la Entidad
            </label>
            <InfoTooltip text="Usa sustantivos en singular que representen un objeto del negocio. Ej: Cliente, Producto, Factura." />
          </div>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-[#28b8d5] transition-colors"
            placeholder="Ej: Cliente, Producto, Transacción"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5] transition-colors resize-none"
            placeholder="Describe el propósito de esta entidad en el modelo..."
          />
        </div>

        {/* Atributos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">
                Atributos ({atributos.length})
              </label>
              <InfoTooltip
                wide
                text="Los atributos son las propiedades o columnas de la entidad. Cada entidad debe tener al menos un atributo PK que la identifique de forma única."
              />
            </div>
            <button
              onClick={addAtributo}
              className="text-xs font-medium text-[#28b8d5] hover:text-[#28b8d5]/80 transition-colors"
            >
              + Agregar
            </button>
          </div>

          {atributos.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-200 py-3 text-center text-xs text-gray-400 dark:border-white/[0.06] dark:text-white/25">
              Sin atributos. Usa «+ Agregar» para añadir columnas.
            </p>
          )}

          <div className="space-y-2">
            {atributos.map((attr, i) => (
              <div
                key={attr.id}
                className="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] p-3 space-y-2"
              >
                {/* Fila 1: Nombre + Tipo */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={attr.nombre}
                    onChange={(e) => updateAtributo(i, "nombre", e.target.value)}
                    placeholder="nombre_atributo"
                    className="flex-1 rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-800 dark:text-white/90 font-mono outline-none focus:border-[#28b8d5]"
                  />
                  <div className="group relative">
                    <select
                      value={attr.tipo_dato}
                      onChange={(e) => updateAtributo(i, "tipo_dato", e.target.value as TipoDato)}
                      className="w-24 rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1.5 text-xs text-gray-600 dark:text-white/60 outline-none focus:border-[#28b8d5]"
                    >
                      {TIPOS_DATO.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {TIPO_DATO_HINTS[attr.tipo_dato] && (
                      <span className="pointer-events-none absolute right-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-gray-600 opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 dark:border-white/[0.1] dark:bg-[#1c1c1c] dark:text-white/60">
                        {TIPO_DATO_HINTS[attr.tipo_dato]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Fila 2: Flags + Eliminar */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attr.es_pk}
                        onChange={(e) => updateAtributo(i, "es_pk", e.target.checked)}
                        className="rounded border-gray-300 text-[#28b8d5] focus:ring-[#28b8d5] w-3 h-3"
                      />
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-white/40">PK</span>
                      <InfoTooltip text="Primary Key: identifica de forma única cada fila de esta entidad. Solo puede haber una por entidad." />
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attr.es_fk}
                        onChange={(e) => updateAtributo(i, "es_fk", e.target.checked)}
                        className="rounded border-gray-300 text-[#28b8d5] focus:ring-[#28b8d5] w-3 h-3"
                      />
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-white/40">FK</span>
                      <InfoTooltip text="Foreign Key: referencia a la clave primaria de otra entidad para establecer una relación entre tablas." />
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attr.es_nullable}
                        onChange={(e) => updateAtributo(i, "es_nullable", e.target.checked)}
                        className="rounded border-gray-300 text-[#28b8d5] focus:ring-[#28b8d5] w-3 h-3"
                      />
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-white/40">NULL</span>
                      <InfoTooltip text="Nullable: el campo puede quedarse vacío (sin valor). Desmarca si el campo es obligatorio." />
                    </label>
                  </div>
                  <button
                    onClick={() => removeAtributo(i)}
                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar atributo"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comentarios */}
        {enableComments && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-2">
              Comentarios ({comentariosEntidad.length})
            </label>

            {comentariosEntidad.length > 0 && (
              <div className="space-y-2 mb-3">
                {comentariosEntidad.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] px-3 py-2 ${c.estado === "resuelto" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold text-gray-600 dark:text-white/50">
                        {c.autor_nombre}
                      </span>
                      <span className="text-[9px] text-gray-400 dark:text-white/30">
                        {formatCommentDate(c.created_at)}
                      </span>
                      {c.es_desactualizado && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                          Desactualizado
                        </span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        c.autor_perfil === "CONSULTOR"
                          ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                          : "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                      }`}>
                        {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                      </span>
                    </div>
                    <p className={`text-xs ${c.estado === "resuelto" ? "text-gray-400 dark:text-white/30 line-through" : "text-gray-700 dark:text-white/60"}`}>{c.contenido}</p>
                    <div className="mt-2 flex items-center justify-between">
                      {c.created_in_version_number && (
                        <p className="text-[10px] text-gray-400 dark:text-white/30">Creado en versión {c.created_in_version_number}</p>
                      )}
                      <button
                        onClick={() => c.estado === "resuelto" ? onReopenComment?.(c.id) : onResolveComment?.(c.id)}
                        className={`ml-auto flex items-center gap-1 text-[10px] font-medium transition-colors ${
                          c.estado === "resuelto"
                            ? "text-gray-400 hover:text-gray-600"
                            : "text-emerald-500 hover:text-emerald-600"
                        }`}
                      >
                        {c.estado === "resuelto" ? <><RotateCcw className="h-2.5 w-2.5" /> Reabrir</> : <><Check className="h-2.5 w-2.5" /> Resolver</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Agregar comentario..."
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
              />
              <button
                onClick={handleAddComment}
                disabled={!nuevoComentario.trim()}
                className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-white/[0.06] space-y-2">
        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
        >
          Guardar Cambios
        </button>

        {showDeleteConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(entidad.id)}
              className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              Confirmar Eliminación
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 rounded-xl border border-red-200 dark:border-red-500/20 text-red-500 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
          >
            Eliminar Entidad
          </button>
        )}
      </div>
    </div>
  );
}

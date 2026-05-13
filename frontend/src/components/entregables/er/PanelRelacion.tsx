"use client";
import React, { useState } from "react";
import { ArrowLeftRight, Check, CircleHelp, RotateCcw, X } from "lucide-react";
import type {
  RelacionER,
  EntidadER,
  Cardinalidad,
  ComentarioER,
  RelationRouting,
} from "@/lib/types/modelo-er.types";

interface PanelRelacionProps {
  relacion: RelacionER;
  entidades: EntidadER[];
  comentarios: ComentarioER[];
  onUpdate: (relacion: RelacionER) => void;
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

// ── Opciones de cardinalidad con notación Crow's Foot ─────────────────────────
const CARDINALIDADES: {
  value: Cardinalidad;
  label: string;
  srcNotation: string;
  tgtNotation: string;
  hint: string;
}[] = [
  {
    value: "1:1",
    label: "Uno a Uno",
    srcNotation: "||",
    tgtNotation: "||",
    hint: "Cada {origen} tiene exactamente un {destino}, y viceversa.",
  },
  {
    value: "1:N",
    label: "Uno a Muchos",
    srcNotation: "||",
    tgtNotation: "|<",
    hint: "Un {origen} puede tener muchos {destino}, pero cada {destino} pertenece a un solo {origen}.",
  },
  {
    value: "N:1",
    label: "Muchos a Uno",
    srcNotation: "|<",
    tgtNotation: "||",
    hint: "Muchos {origen} pertenecen a un solo {destino}.",
  },
  {
    value: "N:M",
    label: "Muchos a Muchos",
    srcNotation: "|<",
    tgtNotation: "|<",
    hint: "Un {origen} puede relacionarse con muchos {destino} y viceversa. Requiere tabla intermedia.",
  },
];

// ── Mini símbolo Crow's Foot para los diagramas de las tarjetas ───────────────
// Orientación base: se extiende en +X. Se rota para el lado destino.
function MiniCrowFoot({ notation }: { notation: string }): React.ReactElement | null {
  const h = 6;
  const sw = 1.5;
  switch (notation) {
    case "||":
      return (
        <>
          <line x1={0} y1={-h} x2={0} y2={h} strokeWidth={sw} />
          <line x1={5} y1={-h} x2={5} y2={h} strokeWidth={sw} />
        </>
      );
    case "|":
      return <line x1={3} y1={-h} x2={3} y2={h} strokeWidth={sw} />;
    case "O|":
      return (
        <>
          <circle cx={3} cy={0} r={2.5} fill="white" strokeWidth={sw} />
          <line x1={8} y1={-h} x2={8} y2={h} strokeWidth={sw} />
        </>
      );
    case "|<":
      return (
        <>
          <line x1={0} y1={-h} x2={0} y2={h} strokeWidth={sw} />
          <line x1={5} y1={0} x2={13} y2={-h} strokeWidth={sw} />
          <line x1={5} y1={0} x2={13} y2={0} strokeWidth={sw} />
          <line x1={5} y1={0} x2={13} y2={h} strokeWidth={sw} />
        </>
      );
    case "O<":
      return (
        <>
          <circle cx={3} cy={0} r={2.5} fill="white" strokeWidth={sw} />
          <line x1={8} y1={0} x2={16} y2={-h} strokeWidth={sw} />
          <line x1={8} y1={0} x2={16} y2={0} strokeWidth={sw} />
          <line x1={8} y1={0} x2={16} y2={h} strokeWidth={sw} />
        </>
      );
    case "<":
      return (
        <>
          <line x1={4} y1={0} x2={13} y2={-h} strokeWidth={sw} />
          <line x1={4} y1={0} x2={13} y2={0} strokeWidth={sw} />
          <line x1={4} y1={0} x2={13} y2={h} strokeWidth={sw} />
        </>
      );
    default:
      return null;
  }
}

// Mini diagrama de relación: entidad ●—[símbolo]——[símbolo]—● entidad
function MiniRelationDiagram({
  srcNotation,
  tgtNotation,
  active,
}: {
  srcNotation: string;
  tgtNotation: string;
  active: boolean;
}) {
  const sym = active ? "#28b8d5" : "#334155";
  const line = active ? "#28b8d5" : "#94a3b8";
  const dot  = active ? "#28b8d5" : "#64748b";

  return (
    <svg viewBox="0 0 92 28" width="92" height="28" aria-hidden>
      {/* Línea del conector */}
      <line x1="22" y1="14" x2="70" y2="14" stroke={line} strokeWidth="1.5" />

      {/* Símbolo origen — al inicio, se extiende hacia la derecha */}
      <g transform="translate(22,14)" stroke={sym} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <MiniCrowFoot notation={srcNotation} />
      </g>

      {/* Símbolo destino — al final, girado 180° para extenderse hacia la izquierda */}
      <g transform="translate(70,14) rotate(180)" stroke={sym} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <MiniCrowFoot notation={tgtNotation} />
      </g>

      {/* Puntos de entidad */}
      <circle cx="8"  cy="14" r="4" fill={dot} />
      <circle cx="84" cy="14" r="4" fill={dot} />
    </svg>
  );
}

function InfoTooltip({ text, wide }: { text: string; wide?: boolean }) {
  return (
    <span className="group relative inline-flex shrink-0">
      <CircleHelp className="h-3.5 w-3.5 cursor-help text-gray-300 transition-colors group-hover:text-[#28b8d5] dark:text-white/20 dark:group-hover:text-[#28b8d5]" />
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:border-white/[0.1] dark:bg-[#1c1c1c] dark:text-white/70 ${wide ? "w-64" : "w-52"}`}
      >
        {text}
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-[#1c1c1c]" />
      </span>
    </span>
  );
}

function formatCommentDate(value: string): string {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PanelRelacion({
  relacion,
  entidades,
  comentarios,
  onUpdate,
  onDelete,
  onClose,
  enableComments = true,
  onAddComment,
  onResolveComment,
  onReopenComment,
}: PanelRelacionProps) {
  const [nombre, setNombre] = useState(relacion.nombre);
  const [descripcion, setDescripcion] = useState(relacion.descripcion ?? "");
  const [cardinalidad, setCardinalidad] = useState<Cardinalidad>(relacion.cardinalidad);
  const [routing, setRouting] = useState<RelationRouting>(relacion.routing ?? "ortogonal");
  const [origenId, setOrigenId] = useState(relacion.entidad_origen_id);
  const [destinoId, setDestinoId] = useState(relacion.entidad_destino_id);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const entidadOrigen  = entidades.find((e) => e.id === origenId);
  const entidadDestino = entidades.find((e) => e.id === destinoId);
  const cardInfo       = CARDINALIDADES.find((c) => c.value === cardinalidad);

  const cardHint = cardInfo
    ? cardInfo.hint
        .replace(/\{origen\}/g,  entidadOrigen?.nombre  ?? "Origen")
        .replace(/\{destino\}/g, entidadDestino?.nombre ?? "Destino")
    : null;

  const handleSave = () => {
    onUpdate({
      ...relacion,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      cardinalidad,
      routing,
      entidad_origen_id: origenId,
      entidad_destino_id: destinoId,
    });
  };

  const handleAddComment = () => {
    if (!nuevoComentario.trim()) return;
    onAddComment(relacion.id, "relacion", nuevoComentario.trim());
    setNuevoComentario("");
  };

  const comentariosRelacion = comentarios.filter(
    (c) => c.referencia_id === relacion.id && c.referencia_tipo === "relacion"
  );

  return (
    <div className="w-[400px] h-full flex flex-col border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-3.5 w-3.5 text-[#28b8d5]" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90">Editar Relación</h3>
        </div>
        <button
          onClick={onClose}
          title="Cerrar panel"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-white/70 dark:hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* ── Nombre ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">
              Nombre de la Relación
            </label>
            <InfoTooltip text="Usa un verbo que describa cómo se relacionan las entidades. Ej: tiene, pertenece_a, genera, incluye." />
          </div>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-800 dark:text-white/90 outline-none focus:border-[#28b8d5] transition-colors"
            placeholder="Ej: tiene, pertenece_a, registra"
          />
        </div>

        {/* ── Cardinalidad — selector visual ────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">
              Cardinalidad
            </label>
            <InfoTooltip
              wide
              text="Define cuántos registros de cada entidad pueden participar en la relación."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CARDINALIDADES.map((opt) => {
              const active = cardinalidad === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCardinalidad(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    active
                      ? "border-[#28b8d5] bg-[#28b8d5]/5 dark:bg-[#28b8d5]/10 ring-1 ring-[#28b8d5]/30"
                      : "border-gray-200 dark:border-white/[0.08] hover:border-[#28b8d5]/40 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Mini diagrama SVG */}
                  <MiniRelationDiagram
                    srcNotation={opt.srcNotation}
                    tgtNotation={opt.tgtNotation}
                    active={active}
                  />
                  {/* Etiqueta */}
                  <div className="text-center">
                    <p className={`text-[11px] font-semibold leading-tight ${
                      active ? "text-[#28b8d5]" : "text-gray-700 dark:text-white/70"
                    }`}>
                      {opt.label}
                    </p>
                    <p className={`text-[10px] font-mono mt-0.5 ${
                      active ? "text-[#28b8d5]/70" : "text-gray-400 dark:text-white/30"
                    }`}>
                      {opt.value}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Hint dinámico con los nombres reales */}
          {cardHint && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#28b8d5]/20 bg-[#28b8d5]/5 px-3 py-2 dark:border-[#28b8d5]/15 dark:bg-[#28b8d5]/5">
              <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#28b8d5]" />
              <p className="text-[11px] leading-relaxed text-[#1e9bb5] dark:text-[#28b8d5]/80">
                {cardHint}
              </p>
            </div>
          )}
        </div>

        {/* ── Entidades ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Origen */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">
                Origen
              </label>
              <InfoTooltip text='En 1:N, es la entidad del lado "uno" (puede tener muchos del otro lado).' />
            </div>
            <div className="relative">
              {entidadOrigen && (
                <span
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: entidadOrigen.color ?? "#28b8d5" }}
                />
              )}
              <select
                value={origenId}
                onChange={(e) => setOrigenId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] py-2 pr-3 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5] pl-7"
              >
                {entidades.map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Destino */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-white/40">
                Destino
              </label>
              <InfoTooltip text='En 1:N, es la entidad del lado "muchos" (la que depende de la otra).' />
            </div>
            <div className="relative">
              {entidadDestino && (
                <span
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: entidadDestino.color ?? "#28b8d5" }}
                />
              )}
              <select
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] py-2 pr-3 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5] pl-7"
              >
                {entidades.map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Tipo de trazo ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-white/40">
              Tipo de trazo
            </label>
            <InfoTooltip
              text="Ortogonal: con esquinas, Lineal: recta, Libre: curva suave."
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "ortogonal" as RelationRouting, label: "Ortogonal" },
              { value: "lineal" as RelationRouting, label: "Lineal" },
              { value: "libre" as RelationRouting, label: "Libre" },
            ].map((opt) => {
              const active = routing === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRouting(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "border-[#28b8d5] bg-[#28b8d5]/10 text-[#28b8d5]"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-white/60 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Descripción ───────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-1.5">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5] transition-colors resize-none"
            placeholder="Describe la relación entre las entidades..."
          />
        </div>

        {/* ── Comentarios ───────────────────────────────────────── */}
        {enableComments && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 mb-2">
              Comentarios ({comentariosRelacion.length})
            </label>

            {comentariosRelacion.length > 0 && (
              <div className="space-y-2 mb-3">
                {comentariosRelacion.map((c) => (
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
              onClick={() => onDelete(relacion.id)}
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
            Eliminar Relación
          </button>
        )}
      </div>
    </div>
  );
}

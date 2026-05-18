"use client";
import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import type { EntidadER, AtributoER } from "@/lib/types/modelo-er.types";

export interface EntidadNodeData {
  entidad: EntidadER;
  seleccionada: boolean;
  onSelect: (id: string) => void;
  comentariosCount: number;
  onContextMenu: (id: string, x: number, y: number) => void;
  onCommentPinClick?: (id: string, x: number, y: number) => void;
  diffStatus?: "added" | "removed";
}

// Estilos compartidos de handle — visible siempre, animado en hover del nodo
const HANDLE_BASE =
  "!rounded-full !border-2 !border-white dark:!border-[#111111] !bg-[#28b8d5] !transition-all !duration-150";
const HANDLE_IDLE   = "!w-2.5 !h-2.5 !opacity-50";
const HANDLE_HOVER  = "!w-3.5 !h-3.5 !opacity-100 !cursor-crosshair !shadow-sm !shadow-[#28b8d5]/40";

const HANDLE_POINTS = ["20", "50", "80"] as const;

function AtributoRow({ attr }: { attr: AtributoER }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 text-xs border-b border-gray-100 dark:border-white/[0.04] last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
      <span className="w-8 flex gap-0.5 shrink-0">
        {attr.es_pk && (
          <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1 rounded" title="Primary Key">
            PK
          </span>
        )}
        {attr.es_fk && (
          <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-1 rounded" title="Foreign Key">
            FK
          </span>
        )}
      </span>
      <span className={`flex-1 truncate ${attr.es_pk ? "font-semibold text-gray-800 dark:text-white/90" : "text-gray-600 dark:text-white/60"}`}>
        {attr.nombre}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-white/30 font-mono shrink-0">
        {attr.tipo_dato}
      </span>
      {attr.es_nullable && (
        <span className="text-[9px] text-gray-300 dark:text-white/20" title="Nullable">
          ?
        </span>
      )}
    </div>
  );
}

function EntidadNodeComponent({ data }: NodeProps) {
  const { entidad, seleccionada, onSelect, comentariosCount, onContextMenu, onCommentPinClick, diffStatus } = data as unknown as EntidadNodeData;
  const [hovered, setHovered] = useState(false);

  const handleCls = `${HANDLE_BASE} ${hovered ? HANDLE_HOVER : HANDLE_IDLE}`;

  const borderClass =
    diffStatus === "added"
      ? "border-emerald-400 dark:border-emerald-400 border-dashed shadow-lg shadow-emerald-400/20"
      : diffStatus === "removed"
      ? "border-red-400 dark:border-red-400 border-dashed opacity-50"
      : seleccionada
      ? "border-[#28b8d5] shadow-lg shadow-[#28b8d5]/10 ring-2 ring-[#28b8d5]/20"
      : "border-gray-200 dark:border-white/[0.08] hover:border-[#28b8d5]/50 hover:shadow-md";

  const headerBg =
    diffStatus === "added"
      ? "#22c55e18"
      : diffStatus === "removed"
      ? "#ef444418"
      : entidad.color ? `${entidad.color}15` : "#28b8d515";

  const dotColor =
    diffStatus === "added" ? "#22c55e"
    : diffStatus === "removed" ? "#ef4444"
    : entidad.color ?? "#28b8d5";

  return (
    <div
      onClick={() => onSelect(entidad.id)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(entidad.id, e.clientX, e.clientY); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        rounded-xl border-2 bg-white dark:bg-[#111111] shadow-sm min-w-[220px] max-w-[280px]
        cursor-pointer transition-all duration-200 select-none
        ${borderClass}
      `}
    >
      {/* Handles múltiples por lado (3 por lado) para conexiones más precisas */}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`left-${p}`}>
          <Handle
            type="target"
            position={Position.Left}
            id={`left-${p}-t`}
            className={handleCls}
            style={{ top: `${p}%` }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id={`left-${p}-s`}
            className={handleCls}
            style={{ top: `${p}%` }}
          />
        </React.Fragment>
      ))}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`right-${p}`}>
          <Handle
            type="target"
            position={Position.Right}
            id={`right-${p}-t`}
            className={handleCls}
            style={{ top: `${p}%` }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id={`right-${p}-s`}
            className={handleCls}
            style={{ top: `${p}%` }}
          />
        </React.Fragment>
      ))}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`top-${p}`}>
          <Handle
            type="target"
            position={Position.Top}
            id={`top-${p}-t`}
            className={handleCls}
            style={{ left: `${p}%` }}
          />
          <Handle
            type="source"
            position={Position.Top}
            id={`top-${p}-s`}
            className={handleCls}
            style={{ left: `${p}%` }}
          />
        </React.Fragment>
      ))}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`bottom-${p}`}>
          <Handle
            type="target"
            position={Position.Bottom}
            id={`bottom-${p}-t`}
            className={handleCls}
            style={{ left: `${p}%` }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id={`bottom-${p}-s`}
            className={handleCls}
            style={{ left: `${p}%` }}
          />
        </React.Fragment>
      ))}

      {/* Cabecera */}
      <div
        className="px-3 py-2 rounded-t-[10px] flex items-center justify-between gap-2"
        style={{ backgroundColor: headerBg }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <h4 className="text-sm font-bold text-gray-800 dark:text-white/90 truncate">
            {entidad.nombre}
          </h4>
          {diffStatus === "added" && (
            <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              + Nueva
            </span>
          )}
          {diffStatus === "removed" && (
            <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400">
              − Eliminar
            </span>
          )}
        </div>
        {(hovered || comentariosCount > 0) && (
          <button
            onClick={(e) => { e.stopPropagation(); onCommentPinClick?.(entidad.id, e.clientX, e.clientY); }}
            className="inline-flex items-center justify-center rounded-full text-[#28b8d5] bg-[#28b8d5]/10 p-1 shrink-0 hover:bg-[#28b8d5]/20 transition-colors"
            title="Ver comentarios"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Hint de conexión al hover */}
      {hovered && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-white pointer-events-none dark:bg-white/10">
          Arrastra un punto para conectar
        </div>
      )}

      {/* Atributos */}
      <div className="max-h-[200px] overflow-y-auto">
        {entidad.atributos.map((attr) => (
          <AtributoRow key={attr.id} attr={attr} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-white/25 border-t border-gray-100 dark:border-white/[0.04]">
        {entidad.atributos.length} atributos
      </div>
    </div>
  );
}

export default memo(EntidadNodeComponent);

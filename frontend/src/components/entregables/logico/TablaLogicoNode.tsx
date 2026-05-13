"use client";
import React, { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

const HANDLE_POINTS = ["20", "50", "80"] as const;
import { MessageSquare } from "lucide-react";
import type { TablaLogica, ColumnaLogica } from "@/lib/types/modelo-logico.types";

// ============================================================================
// Nodo personalizado de Tabla Lógica para el diagrama ERD enriquecido
// ============================================================================

export interface TablaLogicoNodeData {
  tabla: TablaLogica;
  seleccionada: boolean;
  onSelect: (id: string) => void;
  onSelectColumna: (tablaId: string, columnaId: string) => void;
  comentariosCount: number;
  onContextMenu?: (id: string, x: number, y: number) => void;
  onCommentPinClick?: (id: string, x: number, y: number) => void;
}

const TIPO_COLOR: Record<string, string> = {
  VARCHAR: "#8b5cf6",
  CHAR: "#8b5cf6",
  TEXT: "#8b5cf6",
  INT: "#3b82f6",
  BIGINT: "#3b82f6",
  SMALLINT: "#3b82f6",
  DECIMAL: "#06b6d4",
  FLOAT: "#06b6d4",
  DOUBLE: "#06b6d4",
  BOOLEAN: "#f59e0b",
  DATE: "#10b981",
  TIME: "#10b981",
  DATETIME: "#10b981",
  TIMESTAMP: "#10b981",
  UUID: "#ec4899",
  JSON: "#f97316",
  JSONB: "#f97316",
  ENUM: "#a855f7",
  BLOB: "#6b7280",
  ARRAY: "#f97316",
};

function formatTipo(col: ColumnaLogica): string {
  if (col.longitud) return `${col.tipo_dato}(${col.longitud})`;
  return col.tipo_dato;
}

function ColumnaRow({
  col,
  tablaId,
  onSelectColumna,
}: {
  col: ColumnaLogica;
  tablaId: string;
  onSelectColumna: (tablaId: string, columnaId: string) => void;
}) {
  const color = TIPO_COLOR[col.tipo_dato] ?? "#6b7280";

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onSelectColumna(tablaId, col.id);
      }}
      className="flex items-center gap-2 px-2 py-[5px] text-[11px] border-b border-gray-200/70 dark:border-white/[0.06] last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
    >
      <span className="w-12 flex gap-0.5 shrink-0">
        {col.es_pk && (
          <span
            className="text-[8px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-500/10 px-1 rounded-sm"
            title="Primary Key"
          >
            PK
          </span>
        )}
        {col.es_fk && (
          <span
            className="text-[8px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-500/10 px-1 rounded-sm"
            title={`FK → ${col.fk_tabla_ref}.${col.fk_columna_ref}`}
          >
            FK
          </span>
        )}
        {col.es_unique && !col.es_pk && (
          <span
            className="text-[8px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded-sm"
            title="Unique"
          >
            UQ
          </span>
        )}
      </span>

      <span
        className={`flex-1 truncate font-mono ${
          col.es_pk
            ? "font-bold text-gray-800 dark:text-white/90"
            : "text-gray-700 dark:text-white/70"
        }`}
      >
        {col.nombre}
      </span>

      <span
        className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm shrink-0"
        style={{ color: color, backgroundColor: `${color}12` }}
      >
        {formatTipo(col)}
      </span>

      <span
        className={`text-[8px] shrink-0 font-bold ${
          col.es_nullable ? "text-gray-400 dark:text-white/25" : "text-gray-500 dark:text-white/30"
        }`}
        title={col.es_nullable ? "Nullable" : "Not Null"}
      >
        {col.es_nullable ? "N" : ""}
      </span>
    </div>
  );
}

function TablaLogicoNodeComponent({ data }: NodeProps) {
  const { tabla, seleccionada, onSelect, onSelectColumna, comentariosCount, onContextMenu, onCommentPinClick } =
    data as unknown as TablaLogicoNodeData;
  const [hovered, setHovered] = useState(false);

  const pkCount = tabla.columnas.filter((c) => c.es_pk).length;
  const fkCount = tabla.columnas.filter((c) => c.es_fk).length;
  const showHandles = hovered || seleccionada;
  const handleSize = 12;

  return (
    <div
      onClick={() => onSelect(tabla.id)}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(tabla.id, e.clientX, e.clientY); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        rounded-md border bg-white dark:bg-[#111111] min-w-[260px] max-w-[340px]
        cursor-pointer select-none
        ${seleccionada
          ? "border-[#28b8d5] ring-2 ring-[#28b8d5]/15"
          : "border-gray-300 dark:border-white/[0.12] hover:border-[#28b8d5]/60"
        }
      `}
    >
      {/* Handles — 3 por lado, ambos source y target para ConnectionMode.Loose */}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`left-${p}`}>
          <Handle type="target" position={Position.Left} id={`left-${p}-t`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ top: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
          <Handle type="source" position={Position.Left} id={`left-${p}-s`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ top: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
        </React.Fragment>
      ))}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`right-${p}`}>
          <Handle type="target" position={Position.Right} id={`right-${p}-t`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ top: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
          <Handle type="source" position={Position.Right} id={`right-${p}-s`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ top: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
        </React.Fragment>
      ))}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`top-${p}`}>
          <Handle type="target" position={Position.Top} id={`top-${p}-t`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ left: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
          <Handle type="source" position={Position.Top} id={`top-${p}-s`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ left: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
        </React.Fragment>
      ))}
      {HANDLE_POINTS.map((p) => (
        <React.Fragment key={`bottom-${p}`}>
          <Handle type="target" position={Position.Bottom} id={`bottom-${p}-t`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ left: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
          <Handle type="source" position={Position.Bottom} id={`bottom-${p}-s`}
            className="!rounded-[3px] !border-2 !border-gray-500/80 dark:!border-white/40 !bg-white dark:!bg-[#111111] !shadow-sm !transition-all !duration-150"
            style={{ left: `${p}%`, opacity: showHandles ? 1 : 0, width: handleSize, height: handleSize }}
          />
        </React.Fragment>
      ))}

      {/* Hover hint */}
      {hovered && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-white pointer-events-none dark:bg-white/10">
          Arrastra un punto para crear FK · Clic derecho para opciones
        </div>
      )}

      {/* Header */}
      <div className="px-2.5 py-2 rounded-t-[5px] bg-gray-100 dark:bg-white/[0.04] border-b border-gray-200/80 dark:border-white/[0.08]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[9px] font-mono text-gray-500 dark:text-white/35 truncate">
                {tabla.esquema}
              </span>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white/90 truncate">
                {tabla.nombre}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(hovered || comentariosCount > 0) && (
              <button
                onClick={(e) => { e.stopPropagation(); onCommentPinClick?.(tabla.id, e.clientX, e.clientY); }}
                className="inline-flex items-center justify-center rounded-full text-[#28b8d5] bg-[#28b8d5]/10 p-1 hover:bg-[#28b8d5]/20 transition-colors"
                title="Ver comentarios"
              >
                <MessageSquare className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-200/60 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400">
            {tabla.columnas.length} cols
          </span>
          {pkCount > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {pkCount} PK
            </span>
          )}
          {fkCount > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {fkCount} FK
            </span>
          )}
          {comentariosCount > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-semibold">
              {comentariosCount} 💬
            </span>
          )}
        </div>
      </div>

      {/* Columns */}
      <div className="max-h-[240px] overflow-y-auto bg-white dark:bg-[#111111]">
        {tabla.columnas
          .sort((a, b) => a.orden - b.orden)
          .map((col) => (
            <ColumnaRow key={col.id} col={col} tablaId={tabla.id} onSelectColumna={onSelectColumna} />
          ))}
      </div>

      {/* Footer */}
      {tabla.volumen_estimado && (
        <div className="px-3 py-1.5 text-[9px] text-gray-400 dark:text-white/25 border-t border-gray-100 dark:border-white/[0.04] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
          </svg>
          ~{tabla.volumen_estimado} registros
        </div>
      )}

    </div>
  );
}

export default memo(TablaLogicoNodeComponent);

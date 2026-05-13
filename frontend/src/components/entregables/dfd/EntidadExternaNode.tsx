"use client";
import React, { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { MessageCircle } from "lucide-react";
import type { NodoDFD } from "@/lib/types/dfd.types";
import DFDConnectionHandles from "./DFDConnectionHandles";

export interface EntidadExternaNodeData {
  nodo: NodoDFD;
  seleccionado: boolean;
  onSelect: (id: string) => void;
  onNodeRightClick?: (id: string, x: number, y: number) => void;
  comentariosCount: number;
  mostrarPuntosConexion?: boolean;
}

function EntidadExternaNodeComponent({ data, isConnectable }: NodeProps) {
  const {
    nodo,
    seleccionado,
    onSelect,
    onNodeRightClick,
    comentariosCount,
    mostrarPuntosConexion,
  } = data as unknown as EntidadExternaNodeData;

  return (
    <div
      className="group relative cursor-grab active:cursor-grabbing select-none"
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onNodeRightClick?.(nodo.id, e.clientX, e.clientY); }}
    >
      {seleccionado && (
        <NodeResizer
          minWidth={180}
          minHeight={80}
          lineClassName="border-[#28b8d5] border-2"
          handleClassName="w-3 h-3 bg-white border-2 border-[#28b8d5] rounded-sm hover:scale-125 transition-transform !cursor-nwse-resize"
        />
      )}

      <div
        onClick={() => onSelect(nodo.id)}
        style={{
          width: nodo.width ? `${nodo.width}px` : undefined,
          maxWidth: nodo.width ? undefined : "320px",
          height: nodo.height ? `${nodo.height}px` : "auto",
        }}
        className={`
          relative overflow-hidden rounded-sm border-2 border-[#1f2937]
          bg-[#f2e39a] shadow-sm transition-shadow duration-150
          ${
            seleccionado
              ? "shadow-lg ring-2 ring-[#0ea5e9]/35"
              : "hover:shadow-md"
          }
        `}
      >
        <DFDConnectionHandles
          isConnectable={isConnectable}
          visible={mostrarPuntosConexion}
          revealOnHover
        />

        <div className="flex min-h-16 flex-col items-center justify-center px-4 py-2">
          <h4
            className="w-full text-center text-[12px] font-bold leading-snug text-[#111827]"
            title={nodo.nombre}
          >
            {nodo.nombre}
          </h4>
          {nodo.descripcion && (
            <p className="mt-1 text-center text-[10px] leading-relaxed text-[#374151]">
              {nodo.descripcion}
            </p>
          )}
        </div>

        {comentariosCount > 0 && (
          <div className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border border-[#1f2937]/20 bg-[#111827]/10 px-2 py-0.5 text-[10px] font-semibold text-[#111827]">
            <MessageCircle size={11} />
            {comentariosCount}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EntidadExternaNodeComponent);

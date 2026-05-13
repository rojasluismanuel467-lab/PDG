"use client";
import React, { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { MessageCircle } from "lucide-react";
import type { NodoDFD } from "@/lib/types/dfd.types";
import DFDConnectionHandles from "./DFDConnectionHandles";

export interface ProcesoNodeData {
  nodo: NodoDFD;
  seleccionado: boolean;
  onSelect: (id: string) => void;
  onNodeRightClick?: (id: string, x: number, y: number) => void;
  comentariosCount: number;
  mostrarPuntosConexion?: boolean;
}

function ProcesoNodeComponent({ data, isConnectable }: NodeProps) {
  const {
    nodo,
    seleccionado,
    onSelect,
    onNodeRightClick,
    comentariosCount,
    mostrarPuntosConexion,
  } = data as unknown as ProcesoNodeData;

  return (
    // Div raíz: sin overflow para que los handles de NodeResizer no se recorten
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

      {/* Div visual: overflow-hidden para recortar el header en las esquinas redondeadas */}
      <div
        onClick={() => onSelect(nodo.id)}
        style={{
          width: nodo.width ? `${nodo.width}px` : undefined,
          maxWidth: nodo.width ? undefined : "320px",
          height: nodo.height ? `${nodo.height}px` : "auto",
        }}
        className={`
          relative overflow-hidden rounded-[18px] border-2 bg-[#f2e39a]
          transition-shadow duration-150
          ${
            seleccionado
              ? "border-[#1f2937] shadow-lg ring-2 ring-[#0ea5e9]/35"
              : "border-[#1f2937] hover:shadow-md"
          }
        `}
      >
        <DFDConnectionHandles
          isConnectable={isConnectable}
          visible={mostrarPuntosConexion}
          revealOnHover
        />

        <div className="flex cursor-grab items-center justify-between border-b-2 border-[#1f2937] bg-[#e8d987] px-3 py-1.5 active:cursor-grabbing">
          <span className="inline-flex min-w-9 items-center justify-center border border-[#1f2937] bg-[#f9f1bf] px-1.5 py-0.5 text-[10px] font-bold text-[#111827]">
            {nodo.numero_proceso ?? "P"}
          </span>
          {comentariosCount > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full border border-[#1f2937]/20 bg-[#111827]/10 px-2 py-0.5 text-[10px] font-semibold text-[#111827]">
              <MessageCircle size={11} />
              {comentariosCount}
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <p
            className="text-center text-[12px] font-bold leading-snug text-[#111827]"
            title={nodo.nombre}
          >
            {nodo.nombre}
          </p>
          {nodo.descripcion && (
            <p className="mt-2 text-center text-[10px] leading-relaxed text-[#374151]">
              {nodo.descripcion}
            </p>
          )}
          {nodo.ubicacion_proceso && (
            <p className="mt-1 text-center text-[9px] font-medium text-[#4b5563]">
              {nodo.ubicacion_proceso}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProcesoNodeComponent);

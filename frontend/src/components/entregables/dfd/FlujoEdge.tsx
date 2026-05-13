"use client";
import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSimpleBezierPath,
  getStraightPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { EstiloLineaDFD, TipoRelacionDFD } from "@/lib/types/dfd.types";
import { DEFAULT_DFD_LINE_STYLE } from "./dfdNotation";

// ============================================================================
// Edge personalizado: Flujo de Datos
// Muestra la etiqueta del dato que fluye entre nodos del DFD
// ============================================================================

export interface FlujoEdgeData {
  etiqueta: string;
  seleccionado: boolean;
  invalido?: boolean;
  onSelect: (id: string) => void;
  tipo_flujo?: "entrada" | "salida" | "bidireccional";
  tipo_relacion?: TipoRelacionDFD;
  estilo_linea?: EstiloLineaDFD;
}

export default function FlujoEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerStart,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as unknown as FlujoEdgeData;
  const estiloLinea = edgeData?.estilo_linea ?? DEFAULT_DFD_LINE_STYLE;

  const [edgePath, labelX, labelY] = (() => {
    if (estiloLinea === "rectilinear") {
      return getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 0,
      });
    }

    if (estiloLinea === "round_rectilinear") {
      return getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 14,
      });
    }

    if (estiloLinea === "curve") {
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.35,
      });
    }

    if (estiloLinea === "round_oblique") {
      return getSimpleBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
    }

    return getStraightPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  })();

  const isSelected = edgeData?.seleccionado ?? false;
  const isInvalid = edgeData?.invalido ?? false;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isInvalid ? "#DC2626" : isSelected ? "#0EA5E9" : "#1F2937",
          strokeWidth: isSelected ? 2.5 : 1.8,
          opacity: isSelected ? 1 : 0.8,
          strokeDasharray: isInvalid ? "6 4" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          onClick={(e) => {
            e.stopPropagation();
            edgeData?.onSelect?.(id);
          }}
          className={`
            absolute pointer-events-auto cursor-pointer
            px-2.5 py-1 rounded-sm text-[10px] font-semibold
            transition-all duration-200 select-none max-w-[200px]
            ${
              isInvalid
                ? "bg-[#FEE2E2] text-[#7F1D1D] border border-[#DC2626]/50"
                : isSelected
                ? "bg-[#0EA5E9] text-white shadow-md border border-[#0284C7]"
                : "bg-[#F9F1BF] text-[#1F2937] border border-[#1F2937]/35 hover:border-[#0EA5E9]"
            }
          `}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="block leading-tight truncate flex-1">
              {edgeData?.etiqueta ?? ""}
            </span>
          </div>
          {isInvalid && (
            <div className="mt-1 block text-[9px] font-semibold">
              Conexión inválida
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

"use client";
import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

// ============================================================================
// Edge personalizado de Foreign Key para el diagrama ERD lógico
// ============================================================================

export type FKEdgeRouting = "ortogonal" | "lineal" | "personalizado";

export interface FKEdgeData {
  columnaFK: string;
  columnaFKId: string;
  tablaOrigen: string;
  tablaDestino: string;
  columnaRef: string;
  onDelete?: string;
  isNullable?: boolean;
  isUnique?: boolean;
  isIdentifying?: boolean;
  seleccionada: boolean;
  onSelect: (id: string) => void;
  routing?: FKEdgeRouting;
  comentariosCount?: number;
  onContextMenu?: (id: string, x: number, y: number) => void;
  onCommentPinClick?: (id: string, x: number, y: number) => void;
}

export default function FKEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps) {
  const edgeData = data as unknown as FKEdgeData;
  const routing = edgeData?.routing ?? "ortogonal";

  // Seleccionar path según routing
  let edgePath: string, labelX: number, labelY: number;
  if (routing === "lineal") {
    [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  } else if (routing === "personalizado") {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      curvature: 0.4,
    });
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: 0,
    });
  }

  const isSelected = edgeData?.seleccionada ?? false;
  const lineColor = isSelected ? "#28b8d5" : "#6b7280";
  const isIdentifying = edgeData?.isIdentifying ?? false;
  const isOneToOne = edgeData?.isUnique ?? false;

  const markerOneId = `${id}-marker-one`;
  const markerCrowId = `${id}-marker-crow`;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: lineColor,
          strokeWidth: isSelected ? 2.25 : 1.25,
          strokeDasharray: isIdentifying ? undefined : "4 3",
        }}
        markerStart={isOneToOne ? `url(#${markerOneId})` : `url(#${markerCrowId})`}
        markerEnd={`url(#${markerOneId})`}
      />
      <EdgeLabelRenderer>
        <div
          onClick={(e) => {
            e.stopPropagation();
            edgeData?.onSelect?.(id);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            edgeData?.onContextMenu?.(edgeData.columnaFKId ?? id, e.clientX, e.clientY);
          }}
          className={`
            absolute pointer-events-auto cursor-pointer
            px-2 py-1 rounded-md text-[10px] font-mono
            transition-all duration-150 select-none max-w-[220px]
            ${isSelected
              ? "bg-[#28b8d5] text-white shadow-sm"
              : "bg-white dark:bg-[#111111] text-gray-700 dark:text-white/70 border border-gray-300/70 dark:border-white/[0.12] hover:border-[#28b8d5]/60"
            }
          `}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
        >
          <span className="block leading-tight truncate font-semibold">
            {edgeData?.columnaFK ?? "FK"}
          </span>
          <span className={`block leading-tight text-[9px] truncate ${isSelected ? "text-white/70" : "text-gray-400 dark:text-white/30"}`}>
            → {edgeData?.tablaDestino}.{edgeData?.columnaRef}
          </span>
          {(edgeData?.comentariosCount ?? 0) > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); edgeData?.onCommentPinClick?.(edgeData.columnaFKId ?? id, e.clientX, e.clientY); }}
              className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                isSelected ? "bg-white/20 text-white" : "bg-[#28b8d5]/10 text-[#28b8d5]"
              }`}
            >
              {edgeData.comentariosCount}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>

      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <marker
            id={markerOneId}
            viewBox="0 0 12 12"
            refX="0"
            refY="6"
            markerWidth="16"
            markerHeight="16"
            markerUnits="strokeWidth"
            orient="auto"
          >
            <path
              d="M 0 0 L 0 12"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </marker>

          <marker
            id={markerCrowId}
            viewBox="0 0 12 12"
            refX="0"
            refY="6"
            markerWidth="18"
            markerHeight="18"
            markerUnits="strokeWidth"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 6 L 10 0 M 0 6 L 10 6 M 0 6 L 10 12"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </marker>
        </defs>
      </svg>
    </>
  );
}

"use client";
import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

export type EdgeRouting = "ortogonal" | "lineal" | "libre";

export interface RelacionEdgeData {
  nombre: string;
  cardinalidad: string;
  sourceNotation?: string;
  targetNotation?: string;
  seleccionada: boolean;
  onSelect: (id: string) => void;
  comentariosCount?: number;
  routing?: EdgeRouting;
  onContextMenu?: (id: string, x: number, y: number) => void;
  onCommentPinClick?: (id: string, x: number, y: number) => void;
}

// ── Dimensiones de los símbolos ────────────────────────────────────────────────
const H  = 10;   // semialtura de las líneas perpendiculares
const SW = 2.0;  // strokeWidth del símbolo
const BG = "var(--cf-bg, #f9fafb)"; // color de fondo del canvas (para enmascarar la línea)

// Ancho total de cada símbolo (para dimensionar el rect de fondo)
const SYMBOL_WIDTH: Record<string, number> = {
  "||": 16,
  "|":  12,
  "O|": 20,
  "|<": 24,
  "O<": 26,
  "<":  22,
};

// ── Símbolo SVG ────────────────────────────────────────────────────────────────
// Orientación base: la línea sale hacia la DERECHA (+X). Se rota según el handle.
// Primer elemento: rect de fondo que enmascara la línea subyacente.
function CrowFootSymbol({ notation }: { notation: string }): React.ReactElement | null {
  const w = SYMBOL_WIDTH[notation] ?? 24;

  // Fondo que oculta el trazo de la línea detrás del símbolo
  const bg = <rect x={1} y={-(H + 4)} width={w} height={(H + 4) * 2} fill={BG} />;

  switch (notation) {

    // ── || exactamente uno ──────────────────────────────────────────
    case "||":
      return (
        <g>
          {bg}
          <line x1={4}  y1={-H} x2={4}  y2={H} strokeWidth={SW} />
          <line x1={10} y1={-H} x2={10} y2={H} strokeWidth={SW} />
        </g>
      );

    // ── | uno (mín desconocido) ─────────────────────────────────────
    case "|":
      return (
        <g>
          {bg}
          <line x1={6} y1={-H} x2={6} y2={H} strokeWidth={SW} />
        </g>
      );

    // ── O| cero o uno ───────────────────────────────────────────────
    case "O|":
      return (
        <g>
          {bg}
          {/* Círculo relleno con fondo para enmascarar la línea */}
          <circle cx={5} cy={0} r={4.5} fill={BG} strokeWidth={SW} />
          <line x1={13} y1={-H} x2={13} y2={H} strokeWidth={SW} />
        </g>
      );

    // ── |< uno o muchos ─────────────────────────────────────────────
    case "|<":
      return (
        <g>
          {bg}
          <line x1={4}  y1={-H} x2={4}  y2={H}    strokeWidth={SW} />
          {/* Pata de gallo: 3 líneas desde punto común hacia afuera */}
          <line x1={10} y1={0}  x2={20} y2={-(H)}  strokeWidth={SW} />
          <line x1={10} y1={0}  x2={20} y2={0}     strokeWidth={SW} />
          <line x1={10} y1={0}  x2={20} y2={H}     strokeWidth={SW} />
        </g>
      );

    // ── O< cero o muchos ────────────────────────────────────────────
    case "O<":
      return (
        <g>
          {bg}
          <circle cx={5} cy={0} r={4.5} fill={BG} strokeWidth={SW} />
          <line x1={12} y1={0}  x2={22} y2={-(H)}  strokeWidth={SW} />
          <line x1={12} y1={0}  x2={22} y2={0}     strokeWidth={SW} />
          <line x1={12} y1={0}  x2={22} y2={H}     strokeWidth={SW} />
        </g>
      );

    // ── < muchos (mín desconocido) ──────────────────────────────────
    case "<":
      return (
        <g>
          {bg}
          <line x1={8}  y1={0}  x2={18} y2={-(H)}  strokeWidth={SW} />
          <line x1={8}  y1={0}  x2={18} y2={0}     strokeWidth={SW} />
          <line x1={8}  y1={0}  x2={18} y2={H}     strokeWidth={SW} />
        </g>
      );

    default:
      return null;
  }
}

function positionAngle(pos: Position): number {
  if (pos === Position.Left)   return 180;
  if (pos === Position.Top)    return -90;
  if (pos === Position.Bottom) return 90;
  return 0; // Position.Right
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function RelacionEdgeComponent({
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
  const edgeData = data as unknown as RelacionEdgeData;
  const routing = edgeData?.routing ?? "ortogonal";

  // Seleccionar función de path según el tipo de routing
  let edgePath: string, labelX: number, labelY: number;
  if (routing === "lineal") {
    [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  } else if (routing === "libre") {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      curvature: 0.4,
    });
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: 16,
    });
  }

  const isSelected = edgeData?.seleccionada ?? false;

  // Línea: gris claro sin seleccionar, cian al seleccionar
  const lineColor   = isSelected ? "#28b8d5" : "#94a3b8";
  // Símbolos: más oscuros para contrastar con la línea gris
  const symbolColor = isSelected ? "#28b8d5" : "#334155";

  // En líneas rectas el ángulo real viene del vector fuente→destino
  const straightAngle = Math.atan2(targetY - sourceY, targetX - sourceX) * (180 / Math.PI);
  const srcAngle = routing === "lineal" ? straightAngle       : positionAngle(sourcePosition);
  const tgtAngle = routing === "lineal" ? straightAngle + 180 : positionAngle(targetPosition);

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: lineColor,
          strokeWidth: isSelected ? 2.5 : 1.5,
        }}
      />

      {/* ── Crow's Foot — extremo origen ────────────────────────────── */}
      {edgeData?.sourceNotation && (
        <g
          transform={`translate(${sourceX},${sourceY}) rotate(${srcAngle})`}
          stroke={symbolColor}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <CrowFootSymbol notation={edgeData.sourceNotation} />
        </g>
      )}

      {/* ── Crow's Foot — extremo destino ───────────────────────────── */}
      {edgeData?.targetNotation && (
        <g
          transform={`translate(${targetX},${targetY}) rotate(${tgtAngle})`}
          stroke={symbolColor}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <CrowFootSymbol notation={edgeData.targetNotation} />
        </g>
      )}

      {/* ── Label central clicable ──────────────────────────────────── */}
      <EdgeLabelRenderer>
        <div
          onClick={(e) => {
            e.stopPropagation();
            edgeData?.onSelect?.(id);
          }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); edgeData?.onContextMenu?.(id, e.clientX, e.clientY); }}
          className={`
            absolute pointer-events-auto cursor-pointer
            px-2 py-1 rounded-lg text-[10px] font-medium
            transition-all duration-200 select-none
            ${isSelected
              ? "bg-[#28b8d5] text-white shadow-md shadow-[#28b8d5]/20"
              : "bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-white/50 border border-gray-200 dark:border-white/[0.08] hover:border-[#28b8d5]/50"
            }
          `}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
        >
          <span className="block leading-tight">{edgeData?.nombre ?? ""}</span>
          {(edgeData?.comentariosCount ?? 0) > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); edgeData?.onCommentPinClick?.(id, e.clientX, e.clientY); }}
              className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-[#28b8d5]/10 text-[#28b8d5]"
              }`}
            >
              {edgeData.comentariosCount}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

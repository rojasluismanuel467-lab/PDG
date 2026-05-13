"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { LegacyMaturityResult } from "@/lib/types/maturity-legacy";
import { getDomainColor } from "@/lib/constants/domainColors";
import { getMaturityLevelFromPercentEs, getScoreColor } from "@/lib/maturity/scoring";

interface MaturityRadarChartProps {
  data: Array<{
    dimension: string;
    score: number;
    fullMark: number;
  }>;
  results?: LegacyMaturityResult[];
  title?: string;
}

const SCALE_LEGEND = [
  { label: "Inicial",    color: "#DC2626" },
  { label: "Repetible",  color: "#EA580C" },
  { label: "Definido",   color: "#D97706" },
  { label: "Gestionado", color: "#65A30D" },
  { label: "Optimizado", color: "#16A34A" },
  { label: "No evaluado", color: "#9CA3AF" },
];

export const MaturityRadarChart: React.FC<MaturityRadarChartProps> = ({
  data,
  results,
  title = "Vista General de Dominios",
}) => {
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(
    data.map((d) => d.dimension)
  );
  const [showFilters, setShowFilters] = useState(false);

  const toggleDimension = (dimension: string) => {
    setSelectedDimensions((prev) =>
      prev.includes(dimension)
        ? prev.filter((d) => d !== dimension)
        : [...prev, dimension]
    );
  };

  const selectAll = () => setSelectedDimensions(data.map((d) => d.dimension));
  const deselectAll = () => setSelectedDimensions([]);

  const filteredData = data.filter((d) => selectedDimensions.includes(d.dimension));

  const combinedData = (results ?? [])
    .filter((dim) => selectedDimensions.includes(dim.dimensionName))
    .map((dim) => ({
      dimension: dim.dimensionName,
      domainScore: dim.score,
      fullMark: 5,
      percent: dim.percent,
    }));

  const chartData =
    combinedData.length > 0
      ? combinedData
      : filteredData.map((d) => ({
          dimension: d.dimension,
          domainScore: d.score,
          fullMark: 5,
          percent: (d.score / 5) * 100,
        }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 pb-3 pt-4 dark:border-white/[0.06]">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {selectedDimensions.length} de {data.length} dominios seleccionados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showFilters
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-900/20 dark:text-blue-300"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtrar
            {showFilters ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          <button
            onClick={selectAll}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-white/60 dark:hover:bg-white/[0.04]"
          >
            Todos
          </button>
          <button
            onClick={deselectAll}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/[0.08] dark:text-white/60 dark:hover:bg-white/[0.04]"
          >
            Ninguno
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
          <p className="mb-3 text-xs font-medium text-gray-600 dark:text-white/60">
            Selecciona los dominios a mostrar en el gráfico
          </p>
          <div className="flex flex-wrap gap-2">
            {data.map((dim) => {
              const isSelected = selectedDimensions.includes(dim.dimension);
              const dimResult = results?.find((r) => r.dimensionName === dim.dimension);
              const color = getDomainColor(dim.dimension);

              return (
                <button
                  key={dim.dimension}
                  onClick={() => toggleDimension(dim.dimension)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? "border-transparent text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/60 dark:hover:border-white/[0.15]"
                  }`}
                  style={isSelected ? { backgroundColor: color } : undefined}
                >
                  {isSelected && (
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="max-w-[160px] truncate">{dim.dimension}</span>
                  {isSelected && dimResult && (
                    <span className="opacity-90">{dimResult.score.toFixed(1)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="px-5 py-4">
        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center rounded-lg bg-gray-50 dark:bg-white/[0.02]">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecciona al menos un dominio
              </p>
              <button
                onClick={selectAll}
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Seleccionar todos
              </button>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={480}>
            <RadarChart data={chartData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: "#6b7280" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickFormatter={(v: number) => String(v)}
              />
              <Radar
                name="Dominios"
                dataKey="domainScore"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.55}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload?.[0]) {
                    const d = payload[0].payload as {
                      dimension: string;
                      domainScore: number;
                      percent?: number;
                    };
                    const pct = d.percent ?? (d.domainScore / 5) * 100;
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg dark:border-white/[0.12] dark:bg-[#1a1a1a]">
                        <p className="mb-2 font-semibold text-gray-900 dark:text-white">
                          {d.dimension}
                        </p>
                        <p className="text-gray-700 dark:text-white/70">
                          <strong>Puntaje:</strong> {d.domainScore.toFixed(2)} / 5.0
                        </p>
                        <p className="text-gray-700 dark:text-white/70">
                          <strong>Nivel:</strong>{" "}
                          <span style={{ color: getScoreColor(d.domainScore) }}>
                            {getMaturityLevelFromPercentEs(pct)}
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Scale legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 px-5 py-3 dark:border-white/[0.06]">
        {SCALE_LEGEND.map((level) => (
          <div key={level.label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: level.color }} />
            <span className="text-[10px] text-gray-500 dark:text-white/40">{level.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

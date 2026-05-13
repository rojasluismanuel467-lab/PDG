"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getMaturityLevelEs,
  getMaturityLevelFromPercentEs,
  getScoreColor,
} from "@/lib/maturity/scoring";
import type { LegacyMaturityResult } from "@/lib/types/maturity-legacy";
import { getDomainColor } from "@/lib/constants/domainColors";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MaturityResultsSummaryProps {
  results: LegacyMaturityResult[];
  overallScore: number;
  overallPercent?: number;
  respondentCount: number;
}

const MATURITY_SCALE = [
  { label: "Inicial",    range: "0–25%",    color: "#DC2626" },
  { label: "Repetible",  range: "25–50%",   color: "#EA580C" },
  { label: "Definido",   range: "50–75%",   color: "#D97706" },
  { label: "Gestionado", range: "75–90%",   color: "#65A30D" },
  { label: "Optimizado", range: "90–100%",  color: "#16A34A" },
];

const NEXT_STEPS = [
  "Revisar las dimensiones con puntuaciones más bajas para identificar brechas críticas.",
  "Crear un plan de mejora enfocado en las áreas de mayor impacto y prioridad.",
  "Establecer objetivos realistas a corto, mediano y largo plazo.",
  "Realizar evaluaciones periódicas para monitorear el progreso.",
];

export const MaturityResultsSummary: React.FC<MaturityResultsSummaryProps> = ({
  results,
  overallScore,
  overallPercent,
  respondentCount,
}) => {
  const [expandedDimension, setExpandedDimension] = useState<number | null>(null);

  const score = overallScore ?? 0;
  const percent = overallPercent ?? (score / 5) * 100;
  const scoreColor = getScoreColor(score);
  const maturityLabel = getMaturityLevelFromPercentEs(percent);

  const toggleDimension = (id: number) =>
    setExpandedDimension((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-5">

      {/* ── Overall score ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Puntuación general de madurez
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Basada en {respondentCount} respondente{respondentCount !== 1 ? "s" : ""}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: scoreColor }}
          >
            {maturityLabel}
          </span>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold leading-none" style={{ color: scoreColor }}>
            {score.toFixed(2)}
          </span>
          <span className="mb-0.5 text-sm text-gray-400 dark:text-white/40">/ 5.0</span>
          <span className="mb-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
            ({percent.toFixed(1)}%)
          </span>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <div
            className="h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: scoreColor }}
          />
        </div>

        {/* Scale legend */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {MATURITY_SCALE.map((level) => (
            <div key={level.label} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: level.color }} />
              <span className="text-[10px] text-gray-500 dark:text-white/40">
                {level.label}{" "}
                <span className="opacity-60">{level.range}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dimensions ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="border-b border-gray-100 px-5 pb-3 pt-4 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Resultados por dimensión y subdominio
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Expande cada dimensión para ver el detalle de sus subdominios
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {results.map((result) => {
            const dimColor = getScoreColor(result.score);
            const isExpanded = expandedDimension === result.dimensionId;

            return (
              <div key={result.dimensionId}>
                <button
                  onClick={() => toggleDimension(result.dimensionId)}
                  className="w-full px-5 py-3.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    {/* Color bar */}
                    <div
                      className="h-9 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: dimColor }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {result.dimensionName}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: dimColor }}>
                            {result.score.toFixed(2)}
                            <span className="text-xs font-normal text-gray-400">/5</span>
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: dimColor }}
                          >
                            {getMaturityLevelEs(result.score)}
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${(result.score / 5) * 100}%`,
                            backgroundColor: dimColor,
                          }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-400 dark:text-white/30">
                        <span>Peso: {(result.weight * 100).toFixed(0)}%</span>
                        <span>·</span>
                        <span>{result.questionCount} pregunta{result.questionCount !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{result.subdomains.length} subdominio{result.subdomains.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-gray-100 px-5 py-4 dark:border-white/[0.05]">
                    {/* Per-dimension mini radar */}
                    {result.subdomains.length > 1 && (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            data={result.subdomains.map((sd) => ({
                              name: sd.subdomainName,
                              score: sd.score,
                              percent: sd.percent,
                            }))}
                          >
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: "#9ca3af" }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 5]}
                              tick={{ fontSize: 8, fill: "#d1d5db" }}
                              tickCount={3}
                            />
                            <Radar
                              name="Subdominios"
                              dataKey="score"
                              stroke={getDomainColor(result.dimensionName)}
                              fill={getDomainColor(result.dimensionName)}
                              fillOpacity={0.4}
                              strokeWidth={2}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload?.[0]) {
                                  const d = payload[0].payload as {
                                    name: string;
                                    score: number;
                                    percent: number;
                                  };
                                  return (
                                    <div className="rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-lg dark:border-white/[0.12] dark:bg-[#1a1a1a]">
                                      <p className="mb-1 font-semibold text-gray-900 dark:text-white">
                                        {d.name}
                                      </p>
                                      <p className="text-gray-600 dark:text-white/60">
                                        {d.score.toFixed(2)} / 5.0 ({d.percent.toFixed(1)}%)
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Subdomain cards */}
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {result.subdomains.map((sd) => {
                        const sdColor = getScoreColor(sd.score);
                        return (
                          <div
                            key={sd.subdomainId}
                            className="rounded-lg border border-gray-100 p-3 dark:border-white/[0.06]"
                          >
                            <div className="mb-1.5 flex items-start justify-between gap-2">
                              <span className="text-xs font-medium leading-tight text-gray-700 dark:text-white/80">
                                {sd.subdomainName}
                              </span>
                              <span
                                className="shrink-0 text-xs font-semibold"
                                style={{ color: sdColor }}
                              >
                                {sd.score.toFixed(2)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(sd.percent, 100)}%`,
                                  backgroundColor: sdColor,
                                }}
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 dark:text-white/30">
                                {sd.questionCount} pregunta{sd.questionCount !== 1 ? "s" : ""}
                              </span>
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                                style={{ backgroundColor: sdColor }}
                              >
                                {getMaturityLevelFromPercentEs(sd.percent)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Next steps ── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-400/20 dark:bg-blue-950/20">
        <h2 className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-300">
          Próximos pasos recomendados
        </h2>
        <ol className="space-y-2.5">
          {NEXT_STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white dark:bg-blue-500">
                {i + 1}
              </span>
              <span className="text-xs leading-relaxed text-blue-800 dark:text-blue-300/80">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

"use client";

import React from "react";
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
import { getMaturityLevelFromPercent, getScoreColor } from "@/lib/maturity/scoring";
import { getDomainColor } from "@/lib/constants/domainColors";

interface MaturityDomainRadarProps {
  dimension: LegacyMaturityResult;
}

interface SubdomainDataPoint {
  name: string;
  score: number;
  percent: number;
  fullMark: number;
}

export const MaturityDomainRadar: React.FC<MaturityDomainRadarProps> = ({
  dimension,
}) => {
  // Preparar datos para el gráfico de subdominios
  const data: SubdomainDataPoint[] = dimension.subdomains.map((sd) => ({
    name: sd.subdomainName,
    score: sd.score,
    percent: sd.percent,
    fullMark: 5,
  }));

  const domainColor = getDomainColor(dimension.dimensionName);
  const maturityLevel = getMaturityLevelFromPercent(dimension.percent);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header del Dominio */}
      <div className="mb-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-bold text-gray-900">
            {dimension.dimensionName}
          </h3>
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: getScoreColor(dimension.score) }}
          >
            {dimension.score.toFixed(2)}
          </span>
        </div>

        {/* Info adicional */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Peso: {(dimension.weight * 100).toFixed(0)}%</span>
          <span className="font-medium" style={{ color: getScoreColor(dimension.score) }}>
            {maturityLevel}
          </span>
        </div>
      </div>

      {/* Gráfico de Araña de Subdominios */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "#6b7280" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fontSize: 8, fill: "#9ca3af" }}
              tickCount={3}
            />
            <Radar
              name="Subdominios"
              dataKey="score"
              stroke={domainColor}
              fill={domainColor}
              fillOpacity={0.5}
              strokeWidth={2}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const pointData = payload[0].payload as SubdomainDataPoint;
                  return (
                    <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 text-xs">
                      <p className="font-semibold text-gray-900 mb-1">
                        {pointData.name}
                      </p>
                      <p className="text-gray-700">
                        <strong>Puntaje:</strong> {pointData.score.toFixed(2)} / 5.0
                      </p>
                      <p className="text-gray-700">
                        <strong>Porcentaje:</strong> {pointData.percent.toFixed(1)}%
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

      {/* Lista de Subdominios con Scores */}
      <div className="mt-3 space-y-1.5">
        {dimension.subdomains.map((sd) => (
          <div key={sd.subdomainId} className="flex items-center justify-between">
            <span className="text-xs text-gray-600 truncate max-w-[180px]">
              {sd.subdomainName}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${sd.percent}%`,
                    backgroundColor: getScoreColor(sd.score),
                  }}
                />
              </div>
              <span
                className="text-xs font-semibold min-w-[32px] text-right"
                style={{ color: getScoreColor(sd.score) }}
              >
                {sd.score.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

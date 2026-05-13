import type { KPIDashboard, KPI } from "@/lib/types/roadmap.types";

const delay = (ms = 420) => new Promise((res) => setTimeout(res, ms));

const buildId = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 10)}`;

const buildKPIs = (): KPIDashboard => {
  const kpis: KPI[] = [
    {
      id: buildId("kpi"),
      name: "% entidades críticas con modelo lógico aprobado",
      description:
        "Cobertura de modelado lógico para entidades críticas priorizadas en el dominio.",
      unit: "%",
      current_value: 35,
      target_value: 80,
      trend: "Mejorando",
      history: [
        { period: "2026-Q1", value: 10 },
        { period: "2026-Q2", value: 20 },
        { period: "2026-Q3", value: 35 },
      ],
      owner: "Arquitecto de Datos",
      frequency: "Trimestral",
      traceability: {
        initiatives: [{ id: "ini-mock", name: "Modelo lógico TO-BE para entidades críticas" }],
        standards: [{ id: "std-mock", name: "Tipos de datos y longitudes por defecto" }],
      },
    },
    {
      id: buildId("kpi"),
      name: "Integraciones bajo patrón estándar",
      description:
        "Número de integraciones que siguen patrones definidos (API/eventos/batch) y están documentadas en DFD TO-BE.",
      unit: "#",
      current_value: 7,
      target_value: 20,
      trend: "Mejorando",
      history: [
        { period: "2026-Q1", value: 2 },
        { period: "2026-Q2", value: 4 },
        { period: "2026-Q3", value: 7 },
      ],
      owner: "Arquitecto de Integración",
      frequency: "Trimestral",
    },
    {
      id: buildId("kpi"),
      name: "Cumplimiento de estándares (auditoría de artefactos)",
      description:
        "Porcentaje de artefactos revisados que cumplen con estándares obligatorios (naming, documentación, seguridad).",
      unit: "%",
      current_value: 62,
      target_value: 90,
      trend: "Estable",
      history: [
        { period: "2026-Q1", value: 60 },
        { period: "2026-Q2", value: 61 },
        { period: "2026-Q3", value: 62 },
      ],
      owner: "Consultor Gerente",
      frequency: "Mensual",
    },
    {
      id: buildId("kpi"),
      name: "Tiempo promedio de ciclo de revisión",
      description:
        "Días promedio entre creación de versión y aprobación final del consultor en artefactos clave.",
      unit: "días",
      current_value: 9,
      target_value: 5,
      trend: "Empeorando",
      history: [
        { period: "2026-Q1", value: 6 },
        { period: "2026-Q2", value: 8 },
        { period: "2026-Q3", value: 9 },
      ],
      owner: "PMO / Gerencia",
      frequency: "Mensual",
    },
  ];

  return {
    kpis,
    updated_at: new Date().toISOString(),
    report_period: "2026-Q3",
  };
};

const STORE: Record<string, KPIDashboard> = {
  "proy-001": buildKPIs(),
  "proy-002": buildKPIs(),
  "proy-003": buildKPIs(),
  "proy-004": buildKPIs(),
};

export const mockGetKPIDashboard = async (projectId: string): Promise<KPIDashboard> => {
  await delay();
  if (!STORE[projectId]) STORE[projectId] = buildKPIs();
  return structuredClone(STORE[projectId]!);
};

export const mockGuardarKPIDashboard = async (
  projectId: string,
  next: KPIDashboard
): Promise<KPIDashboard> => {
  await delay(320);
  STORE[projectId] = { ...next, updated_at: new Date().toISOString() };
  return structuredClone(STORE[projectId]!);
};

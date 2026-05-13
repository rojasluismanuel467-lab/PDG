import type {
  ImplementationRoadmap,
  Initiative,
  Milestone,
  Phase,
} from "@/lib/types/roadmap.types";

const delay = (ms = 450) => new Promise((res) => setTimeout(res, ms));

const buildId = (prefix: string) =>
  `${prefix}-${Math.random().toString(16).slice(2, 10)}`;

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

const calcMonths = (startISO: string, endISO: string) => {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1;
  return Math.max(1, months);
};

const buildMockRoadmap = (): ImplementationRoadmap => {
  const streams = [
    { key: "foundations", name: "Fundaciones", color: "#111827", order: 1 },
    { key: "models", name: "Modelos", color: "#2563eb", order: 2 },
    { key: "integration", name: "Integración", color: "#0ea5e9", order: 3 },
    { key: "platform", name: "Plataforma", color: "#14b8a6", order: 4 },
    { key: "operating_model", name: "Modelo Operativo", color: "#f59e0b", order: 5 },
  ];

  const initiatives1: Initiative[] = [
    {
      id: buildId("ini"),
      code: "INI-01",
      project_ref: "PRY-02",
      name: "Estandarizar convenciones de modelado y naming",
      description:
        "Definir y socializar estándares mínimos para modelos conceptuales/lógicos y artefactos asociados. Incluye checklist de revisión.",
      start_date: "2026-05-01",
      end_date: "2026-06-30",
      team: ["Arquitecto de Datos", "Data Steward", "Líder TI"],
      budget: 18000,
      dependency_ids: [],
      quick_wins: ["Checklist de revisión", "Convenciones de naming publicadas"],
      stream: "foundations",
      status: "IN_PROGRESS",
      priority: "HIGH",
      owner: "Consultor Gerente",
      traceability: {
        artifacts: [
          { id: "art-asis-conceptual", name: "Diagrama Conceptual AS-IS", stage: "AS_IS" },
          { id: "art-asis-dfd", name: "DFD AS-IS", stage: "AS_IS" },
        ],
        maturity: [{ domain: "Arquitectura de Datos" }],
      },
    },
    {
      id: buildId("ini"),
      code: "INI-02",
      project_ref: "PRY-02",
      name: "Definir dominios de datos y ownership",
      description:
        "Mapear dominios prioritarios y establecer dueños y responsables. Alinear con RACI y ciclo de vida de datos.",
      start_date: "2026-06-01",
      end_date: "2026-07-31",
      team: ["Arquitecto de Datos", "Negocio", "Data Owner"],
      budget: 24000,
      dependency_ids: [],
      quick_wins: ["RACI validada", "Dueños por dominio asignados"],
      stream: "operating_model",
      status: "PLANNED",
      priority: "HIGH",
      owner: "Arquitecto de Datos",
      traceability: {
        artifacts: [{ id: "art-asis-raci", name: "Matriz RACI / Roles", stage: "AS_IS" }],
        maturity: [{ domain: "Gobernanza de Datos", subdomain: "Roles y Responsabilidades" }],
      },
    },
  ];

  const initiatives2: Initiative[] = [
    {
      id: buildId("ini"),
      code: "INI-03",
      project_ref: "PRY-05",
      name: "Modelo lógico TO-BE para entidades críticas",
      description:
        "Construir y validar el modelo lógico (tablas, columnas, FKs, índices) para las entidades críticas del dominio seleccionado.",
      start_date: "2026-08-01",
      end_date: "2026-10-15",
      team: ["Arquitecto de Datos", "DBA", "Desarrollo"],
      budget: 42000,
      dependency_ids: [initiatives1[0]!.id],
      quick_wins: ["Tablas críticas definidas", "FKs e índices validados"],
      stream: "models",
      status: "PLANNED",
      priority: "CRITICAL",
      owner: "Arquitecto de Datos",
      traceability: {
        artifacts: [
          { id: "art-tobe-logical", name: "Modelo Lógico de Datos TO-BE", stage: "TO_BE" },
          { id: "art-tobe-conceptual", name: "Diagrama Conceptual TO-BE", stage: "TO_BE" },
        ],
        gaps: [{ id: "gap-01", title: "Inconsistencia de definiciones en entidades maestras", severity: "Alta" }],
      },
    },
    {
      id: buildId("ini"),
      code: "INI-04",
      project_ref: "PRY-05",
      name: "Estandarizar flujos e integración (DFD + patrones)",
      description:
        "Definir patrones de integración (batch/API/eventos) y documentar flujos críticos. Alinear DFD TO-BE y dependencias.",
      start_date: "2026-09-01",
      end_date: "2026-11-30",
      team: ["Arquitecto de Datos", "Arquitecto de Integración", "Seguridad"],
      budget: 38000,
      dependency_ids: [initiatives1[0]!.id],
      quick_wins: ["Patrones definidos", "Flujos críticos documentados"],
      stream: "integration",
      status: "PLANNED",
      priority: "HIGH",
      owner: "Arquitecto de Integración",
      traceability: {
        artifacts: [{ id: "art-tobe-dfd", name: "DFD TO-BE", stage: "TO_BE" }],
        gaps: [{ id: "gap-02", title: "Integraciones manuales y no documentadas", severity: "Alta" }],
      },
    },
  ];

  const phase1: Phase = {
    id: buildId("phase"),
    name: "Etapa 1: Fundaciones (Año 1)",
    description:
      "Bases institucionales y de arquitectura para ejecutar el programa de transformación de arquitectura de datos.",
    start_date: "2026-05-01",
    end_date: "2026-07-31",
    enabled_stream_keys: streams.map((s) => s.key),
    initiatives: initiatives1,
    budget_total: sum(initiatives1.map((i) => i.budget)),
  };

  const phase2: Phase = {
    id: buildId("phase"),
    name: "Etapa 2: Consolidación (Años 2-3)",
    description:
      "Consolidación de modelos objetivo e integración; despliegue de capacidades técnicas y operativas del dominio.",
    start_date: "2026-08-01",
    end_date: "2026-11-30",
    enabled_stream_keys: streams.map((s) => s.key),
    initiatives: initiatives2,
    budget_total: sum(initiatives2.map((i) => i.budget)),
  };

  const milestones: Milestone[] = [
    {
      id: buildId("ms"),
      name: "Estándares base aprobados",
      date: "2026-06-30",
      description: "Checklist mínimo y convenciones de modelado habilitadas.",
      initiative_ids: [initiatives1[0]!.id],
    },
    {
      id: buildId("ms"),
      name: "Ownership por dominio definido",
      date: "2026-07-31",
      description: "Roles y responsabilidades confirmadas con negocio y TI.",
      initiative_ids: [initiatives1[1]!.id],
    },
    {
      id: buildId("ms"),
      name: "Modelo lógico crítico validado",
      date: "2026-10-15",
      description: "Tablas, FKs e índices revisados y aprobados por el equipo.",
      initiative_ids: [initiatives2[0]!.id],
    },
  ];

  const budget_total = phase1.budget_total + phase2.budget_total;
  const duration_total_months = calcMonths(phase1.start_date, phase2.end_date);

  return {
    streams,
    phases: [phase1, phase2],
    duration_total_months,
    budget_total,
    milestones,
    updated_at: new Date().toISOString(),
  };
};

const STORE: Record<string, ImplementationRoadmap> = {
  "proy-001": buildMockRoadmap(),
  "proy-002": buildMockRoadmap(),
  "proy-003": buildMockRoadmap(),
  "proy-004": buildMockRoadmap(),
};

export const mockGetRoadmapImplementation = async (
  projectId: string
): Promise<ImplementationRoadmap> => {
  await delay();
  if (!STORE[projectId]) {
    STORE[projectId] = buildMockRoadmap();
  }
  return structuredClone(STORE[projectId]!);
};

export const mockGuardarRoadmapImplementation = async (
  projectId: string,
  next: ImplementationRoadmap
): Promise<ImplementationRoadmap> => {
  await delay(350);
  STORE[projectId] = { ...next, updated_at: new Date().toISOString() };
  return structuredClone(STORE[projectId]!);
};


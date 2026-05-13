import type { ArchitectureStandards, Standard } from "@/lib/types/roadmap.types";

const delay = (ms = 420) => new Promise((res) => setTimeout(res, ms));

const buildId = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 10)}`;

const buildStandards = (): ArchitectureStandards => {
  const standards: Standard[] = [
    {
      id: buildId("std"),
      name: "Convención de nombres para entidades y atributos",
      description:
        "Definir nombres consistentes, sin abreviaturas ambiguas, y en singular para entidades. Atributos en snake_case y en español.",
      category: "Nomenclatura",
      recommendation:
        "Aplicar naming estándar en Conceptual/Logical/DFD. Registrar excepciones con justificación.",
      mandatory: true,
      status: "ACTIVE",
      applies_to: ["CONCEPTUAL_MODEL", "LOGICAL_MODEL", "NAMING"],
      effective_from: "2026-06-01",
      traceability: {
        artifacts: [
          { id: "art-asis-conceptual", name: "Diagrama Conceptual AS-IS", stage: "AS_IS" },
          { id: "art-tobe-logical", name: "Modelo Lógico de Datos TO-BE", stage: "TO_BE" },
        ],
      },
    },
    {
      id: buildId("std"),
      name: "Tipos de datos y longitudes por defecto",
      description:
        "Establecer catálogo de tipos de datos permitidos y convenciones de longitud para strings, fechas y UUIDs.",
      category: "TiposDeDatos",
      recommendation:
        "Priorizar UUID para identificadores globales y TIMESTAMP WITH TIME ZONE para auditoría.",
      mandatory: true,
      status: "ACTIVE",
      applies_to: ["LOGICAL_MODEL", "GENERAL"],
      effective_from: "2026-06-15",
      traceability: {
        artifacts: [{ id: "art-tobe-logical", name: "Modelo Lógico de Datos TO-BE", stage: "TO_BE" }],
      },
    },
    {
      id: buildId("std"),
      name: "Seguridad: clasificación y controles mínimos",
      description:
        "Clasificar datos (público/interno/restringido) y aplicar controles mínimos por clasificación.",
      category: "Seguridad",
      recommendation:
        "Alinear controles con RBAC y evidencias. Definir campos sensibles y enmascaramiento donde aplique.",
      mandatory: true,
      status: "DRAFT",
      applies_to: ["SECURITY", "INTEGRATION", "GENERAL"],
      effective_from: "2026-07-01",
    },
    {
      id: buildId("std"),
      name: "Documentación y versionado de artefactos",
      description:
        "Cada cambio relevante debe registrar un resumen de cambio y conservar historial de versiones para auditoría.",
      category: "Documentacion",
      recommendation:
        "No sobrescribir sin versión; usar un ciclo de revisión antes de aprobación final del consultor.",
      mandatory: true,
      status: "ACTIVE",
      applies_to: ["CONCEPTUAL_MODEL", "LOGICAL_MODEL", "DFD", "GENERAL"],
      effective_from: "2026-05-15",
    },
    {
      id: buildId("std"),
      name: "Performance: índices mínimos para entidades críticas",
      description:
        "Definir criterios para índices (PK, FKs, campos de búsqueda frecuentes) y evitar sobre-indexación.",
      category: "Performance",
      recommendation:
        "Crear índices solo con evidencia de consultas; documentar impacto en almacenamiento y mantenimiento.",
      mandatory: false,
      status: "ACTIVE",
      applies_to: ["LOGICAL_MODEL"],
      effective_from: "2026-08-01",
    },
    {
      id: buildId("std"),
      name: "Compliance: retención y auditoría",
      description:
        "Establecer lineamientos de retención de datos y auditoría de cambios para entidades reguladas.",
      category: "Compliance",
      recommendation:
        "Asegurar campos de auditoría (created_at, updated_at, updated_by) y políticas de retención por dominio.",
      mandatory: true,
      status: "DRAFT",
      applies_to: ["LOGICAL_MODEL", "GENERAL"],
      effective_from: "2026-09-01",
    },
  ];

  return {
    standards,
    version: "1.0",
    effective_date: "2026-06-01",
    updated_at: new Date().toISOString(),
  };
};

const STORE: Record<string, ArchitectureStandards> = {
  "proy-001": buildStandards(),
  "proy-002": buildStandards(),
  "proy-003": buildStandards(),
  "proy-004": buildStandards(),
};

export const mockGetArchitectureStandards = async (
  projectId: string
): Promise<ArchitectureStandards> => {
  await delay();
  if (!STORE[projectId]) STORE[projectId] = buildStandards();
  return structuredClone(STORE[projectId]!);
};

export const mockGuardarArchitectureStandards = async (
  projectId: string,
  next: ArchitectureStandards
): Promise<ArchitectureStandards> => {
  await delay(320);
  STORE[projectId] = { ...next, updated_at: new Date().toISOString() };
  return structuredClone(STORE[projectId]!);
};

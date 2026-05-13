export type RoadmapStreamKey = string;

export type RoadmapStreamDefinition = {
  key: RoadmapStreamKey;
  name: string;
  color?: string; // HEX or css color, optional for mock UI accents
  order: number;
  status?: RoadmapStatus;
  priority?: RoadmapPriority;
};

export type RoadmapStatus = string;

export type RoadmapPriority = string;

export type Milestone = {
  id: string;
  name: string;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  description?: string;
  initiative_ids?: string[];
};

export type Initiative = {
  id: string;
  code?: string; // e.g. INI-01
  project_ref?: string; // e.g. PRY-02
  name: string;
  description: string;
  start_date: string | null; // ISO 8601 date (YYYY-MM-DD)
  end_date: string | null; // ISO 8601 date (YYYY-MM-DD)
  team: string[];
  budget: number; // currency assumed USD for mock
  dependency_ids: string[];
  quick_wins?: string[];
  stream: RoadmapStreamKey;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  owner: string;
  // Traceability placeholders (mock-ready, backend-owned later)
  traceability?: {
    artifacts?: Array<{
      id: string;
      name: string;
      stage: "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP";
    }>;
    gaps?: Array<{ id: string; title: string; severity: "Alta" | "Media" | "Baja" }>;
    maturity?: Array<{ domain: string; subdomain?: string }>;
  };
};

export type Phase = {
  id: string;
  name: string;
  description: string;
  start_date: string; // ISO 8601 date (YYYY-MM-DD)
  end_date: string; // ISO 8601 date (YYYY-MM-DD)
  status?: RoadmapStatus;
  priority?: RoadmapPriority;
  enabled_stream_keys?: RoadmapStreamKey[]; // when omitted, all streams are considered enabled
  initiatives: Initiative[];
  budget_total: number;
};

export type ImplementationRoadmap = {
  streams: RoadmapStreamDefinition[];
  phases: Phase[];
  duration_total_months: number;
  budget_total: number;
  milestones: Milestone[];
  updated_at: string;
};

export type StandardCategory =
  | "Nomenclatura"
  | "Seguridad"
  | "Performance"
  | "Documentacion"
  | "TiposDeDatos"
  | "Compliance";

export type StandardStatus = "DRAFT" | "ACTIVE" | "DEPRECATED";

export type Standard = {
  id: string;
  name: string;
  description: string;
  category: StandardCategory;
  recommendation: string;
  mandatory: boolean;
  status: StandardStatus;
  applies_to: Array<
    | "CONCEPTUAL_MODEL"
    | "LOGICAL_MODEL"
    | "DFD"
    | "INTEGRATION"
    | "NAMING"
    | "SECURITY"
    | "GENERAL"
  >;
  effective_from: string; // ISO date
  traceability?: {
    initiatives?: Array<{ id: string; name: string }>;
    artifacts?: Array<{
      id: string;
      name: string;
      stage: "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP";
    }>;
  };
};

export type ArchitectureStandards = {
  standards: Standard[];
  version: string;
  effective_date: string; // ISO date
  updated_at: string;
};

export type KPITrend = "Mejorando" | "Estable" | "Empeorando";

export type KPI = {
  id: string;
  name: string;
  description: string;
  unit: string;
  current_value: number;
  target_value: number;
  trend: KPITrend;
  history: Array<{ period: string; value: number }>; // period e.g. 2026-Q1
  owner: string;
  frequency: "Mensual" | "Trimestral" | "Semestral";
  traceability?: {
    initiatives?: Array<{ id: string; name: string }>;
    standards?: Array<{ id: string; name: string }>;
  };
};

export type KPIDashboard = {
  kpis: KPI[];
  updated_at: string;
  report_period: string;
};

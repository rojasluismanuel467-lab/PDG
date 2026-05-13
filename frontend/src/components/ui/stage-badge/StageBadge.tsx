import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StageColor =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "gray";

export interface StageDefinition {
  /** Display label — falls back to the stage key if omitted */
  label?: string;
  color: StageColor;
}

export type StageConfig = Record<string, StageDefinition>;

// ─── Built-in presets ─────────────────────────────────────────────────────────

/** DAMA-DMBOK / general maturity model */
export const MATURITY_STAGES: StageConfig = {
  initial:       { label: "Initial",      color: "gray"    },
  emerging:      { label: "Emerging",     color: "primary" },
  defined:       { label: "Defined",      color: "info"    },
  managed:       { label: "Managed",      color: "warning" },
  optimized:     { label: "Optimized",    color: "success" },
  "not-started": { label: "Not started",  color: "gray"    },
};

/** Generic project / ticket workflow */
export const PROJECT_STAGES: StageConfig = {
  backlog:       { label: "Backlog",      color: "gray"    },
  todo:          { label: "To do",        color: "primary" },
  "in-progress": { label: "In progress",  color: "warning" },
  review:        { label: "In review",    color: "info"    },
  done:          { label: "Done",         color: "success" },
  blocked:       { label: "Blocked",      color: "error"   },
};

/** Generic health / risk indicator */
export const HEALTH_STAGES: StageConfig = {
  healthy:    { label: "Healthy",    color: "success" },
  degraded:   { label: "Degraded",   color: "warning" },
  critical:   { label: "Critical",   color: "error"   },
  unknown:    { label: "Unknown",    color: "gray"    },
};

/**
 * TOGAF Architecture Development Method (ADM) phases.
 * Use to track where a capability or initiative sits in the ADM cycle.
 */
export const TOGAF_ADM_STAGES: StageConfig = {
  preliminary:           { label: "Preliminary",            color: "gray"    },
  vision:                { label: "A · Vision",             color: "primary" },
  business:              { label: "B · Business",           color: "info"    },
  "information-systems": { label: "C · Info Systems",       color: "info"    },
  technology:            { label: "D · Technology",         color: "primary" },
  opportunities:         { label: "E · Opportunities",      color: "warning" },
  migration:             { label: "F · Migration",          color: "warning" },
  governance:            { label: "G · Governance",         color: "success" },
  "change-management":   { label: "H · Change Mgmt",       color: "success" },
};

/**
 * Enterprise Architecture capability maturity.
 * More granular than MATURITY_STAGES — designed for EA capability assessments.
 */
export const EA_CAPABILITY_STAGES: StageConfig = {
  "not-assessed": { label: "Not assessed", color: "gray"    },
  "ad-hoc":       { label: "Ad hoc",       color: "gray"    },
  developing:     { label: "Developing",   color: "primary" },
  established:    { label: "Established",  color: "info"    },
  advanced:       { label: "Advanced",     color: "warning" },
  optimized:      { label: "Optimized",    color: "success" },
};

/**
 * EA governance & compliance status.
 * Use on architecture artifacts, principles, or decisions.
 */
export const EA_GOVERNANCE_STAGES: StageConfig = {
  compliant:             { label: "Compliant",           color: "success" },
  "partially-compliant": { label: "Partial",             color: "warning" },
  "non-compliant":       { label: "Non-compliant",       color: "error"   },
  "under-review":        { label: "Under review",        color: "info"    },
  "not-applicable":      { label: "N/A",                 color: "gray"    },
  retired:               { label: "Retired",             color: "gray"    },
};

/**
 * Architecture layer / domain tags (BDAT model).
 * Useful as classification labels on any artifact or capability card.
 */
export const EA_DOMAIN_STAGES: StageConfig = {
  business:    { label: "Business",    color: "warning" },
  application: { label: "Application", color: "info"    },
  data:        { label: "Data",        color: "primary" },
  technology:  { label: "Technology",  color: "success" },
  security:    { label: "Security",    color: "error"   },
  integration: { label: "Integration", color: "gray"    },
};

// ─── Color maps ───────────────────────────────────────────────────────────────

const colorClasses: Record<StageColor, string> = {
  primary: "bg-brand-50  text-brand-600  dark:bg-[#28b8d5]/15  dark:text-[#28b8d5]",
  success: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-orange-400",
  error:   "bg-error-50  text-error-700  dark:bg-error-500/15  dark:text-error-400",
  info:    "bg-blue-light-50 text-blue-light-600 dark:bg-[#28b8d5]/10 dark:text-[#28b8d5]/75",
  gray:    "bg-gray-100  text-gray-600   dark:bg-white/[0.06]  dark:text-white/40",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-theme-xs",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface StageBadgeProps {
  /** Stage key (e.g. "emerging", "in-progress", "healthy") */
  stage: string;
  /**
   * Stage configuration map. Pass one of the built-in presets or your own.
   * Defaults to MATURITY_STAGES.
   */
  config?: StageConfig;
  size?: "sm" | "md";
  className?: string;
}

const StageBadge: React.FC<StageBadgeProps> = ({
  stage,
  config = MATURITY_STAGES,
  size = "md",
  className = "",
}) => {
  const definition = config[stage] ?? { label: stage, color: "gray" as StageColor };
  const label = definition.label ?? stage;
  const colorClass = colorClasses[definition.color];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium ${sizeClasses[size]} ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
};

export default StageBadge;

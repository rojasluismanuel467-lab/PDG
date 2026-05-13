import React from "react";
import type { Metadata } from "next";
import ComponentCard from "@/components/common/ComponentCard";
import {
  StageBadge,
  MATURITY_STAGES,
  PROJECT_STAGES,
  HEALTH_STAGES,
} from "@/components/ui/stage-badge";
import type { StageConfig } from "@/components/ui/stage-badge";

export const metadata: Metadata = {
  title: "Stage Badge — UI Elements",
};

const SPRINT_STAGES: StageConfig = {
  planning:   { label: "Planning",   color: "gray"    },
  active:     { label: "Active",     color: "primary" },
  review:     { label: "Review",     color: "info"    },
  completed:  { label: "Completed",  color: "success" },
  cancelled:  { label: "Cancelled",  color: "error"   },
};

export default function StageBadgePage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Stage Badge</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configurable badge for categorical stages. Ships with built-in presets — or pass your own config.
        </p>
      </div>

      {/* Maturity preset */}
      <ComponentCard title="Maturity stages" desc="MATURITY_STAGES preset — DAMA-DMBOK / governance models.">
        <div className="flex flex-wrap gap-2">
          {Object.keys(MATURITY_STAGES).map((stage) => (
            <StageBadge key={stage} stage={stage} config={MATURITY_STAGES} />
          ))}
        </div>
      </ComponentCard>

      {/* Project preset */}
      <ComponentCard title="Project / ticket stages" desc="PROJECT_STAGES preset — kanban, issue trackers.">
        <div className="flex flex-wrap gap-2">
          {Object.keys(PROJECT_STAGES).map((stage) => (
            <StageBadge key={stage} stage={stage} config={PROJECT_STAGES} />
          ))}
        </div>
      </ComponentCard>

      {/* Health preset */}
      <ComponentCard title="Health / risk stages" desc="HEALTH_STAGES preset — services, infrastructure, APIs.">
        <div className="flex flex-wrap gap-2">
          {Object.keys(HEALTH_STAGES).map((stage) => (
            <StageBadge key={stage} stage={stage} config={HEALTH_STAGES} />
          ))}
        </div>
      </ComponentCard>

      {/* Custom config */}
      <ComponentCard title="Custom config" desc="Pass any StageConfig object to define your own stages and colors.">
        <div className="flex flex-wrap gap-2">
          {Object.keys(SPRINT_STAGES).map((stage) => (
            <StageBadge key={stage} stage={stage} config={SPRINT_STAGES} />
          ))}
        </div>
      </ComponentCard>

      {/* Sizes */}
      <ComponentCard title="Sizes">
        <div className="flex flex-wrap items-center gap-3">
          <StageBadge stage="emerging" config={MATURITY_STAGES} size="sm" />
          <StageBadge stage="emerging" config={MATURITY_STAGES} size="md" />
        </div>
      </ComponentCard>

      {/* Unknown stage fallback */}
      <ComponentCard title="Unknown stage fallback" desc="Unrecognised stage keys render as gray with the raw key as label.">
        <div className="flex flex-wrap gap-2">
          <StageBadge stage="pending-review" config={PROJECT_STAGES} />
          <StageBadge stage="unknown" />
        </div>
      </ComponentCard>
    </div>
  );
}

import React from "react";
import type { Metadata } from "next";
import ComponentCard from "@/components/common/ComponentCard";
import { ScoreBar } from "@/components/ui/score-bar";
import type { ScoreBarColor } from "@/components/ui/score-bar";

export const metadata: Metadata = {
  title: "Score Bar — UI Elements",
};

function thresholdColor(ratio: number): ScoreBarColor {
  if (ratio < 0.4) return "error";
  if (ratio < 0.7) return "warning";
  return "success";
}

export default function ScoreBarPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Score Bar</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Progress bar with a numeric value label. Supports fixed colors and threshold-based coloring.
        </p>
      </div>

      {/* Colors */}
      <ComponentCard title="Colors" desc="Use the color prop to apply a fixed semantic color.">
        <div className="space-y-4">
          <ScoreBar value={72} label="Brand (default)" color="brand" />
          <ScoreBar value={88} label="Success" color="success" />
          <ScoreBar value={53} label="Warning" color="warning" />
          <ScoreBar value={24} label="Error" color="error" />
          <ScoreBar value={40} label="Gray" color="gray" />
        </div>
      </ComponentCard>

      {/* Threshold coloring */}
      <ComponentCard
        title="Threshold coloring"
        desc="Pass a colorFn to derive the color from the fill ratio (0–1)."
      >
        <div className="space-y-4">
          <ScoreBar value={18} max={100} label="Critical" colorFn={thresholdColor} />
          <ScoreBar value={55} max={100} label="Needs attention" colorFn={thresholdColor} />
          <ScoreBar value={91} max={100} label="Healthy" colorFn={thresholdColor} />
        </div>
      </ComponentCard>

      {/* Custom max */}
      <ComponentCard title="Custom max" desc="Useful for rating scales like 1–5 or 1–10.">
        <div className="space-y-4">
          <ScoreBar value={2.4} max={5} label="Maturity Score" />
          <ScoreBar value={3.2} max={5} label="Data Architecture" color="success" />
          <ScoreBar value={7.8} max={10} label="NPS Score" color="brand" decimals={1} />
        </div>
      </ComponentCard>

      {/* Sizes */}
      <ComponentCard title="Sizes">
        <div className="space-y-4">
          <ScoreBar value={65} label="md (default)" size="md" />
          <ScoreBar value={65} label="sm" size="sm" />
        </div>
      </ComponentCard>

      {/* No label / no value */}
      <ComponentCard title="Without label or value" desc="Set showValue=false for minimal layouts.">
        <div className="space-y-3">
          <ScoreBar value={40} showValue={false} color="error" />
          <ScoreBar value={65} showValue={false} color="warning" />
          <ScoreBar value={90} showValue={false} color="success" />
        </div>
      </ComponentCard>
    </div>
  );
}

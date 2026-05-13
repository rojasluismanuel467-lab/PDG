import React from "react";
import type { Metadata } from "next";
import ComponentCard from "@/components/common/ComponentCard";
import { ProgressTrack } from "@/components/ui/progress-track";

export const metadata: Metadata = {
  title: "Progress Track — UI Elements",
};

const MATURITY_STEPS = ["Initial", "Emerging", "Defined", "Managed", "Optimized"];
const ONBOARDING_STEPS = ["Account", "Profile", "Plan", "Confirm"];
const QUARTER_STEPS = ["Q1", "Q2", "Q3", "Q4"];
const PIPELINE_STEPS = ["Build", "Test", "Staging", "Review", "Deploy"];

export default function ProgressTrackPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Progress Track</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Horizontal step indicator. Works for maturity models, wizards, pipelines, or any ordered sequence.
        </p>
      </div>

      {/* Different positions */}
      <ComponentCard title="Step positions" desc="currentStep is 0-based — steps before it are marked as completed.">
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">Step 0 — not started</p>
            <ProgressTrack steps={MATURITY_STEPS} currentStep={0} />
          </div>
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">Step 1 — Emerging</p>
            <ProgressTrack steps={MATURITY_STEPS} currentStep={1} />
          </div>
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">Step 3 — Managed</p>
            <ProgressTrack steps={MATURITY_STEPS} currentStep={3} />
          </div>
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">Step 4 — Optimized (complete)</p>
            <ProgressTrack steps={MATURITY_STEPS} currentStep={4} />
          </div>
        </div>
      </ComponentCard>

      {/* Different contexts */}
      <ComponentCard title="Different contexts" desc="The same component adapts to any step sequence.">
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">Onboarding wizard</p>
            <ProgressTrack steps={ONBOARDING_STEPS} currentStep={2} />
          </div>
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">Quarterly roadmap</p>
            <ProgressTrack steps={QUARTER_STEPS} currentStep={1} />
          </div>
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">CI/CD pipeline</p>
            <ProgressTrack steps={PIPELINE_STEPS} currentStep={3} />
          </div>
        </div>
      </ComponentCard>

      {/* Sizes */}
      <ComponentCard title="Sizes">
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">md (default)</p>
            <ProgressTrack steps={MATURITY_STEPS} currentStep={2} size="md" />
          </div>
          <div>
            <p className="mb-3 text-theme-xs text-gray-400 dark:text-gray-500">sm</p>
            <ProgressTrack steps={MATURITY_STEPS} currentStep={2} size="sm" />
          </div>
        </div>
      </ComponentCard>

      {/* Without labels */}
      <ComponentCard title="Without labels" desc="Set showLabels=false for compact or inline use.">
        <div className="space-y-4">
          <ProgressTrack steps={MATURITY_STEPS} currentStep={1} showLabels={false} />
          <ProgressTrack steps={PIPELINE_STEPS} currentStep={3} showLabels={false} size="sm" />
        </div>
      </ComponentCard>

      {/* Inside a card — realistic use */}
      <ComponentCard title="Realistic use — inside a summary card">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <p className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Overall Maturity Level
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white/90">
            Emerging — Level 2 / 5
          </p>
          <div className="mt-4">
            <ProgressTrack steps={MATURITY_STEPS} currentStep={1} />
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}

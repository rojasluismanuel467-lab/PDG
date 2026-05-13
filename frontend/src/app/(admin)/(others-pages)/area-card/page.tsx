import React from "react";
import type { Metadata } from "next";
import ComponentCard from "@/components/common/ComponentCard";
import { AreaCard } from "@/components/ui/area-card";
import { ScoreBar } from "@/components/ui/score-bar";
import {
  StageBadge,
  MATURITY_STAGES,
  HEALTH_STAGES,
  EA_CAPABILITY_STAGES,
  EA_GOVERNANCE_STAGES,
  EA_DOMAIN_STAGES,
  TOGAF_ADM_STAGES,
} from "@/components/ui/stage-badge";
import type { ScoreBarColor } from "@/components/ui/score-bar";
import { ClickableDemo } from "./AreaCardDemos";

export const metadata: Metadata = {
  title: "Area Card — UI Elements",
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ShieldIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l7 4v5c0 5-3.5 9.5-7 11C5.5 20.5 2 16 2 11V6l10-4z" />
  </svg>
);
const DatabaseIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path strokeLinecap="round" d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
    <path strokeLinecap="round" d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" />
  </svg>
);
const ApiIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3m8-6l3 3-3 3M14 6l-4 12" />
  </svg>
);
const UserGroupIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const BuildingIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10" />
  </svg>
);
const CpuIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
  </svg>
);
const MapIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);
const LayersIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);
const ClipboardIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(ratio: number): ScoreBarColor {
  if (ratio < 0.4) return "error";
  if (ratio < 0.7) return "warning";
  return "success";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AreaCardPage() {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Area Card</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Composable card with icon, badge, metric, alert, and footer slots.
          Works for any domain — data governance, enterprise architecture, DevOps, and more.
        </p>
      </div>

      {/* ── Anatomy ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Anatomy
        </h2>

        <ComponentCard title="Slots" desc="All slots are optional — compose only what you need.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AreaCard title="Title only" />
            <AreaCard title="+ Description" description="Supporting detail below title" />
            <AreaCard
              title="+ Icon"
              description="Domain icon on the left"
              icon={<LayersIcon />}
            />
            <AreaCard
              title="+ Badge"
              icon={<LayersIcon />}
              badge={<StageBadge stage="established" config={EA_CAPABILITY_STAGES} />}
            />
          </div>
        </ComponentCard>

        <ComponentCard title="Alert state" desc="Highlights cards that need attention with a colored left border.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AreaCard
              title="Normal"
              icon={<ShieldIcon />}
              badge={<StageBadge stage="compliant" config={EA_GOVERNANCE_STAGES} />}
              metric={<ScoreBar value={4.1} max={5} label="Score" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Alert"
              icon={<ShieldIcon />}
              badge={<StageBadge stage="partially-compliant" config={EA_GOVERNANCE_STAGES} />}
              metric={<ScoreBar value={2.4} max={5} label="Score" colorFn={scoreColor} />}
              alert
            />
            <AreaCard
              title="Alert + custom icon"
              icon={<ShieldIcon />}
              badge={<StageBadge stage="non-compliant" config={EA_GOVERNANCE_STAGES} />}
              metric={<ScoreBar value={0.9} max={5} label="Score" colorFn={scoreColor} />}
              alert
              alertIcon={
                <span className="text-[10px] font-semibold text-error-600 dark:text-error-400">
                  ACTION REQUIRED
                </span>
              }
            />
          </div>
        </ComponentCard>

        <ComponentCard title="Clickable" desc="Pass onClick for navigation — adds hover styles and a chevron. Requires a Client Component parent.">
          <ClickableDemo />
        </ComponentCard>
      </section>

      {/* ── Data Governance ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Data Governance (DAMA-DMBOK)
        </h2>

        <ComponentCard title="Knowledge area assessment">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AreaCard
              title="Data Governance"
              icon={<ClipboardIcon />}
              badge={<StageBadge stage="emerging" config={MATURITY_STAGES} />}
              metric={<ScoreBar value={2.4} max={5} label="Maturity Score" colorFn={scoreColor} />}
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">11 controls evaluated</span>}
            />
            <AreaCard
              title="Data Architecture"
              icon={<LayersIcon />}
              badge={<StageBadge stage="defined" config={MATURITY_STAGES} />}
              metric={<ScoreBar value={3.2} max={5} label="Maturity Score" colorFn={scoreColor} />}
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">8 controls evaluated</span>}
            />
            <AreaCard
              title="Data Security"
              icon={<ShieldIcon />}
              badge={<StageBadge stage="emerging" config={MATURITY_STAGES} />}
              metric={<ScoreBar value={1.8} max={5} label="Maturity Score" colorFn={scoreColor} />}
              alert
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">Score below 2.0 threshold</span>}
            />
            <AreaCard
              title="Data Storage & Ops"
              icon={<DatabaseIcon />}
              badge={<StageBadge stage="optimized" config={MATURITY_STAGES} />}
              metric={<ScoreBar value={4.3} max={5} label="Maturity Score" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Data Integration"
              icon={<ApiIcon />}
              badge={<StageBadge stage="not-started" config={MATURITY_STAGES} />}
              metric={<ScoreBar value={0.8} max={5} label="Maturity Score" colorFn={scoreColor} />}
              alert
            />
            <AreaCard
              title="Data Quality"
              icon={<ClipboardIcon />}
              badge={<StageBadge stage="emerging" config={MATURITY_STAGES} />}
              metric={<ScoreBar value={2.1} max={5} label="Maturity Score" colorFn={scoreColor} />}
            />
          </div>
        </ComponentCard>
      </section>

      {/* ── Enterprise Architecture / TOGAF ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Enterprise Architecture (TOGAF)
        </h2>

        <ComponentCard
          title="Architecture domains — BDAT"
          desc="Business, Data, Application, Technology layers with EA_DOMAIN_STAGES as classification tags."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AreaCard
              title="Business Architecture"
              description="Capabilities & value streams"
              icon={<BuildingIcon />}
              badge={<StageBadge stage="business" config={EA_DOMAIN_STAGES} />}
              metric={<ScoreBar value={3.8} max={5} label="Maturity" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Application Architecture"
              description="Application portfolio & integrations"
              icon={<ApiIcon />}
              badge={<StageBadge stage="application" config={EA_DOMAIN_STAGES} />}
              metric={<ScoreBar value={2.9} max={5} label="Maturity" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Data Architecture"
              description="Data assets & information flows"
              icon={<DatabaseIcon />}
              badge={<StageBadge stage="data" config={EA_DOMAIN_STAGES} />}
              metric={<ScoreBar value={3.2} max={5} label="Maturity" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Technology Architecture"
              description="Infrastructure & platforms"
              icon={<CpuIcon />}
              badge={<StageBadge stage="technology" config={EA_DOMAIN_STAGES} />}
              metric={<ScoreBar value={4.1} max={5} label="Maturity" colorFn={scoreColor} />}
            />
          </div>
        </ComponentCard>

        <ComponentCard
          title="EA Capability assessment"
          desc="EA_CAPABILITY_STAGES — finer granularity than DAMA maturity for EA-specific capabilities."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AreaCard
              title="Architecture Governance"
              icon={<ClipboardIcon />}
              badge={<StageBadge stage="established" config={EA_CAPABILITY_STAGES} />}
              metric={<ScoreBar value={68} label="Adoption" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Architecture Repository"
              icon={<DatabaseIcon />}
              badge={<StageBadge stage="developing" config={EA_CAPABILITY_STAGES} />}
              metric={<ScoreBar value={41} label="Adoption" colorFn={scoreColor} />}
              alert
            />
            <AreaCard
              title="Roadmap Management"
              icon={<MapIcon />}
              badge={<StageBadge stage="advanced" config={EA_CAPABILITY_STAGES} />}
              metric={<ScoreBar value={82} label="Adoption" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Principles & Standards"
              icon={<LayersIcon />}
              badge={<StageBadge stage="optimized" config={EA_CAPABILITY_STAGES} />}
              metric={<ScoreBar value={94} label="Adoption" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Stakeholder Engagement"
              icon={<UserGroupIcon />}
              badge={<StageBadge stage="ad-hoc" config={EA_CAPABILITY_STAGES} />}
              metric={<ScoreBar value={22} label="Adoption" colorFn={scoreColor} />}
              alert
            />
            <AreaCard
              title="Security Architecture"
              icon={<ShieldIcon />}
              badge={<StageBadge stage="not-assessed" config={EA_CAPABILITY_STAGES} />}
              metric={<ScoreBar value={0} label="Adoption" color="gray" showValue={false} />}
            />
          </div>
        </ComponentCard>

        <ComponentCard
          title="ADM phase tracking"
          desc="TOGAF_ADM_STAGES — locate artifacts or initiatives within the ADM cycle."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AreaCard
              title="Current State Assessment"
              icon={<ClipboardIcon />}
              badge={<StageBadge stage="business" config={TOGAF_ADM_STAGES} />}
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">Owner: EA Team</span>}
            />
            <AreaCard
              title="Target Architecture"
              icon={<MapIcon />}
              badge={<StageBadge stage="technology" config={TOGAF_ADM_STAGES} />}
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">Owner: CTO Office</span>}
            />
            <AreaCard
              title="Migration Roadmap"
              icon={<LayersIcon />}
              badge={<StageBadge stage="migration" config={TOGAF_ADM_STAGES} />}
              metric={<ScoreBar value={35} label="Progress" color="brand" />}
            />
            <AreaCard
              title="Architecture Compliance"
              icon={<ShieldIcon />}
              badge={<StageBadge stage="governance" config={TOGAF_ADM_STAGES} />}
              metric={<ScoreBar value={78} label="Compliant" colorFn={scoreColor} />}
            />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Governance & compliance status"
          desc="EA_GOVERNANCE_STAGES — track compliance of architecture principles, decisions, or standards."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AreaCard
              title="Cloud Strategy Principle"
              icon={<CpuIcon />}
              badge={<StageBadge stage="compliant" config={EA_GOVERNANCE_STAGES} />}
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">Reviewed Feb 2026</span>}
            />
            <AreaCard
              title="API-First Mandate"
              icon={<ApiIcon />}
              badge={<StageBadge stage="partially-compliant" config={EA_GOVERNANCE_STAGES} />}
              alert
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">3 legacy systems excluded</span>}
            />
            <AreaCard
              title="On-Prem Database Standard"
              icon={<DatabaseIcon />}
              badge={<StageBadge stage="retired" config={EA_GOVERNANCE_STAGES} />}
              footer={<span className="text-theme-xs text-gray-400 dark:text-gray-500">Superseded by cloud policy</span>}
            />
            <AreaCard
              title="Zero-Trust Security"
              icon={<ShieldIcon />}
              badge={<StageBadge stage="under-review" config={EA_GOVERNANCE_STAGES} />}
              metric={<ScoreBar value={55} label="Implementation" colorFn={scoreColor} />}
            />
            <AreaCard
              title="Monolith Decomposition"
              icon={<LayersIcon />}
              badge={<StageBadge stage="non-compliant" config={EA_GOVERNANCE_STAGES} />}
              metric={<ScoreBar value={12} label="Progress" colorFn={scoreColor} />}
              alert
            />
            <AreaCard
              title="Partner Integration SLA"
              icon={<UserGroupIcon />}
              badge={<StageBadge stage="not-applicable" config={EA_GOVERNANCE_STAGES} />}
            />
          </div>
        </ComponentCard>
      </section>

      {/* ── Footer slot ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Footer slot
        </h2>
        <ComponentCard title="Footer examples" desc="Render metadata, timestamps, owners, or secondary actions.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AreaCard
              title="User Onboarding Flow"
              icon={<UserGroupIcon />}
              badge={<StageBadge stage="developing" config={EA_CAPABILITY_STAGES} />}
              metric={<ScoreBar value={76} label="Completion rate" colorFn={scoreColor} />}
              footer={
                <div className="flex gap-2 text-theme-xs text-gray-400 dark:text-gray-500">
                  <span>1 240 users</span><span>·</span><span>Updated 2h ago</span>
                </div>
              }
            />
            <AreaCard
              title="EA Architecture Board"
              icon={<BuildingIcon />}
              badge={<StageBadge stage="governance" config={TOGAF_ADM_STAGES} />}
              metric={<ScoreBar value={90} label="Decisions logged" colorFn={scoreColor} />}
              footer={
                <div className="flex gap-2 text-theme-xs text-gray-400 dark:text-gray-500">
                  <span>47 decisions</span><span>·</span><span>Next review Mar 5</span>
                </div>
              }
            />
          </div>
        </ComponentCard>
      </section>
    </div>
  );
}

"use client";

import React from "react";
import { AreaCard } from "@/components/ui/area-card";
import { ScoreBar } from "@/components/ui/score-bar";
import { StageBadge, MATURITY_STAGES, PROJECT_STAGES, HEALTH_STAGES } from "@/components/ui/stage-badge";
import type { ScoreBarColor } from "@/components/ui/score-bar";

const ApiIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-3 3 3 3m8-6l3 3-3 3M14 6l-4 12" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path strokeLinecap="round" d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
    <path strokeLinecap="round" d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" />
  </svg>
);

const UserGroupIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

function scoreColor(ratio: number): ScoreBarColor {
  if (ratio < 0.4) return "error";
  if (ratio < 0.7) return "warning";
  return "success";
}

/** Clickable cards — needs "use client" because onClick crosses the RSC boundary */
export function ClickableDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AreaCard
        title="Reference & Master Data"
        icon={<UserGroupIcon />}
        badge={<StageBadge stage="in-progress" config={PROJECT_STAGES} />}
        metric={<ScoreBar value={2.8} max={5} label="Maturity Score" colorFn={scoreColor} />}
        onClick={() => alert("Navigate to Reference & Master Data")}
      />
      <AreaCard
        title="Data Warehousing"
        icon={<DatabaseIcon />}
        badge={<StageBadge stage="defined" config={MATURITY_STAGES} />}
        metric={<ScoreBar value={3.5} max={5} label="Maturity Score" colorFn={scoreColor} />}
        onClick={() => alert("Navigate to Data Warehousing")}
      />
      <AreaCard
        title="Data Integration"
        icon={<ApiIcon />}
        badge={<StageBadge stage="not-started" config={MATURITY_STAGES} />}
        alert
        metric={<ScoreBar value={0.8} max={5} label="Maturity Score" colorFn={scoreColor} />}
        onClick={() => alert("Navigate to Data Integration")}
      />
    </div>
  );
}

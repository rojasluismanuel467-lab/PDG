"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type {
  Initiative,
  Phase,
  RoadmapPriority,
  RoadmapStatus,
  RoadmapStreamKey,
} from "@/lib/types/roadmap.types";

export type PhaseGroupNodeData = {
  phase: Phase;
  streams: Array<{ key: RoadmapStreamKey; label: string }>;
  laneLayout?: Array<{ key: RoadmapStreamKey; label: string; top: number; height: number }>;
  streamColor?: Record<string, string>;
  laneHeight: number;
  headerHeight: number;
  onAddInitiative?: (phaseId: string) => void;
  onAddStream?: (phaseId: string) => void;
  onSelectPhase?: (phaseId: string) => void;
  onEditStream?: (streamKey: string) => void;
  selected?: boolean;
  readOnly: boolean;
};

export type InitiativeNodeData = {
  initiative: Initiative;
  streamLabel: string;
  statusLabel: string;
  priorityLabel: string;
  onSelect: (id: string) => void;
  selected: boolean;
  streamColor?: string;
  compact?: boolean;
};

const STATUS_BADGE: Record<RoadmapStatus, string> = {
  PLANNED: "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  DONE: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  BLOCKED: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

const PRIORITY_BADGE: Record<RoadmapPriority, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70",
  MEDIUM: "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70",
  HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300",
};

export function PhaseGroupNode({ data }: NodeProps) {
  const d = data as PhaseGroupNodeData;
  const phaseNumberMatch = d.phase.name.match(/(\d+)/);
  const phaseNumber = phaseNumberMatch?.[1];
  const layout = React.useMemo(() => {
    // Keep lane visuals aligned with the actual initiative node positions (computed in canvas).
    if (d.laneLayout?.length) return d.laneLayout;
    return d.streams.map((s, idx) => ({
      key: s.key,
      label: s.label,
      top: idx * d.laneHeight,
      height: d.laneHeight,
    }));
  }, [d.laneHeight, d.laneLayout, d.streams]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      d.onSelectPhase?.(d.phase.id);
    }
  };
  return (
    <div
      className={`group relative w-full h-full rounded-2xl border bg-white dark:bg-[#0f0f0f] overflow-hidden shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${
        d.selected
          ? "border-[#28b8d5] shadow-[0_0_0_3px_rgba(40,184,213,0.18)]"
          : "border-gray-200 dark:border-white/[0.10]"
      }`}
      onClick={() => d.onSelectPhase?.(d.phase.id)}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden handles so we can draw phase-to-phase arrows for clarity */}
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !opacity-0 !border-0" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !opacity-0 !border-0" />

      <div className="absolute -top-3 left-3 hidden group-hover:block pointer-events-none z-20">
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur px-3 py-2 shadow-xl">
          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[260px]">
            {d.phase.name}
          </div>
          <div className="text-[11px] text-gray-600 dark:text-white/60">
            {d.phase.start_date} {"->"} {d.phase.end_date}
          </div>
        </div>
      </div>
      <div
        className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] flex items-start justify-between gap-2 cursor-pointer"
        style={{ height: d.headerHeight }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border border-gray-200 dark:border-white/[0.10] bg-white/80 dark:bg-white/[0.04] text-gray-700 dark:text-white/70">
              Etapa {phaseNumber ?? ""}
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {d.phase.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-white/40 truncate whitespace-nowrap">
            {d.phase.start_date} - {d.phase.end_date}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => d.onAddStream?.(d.phase.id)}
            disabled={d.readOnly}
            onMouseDown={(e) => e.stopPropagation()}
            onClickCapture={(e) => e.stopPropagation()}
            className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70 text-xs hover:bg-gray-200 dark:hover:bg-white/[0.10] disabled:opacity-50 whitespace-nowrap"
            title="Agregar stream a esta fase"
          >
            + Stream
          </button>
          <button
            onClick={() => d.onAddInitiative?.(d.phase.id)}
            disabled={d.readOnly}
            onMouseDown={(e) => e.stopPropagation()}
            onClickCapture={(e) => e.stopPropagation()}
            className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70 text-xs hover:bg-gray-200 dark:hover:bg-white/[0.10] disabled:opacity-50 whitespace-nowrap"
            title="Agregar iniciativa"
          >
            + Iniciativa
          </button>
        </div>
      </div>

      <div className="relative w-full" style={{ height: `calc(100% - ${d.headerHeight}px)` }}>
        {layout.map((lane) => {
          const color = d.streamColor?.[lane.key];
          return (
            <div key={lane.key}>
              <div
                className="absolute left-0 right-0 border-t border-gray-200/70 dark:border-white/[0.06]"
                style={{ top: `${lane.top}px` }}
              />
              <div
                className="absolute left-0 right-0"
                style={{ top: `${lane.top}px`, height: lane.height }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.28) 100%)",
                    boxShadow: "inset 0 -1px 0 rgba(148,163,184,0.28), inset 0 1px 0 rgba(255,255,255,0.72)",
                  }}
                />
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: color ?? "transparent", opacity: color ? 0.7 : 0 }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    d.onEditStream?.(lane.key);
                  }}
                  disabled={!d.onEditStream}
                  className="absolute left-2 top-2 text-[10px] font-medium px-2 py-0.5 rounded-full border shadow-[0_4px_12px_rgba(15,23,42,0.18)] hover:shadow-[0_8px_18px_rgba(15,23,42,0.22)] transition-shadow"
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    borderColor: color ? `${color}55` : "rgba(229,231,235,0.8)",
                    color: "#111827",
                  }}
                  title="Editar stream"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-flex h-2 w-2 rounded-full"
                      style={{ background: color ?? "#94a3b8" }}
                    />
                    {lane.label}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InitiativeNode({ data }: NodeProps) {
  const d = data as InitiativeNodeData;
  const ini = d.initiative;
  const compact = !!d.compact;

  if (compact) {
    return (
      <div
        onClick={() => d.onSelect(ini.id)}
        className={`group relative w-[238px] px-2.5 py-2 rounded-xl border bg-white dark:bg-[#0f0f0f] cursor-pointer transition-shadow ${
          d.selected
            ? "border-[#28b8d5] shadow-[0_0_0_3px_rgba(40,184,213,0.18)]"
            : "border-gray-200 dark:border-white/[0.10] shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:shadow-[0_12px_26px_rgba(15,23,42,0.2)]"
        }`}
        title={`${ini.name} (${ini.start_date ?? "-"} - ${ini.end_date ?? "-"})`}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
          style={{ background: d.streamColor ?? "transparent", opacity: d.streamColor ? 0.85 : 0 }}
        />
        <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#94a3b8] !border-0" />
        <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#94a3b8] !border-0" />
        <div className="text-[12px] font-semibold text-gray-900 dark:text-white truncate">{ini.name}</div>
      </div>
    );
  }

  return (
    <div
      onClick={() => d.onSelect(ini.id)}
      className={`group relative w-[268px] px-3 py-2 rounded-xl border bg-white dark:bg-[#0f0f0f] cursor-pointer transition-shadow ${
        d.selected
          ? "border-[#28b8d5] shadow-[0_0_0_3px_rgba(40,184,213,0.18)]"
          : "border-gray-200 dark:border-white/[0.10] shadow-[0_10px_22px_rgba(15,23,42,0.16)] hover:shadow-[0_14px_32px_rgba(15,23,42,0.22)]"
      }`}
      title={ini.description}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: d.streamColor ?? "transparent", opacity: d.streamColor ? 0.85 : 0 }}
      />
      <div className="absolute -top-3 left-2 hidden group-hover:block pointer-events-none z-20">
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur px-3 py-2 shadow-xl max-w-[300px]">
          <div className="text-xs font-mono text-gray-500 dark:text-white/40 truncate">
            {ini.code ?? ini.id}
          </div>
          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {ini.name}
          </div>
          <div className="text-[11px] text-gray-600 dark:text-white/60 truncate">
            {ini.start_date ?? "-"} {"->"} {ini.end_date ?? "-"} {" - "} {ini.owner}
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#94a3b8] !border-0" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#94a3b8] !border-0" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {ini.code ? (
              <span className="text-[11px] font-semibold text-gray-700 dark:text-white/70 font-mono">
                {ini.code}
              </span>
            ) : null}
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {ini.name}
            </div>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-white/40 truncate">
            {d.streamLabel} {" - "} {ini.owner}
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap leading-none ${
            STATUS_BADGE[ini.status] ??
            "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70"
          }`}
        >
          {d.statusLabel}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {ini.project_ref ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70 font-mono">
              {ini.project_ref}
            </span>
          ) : null}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              PRIORITY_BADGE[ini.priority] ??
              "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70"
            }`}
          >
            {d.priorityLabel}
          </span>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-white/40 whitespace-nowrap">
          {ini.start_date ?? "-"} - {ini.end_date ?? "-"}
        </span>
      </div>
    </div>
  );
}

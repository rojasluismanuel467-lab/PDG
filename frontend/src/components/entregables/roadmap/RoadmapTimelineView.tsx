/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  ImplementationRoadmap,
  Initiative,
  Phase,
  RoadmapStreamDefinition,
  RoadmapStreamKey,
} from "@/lib/types/roadmap.types";
import { Pencil, Layers, GripVertical, ArrowLeftRight } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";

type RoadmapTimelineViewProps = {
  roadmap: ImplementationRoadmap;
  selectedInitiativeId: string | null;
  onSelectInitiative: (id: string) => void;
  selectedPhaseId: string | null;
  onSelectPhase: (id: string) => void;
  onClearSelection: () => void;
  onEditStream?: (key: RoadmapStreamKey) => void;
  columnWidth?: number;
  rowPitch?: number;
  timeScale?: "day" | "month" | "quarter" | "year";
  readOnly?: boolean;
  onReorderPhase?: (phaseId: string, newIndex: number) => void;
  onReorderStream?: (streamKey: RoadmapStreamKey, newIndex: number) => void;
  onMoveInitiative?: (
    fromPhaseId: string,
    initiativeId: string,
    targetPhaseId: string,
    targetStreamKey: RoadmapStreamKey,
    newIndexWithinStream: number
  ) => void;
  onUpdateInitiativeDates?: (phaseId: string, initiativeId: string, startISO: string, endISO: string) => void;
};

type Span = { label: string; count: number };

const toMonthKey = (isoDate: string) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
};

const toDayKey = (isoDate: string) => {
  // Expect YYYY-MM-DD
  return isoDate.slice(0, 10);
};

const toYearKey = (isoDate: string) => String(new Date(`${isoDate}T00:00:00Z`).getUTCFullYear());

const toQuarterKey = (isoDate: string) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const q = Math.floor((m - 1) / 3) + 1;
  return `${y}-Q${q}`;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map((x) => Number(x));
  const date = new Date(Date.UTC(y!, (m! - 1), 1));
  return date.toLocaleString("es-CO", { month: "short", year: "2-digit" });
};

const yearLabel = (key: string) => key;

const quarterLabel = (key: string) => {
  const [y, q] = key.split("-Q");
  return `Q${q} ${y}`;
};

const dayLabel = (key: string) => {
  // show day number; month label is in upper tier
  return key.slice(8, 10);
};

const buildMonthRange = (startISO: string, endISO: string): string[] => {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  const out: string[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cur <= endMonth) {
    out.push(`${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
};

const buildYearRange = (startISO: string, endISO: string): string[] => {
  const startY = Number(toYearKey(startISO));
  const endY = Number(toYearKey(endISO));
  const out: string[] = [];
  for (let y = startY; y <= endY; y += 1) out.push(String(y));
  return out;
};

const buildQuarterRange = (startISO: string, endISO: string): string[] => {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  const out: string[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth() + 1;
    const q = Math.floor((m - 1) / 3) + 1;
    const key = `${y}-Q${q}`;
    if (!out.includes(key)) out.push(key);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
};

const buildDayRange = (startISO: string, endISO: string): string[] => {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  const out: string[] = [];
  const cur = new Date(start.getTime());
  while (cur <= end) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
};

const bucketStartISO = (key: string, scale: "day" | "month" | "quarter" | "year") => {
  if (scale === "day") return key;
  if (scale === "month") return `${key}-01`;
  if (scale === "year") return `${key}-01-01`;
  // quarter
  const [y, qS] = key.split("-Q");
  const q = Number(qS ?? "1");
  const startM = (q - 1) * 3 + 1;
  return `${y}-${String(startM).padStart(2, "0")}-01`;
};

const bucketEndISO = (key: string, scale: "day" | "month" | "quarter" | "year") => {
  if (scale === "day") return key;
  if (scale === "year") return `${key}-12-31`;
  if (scale === "month") {
    const [y, m] = key.split("-").map((x) => Number(x));
    const last = new Date(Date.UTC(y!, (m ?? 1), 0));
    const dd = String(last.getUTCDate()).padStart(2, "0");
    return `${y}-${String(m).padStart(2, "0")}-${dd}`;
  }
  // quarter
  const [y, qS] = key.split("-Q");
  const q = Number(qS ?? "1");
  const endM = (q - 1) * 3 + 3;
  const last = new Date(Date.UTC(Number(y), endM, 0));
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${y}-${String(endM).padStart(2, "0")}-${dd}`;
};

const bucketKeyForDate = (iso: string, scale: "day" | "month" | "quarter" | "year") => {
  if (scale === "day") return toDayKey(iso);
  if (scale === "month") return toMonthKey(iso);
  if (scale === "quarter") return toQuarterKey(iso);
  return toYearKey(iso);
};

const buildYearSpans = (months: string[]): Span[] => {
  const spans: Span[] = [];
  let curLabel = "";
  let curCount = 0;
  months.forEach((k) => {
    const y = k.split("-")[0] ?? "";
    if (y !== curLabel) {
      if (curCount) spans.push({ label: `Año ${curLabel}`, count: curCount });
      curLabel = y;
      curCount = 1;
    } else {
      curCount += 1;
    }
  });
  if (curCount) spans.push({ label: `Año ${curLabel}`, count: curCount });
  return spans;
};

const buildMonthSpansFromDays = (days: string[]): Span[] => {
  const spans: Span[] = [];
  let cur = "";
  let cnt = 0;
  days.forEach((k) => {
    const mKey = k.slice(0, 7); // YYYY-MM
    if (mKey !== cur) {
      if (cnt) spans.push({ label: monthLabel(cur), count: cnt });
      cur = mKey;
      cnt = 1;
    } else cnt += 1;
  });
  if (cnt) spans.push({ label: monthLabel(cur), count: cnt });
  return spans;
};

const phaseIndexLabel = (idx: number) => `Etapa ${idx + 1}`;

const statusPillClass = (status: string) => {
  switch (status) {
    case "PLANNED":
      return "bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white/80";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-900 dark:bg-blue-500/15 dark:text-blue-200";
    case "DONE":
      return "bg-green-100 text-green-900 dark:bg-green-500/15 dark:text-green-200";
    case "BLOCKED":
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200";
    case "CANCELLED":
      return "bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white/80";
  }
};

const safeHex = (color?: string) => {
  if (!color) return null;
  // allow hex and css colors; just keep short guard to avoid injecting arbitrary strings into style.
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  return null;
};

const phaseEnabledStreams = (phase: Phase, streams: RoadmapStreamDefinition[]) => {
  const enabled = phase.enabled_stream_keys?.length ? new Set(phase.enabled_stream_keys) : null;
  return streams.filter((s) => (enabled ? enabled.has(s.key) : true));
};

const groupByStream = (initiatives: Initiative[]) => {
  const map = new Map<string, Initiative[]>();
  initiatives.forEach((i) => {
    const k = i.stream ?? "unknown";
    const cur = map.get(k) ?? [];
    cur.push(i);
    map.set(k, cur);
  });
  // Keep existing order from `phase.initiatives` so "reorder" is respected.
  return map;
};

const PHASE_ACCENTS = [
  "#0ea5e9", // sky
  "#22c55e", // green
  "#f97316", // orange
  "#a855f7", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#eab308", // yellow
  "#6366f1", // indigo
] as const;

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => `${c}${c}`).join("") : h;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(40,184,213,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
};

const DND_TYPES = {
  PHASE: "roadmap.phase",
  STREAM: "roadmap.stream",
  INITIATIVE: "roadmap.initiative",
} as const;

function InitiativeBar({
  initiative,
  idx,
  phaseId,
  streamKey,
  left,
  width,
  top,
  selected,
  readOnly,
  onSelectInitiative,
  colW,
  startIdx,
  endIdx,
  minIdx,
  maxIdx,
  onUpdateDates,
  buckets,
  scale,
}: {
  initiative: Initiative;
  idx: number;
  phaseId: string;
  streamKey: RoadmapStreamKey;
  left: number;
  width: number;
  top: number;
  selected: boolean;
  readOnly: boolean;
  onSelectInitiative: (id: string) => void;
  colW: number;
  startIdx: number;
  endIdx: number;
  minIdx: number;
  maxIdx: number;
  onUpdateDates?: (phaseId: string, initiativeId: string, startISO: string, endISO: string) => void;
  buckets: string[];
  scale: "day" | "month" | "quarter" | "year";
}) {
  const [{ isDraggingIni }, dragIniRef] = useDrag(
    () => ({
      type: DND_TYPES.INITIATIVE,
      item: {
        initiativeId: initiative.id,
        fromPhaseId: phaseId,
        fromStreamKey: streamKey,
        fromIndex: idx,
      },
      canDrag: !readOnly,
      collect: (m) => ({ isDraggingIni: m.isDragging() }),
    }),
    [readOnly, initiative.id, idx, phaseId, streamKey]
  );

  const [dragMode, setDragMode] = useState<null | "move" | "start" | "end">(null);
  const dragStart = useRef<{ x: number; s: number; e: number } | null>(null);

  const applyDrag = (clientX: number) => {
    if (!dragMode) return;
    if (!dragStart.current) return;
    if (!onUpdateDates) return;

    const dx = clientX - dragStart.current.x;
    const delta = Math.round(dx / colW);
    const s0 = dragStart.current.s;
    const e0 = dragStart.current.e;

    let s = s0;
    let e = e0;
    if (dragMode === "start") s = s0 + delta;
    if (dragMode === "end") e = e0 + delta;
    if (dragMode === "move") {
      s = s0 + delta;
      e = e0 + delta;
    }

    s = Math.max(minIdx, Math.min(s, maxIdx));
    e = Math.max(minIdx, Math.min(e, maxIdx));
    if (s > e) {
      if (dragMode === "start") s = e;
      else e = s;
    }

    const startKey = buckets[s] ?? buckets[minIdx] ?? "2026-01";
    const endKey = buckets[e] ?? buckets[maxIdx] ?? "2026-12";
    onUpdateDates(phaseId, initiative.id, bucketStartISO(startKey, scale), bucketEndISO(endKey, scale));
  };

  const onPointerDown = (mode: "move" | "start" | "end") => (ev: React.PointerEvent) => {
    if (readOnly) return;
    if (!onUpdateDates) return;
    ev.stopPropagation();
    ev.preventDefault();
    setDragMode(mode);
    dragStart.current = { x: ev.clientX, s: startIdx, e: endIdx };
  };

  const endDrag = () => {
    setDragMode(null);
    dragStart.current = null;
  };

  useEffect(() => {
    if (!dragMode) return;

    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => applyDrag(ev.clientX);
    const onUp = () => endDrag();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // Intentionally omit applyDrag from deps: it reads latest refs/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragMode]);

  const compact = width < 220;

  return (
    <div
      className={[
        "absolute rounded-2xl border transition-shadow group",
        selected ? "border-[#28b8d5] shadow-[0_0_0_3px_rgba(40,184,213,0.18)]" : "border-gray-200 dark:border-white/[0.10] hover:shadow-md",
        statusPillClass(initiative.status),
        isDraggingIni ? "opacity-70" : "",
      ].join(" ")}
      style={{ left, width, top }}
      title={initiative.description}
    >
      {/* resize handles */}
      {!readOnly ? (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity"
            title="Ajustar fecha inicio"
            onPointerDown={onPointerDown("start")}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-2xl opacity-0 group-hover:opacity-100 transition-opacity"
            title="Ajustar fecha fin"
            onPointerDown={onPointerDown("end")}
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={() => onSelectInitiative(initiative.id)}
        className={[
          "w-full h-full text-left rounded-2xl",
          compact ? "px-2 py-1.5" : "px-3 py-2",
          "focus:outline-none",
        ].join(" ")}
        // Dragging the card moves the whole time range (start+end).
        onPointerDown={(e) => {
          // Don't hijack drag when user starts on the vertical grip.
          const target = e.target as HTMLElement | null;
          if (target?.closest?.("[data-dnd-grip='true']")) return;
          onPointerDown("move")(e);
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {!readOnly ? (
                <span
                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white/60 dark:bg-black/10"
                  title="Arrastra para reordenar o mover a otro stream"
                  ref={dragIniRef as any}
                  data-dnd-grip="true"
                >
                  <GripVertical size={14} className="text-gray-700 dark:text-white/70" />
                </span>
              ) : null}
              <div className="text-xs font-mono font-semibold truncate">
                {initiative.code ?? initiative.id}
              </div>
              {initiative.project_ref ? (
                <span className="text-[10px] font-mono opacity-80">{initiative.project_ref}</span>
              ) : null}
            </div>
            <div className={compact ? "text-xs font-semibold truncate" : "text-sm font-semibold truncate"}>
              {initiative.name}
            </div>
          </div>
          {!compact ? (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-mono opacity-75">
                {initiative.start_date ?? "?"} {"->"} {initiative.end_date ?? "?"}
              </span>
              {!readOnly ? (
                <div
                  role="button"
                  tabIndex={0}
                  className="inline-flex items-center gap-1 text-[10px] font-mono opacity-80 hover:opacity-100 select-none"
                  title="Arrastra para mover el rango completo"
                  onPointerDown={onPointerDown("move")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      // no-op: we only support pointer drag; keep element keyboard-focusable for a11y
                      e.preventDefault();
                    }
                  }}
                >
                  <ArrowLeftRight size={12} /> Ajustar
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>

      {isDraggingIni ? <span className="absolute inset-0 rounded-2xl bg-white/20 dark:bg-black/20" /> : null}
    </div>
  );
}

function StreamLaneRow({
  stream,
  initiatives,
  buckets,
  scale,
  minISO,
  maxISO,
  colW,
  rowPitch,
  selectedInitiativeId,
  onSelectInitiative,
  onEditStream,
  readOnly,
  phaseId,
  streamIndex,
  onReorderStream,
  onMoveInitiative,
  phaseStartKey,
  phaseEndKey,
  onUpdateDates,
}: {
  stream: RoadmapStreamDefinition;
  initiatives: Initiative[];
  buckets: string[];
  scale: "day" | "month" | "quarter" | "year";
  minISO: string;
  maxISO: string;
  colW: number;
  rowPitch: number;
  selectedInitiativeId: string | null;
  onSelectInitiative: (id: string) => void;
  onEditStream?: (key: RoadmapStreamKey) => void;
  readOnly: boolean;
  phaseId: string;
  streamIndex: number;
  onReorderStream?: (streamKey: RoadmapStreamKey, newIndex: number) => void;
  onMoveInitiative?: (
    fromPhaseId: string,
    initiativeId: string,
    targetPhaseId: string,
    targetStreamKey: RoadmapStreamKey,
    newIndexWithinStream: number
  ) => void;
  phaseStartKey: string;
  phaseEndKey: string;
  onUpdateDates?: (phaseId: string, initiativeId: string, startISO: string, endISO: string) => void;
}) {
  const accent = safeHex(stream.color) ?? "#28b8d5";
  const compactBars = rowPitch < 52;
  const barMin = compactBars ? 44 : 56;
  const slotH = Math.max(rowPitch, barMin + 10);
  const height = Math.max(66, initiatives.length * slotH + 18);

  const [{ isDraggingStream }, dragStreamRef] = useDrag(
    () => ({
      type: DND_TYPES.STREAM,
      item: { streamKey: stream.key, fromIndex: streamIndex },
      canDrag: !readOnly,
      collect: (m) => ({ isDraggingStream: m.isDragging() }),
    }),
    [readOnly, stream.key, streamIndex]
  );

  const [, dropStreamRef] = useDrop(
    () => ({
      accept: DND_TYPES.STREAM,
      canDrop: () => !readOnly && !!onReorderStream,
      hover: (item: any) => {
        if (!onReorderStream) return;
        if (item.streamKey === stream.key) return;
        onReorderStream(item.streamKey, streamIndex);
      },
    }),
    [readOnly, onReorderStream, streamIndex, stream.key]
  );

  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const [, dropInitiativeRef] = useDrop(
    () => ({
      accept: DND_TYPES.INITIATIVE,
      canDrop: () => !readOnly && !!onMoveInitiative,
      drop: (item: any, monitor) => {
        if (!onMoveInitiative) return;
        if (!gridRef.current) return;
        if (!item?.initiativeId || !item?.fromPhaseId) return;
        const client = monitor.getClientOffset();
        if (!client) return;
        const rect = gridRef.current.getBoundingClientRect();
        const y = client.y - rect.top - 12; // padding
        const idx = Math.max(0, Math.min(initiatives.length, Math.floor(y / slotH)));
        onMoveInitiative(item.fromPhaseId, item.initiativeId, phaseId, stream.key, idx);
      },
    }),
    [readOnly, onMoveInitiative, initiatives.length, phaseId, slotH, stream.key]
  );

  const streamHeaderRef = (el: HTMLDivElement | null) => {
    dragStreamRef(el);
    dropStreamRef(el);
  };

  return (
    <div className="flex border-t border-gray-200/60 dark:border-white/[0.06]">
      <div className="w-[260px] px-4 py-4 border-r border-gray-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.02]">
        <div
          className={[
            "flex items-start justify-between gap-3 rounded-2xl p-2 -m-2",
            isDraggingStream ? "opacity-60" : "",
          ].join(" ")}
        >
          {!readOnly ? (
            <div
              ref={streamHeaderRef}
              className="h-9 w-9 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0"
              title="Arrastra para reordenar streams"
            >
              <GripVertical size={16} className="text-gray-700 dark:text-white/70" />
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => onEditStream?.(stream.key)}
            className="text-left group"
            title="Editar stream"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
              <div className="text-sm font-semibold text-gray-900 dark:text-white group-hover:underline">
                {stream.name}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-white/40 mt-1">
              {initiatives.length} iniciativa(s)
            </div>
          </button>

          {onEditStream ? (
            <button
              type="button"
              onClick={() => onEditStream(stream.key)}
              className="h-9 w-9 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] flex items-center justify-center"
              title="Editar stream"
            >
              <Pencil size={16} className="text-gray-600 dark:text-white/70" />
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={(el) => {
          gridRef.current = el;
          dropInitiativeRef(el);
        }}
        className="flex-1 relative"
        style={{ height }}
      >
        <div className="absolute inset-0 flex pointer-events-none">
          {buckets.map((k) => (
            <div
              key={`${stream.key}-${k}-grid`}
              className="border-r border-gray-200/40 dark:border-white/[0.05] box-border"
              style={{ width: colW }}
            />
          ))}
        </div>

        <div className="absolute inset-0 pt-3 pb-3">
          {initiatives.map((i, idx) => {
            const s = i.start_date ?? minISO;
            const e = i.end_date ?? maxISO;
            const startKey = bucketKeyForDate(s, scale);
            const endKey = bucketKeyForDate(e, scale);
            // Clamp interactions to the global visible range, not the phase range.
            // The phase range can still be edited/expanded separately and is recomputed from initiatives.
            const phaseMinIdx = 0;
            const phaseMaxIdx = Math.max(0, buckets.length - 1);
            const startIdx = Math.max(phaseMinIdx, buckets.indexOf(startKey));
            const endIdx = Math.max(startIdx, buckets.indexOf(endKey));
            const left = startIdx * colW + 6;
            const width = (endIdx - startIdx + 1) * colW - 12;
            const top = idx * slotH;
            const selected = i.id === selectedInitiativeId;

            return (
              <InitiativeBar
                key={i.id}
                initiative={i}
                idx={idx}
                phaseId={phaseId}
                streamKey={stream.key}
                left={left}
                width={width}
                top={top}
                selected={selected}
                readOnly={readOnly}
                onSelectInitiative={onSelectInitiative}
                colW={colW}
                startIdx={startIdx}
                endIdx={endIdx}
                minIdx={phaseMinIdx}
                maxIdx={phaseMaxIdx}
                onUpdateDates={onUpdateDates}
                buckets={buckets}
                scale={scale}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PhaseSection({
  phase,
  phaseIdx,
  streams,
  buckets,
  scale,
  minISO,
  maxISO,
  colW,
  rowPitch,
  selectedPhaseId,
  selectedInitiativeId,
  onSelectPhase,
  onSelectInitiative,
  onEditStream,
  readOnly,
  onReorderPhase,
  onReorderStream,
  onMoveInitiative,
  onUpdateInitiativeDates,
}: {
  phase: Phase;
  phaseIdx: number;
  streams: RoadmapStreamDefinition[];
  buckets: string[];
  scale: "day" | "month" | "quarter" | "year";
  minISO: string;
  maxISO: string;
  colW: number;
  rowPitch: number;
  selectedPhaseId: string | null;
  selectedInitiativeId: string | null;
  onSelectPhase: (id: string) => void;
  onSelectInitiative: (id: string) => void;
  onEditStream?: (key: RoadmapStreamKey) => void;
  readOnly: boolean;
  onReorderPhase?: (phaseId: string, newIndex: number) => void;
  onReorderStream?: (streamKey: RoadmapStreamKey, newIndex: number) => void;
  onMoveInitiative?: (
    fromPhaseId: string,
    initiativeId: string,
    targetPhaseId: string,
    targetStreamKey: RoadmapStreamKey,
    newIndexWithinStream: number
  ) => void;
  onUpdateInitiativeDates?: (phaseId: string, initiativeId: string, startISO: string, endISO: string) => void;
}) {
  const enabledStreams = phaseEnabledStreams(phase, streams);
  const byStream = groupByStream(phase.initiatives);
  const streamsWithWork = enabledStreams.filter((s) => (byStream.get(s.key) ?? []).length > 0);
  const phaseSelected = phase.id === selectedPhaseId;
  const total = phase.initiatives.length;
  const done = phase.initiatives.filter((i) => i.status === "DONE").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const phaseStartKey = bucketKeyForDate(phase.start_date, scale);
  const phaseEndKey = bucketKeyForDate(phase.end_date, scale);
  const phaseAccent = safeHex(PHASE_ACCENTS[phaseIdx % PHASE_ACCENTS.length]) ?? "#28b8d5";

  const [{ isDraggingPhase }, dragPhaseRef] = useDrag(
    () => ({
      type: DND_TYPES.PHASE,
      item: { phaseId: phase.id, fromIndex: phaseIdx },
      canDrag: !readOnly,
      collect: (m) => ({ isDraggingPhase: m.isDragging() }),
    }),
    [readOnly, phase.id, phaseIdx]
  );

  const [, dropPhaseRef] = useDrop(
    () => ({
      accept: DND_TYPES.PHASE,
      canDrop: () => !readOnly && !!onReorderPhase,
      hover: (item: any) => {
        if (!onReorderPhase) return;
        if (item.phaseId === phase.id) return;
        onReorderPhase(item.phaseId, phaseIdx);
      },
    }),
    [readOnly, onReorderPhase, phase.id, phaseIdx]
  );

  const phaseHandleRef = (el: HTMLButtonElement | null) => {
    dragPhaseRef(el);
    dropPhaseRef(el);
  };

  return (
    <section
      className={[
        "relative bg-gradient-to-b from-white to-gray-50/40 dark:from-[#0b0b0b] dark:to-white/[0.02]",
        phaseSelected ? "shadow-[inset_0_0_0_2px_rgba(40,184,213,0.35)]" : "",
        isDraggingPhase ? "opacity-70" : "",
      ].join(" ")}
    >
      {/* Phase band: subtle background + left accent for faster scanning */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.10]"
        style={{ backgroundColor: hexToRgba(phaseAccent, 1) }}
      />

      <div className="relative z-10 flex">
        <button
          type="button"
          onClick={() => onSelectPhase(phase.id)}
          className="w-[260px] text-left px-4 py-4 border-r border-gray-200 dark:border-white/[0.08] border-l-4 hover:bg-gray-50/70 dark:hover:bg-white/[0.03] transition-colors"
          title={!readOnly ? "Arrastra para reordenar fases" : "Seleccionar etapa"}
          ref={phaseHandleRef}
          style={{ borderLeftColor: phaseAccent }}
        >
          <div className="text-xs text-gray-500 dark:text-white/40">{phaseIndexLabel(phaseIdx)}</div>
          <div className="text-base font-semibold text-gray-900 dark:text-white">{phase.name}</div>
          <div className="text-xs text-gray-500 dark:text-white/40 mt-1">
            {phase.start_date} - {phase.end_date}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/40 mb-1">
              <span>Avance</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-[#28b8d5]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </button>

        <div className="flex-1">
          <div className="px-4 py-3 border-b border-gray-200/60 dark:border-white/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-700 dark:text-white/80">{phase.description}</div>
              <div className="text-xs text-gray-500 dark:text-white/40 font-mono">{total} iniciativas</div>
            </div>
          </div>

          {streamsWithWork.length ? (
            streamsWithWork.map((stream) => {
              const globalIndex = streams.findIndex((s) => s.key === stream.key);
              return (
                <StreamLaneRow
                  key={`${phase.id}-${stream.key}`}
                  stream={stream}
                  initiatives={byStream.get(stream.key) ?? []}
                  buckets={buckets}
                  scale={scale}
                  minISO={minISO}
                  maxISO={maxISO}
                  colW={colW}
                  rowPitch={rowPitch}
                  selectedInitiativeId={selectedInitiativeId}
                  onSelectInitiative={onSelectInitiative}
                  onEditStream={onEditStream}
                  readOnly={readOnly}
                  phaseId={phase.id}
                  streamIndex={Math.max(0, globalIndex)}
                  onReorderStream={onReorderStream}
                  onMoveInitiative={onMoveInitiative}
                  phaseStartKey={phaseStartKey}
                  phaseEndKey={phaseEndKey}
                  onUpdateDates={onUpdateInitiativeDates}
                />
              );
            })
          ) : (
            <div className="px-6 py-10 text-sm text-gray-500 dark:text-white/40">
              No hay iniciativas visibles en esta fase (según los filtros actuales).
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function RoadmapTimelineView({
  roadmap,
  selectedInitiativeId,
  onSelectInitiative,
  selectedPhaseId,
  onSelectPhase,
  onClearSelection,
  onEditStream,
  columnWidth,
  rowPitch,
  timeScale = "month",
  readOnly = false,
  onReorderPhase,
  onReorderStream,
  onMoveInitiative,
  onUpdateInitiativeDates,
}: RoadmapTimelineViewProps) {
  const streams = useMemo(
    () => (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order),
    [roadmap.streams]
  );

  const allInitiatives = useMemo(
    () => roadmap.phases.flatMap((p) => p.initiatives),
    [roadmap.phases]
  );

  const { minISO, maxISO } = useMemo(() => {
    const starts = allInitiatives.map((i) => i.start_date).filter(Boolean) as string[];
    const ends = allInitiatives.map((i) => i.end_date).filter(Boolean) as string[];
    const phaseStarts = roadmap.phases.map((p) => p.start_date).filter(Boolean);
    const phaseEnds = roadmap.phases.map((p) => p.end_date).filter(Boolean);

    const min =
      (starts.length ? starts.slice().sort()[0] : phaseStarts.slice().sort()[0]) ??
      "2026-01-01";
    const max =
      (ends.length ? ends.slice().sort().slice(-1)[0] : phaseEnds.slice().sort().slice(-1)[0]) ??
      "2026-12-31";

    // Daily scale can explode in width; if a phase is selected, zoom to that phase range.
    if (timeScale === "day" && (roadmap.phases ?? []).length) {
      const phase = selectedPhaseId ? roadmap.phases.find((p) => p.id === selectedPhaseId) : null;
      if (phase) return { minISO: phase.start_date, maxISO: phase.end_date };

      // If no phase selected, show at least the full month of the earliest start.
      const d = new Date(`${min}T00:00:00Z`);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const startMonth = `${y}-${String(m).padStart(2, "0")}-01`;
      const endMonth = bucketEndISO(`${y}-${String(m).padStart(2, "0")}`, "month");
      return { minISO: startMonth, maxISO: endMonth };
    }

    // For month/quarter/year: expand to full years so empty months still show.
    if (timeScale === "month" || timeScale === "quarter" || timeScale === "year") {
      const minY = toYearKey(min);
      const maxY = toYearKey(max);
      return { minISO: `${minY}-01-01`, maxISO: `${maxY}-12-31` };
    }
    return { minISO: min, maxISO: max };
  }, [allInitiatives, roadmap.phases, selectedPhaseId, timeScale]);

  const buckets = useMemo(() => {
    if (timeScale === "year") return buildYearRange(minISO, maxISO);
    if (timeScale === "quarter") return buildQuarterRange(minISO, maxISO);
    if (timeScale === "day") return buildDayRange(minISO, maxISO);
    return buildMonthRange(minISO, maxISO);
  }, [minISO, maxISO, timeScale]);

  const yearSpans = useMemo(() => {
    if (timeScale === "year") return buckets.map((k) => ({ label: `Año ${k}`, count: 1 }));
    if (timeScale === "quarter") {
      // group quarters by year
      const spans: Span[] = [];
      let cur = "";
      let cnt = 0;
      buckets.forEach((k) => {
        const y = k.split("-")[0] ?? "";
        if (y !== cur) {
          if (cnt) spans.push({ label: `Año ${cur}`, count: cnt });
          cur = y;
          cnt = 1;
        } else cnt += 1;
      });
      if (cnt) spans.push({ label: `Año ${cur}`, count: cnt });
      return spans;
    }
    if (timeScale === "day") {
      // group days by year
      const spans: Span[] = [];
      let cur = "";
      let cnt = 0;
      buckets.forEach((k) => {
        const y = k.slice(0, 4);
        if (y !== cur) {
          if (cnt) spans.push({ label: `Año ${cur}`, count: cnt });
          cur = y;
          cnt = 1;
        } else cnt += 1;
      });
      if (cnt) spans.push({ label: `Año ${cur}`, count: cnt });
      return spans;
    }
    return buildYearSpans(buckets);
  }, [buckets, timeScale]);

  const colWBase = timeScale === "day" ? 34 : timeScale === "year" ? 140 : columnWidth ?? 96;
  const colW = Math.max(timeScale === "day" ? 28 : 64, Math.min(220, colWBase));
  const phaseW = 260;
  const streamW = 260;
  const leftW = phaseW + streamW;
  const minWidth = leftW + buckets.length * colW;
  const pitch = Math.max(34, Math.min(70, rowPitch ?? 46));

  const milestonesByKey = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    (roadmap.milestones ?? []).forEach((m) => {
      const k = bucketKeyForDate(m.date, timeScale);
      const cur = map.get(k) ?? [];
      cur.push({ id: m.id, name: m.name });
      map.set(k, cur);
    });
    return map;
  }, [roadmap.milestones, timeScale]);

  return (
    <div className="h-full overflow-hidden rounded-3xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0b0b0b]">
      <div className="h-full overflow-auto">
        <div style={{ minWidth }}>
          {/* Time axis */}
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0b0b0b]/95 backdrop-blur border-b border-gray-200 dark:border-white/[0.08]">
            <div className="flex">
              <div className="w-[520px] flex border-r border-gray-200 dark:border-white/[0.08]">
                <div className="w-[260px] px-4 py-3 border-r border-gray-200 dark:border-white/[0.08]">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-white/40">Timeline</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        Fases → Carriles → Iniciativas
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClearSelection}
                      className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] text-sm text-gray-700 dark:text-white/80"
                      title="Limpiar selección"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
                <div className="w-[260px] px-4 py-3">
                  <div className="text-xs text-gray-500 dark:text-white/40">Stream</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Carriles</div>
                </div>
              </div>

              <div className="flex-1">
                {timeScale === "year" ? null : (
                  <div className="flex h-[34px]">
                    {yearSpans.map((s) => (
                      <div
                        key={s.label}
                        className="border-r border-gray-200/70 dark:border-white/[0.06] box-border px-3 py-2 text-xs font-semibold text-gray-700 dark:text-white/70"
                        style={{ width: s.count * colW }}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>
                )}

                {timeScale === "day" ? (
                  <div className="flex h-[34px]">
                    {buildMonthSpansFromDays(buckets).map((s) => (
                      <div
                        key={s.label}
                        className="border-r border-gray-200/70 dark:border-white/[0.06] box-border px-3 py-2 text-xs font-semibold text-gray-700 dark:text-white/70"
                        style={{ width: s.count * colW }}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex h-[44px]">
                  {buckets.map((k) => {
                    const ms = milestonesByKey.get(k) ?? [];
                    return (
                      <div
                        key={k}
                        className="border-r border-gray-200/70 dark:border-white/[0.06] box-border px-3 py-3 text-xs text-gray-500 dark:text-white/40 whitespace-nowrap relative"
                        style={{ width: colW }}
                        title={ms.length ? `Hitos: ${ms.map((x) => x.name).join(", ")}` : undefined}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {timeScale === "year"
                              ? yearLabel(k)
                              : timeScale === "quarter"
                                ? quarterLabel(k)
                                : timeScale === "day"
                                  ? dayLabel(k)
                                  : monthLabel(k)}
                          </span>
                          {ms.length ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#28b8d5]">
                              <Layers size={12} /> {ms.length}
                            </span>
                          ) : null}
                        </div>
                        {ms.length ? (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#28b8d5]" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Phases first */}
          <div className="divide-y divide-gray-200/60 dark:divide-white/[0.06]">
            {roadmap.phases.map((phase, phaseIdx) => (
              <PhaseSection
                key={phase.id}
                phase={phase}
                phaseIdx={phaseIdx}
                streams={streams}
                buckets={buckets}
                scale={timeScale}
                minISO={minISO}
                maxISO={maxISO}
                colW={colW}
                rowPitch={pitch}
                selectedPhaseId={selectedPhaseId}
                selectedInitiativeId={selectedInitiativeId}
                onSelectPhase={onSelectPhase}
                onSelectInitiative={onSelectInitiative}
                onEditStream={onEditStream}
                readOnly={readOnly}
                onReorderPhase={onReorderPhase}
                onReorderStream={onReorderStream}
                onMoveInitiative={onMoveInitiative}
                onUpdateInitiativeDates={onUpdateInitiativeDates}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

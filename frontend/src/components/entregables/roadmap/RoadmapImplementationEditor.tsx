/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ImplementationRoadmap,
  Initiative,
  Phase,
  RoadmapPriority,
  RoadmapStatus,
  RoadmapStreamDefinition,
  RoadmapStreamKey,
} from "@/lib/types/roadmap.types";
import { Modal } from "@/components/ui/modal";
import RoadmapPipelineCanvas from "./RoadmapPipelineCanvas";
import RoadmapTimelineView from "./RoadmapTimelineView";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { buildRoadmapHtmlReport, buildRoadmapTxtReport } from "@/lib/export/roadmap-report";
import Button from "@/components/ui/button/Button";
import { CalendarDays, LayoutGrid, Plus, Save, ZoomIn, ZoomOut, Rows3, GripVertical, ArrowRightLeft, ChevronDown, ChevronRight } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDrag, useDrop } from "react-dnd";

type ViewMode = "pipeline" | "timeline";
type EditorMode = "phase" | "initiative";
type CatalogType = "status" | "priority";

const ADD_NEW_STATUS_VALUE = "__ADD_NEW_STATUS__";
const ADD_NEW_PRIORITY_VALUE = "__ADD_NEW_PRIORITY__";

const DEFAULT_STATUS_OPTIONS: Array<{ value: RoadmapStatus; label: string }> = [
  { value: "PLANNED", label: "Planeado" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "DONE", label: "Completado" },
  { value: "BLOCKED", label: "Bloqueado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const DEFAULT_PRIORITY_OPTIONS: Array<{ value: RoadmapPriority; label: string }> = [
  { value: "LOW", label: "Baja" },
  { value: "MEDIUM", label: "Media" },
  { value: "HIGH", label: "Alta" },
  { value: "CRITICAL", label: "Critica" },
];

const fallbackLabel = (raw: string) =>
  raw
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeCatalogCode = (raw: string) =>
  raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

const STAGE_BADGE: Record<"AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP", string> = {
  AS_IS: "bg-gray-100 text-gray-800 dark:bg-white/[0.06] dark:text-white/70",
  TO_BE: "bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
  BRECHAS: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  ROADMAP: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
};

const SEVERITY_BADGE: Record<"Alta" | "Media" | "Baja", string> = {
  Alta: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300",
  Media: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  Baja: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

interface RoadmapImplementationEditorProps {
  roadmap: ImplementationRoadmap;
  readOnly?: boolean;
  onRoadmapChange?: (next: ImplementationRoadmap) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

export default function RoadmapImplementationEditor(_props: RoadmapImplementationEditorProps) {
  const { roadmap, readOnly = false, onRoadmapChange, onSave, isSaving = false } = _props;

  const streams = useMemo(() => (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order), [roadmap.streams]);
  const streamLabel = useMemo(() => {
    const map: Record<string, string> = {};
    streams.forEach((s) => {
      map[s.key] = s.name;
    });
    return map;
  }, [streams]);

  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [selectedStream, setSelectedStream] = useState<RoadmapStreamKey | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<RoadmapStatus | "ALL">("ALL");
  const [selectedPriority, setSelectedPriority] = useState<RoadmapPriority | "ALL">("ALL");
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const [priorityOptions, setPriorityOptions] = useState(DEFAULT_PRIORITY_OPTIONS);
  const [inlineCatalogOpen, setInlineCatalogOpen] = useState(false);
  const [inlineCatalogType, setInlineCatalogType] = useState<CatalogType>("status");
  const [inlineCatalogCode, setInlineCatalogCode] = useState("");
  const [inlineCatalogLabel, setInlineCatalogLabel] = useState("");
  const [inlineCatalogApplyTarget, setInlineCatalogApplyTarget] = useState<
    | null
    | { type: "phaseDraft" }
    | { type: "initiativeDraft" }
    | { type: "stream"; streamKey: string }
  >(null);
  const [compact, setCompact] = useState(true);
  const [timelineScale, setTimelineScale] = useState(1);
  const [timelineDensity, setTimelineDensity] = useState(1);
  const [timelineTimescale, setTimelineTimescale] = useState<"day" | "month" | "quarter" | "year">("month");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [compactStreamsTree, setCompactStreamsTree] = useState(false);
  const [compactInitiativesTree, setCompactInitiativesTree] = useState(false);
  const [collapsedStreamsTree, setCollapsedStreamsTree] = useState<Record<string, boolean>>({});
  const [phaseWarning, setPhaseWarning] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditorMode>("initiative");
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [streamsOpen, setStreamsOpen] = useState(false);
  const [focusStreamKey, setFocusStreamKey] = useState<string | null>(null);

  const allInitiatives = useMemo(
    () => roadmap.phases.flatMap((p) => p.initiatives),
    [roadmap.phases]
  );

  useEffect(() => {
    const usedStatuses = new Set<string>();
    const usedPriorities = new Set<string>();

    roadmap.phases.forEach((p) => {
      if (p.status) usedStatuses.add(p.status);
      if (p.priority) usedPriorities.add(p.priority);
      p.initiatives.forEach((i) => {
        if (i.status) usedStatuses.add(i.status);
        if (i.priority) usedPriorities.add(i.priority);
      });
    });
    (roadmap.streams ?? []).forEach((s) => {
      if (s.status) usedStatuses.add(s.status);
      if (s.priority) usedPriorities.add(s.priority);
    });

    setStatusOptions((prev) => {
      const map = new Map(prev.map((x) => [x.value, x]));
      usedStatuses.forEach((code) => {
        if (!map.has(code)) map.set(code, { value: code, label: fallbackLabel(code) });
      });
      return Array.from(map.values());
    });

    setPriorityOptions((prev) => {
      const map = new Map(prev.map((x) => [x.value, x]));
      usedPriorities.forEach((code) => {
        if (!map.has(code)) map.set(code, { value: code, label: fallbackLabel(code) });
      });
      return Array.from(map.values());
    });
  }, [roadmap.phases, roadmap.streams]);

  const statusLabelMap = useMemo(
    () => Object.fromEntries(statusOptions.map((o) => [o.value, o.label])) as Record<string, string>,
    [statusOptions]
  );

  const priorityLabelMap = useMemo(
    () => Object.fromEntries(priorityOptions.map((o) => [o.value, o.label])) as Record<string, string>,
    [priorityOptions]
  );

  useEffect(() => {
    if (selectedStatus !== "ALL" && !statusOptions.some((o) => o.value === selectedStatus)) {
      setSelectedStatus("ALL");
    }
  }, [selectedStatus, statusOptions]);

  useEffect(() => {
    if (selectedPriority !== "ALL" && !priorityOptions.some((o) => o.value === selectedPriority)) {
      setSelectedPriority("ALL");
    }
  }, [priorityOptions, selectedPriority]);

  const roadmapProjectRef = useMemo(() => {
    const refs = allInitiatives
      .map((i) => (i.project_ref ?? "").trim())
      .filter((v) => v.length > 0);
    return refs[0] ?? "PRY-01";
  }, [allInitiatives]);

  const nextInitiativeCode = useMemo(() => {
    const maxN = allInitiatives.reduce((acc, i) => {
      const m = (i.code ?? "").trim().match(/^INI-(\d+)$/i);
      if (!m) return acc;
      const n = Number(m[1]);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return `INI-${String(maxN + 1).padStart(2, "0")}`;
  }, [allInitiatives]);

  const filteredRoadmap = useMemo<ImplementationRoadmap>(() => {
    const match = (i: Initiative) => {
      if (selectedStream !== "ALL" && i.stream !== selectedStream) return false;
      if (selectedStatus !== "ALL" && i.status !== selectedStatus) return false;
      if (selectedPriority !== "ALL" && i.priority !== selectedPriority) return false;
      return true;
    };
    const phases = roadmap.phases.map((p) => ({ ...p, initiatives: p.initiatives.filter(match) }));
    return { ...roadmap, phases };
  }, [roadmap, selectedStream, selectedStatus, selectedPriority]);

  const selectedInitiative = useMemo(() => {
    if (!selectedInitiativeId) return null;
    return allInitiatives.find((i) => i.id === selectedInitiativeId) ?? null;
  }, [allInitiatives, selectedInitiativeId]);

  const selectedPhase = useMemo(() => {
    if (!selectedPhaseId) return null;
    return roadmap.phases.find((p) => p.id === selectedPhaseId) ?? null;
  }, [roadmap.phases, selectedPhaseId]);

  const selectedPhaseForCreate = useMemo(() => {
    if (selectedPhaseId) {
      return roadmap.phases.find((p) => p.id === selectedPhaseId) ?? null;
    }

    if (selectedInitiativeId) {
      return roadmap.phases.find((p) => p.initiatives.some((i) => i.id === selectedInitiativeId)) ?? null;
    }

    return roadmap.phases[0] ?? null;
  }, [roadmap.phases, selectedInitiativeId, selectedPhaseId]);

  const editingPhase = useMemo(() => {
    if (!editingPhaseId) return null;
    return roadmap.phases.find((p) => p.id === editingPhaseId) ?? null;
  }, [editingPhaseId, roadmap.phases]);

  const editingInitiative = useMemo(() => {
    if (!editingInitiativeId) return null;
    return allInitiatives.find((i) => i.id === editingInitiativeId) ?? null;
  }, [allInitiatives, editingInitiativeId]);

  const editingInitiativePhaseId = useMemo(() => {
    if (!editingInitiative) return null;
    return roadmap.phases.find((p) => p.initiatives.some((i) => i.id === editingInitiative.id))?.id ?? null;
  }, [editingInitiative, roadmap.phases]);

  const editingInitiativePhase = useMemo(() => {
    if (!editingInitiativePhaseId) return null;
    return roadmap.phases.find((p) => p.id === editingInitiativePhaseId) ?? null;
  }, [editingInitiativePhaseId, roadmap.phases]);

  const [phaseDraft, setPhaseDraft] = useState<{
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: RoadmapStatus;
    priority: RoadmapPriority;
    enabled_stream_keys: string[];
  } | null>(null);

  const [initiativeDraft, setInitiativeDraft] = useState<{
    code: string;
    project_ref: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    owner: string;
    status: RoadmapStatus;
    priority: RoadmapPriority;
    stream: string;
    budget: number;
    teamText: string;
    quickWinsText: string;
    dependencyIds: string[];
  } | null>(null);

  React.useEffect(() => {
    if (!editOpen) return;
    if (editMode === "phase") {
      if (!editingPhase) return;
      setPhaseDraft({
        name: editingPhase.name,
        description: editingPhase.description ?? "",
        start_date: editingPhase.start_date,
        end_date: editingPhase.end_date,
        status: editingPhase.status ?? "PLANNED",
        priority: editingPhase.priority ?? "MEDIUM",
        enabled_stream_keys: editingPhase.enabled_stream_keys?.length
          ? editingPhase.enabled_stream_keys.slice()
          : streams.map((s) => s.key),
      });
      setCollapsedStreamsTree({});
      return;
    }

    if (editMode === "initiative") {
      if (!editingInitiative) return;
      setInitiativeDraft({
        code: editingInitiative.code ?? nextInitiativeCode,
        project_ref: roadmapProjectRef,
        name: editingInitiative.name,
        description: editingInitiative.description ?? "",
        start_date: editingInitiative.start_date ?? "",
        end_date: editingInitiative.end_date ?? "",
        owner: editingInitiative.owner ?? "",
        status: editingInitiative.status,
        priority: editingInitiative.priority,
        stream: editingInitiative.stream,
        budget: editingInitiative.budget ?? 0,
        teamText: (editingInitiative.team ?? []).join(", "),
        quickWinsText: (editingInitiative.quick_wins ?? []).join("\n"),
        dependencyIds: (editingInitiative.dependency_ids ?? []).slice(),
      });
    }
  }, [editMode, editOpen, editingInitiative, editingPhase, streams, nextInitiativeCode, roadmapProjectRef]);

  React.useEffect(() => {
    try {
      const s = Number(localStorage.getItem("arqdata.roadmap.timelineScale") ?? "1");
      const d = Number(localStorage.getItem("arqdata.roadmap.timelineDensity") ?? "1");
      const t = String(localStorage.getItem("arqdata.roadmap.timelineTimescale") ?? "month") as any;
      if (Number.isFinite(s) && s > 0) setTimelineScale(Math.max(0.75, Math.min(1.6, s)));
      if (Number.isFinite(d) && d > 0) setTimelineDensity(Math.max(0.8, Math.min(1.35, d)));
      if (t === "day" || t === "month" || t === "quarter" || t === "year") setTimelineTimescale(t);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("arqdata.roadmap.timelineScale", String(timelineScale));
      localStorage.setItem("arqdata.roadmap.timelineDensity", String(timelineDensity));
      localStorage.setItem("arqdata.roadmap.timelineTimescale", String(timelineTimescale));
    } catch {
      // ignore
    }
  }, [timelineScale, timelineDensity, timelineTimescale]);

  const selectedDeps = useMemo(() => {
    if (!selectedInitiative) return [];
    const map = new Map(allInitiatives.map((i) => [i.id, i] as const));
    return selectedInitiative.dependency_ids
      .map((id) => map.get(id))
      .filter(Boolean) as Initiative[];
  }, [allInitiatives, selectedInitiative]);

  const summary = useMemo(() => {
    const totalBudget = allInitiatives.reduce((a, i) => a + i.budget, 0);
    const blocked = allInitiatives.filter((i) => i.status === "BLOCKED").length;
    const done = allInitiatives.filter((i) => i.status === "DONE").length;
    const pct = allInitiatives.length ? Math.round((done / allInitiatives.length) * 100) : 0;
    return { totalBudget, totalInitiatives: allInitiatives.length, blocked, done, pct };
  }, [allInitiatives]);

  const timelineColumnWidth = Math.round(96 * timelineScale);
  const timelineRowPitch = Math.round(46 * timelineDensity);

  const executivePanel = (
    <div className="mt-3 rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Resumen ejecutivo</div>
          <div className="text-xs text-gray-500 dark:text-white/40">
            Vista rÃ¡pida por etapa (iniciativas, bloqueos, presupuesto y avance).
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSummaryOpen((v) => !v)}
          className="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] text-sm text-gray-700 dark:text-white/80"
        >
          {summaryOpen ? "Compactar" : "Ampliar"}
        </button>
      </div>

      {summaryOpen ? (
        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {roadmap.phases.map((p, idx) => {
              const total = p.initiatives.length;
              const done = p.initiatives.filter((i) => i.status === "DONE").length;
              const blocked = p.initiatives.filter((i) => i.status === "BLOCKED").length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSummaryOpen(false);
                    setViewMode("pipeline");
                    handleSelectPhase(p.id);
                    setDetailOpen(true);
                  }}
                  className="text-left rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] overflow-hidden hover:shadow-lg transition-shadow"
                  title="Abrir detalle de la etapa"
                >
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03]">
                    <div className="text-xs text-gray-500 dark:text-white/40">Etapa {idx + 1}</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-white/40 mt-1">
                      {p.start_date} - {p.end_date}
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat label="Iniciativas" value={String(total)} />
                      <MiniStat label="Bloqueadas" value={String(blocked)} />
                      <MiniStat label="Presupuesto" value={formatCurrency(p.budget_total)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/40 mb-1">
                        <span>Avance</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                        <div className="h-full bg-[#28b8d5]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );

  const updateRoadmap = (next: ImplementationRoadmap) => {
    if (!onRoadmapChange) return;
    onRoadmapChange({ ...next, updated_at: new Date().toISOString() });
  };

  const buildPhaseVacia = useCallback(
    (): Phase => ({
      id: `phase-${Date.now()}`,
      name: "Nueva fase",
      description: "",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      status: "PLANNED",
      priority: "MEDIUM",
      enabled_stream_keys: (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order).map((s) => s.key),
      initiatives: [],
      budget_total: 0,
    }),
    [roadmap.streams]
  );

  const buildInitiativeVacia = useCallback((phase: Phase): Initiative => {
    const defaultStream = (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order)[0]?.key ?? "stream-1";
    return {
      id: `ini-${Date.now()}`,
      code: nextInitiativeCode,
      project_ref: roadmapProjectRef,
      name: "Nueva iniciativa",
      description: "",
      start_date: phase.start_date,
      end_date: phase.end_date,
      team: [],
      budget: 0,
      dependency_ids: [],
      quick_wins: [],
      stream: defaultStream,
      status: "PLANNED",
      priority: "MEDIUM",
      owner: "Sin asignar",
      traceability: { artifacts: [], gaps: [], maturity: [] },
    };
  }, [nextInitiativeCode, roadmap.streams, roadmapProjectRef]);

  const openStreamsEditor = useCallback(
    (streamKey?: string) => {
      setFocusStreamKey(streamKey ?? null);
      setStreamsOpen(true);
    },
    []
  );

  const openEditPhase = (phaseId: string) => {
    setEditMode("phase");
    setEditingPhaseId(phaseId);
    setEditingInitiativeId(null);
    setEditOpen(true);
  };

  const openEditInitiative = (phaseId: string, initiativeId: string) => {
    setEditMode("initiative");
    setEditingPhaseId(phaseId);
    setEditingInitiativeId(initiativeId);
    setEditOpen(true);
  };

  const handleAddPhase = () => {
    if (readOnly) return;
    const p = buildPhaseVacia();
    updateRoadmap({ ...roadmap, phases: [...roadmap.phases, p] });
    openEditPhase(p.id);
  };

  const handleAddInitiative = (phaseId: string, preferredStream?: string) => {
    if (readOnly) return;
    const phase = roadmap.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    const baseIni = buildInitiativeVacia(phase);
    const ini = {
      ...baseIni,
      stream: preferredStream ?? baseIni.stream,
    };
    updateRoadmap({
      ...roadmap,
      phases: roadmap.phases.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              enabled_stream_keys: Array.from(
                new Set([...(p.enabled_stream_keys?.length ? p.enabled_stream_keys : streams.map((s) => s.key)), ini.stream])
              ),
              initiatives: [...p.initiatives, ini],
            }
          : p
      ),
    });
    openEditInitiative(phaseId, ini.id);
  };

  const handleAddInitiativeFromMenu = () => {
    if (readOnly) return;
    if (!selectedPhaseForCreate) {
      const p = buildPhaseVacia();
      updateRoadmap({ ...roadmap, phases: [...roadmap.phases, p] });
      setCreateOpen(false);
      setSelectedPhaseId(p.id);
      handleAddInitiative(p.id);
      return;
    }
    setCreateOpen(false);
    setSelectedPhaseId(selectedPhaseForCreate.id);
    handleAddInitiative(selectedPhaseForCreate.id);
  };

  const handleAddStreamInPhaseFromMenu = () => {
    if (readOnly) return;

    const currentStreams = (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order);
    const nextOrder = currentStreams.length + 1;
    const nextKey = `stream_${Date.now()}`;
    const colorPool = ["#111827", "#2563eb", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"];
    const nextColor = colorPool[(nextOrder - 1) % colorPool.length];

    const newStream: RoadmapStreamDefinition = {
      key: nextKey,
      name: `Stream ${nextOrder}`,
      order: nextOrder,
      color: nextColor,
      status: "PLANNED",
      priority: "MEDIUM",
    };

    const nextPhases = roadmap.phases.map((p) => {
      const enabled = p.enabled_stream_keys?.length
        ? p.enabled_stream_keys.slice()
        : currentStreams.map((s) => s.key);
      if (!enabled.includes(nextKey)) enabled.push(nextKey);
      return { ...p, enabled_stream_keys: enabled };
    });

    updateRoadmap({
      ...roadmap,
      streams: [...currentStreams, newStream],
      phases: nextPhases,
    });

    if (selectedPhaseForCreate) setSelectedPhaseId(selectedPhaseForCreate.id);
    setCreateOpen(false);
    openStreamsEditor(nextKey);
  };

  const handleAddStreamInPhase = useCallback(
    (phaseId: string) => {
      if (readOnly) return;

      const targetPhase = roadmap.phases.find((p) => p.id === phaseId);
      if (!targetPhase) return;

      const currentStreams = (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order);
      const nextOrder = currentStreams.length + 1;
      const nextKey = `stream_${Date.now()}`;
      const colorPool = ["#111827", "#2563eb", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"];
      const nextColor = colorPool[(nextOrder - 1) % colorPool.length];

      const newStream: RoadmapStreamDefinition = {
        key: nextKey,
        name: `Stream ${nextOrder}`,
        order: nextOrder,
        color: nextColor,
        status: "PLANNED",
        priority: "MEDIUM",
      };

      const nextPhases = roadmap.phases.map((p) => {
        const baseEnabled = p.enabled_stream_keys?.length
          ? p.enabled_stream_keys.slice()
          : currentStreams.map((s) => s.key);
        if (p.id === phaseId && !baseEnabled.includes(nextKey)) {
          baseEnabled.push(nextKey);
        }
        return { ...p, enabled_stream_keys: baseEnabled };
      });

      updateRoadmap({
        ...roadmap,
        streams: [...currentStreams, newStream],
        phases: nextPhases,
      });

      setSelectedPhaseId(phaseId);
      openStreamsEditor(nextKey);
    },
    [readOnly, roadmap, updateRoadmap, openStreamsEditor]
  );

  const handleSelectInitiative = useCallback((id: string) => {
    setSelectedInitiativeId(id);
    setSelectedPhaseId(null);
    setDetailOpen(true);
  }, []);

  const handleSelectPhase = useCallback((phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setSelectedInitiativeId(null);
    setDetailOpen(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedInitiativeId(null);
    setSelectedPhaseId(null);
    setDetailOpen(false);
  }, []);

  const handleReorderPhase = useCallback(
    (phaseId: string, newIndex: number) => {
      if (readOnly) return;
      const currentIndex = roadmap.phases.findIndex((p) => p.id === phaseId);
      if (currentIndex < 0 || currentIndex === newIndex) return;
      const next = roadmap.phases.slice();
      const [moved] = next.splice(currentIndex, 1);
      next.splice(newIndex, 0, moved!);
      updateRoadmap({ ...roadmap, phases: next });
    },
    [readOnly, roadmap, updateRoadmap]
  );

  const handleUpdateInitiativeDates = useCallback(
    (phaseId: string, initiativeId: string, startISO: string, endISO: string) => {
      if (readOnly) return;
      updateRoadmap({
        ...roadmap,
        phases: roadmap.phases.map((p) => {
          if (p.id !== phaseId) return p;

          const initiatives = p.initiatives.map((i) =>
            i.id === initiativeId ? { ...i, start_date: startISO, end_date: endISO } : i
          );

          // Keep phase dates consistent with its initiatives so dragging doesn't "hit a wall".
          const starts = initiatives.map((i) => i.start_date).filter(Boolean) as string[];
          const ends = initiatives.map((i) => i.end_date).filter(Boolean) as string[];
          const nextStart = starts.length ? starts.slice().sort()[0] : p.start_date;
          const nextEnd = ends.length ? ends.slice().sort().slice(-1)[0] : p.end_date;

          return { ...p, start_date: nextStart, end_date: nextEnd, initiatives };
        }),
      });
    },
    [readOnly, roadmap, updateRoadmap]
  );

  const handleReorderInitiative = useCallback(
    (phaseId: string, initiativeId: string, newIndexWithinStream: number) => {
      if (readOnly) return;

      const phase = roadmap.phases.find((p) => p.id === phaseId);
      if (!phase) return;
      const target = phase.initiatives.find((i) => i.id === initiativeId);
      if (!target) return;

      const stream = target.stream;
      const inStream = phase.initiatives.filter((i) => i.stream === stream);
      const currentIndex = inStream.findIndex((i) => i.id === initiativeId);
      if (currentIndex < 0 || currentIndex === newIndexWithinStream) return;

      const nextStream = inStream.slice();
      const [moved] = nextStream.splice(currentIndex, 1);
      nextStream.splice(newIndexWithinStream, 0, moved!);

      const nextInitiatives: Initiative[] = [];
      const streamQueue = nextStream.slice();
      phase.initiatives.forEach((i) => {
        if (i.stream !== stream) {
          nextInitiatives.push(i);
          return;
        }
        const nextI = streamQueue.shift();
        if (nextI) nextInitiatives.push(nextI);
      });

      updateRoadmap({
        ...roadmap,
        phases: roadmap.phases.map((p) => (p.id === phaseId ? { ...p, initiatives: nextInitiatives } : p)),
      });
    },
    [readOnly, roadmap, updateRoadmap]
  );

  const handleMoveInitiative = useCallback(
    (
      fromPhaseId: string,
      initiativeId: string,
      targetPhaseId: string,
      targetStreamKey: string,
      newIndexWithinStream: number
    ) => {
      if (readOnly) return;
      if (!fromPhaseId || !targetPhaseId) return;

      const fromPhase = roadmap.phases.find((p) => p.id === fromPhaseId);
      const toPhase = roadmap.phases.find((p) => p.id === targetPhaseId);
      if (!fromPhase || !toPhase) return;

      const fromList = fromPhase.initiatives.slice();
      const fromIdx = fromList.findIndex((i) => i.id === initiativeId);
      if (fromIdx === -1) return;

      const moving = { ...fromList[fromIdx], stream: targetStreamKey };
      fromList.splice(fromIdx, 1);

      const toList = (fromPhaseId === targetPhaseId ? fromList : toPhase.initiatives.slice());

      const streamIndexes = toList
        .map((i, idx) => ({ i, idx }))
        .filter((x) => x.i.stream === targetStreamKey)
        .map((x) => x.idx);

      let insertAt = toList.length;
      if (streamIndexes.length) {
        const clamped = Math.max(0, Math.min(newIndexWithinStream, streamIndexes.length));
        if (clamped === streamIndexes.length) {
          insertAt = (streamIndexes[streamIndexes.length - 1] ?? 0) + 1;
        } else {
          insertAt = streamIndexes[clamped] ?? toList.length;
        }
      }

      toList.splice(insertAt, 0, moving);

      updateRoadmap({
        ...roadmap,
        phases: roadmap.phases.map((p) => {
          if (p.id === fromPhaseId && p.id === targetPhaseId) return { ...p, initiatives: toList };
          if (p.id === fromPhaseId) return { ...p, initiatives: fromList };
          if (p.id === targetPhaseId) return { ...p, initiatives: toList };
          return p;
        }),
      });
    },
    [readOnly, roadmap, updateRoadmap]
  );

  const handleReorderStream = useCallback(
    (streamKey: string, newIndex: number) => {
      if (readOnly) return;
      const list = (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order);
      const from = list.findIndex((s) => s.key === streamKey);
      if (from === -1) return;
      const to = Math.max(0, Math.min(newIndex, list.length - 1));
      const next = list.slice();
      const [item] = next.splice(from, 1);
      if (!item) return;
      next.splice(to, 0, item);
      const reOrdered = next.map((s, idx) => ({ ...s, order: idx + 1 }));
      updateRoadmap({ ...roadmap, streams: reOrdered });
    },
    [readOnly, roadmap, updateRoadmap]
  );

  const openInlineCatalog = useCallback(
    (type: CatalogType, target: NonNullable<typeof inlineCatalogApplyTarget>) => {
      if (readOnly) return;
      setInlineCatalogType(type);
      setInlineCatalogApplyTarget(target);
      setInlineCatalogCode("");
      setInlineCatalogLabel("");
      setInlineCatalogOpen(true);
    },
    [readOnly]
  );

  const closeInlineCatalog = useCallback(() => {
    setInlineCatalogOpen(false);
    setInlineCatalogCode("");
    setInlineCatalogLabel("");
    setInlineCatalogApplyTarget(null);
  }, []);

  const handleCreateInlineCatalogOption = useCallback(() => {
    if (readOnly || !inlineCatalogApplyTarget) return;
    const value = normalizeCatalogCode(inlineCatalogCode || inlineCatalogLabel);
    const label = inlineCatalogLabel.trim() || fallbackLabel(value);
    if (!value || !label) return;

    if (inlineCatalogType === "status") {
      if (!statusOptions.some((o) => o.value === value)) {
        setStatusOptions((prev) => [...prev, { value, label }]);
      }
      if (inlineCatalogApplyTarget.type === "phaseDraft" && phaseDraft) {
        setPhaseDraft({ ...phaseDraft, status: value });
      } else if (inlineCatalogApplyTarget.type === "initiativeDraft" && initiativeDraft) {
        setInitiativeDraft({ ...initiativeDraft, status: value });
      } else if (inlineCatalogApplyTarget.type === "stream") {
        updateRoadmap({
          ...roadmap,
          streams: streams.map((s) => (s.key === inlineCatalogApplyTarget.streamKey ? { ...s, status: value } : s)),
        });
      }
    } else {
      if (!priorityOptions.some((o) => o.value === value)) {
        setPriorityOptions((prev) => [...prev, { value, label }]);
      }
      if (inlineCatalogApplyTarget.type === "phaseDraft" && phaseDraft) {
        setPhaseDraft({ ...phaseDraft, priority: value });
      } else if (inlineCatalogApplyTarget.type === "initiativeDraft" && initiativeDraft) {
        setInitiativeDraft({ ...initiativeDraft, priority: value });
      } else if (inlineCatalogApplyTarget.type === "stream") {
        updateRoadmap({
          ...roadmap,
          streams: streams.map((s) =>
            s.key === inlineCatalogApplyTarget.streamKey ? { ...s, priority: value } : s
          ),
        });
      }
    }

    closeInlineCatalog();
  }, [
    closeInlineCatalog,
    inlineCatalogApplyTarget,
    inlineCatalogCode,
    inlineCatalogLabel,
    inlineCatalogType,
    initiativeDraft,
    phaseDraft,
    priorityOptions,
    readOnly,
    roadmap,
    statusOptions,
    streams,
    updateRoadmap,
  ]);


  const handleReorderPhaseLocal = useCallback(
    (phaseId: string, newIndex: number) => {
      if (readOnly) return;
      const fromIdx = roadmap.phases.findIndex((p) => p.id === phaseId);
      if (fromIdx === -1) return;
      const to = Math.max(0, Math.min(newIndex, roadmap.phases.length - 1));
      const next = roadmap.phases.slice();
      const [moving] = next.splice(fromIdx, 1);
      if (!moving) return;
      next.splice(to, 0, moving);
      updateRoadmap({ ...roadmap, phases: next });
    },
    [readOnly, roadmap, updateRoadmap]
  );

  const downloadTextFile = useCallback((filename: string, content: string, mime = "text/plain") => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportTxt = useCallback(() => {
    const txt = buildRoadmapTxtReport(roadmap);
    downloadTextFile("roadmap-implementacion.txt", txt, "text/plain");
  }, [downloadTextFile, roadmap]);

  const handleExportHtml = useCallback(() => {
    const html = buildRoadmapHtmlReport(roadmap);
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  }, [roadmap]);

  const actionsBar = (
    <div className="flex items-center gap-2">
      {viewMode === "timeline" ? (
        <div className="hidden md:flex items-center gap-2 mr-1">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1">
            <span className="text-xs font-medium text-gray-600 dark:text-white/60 px-1">Escala</span>
            <select
              value={timelineTimescale}
              onChange={(e) => setTimelineTimescale(e.target.value as any)}
              className="h-8 pr-8 pl-2 rounded-lg bg-transparent text-sm text-gray-800 dark:text-white/90 outline-none"
              title="Escala temporal"
            >
              <option value="day">DÃ­as</option>
              <option value="month">Meses</option>
              <option value="quarter">Trimestres</option>
              <option value="year">AÃ±os</option>
            </select>
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1">
            <button
              type="button"
              onClick={() => setTimelineScale((v) => Math.max(0.75, Math.round((v - 0.1) * 100) / 100))}
              className="h-8 w-8 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.06] flex items-center justify-center"
              title="Reducir ancho de columnas"
            >
              <ZoomOut size={16} className="text-gray-700 dark:text-white/80" />
            </button>
            <div className="text-xs font-mono text-gray-600 dark:text-white/60 min-w-[56px] text-center">
              {Math.round(timelineScale * 100)}%
            </div>
            <button
              type="button"
              onClick={() => setTimelineScale((v) => Math.min(1.6, Math.round((v + 0.1) * 100) / 100))}
              className="h-8 w-8 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.06] flex items-center justify-center"
              title="Aumentar ancho de columnas"
            >
              <ZoomIn size={16} className="text-gray-700 dark:text-white/80" />
            </button>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-2 py-1">
            <Rows3 size={16} className="text-gray-700 dark:text-white/80" />
            <select
              value={String(timelineDensity)}
              onChange={(e) => setTimelineDensity(Number(e.target.value))}
              className="h-8 pr-8 pl-2 rounded-lg bg-transparent text-sm text-gray-800 dark:text-white/90 outline-none"
              title="Altura de filas"
            >
              <option value="0.85">Compactas</option>
              <option value="1">Normal</option>
              <option value="1.2">Amplias</option>
            </select>
          </div>
        </div>
      ) : null}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          startIcon={<Plus size={16} />}
          onClick={() => setCreateOpen((v) => !v)}
          className="dropdown-toggle"
          disabled={readOnly}
        >
          Nuevo
        </Button>
        <Dropdown isOpen={createOpen} onClose={() => setCreateOpen(false)} className="w-72">
          <div className="py-2">
            <div className="px-4 pb-1 text-[11px] font-medium text-gray-500 dark:text-white/40">
              Acciones de creacion
            </div>
            <DropdownItem
              onItemClick={() => setCreateOpen(false)}
              onClick={handleAddPhase}
            >
              Nueva fase
            </DropdownItem>
            <DropdownItem
              onItemClick={() => setCreateOpen(false)}
              onClick={handleAddInitiativeFromMenu}
            >
              Nueva iniciativa
            </DropdownItem>
            <DropdownItem
              onItemClick={() => setCreateOpen(false)}
              onClick={handleAddStreamInPhaseFromMenu}
            >
              Nuevo stream
            </DropdownItem>
          </div>
        </Dropdown>
      </div>

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExportOpen((v) => !v)}
          className="dropdown-toggle"
        >
          Exportar
        </Button>
        <Dropdown isOpen={exportOpen} onClose={() => setExportOpen(false)} className="w-64">
          <div className="py-2">
            <div className="px-4 pb-1 text-[11px] font-medium text-gray-500 dark:text-white/40">
              Informe
            </div>
            <DropdownItem onItemClick={() => setExportOpen(false)} onClick={handleExportTxt}>
              Descargar TXT
            </DropdownItem>
            <DropdownItem onItemClick={() => setExportOpen(false)} onClick={handleExportHtml}>
              Abrir vista PDF (imprimir)
            </DropdownItem>
          </div>
        </Dropdown>
      </div>

      <Button
        variant="primary"
        size="sm"
        startIcon={<Save size={16} />}
        onClick={() => void onSave?.()}
        disabled={readOnly || !onSave || isSaving}
        className="!bg-[#28b8d5] !text-white hover:!bg-[#1ea7c3] dark:!bg-[#28b8d5] dark:hover:!bg-[#1ea7c3]"
      >
        {isSaving ? "Guardando..." : "Guardar"}
      </Button>
    </div>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-white dark:bg-[#0f0f0f]">
      <div className="border-b border-gray-200 dark:border-white/[0.08] px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Roadmap de Implementacion
            </h1>
            <p className="text-sm text-gray-500 dark:text-white/40">
              Pipeline tipo workflow: etapas {"->"} streams {"->"} iniciativas con dependencias.
            </p>
          </div>
          <div className="text-xs text-gray-500 dark:text-white/40">
            Tip: arrastra fases e iniciativas para reordenar. Click para abrir el detalle.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Stat label="Presupuesto total" value={formatCurrency(summary.totalBudget)} />
          <Stat label="Iniciativas" value={String(summary.totalInitiatives)} />
          <Stat label="Bloqueadas" value={String(summary.blocked)} />
          <Stat label="Avance (Done)" value={`${summary.pct}%`} />
        </div>

        {executivePanel}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[11px] text-gray-500 dark:text-white/40">Vista</div>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/[0.08] p-1 bg-white dark:bg-white/[0.04]">
            <button
              onClick={() => setViewMode("pipeline")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "pipeline"
                  ? "bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <LayoutGrid size={16} /> Pipeline
              </span>
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "timeline"
                  ? "bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white"
                  : "text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} /> Timeline
              </span>
            </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-white/40 ml-2">Filtrar:</div>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value as any)}
              className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
            >
              <option value="ALL">Todos los streams</option>
              {streams.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
            >
              <option value="ALL">Todos los estados</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
            >
              <option value="ALL">Todas las prioridades</option>
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-white/70 ml-1">
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => setCompact(e.target.checked)}
                className="accent-[#28b8d5]"
              />
              Compactar
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openStreamsEditor()}
              className="ml-1"
            >
              Streams
            </Button>
          </div>

          <div className="ml-auto">{actionsBar}</div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "timeline" ? (
          <div className="h-full p-5 overflow-hidden relative">
            <RoadmapTimelineView
              roadmap={filteredRoadmap}
              onSelectInitiative={handleSelectInitiative}
              selectedInitiativeId={selectedInitiativeId}
              selectedPhaseId={selectedPhaseId}
              onSelectPhase={handleSelectPhase}
              onClearSelection={clearSelection}
              onEditStream={(key) => openStreamsEditor(key)}
              columnWidth={timelineColumnWidth}
              rowPitch={timelineRowPitch}
              timeScale={timelineTimescale}
              readOnly={readOnly}
              onReorderPhase={handleReorderPhaseLocal}
              onReorderStream={handleReorderStream}
              onMoveInitiative={handleMoveInitiative}
              onUpdateInitiativeDates={handleUpdateInitiativeDates}
            />
          </div>
        ) : (
          <div className="h-full p-5 relative">
            <RoadmapPipelineCanvas
              roadmap={filteredRoadmap}
              selectedInitiativeId={selectedInitiativeId}
              onSelectInitiative={handleSelectInitiative}
              selectedPhaseId={selectedPhaseId}
              onSelectPhase={handleSelectPhase}
              onClearSelection={clearSelection}
              onAddInitiative={handleAddInitiative}
              onAddStream={handleAddStreamInPhase}
              onReorderPhase={handleReorderPhase}
              onReorderInitiative={handleReorderInitiative}
              onMoveInitiative={handleMoveInitiative}
              onEditStream={(key) => openStreamsEditor(key)}
              readOnly={readOnly}
              compact={compact}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={detailOpen && (!!selectedInitiative || !!selectedPhase)}
        onClose={clearSelection}
        className="max-w-3xl"
        showCloseButton={false}
      >
        <div className="p-5">
          <DetailPanel
            roadmap={roadmap}
            initiative={selectedInitiative}
            phase={selectedPhase}
            statusLabel={statusLabelMap}
            priorityLabel={priorityLabelMap}
            streamLabel={streamLabel}
            stageBadge={STAGE_BADGE}
            severityBadge={SEVERITY_BADGE}
            onEditPhase={(phaseId) => {
              openEditPhase(phaseId);
            }}
            onEdit={(phaseId, iniId) => {
              openEditInitiative(phaseId, iniId);
            }}
            onClose={clearSelection}
            readOnly={readOnly}
          />
        </div>
      </Modal>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        className="max-w-none w-auto mx-4 p-0 overflow-visible"
        showCloseButton={false}
      >
        <div
          className="w-[980px] h-[76vh] min-w-[760px] min-h-[520px] max-w-[94vw] max-h-[90vh] resize overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] shadow-[0_24px_80px_rgba(0,0,0,0.18)] flex flex-col"
          style={{ resize: "both" }}
        >
        <div className="p-5 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {editMode === "phase" ? "Editar fase" : "Editar iniciativa"}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/40">
                {editMode === "initiative" && editingInitiativePhase
                  ? `Fase: ${editingInitiativePhase.name}. Cambios en el Roadmap se reflejan en Pipeline y Timeline.`
                  : "Cambios en el Roadmap se reflejan en Pipeline y Timeline."}
              </div>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-white/40">Redimensiona desde la esquina inferior derecha</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#0f0f0f] space-y-5 overflow-auto flex-1">
          {editMode === "phase" ? (
            !phaseDraft || !editingPhase ? (
              <div className="text-sm text-gray-500 dark:text-white/40">No se pudo cargar la fase.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Nombre</div>
                    <input
                      value={phaseDraft.name}
                      disabled={readOnly}
                      onChange={(e) => setPhaseDraft({ ...phaseDraft, name: e.target.value })}
                      className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                      placeholder="Ej: Etapa 1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Inicio</div>
                      <input
                        type="date"
                        value={phaseDraft.start_date}
                        disabled={readOnly}
                        onChange={(e) => setPhaseDraft({ ...phaseDraft, start_date: e.target.value })}
                        className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Fin</div>
                      <input
                        type="date"
                        value={phaseDraft.end_date}
                        disabled={readOnly}
                        onChange={(e) => setPhaseDraft({ ...phaseDraft, end_date: e.target.value })}
                        className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Estado</div>
                    <select
                      value={phaseDraft.status}
                      disabled={readOnly}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === ADD_NEW_STATUS_VALUE) {
                          openInlineCatalog("status", { type: "phaseDraft" });
                          return;
                        }
                        setPhaseDraft({ ...phaseDraft, status: value as RoadmapStatus });
                      }}
                      className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value={ADD_NEW_STATUS_VALUE}>+ Nuevo estado…</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Prioridad</div>
                    <select
                      value={phaseDraft.priority}
                      disabled={readOnly}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === ADD_NEW_PRIORITY_VALUE) {
                          openInlineCatalog("priority", { type: "phaseDraft" });
                          return;
                        }
                        setPhaseDraft({ ...phaseDraft, priority: value as RoadmapPriority });
                      }}
                      className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    >
                      {priorityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                      <option value={ADD_NEW_PRIORITY_VALUE}>+ Nueva prioridad…</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">DescripciÃ³n</div>
                  <textarea
                    value={phaseDraft.description}
                    disabled={readOnly}
                    onChange={(e) => setPhaseDraft({ ...phaseDraft, description: e.target.value })}
                    className="min-h-[96px] w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    placeholder="QuÃ© se logra en esta fase..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-white/60">
                      Estructura de streams e iniciativas (fase)
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-white/40">
                      Si un stream tiene iniciativas, no se puede ocultar.
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                        <input
                          type="checkbox"
                          checked={compactStreamsTree}
                          onChange={(e) => setCompactStreamsTree(e.target.checked)}
                          className="accent-[#28b8d5]"
                        />
                        Compactar streams
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
                        <input
                          type="checkbox"
                          checked={compactInitiativesTree}
                          onChange={(e) => setCompactInitiativesTree(e.target.checked)}
                          className="accent-[#28b8d5]"
                        />
                        Compactar iniciativas
                      </label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={readOnly}
                      onClick={() => {
                        const currentStreams = (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order);
                        const nextOrder = currentStreams.length + 1;
                        const nextKey = `stream_${Date.now()}`;
                        const colorPool = ["#111827", "#2563eb", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"];
                        const nextColor = colorPool[(nextOrder - 1) % colorPool.length];
                        const newStream: RoadmapStreamDefinition = {
                          key: nextKey,
                          name: `Stream ${nextOrder}`,
                          order: nextOrder,
                          color: nextColor,
                          status: "PLANNED",
                          priority: "MEDIUM",
                        };

                        updateRoadmap({
                          ...roadmap,
                          streams: [...currentStreams, newStream],
                          phases: roadmap.phases.map((p) => {
                            const baseEnabled = p.enabled_stream_keys?.length
                              ? p.enabled_stream_keys.slice()
                              : currentStreams.map((s) => s.key);
                            if (p.id === editingPhase.id && !baseEnabled.includes(nextKey)) baseEnabled.push(nextKey);
                            return { ...p, enabled_stream_keys: baseEnabled };
                          }),
                        });

                        setPhaseDraft({
                          ...phaseDraft,
                          enabled_stream_keys: Array.from(new Set([...phaseDraft.enabled_stream_keys, nextKey])),
                        });
                      }}
                    >
                      + Nuevo stream
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2 max-h-[320px] overflow-auto pr-1">
                    {streams.map((s) => {
                      const used = editingPhase.initiatives.some((i) => i.stream === s.key);
                      const streamInitiatives = editingPhase.initiatives.filter((i) => i.stream === s.key);
                      const checked = phaseDraft.enabled_stream_keys.includes(s.key);
                      const collapsed = collapsedStreamsTree[s.key] ?? false;
                      return (
                        <div
                          key={`${editingPhase.id}-${s.key}`}
                          className={`rounded-xl border ${
                            checked
                              ? "border-[#28b8d5] bg-[#28b8d5]/5"
                              : "border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]"
                          }`}
                        >
                          <div className={`flex items-center justify-between gap-2 px-3 ${compactStreamsTree ? "py-2" : "py-2.5"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedStreamsTree((prev) => ({ ...prev, [s.key]: !collapsed }))
                                }
                                className="h-6 w-6 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] flex items-center justify-center text-gray-600 dark:text-white/60"
                                title={collapsed ? "Expandir stream" : "Compactar stream"}
                              >
                                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              </button>
                              <span
                                className="inline-flex h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ background: s.color ?? "#94a3b8" }}
                              />
                              <span className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">{s.name}</span>
                              <span className="text-[11px] text-gray-500 dark:text-white/40">{streamInitiatives.length} iniciativa(s)</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={readOnly}
                                onChange={(e) => {
                                  if (used && !e.target.checked) {
                                    setPhaseWarning({
                                      open: true,
                                      message: `No puedes ocultar \"${s.name}\" porque tiene ${streamInitiatives.length} iniciativa(s).`,
                                    });
                                    return;
                                  }
                                  const next = e.target.checked
                                    ? Array.from(new Set([...phaseDraft.enabled_stream_keys, s.key]))
                                    : phaseDraft.enabled_stream_keys.filter((k) => k !== s.key);
                                  setPhaseDraft({ ...phaseDraft, enabled_stream_keys: next });
                                }}
                                className="accent-[#28b8d5]"
                                title={used ? "No se puede ocultar: hay iniciativas en este stream" : ""}
                              />
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => {
                                  setEditOpen(false);
                                  openStreamsEditor(s.key);
                                }}
                                className="h-7 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-xs text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50"
                                title="Editar stream"
                              >
                                Editar stream
                              </button>
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => handleAddInitiative(editingPhase.id, s.key)}
                                className="h-7 px-2 rounded-lg border border-[#28b8d5]/40 bg-[#28b8d5]/10 text-xs text-[#0f6d81] dark:text-[#8bd8ee] hover:bg-[#28b8d5]/20 disabled:opacity-50"
                                title="Nueva iniciativa en este stream"
                              >
                                + Iniciativa
                              </button>
                            </div>
                          </div>

                          {!collapsed ? (
                            <div className="border-t border-gray-200 dark:border-white/[0.08] px-3 py-2 space-y-1.5">
                              {streamInitiatives.length === 0 ? (
                                <div className="text-xs text-gray-500 dark:text-white/40">Sin iniciativas en este stream.</div>
                              ) : (
                                streamInitiatives.map((ini) => (
                                  <div
                                    key={`${s.key}-${ini.id}`}
                                    className={`rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] ${
                                      compactInitiativesTree ? "px-2.5 py-1.5" : "px-2.5 py-2"
                                    } flex items-center justify-between gap-2`}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-mono text-gray-500 dark:text-white/40">
                                        {ini.code ?? ini.id}
                                      </div>
                                      <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                                        {ini.name}
                                      </div>
                                      {!compactInitiativesTree ? (
                                        <div className="text-[11px] text-gray-500 dark:text-white/40 truncate">
                                          {ini.status} · {ini.priority}
                                        </div>
                                      ) : null}
                                    </div>
                                    <button
                                      type="button"
                                      disabled={readOnly}
                                      onClick={() => {
                                        setEditOpen(false);
                                        openEditInitiative(editingPhase.id, ini.id);
                                      }}
                                      className="h-7 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-xs text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50"
                                    >
                                      Editar
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={readOnly || !phaseDraft.name.trim()}
                    className="!bg-[#28b8d5] !text-white hover:!bg-[#1ea7c3] dark:!bg-[#28b8d5] dark:hover:!bg-[#1ea7c3]"
                    onClick={() => {
                      const nextPhases = roadmap.phases.map((p) => {
                        if (p.id !== editingPhase.id) return p;
                        return {
                          ...p,
                          name: phaseDraft.name.trim(),
                          description: phaseDraft.description,
                          start_date: phaseDraft.start_date,
                          end_date: phaseDraft.end_date,
                          status: phaseDraft.status,
                          priority: phaseDraft.priority,
                          enabled_stream_keys: phaseDraft.enabled_stream_keys,
                        };
                      });
                      updateRoadmap({ ...roadmap, phases: nextPhases });
                      setEditOpen(false);
                    }}
                  >
                    Guardar cambios
                  </Button>
                </div>
              </div>
            )
          ) : !initiativeDraft || !editingInitiative ? (
            <div className="text-sm text-gray-500 dark:text-white/40">No se pudo cargar la iniciativa.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Nombre</div>
                  <input
                    value={initiativeDraft.name}
                    disabled={readOnly}
                    onChange={(e) => setInitiativeDraft({ ...initiativeDraft, name: e.target.value })}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    placeholder="Ej: Estandarizar naming"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">CÃ³digo</div>
                    <input
                      value={initiativeDraft.code}
                      disabled
                      readOnly
                      className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-100 dark:bg-white/[0.06] text-sm text-gray-700 dark:text-white/70 font-mono"
                      placeholder="Autogenerado"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Proyecto</div>
                    <input
                      value={initiativeDraft.project_ref}
                      disabled
                      readOnly
                      className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-100 dark:bg-white/[0.06] text-sm text-gray-700 dark:text-white/70 font-mono"
                      placeholder="Fijo por roadmap"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Fase</div>
                  <input
                    value={editingInitiativePhase?.name ?? "-"}
                    disabled
                    readOnly
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-100 dark:bg-white/[0.06] text-sm text-gray-700 dark:text-white/70"
                    placeholder="Asignada por etapa"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">DescripciÃ³n</div>
                <textarea
                  value={initiativeDraft.description}
                  disabled={readOnly}
                  onChange={(e) => setInitiativeDraft({ ...initiativeDraft, description: e.target.value })}
                  className="min-h-[96px] w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                  placeholder="QuÃ© se hace y por quÃ©..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Stream</div>
                  <select
                    value={initiativeDraft.stream}
                    disabled={readOnly || streams.length === 0}
                    onChange={(e) => setInitiativeDraft({ ...initiativeDraft, stream: e.target.value })}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                  >
                    {streams.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Estado</div>
                  <select
                    value={initiativeDraft.status}
                    disabled={readOnly}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_STATUS_VALUE) {
                        openInlineCatalog("status", { type: "initiativeDraft" });
                        return;
                      }
                      setInitiativeDraft({ ...initiativeDraft, status: value as RoadmapStatus });
                    }}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value={ADD_NEW_STATUS_VALUE}>+ Nuevo estado…</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Prioridad</div>
                  <select
                    value={initiativeDraft.priority}
                    disabled={readOnly}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === ADD_NEW_PRIORITY_VALUE) {
                        openInlineCatalog("priority", { type: "initiativeDraft" });
                        return;
                      }
                      setInitiativeDraft({ ...initiativeDraft, priority: value as RoadmapPriority });
                    }}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value={ADD_NEW_PRIORITY_VALUE}>+ Nueva prioridad…</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Owner</div>
                  <input
                    value={initiativeDraft.owner}
                    disabled={readOnly}
                    onChange={(e) => setInitiativeDraft({ ...initiativeDraft, owner: e.target.value })}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    placeholder="Ej: Consultor Gerente"
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Inicio</div>
                  <input
                    type="date"
                    value={initiativeDraft.start_date}
                    disabled={readOnly}
                    onChange={(e) => setInitiativeDraft({ ...initiativeDraft, start_date: e.target.value })}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Fin</div>
                  <input
                    type="date"
                    value={initiativeDraft.end_date}
                    disabled={readOnly}
                    onChange={(e) => setInitiativeDraft({ ...initiativeDraft, end_date: e.target.value })}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Presupuesto (USD)</div>
                  <input
                    type="number"
                    value={initiativeDraft.budget}
                    disabled={readOnly}
                    onChange={(e) =>
                      setInitiativeDraft({ ...initiativeDraft, budget: Number(e.target.value || "0") })
                    }
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    min={0}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Equipo (coma)</div>
                  <input
                    value={initiativeDraft.teamText}
                    disabled={readOnly}
                    onChange={(e) => setInitiativeDraft({ ...initiativeDraft, teamText: e.target.value })}
                    className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    placeholder="Arquitecto, DBA, Seguridad"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Quick wins (1 por lÃ­nea)</div>
                  <textarea
                    value={initiativeDraft.quickWinsText}
                    disabled={readOnly}
                    onChange={(e) => setInitiativeDraft({ ...initiativeDraft, quickWinsText: e.target.value })}
                    className="min-h-[96px] w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                    placeholder="Checklist...\nConvenciones publicadas..."
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Dependencias</div>
                  <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-3 max-h-[140px] overflow-auto">
                    {allInitiatives
                      .filter((i) => i.id !== editingInitiative.id)
                      .map((i) => (
                        <label key={`dep-${editingInitiative.id}-${i.id}`} className="flex items-center justify-between gap-2 py-1">
                          <span className="text-sm text-gray-800 dark:text-white/90 truncate">
                            <span className="text-[11px] font-mono text-gray-500 dark:text-white/40 mr-2">
                              {i.code ?? i.id}
                            </span>
                            {i.name}
                          </span>
                          <input
                            type="checkbox"
                            disabled={readOnly}
                            checked={initiativeDraft.dependencyIds.includes(i.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...initiativeDraft.dependencyIds, i.id]))
                                : initiativeDraft.dependencyIds.filter((x) => x !== i.id);
                              setInitiativeDraft({ ...initiativeDraft, dependencyIds: next });
                            }}
                            className="accent-[#28b8d5]"
                          />
                        </label>
                      ))}
                    {!allInitiatives.filter((i) => i.id !== editingInitiative.id).length ? (
                      <div className="text-sm text-gray-500 dark:text-white/40">No hay otras iniciativas.</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={readOnly || !initiativeDraft.name.trim() || !editingInitiativePhaseId}
                  className="!bg-[#28b8d5] !text-white hover:!bg-[#1ea7c3] dark:!bg-[#28b8d5] dark:hover:!bg-[#1ea7c3]"
                  onClick={() => {
                    const nextIni: Initiative = {
                      ...editingInitiative,
                      code: editingInitiative.code?.trim() || nextInitiativeCode,
                      project_ref: roadmapProjectRef,
                      name: initiativeDraft.name.trim(),
                      description: initiativeDraft.description,
                      start_date: initiativeDraft.start_date || null,
                      end_date: initiativeDraft.end_date || null,
                      owner: initiativeDraft.owner,
                      status: initiativeDraft.status,
                      priority: initiativeDraft.priority,
                      stream: initiativeDraft.stream,
                      budget: Number.isFinite(initiativeDraft.budget) ? initiativeDraft.budget : 0,
                      team: initiativeDraft.teamText
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                      quick_wins: initiativeDraft.quickWinsText
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                      dependency_ids: initiativeDraft.dependencyIds,
                    };

                    const nextPhases = roadmap.phases.map((p) => {
                      if (p.id !== editingInitiativePhaseId) return p;
                      const initiatives = p.initiatives.map((i) => (i.id === editingInitiative.id ? nextIni : i));
                      const budget_total = initiatives.reduce((a, i) => a + (i.budget ?? 0), 0);
                      const enabled = p.enabled_stream_keys?.length ? p.enabled_stream_keys.slice() : streams.map((s) => s.key);
                      // Ensure the new stream is visible for this phase in pipeline.
                      if (nextIni.stream && !enabled.includes(nextIni.stream)) enabled.push(nextIni.stream);
                      return { ...p, initiatives, budget_total, enabled_stream_keys: enabled };
                    });

                    updateRoadmap({ ...roadmap, phases: nextPhases });
                    setEditOpen(false);
                  }}
                >
                  Guardar cambios
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </Modal>
      <Modal
        isOpen={inlineCatalogOpen}
        onClose={closeInlineCatalog}
        className="max-w-md w-full mx-4 p-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-gray-900 dark:text-white">
                {inlineCatalogType === "status" ? "Nuevo estado" : "Nueva prioridad"}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/40">
                Esta opción quedará disponible para fases, streams e iniciativas.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={closeInlineCatalog}>
              Cerrar
            </Button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#0f0f0f] space-y-3">
          <div>
            <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Código</div>
            <input
              value={inlineCatalogCode}
              disabled={readOnly}
              onChange={(e) => setInlineCatalogCode(normalizeCatalogCode(e.target.value))}
              className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90 font-mono"
              placeholder={inlineCatalogType === "status" ? "Ej: ON_HOLD" : "Ej: VERY_HIGH"}
            />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Etiqueta</div>
            <input
              value={inlineCatalogLabel}
              disabled={readOnly}
              onChange={(e) => setInlineCatalogLabel(e.target.value)}
              className="h-10 w-full px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
              placeholder={inlineCatalogType === "status" ? "Ej: En espera" : "Ej: Muy alta"}
            />
          </div>

          <div className="pt-1 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeInlineCatalog}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="!bg-[#28b8d5] !text-white hover:!bg-[#1ea7c3] dark:!bg-[#28b8d5] dark:hover:!bg-[#1ea7c3]"
              onClick={handleCreateInlineCatalogOption}
              disabled={readOnly || !(inlineCatalogCode.trim() || inlineCatalogLabel.trim())}
            >
              Crear y seleccionar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={phaseWarning.open}
        onClose={() => setPhaseWarning({ open: false, message: "" })}
        className="max-w-md w-full mx-4 p-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f]">
          <div className="text-base font-semibold text-gray-900 dark:text-white">No se puede ocultar el stream</div>
        </div>
        <div className="p-5 bg-white dark:bg-[#0f0f0f] space-y-4">
          <div className="text-sm text-gray-700 dark:text-white/80">{phaseWarning.message}</div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              className="!bg-[#28b8d5] !text-white hover:!bg-[#1ea7c3] dark:!bg-[#28b8d5] dark:hover:!bg-[#1ea7c3]"
              onClick={() => setPhaseWarning({ open: false, message: "" })}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={streamsOpen}
        onClose={() => {
          setStreamsOpen(false);
          setFocusStreamKey(null);
        }}
        className="max-w-3xl"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Streams</div>
              <div className="text-sm text-gray-500 dark:text-white/40">
                Gestiona los carriles del roadmap (nombre, orden y color).
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStreamsOpen(false)}>
              Cerrar
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {streams.length ? (
              streams.map((s) => (
                <StreamRow
                  key={s.key}
                  stream={s}
                  focused={focusStreamKey === s.key}
                  allStreams={streams}
                  statusOptions={statusOptions}
                  priorityOptions={priorityOptions}
                  roadmap={roadmap}
                  readOnly={readOnly}
                  onRequestNewStatus={(streamKey) => openInlineCatalog("status", { type: "stream", streamKey })}
                  onRequestNewPriority={(streamKey) => openInlineCatalog("priority", { type: "stream", streamKey })}
                  onChange={(nextStreams) => updateRoadmap({ ...roadmap, streams: nextStreams })}
                  onReorderStream={handleReorderStream}
                  onReassignInitiative={(initiativeId, targetStreamKey) => {
                    if (readOnly) return;
                    const phaseId =
                      roadmap.phases.find((p) => p.initiatives.some((i) => i.id === initiativeId))?.id ?? null;
                    if (!phaseId) return;
                    handleMoveInitiative(phaseId, initiativeId, phaseId, targetStreamKey, 999);
                  }}
                />
              ))
            ) : (
              <div className="text-sm text-gray-500 dark:text-white/40">AÃºn no hay streams.</div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-gray-500 dark:text-white/40">
              Tip: si eliminas un stream con iniciativas, reasigna primero.
            </div>
            <Button
              variant="primary"
              size="sm"
              startIcon={<Plus size={16} />}
              disabled={readOnly}
              className="!bg-[#28b8d5] !text-white hover:!bg-[#1ea7c3] dark:!bg-[#28b8d5] dark:hover:!bg-[#1ea7c3]"
              onClick={() => {
                const nextKey = `stream-${Date.now()}`;
                const next: RoadmapStreamDefinition = {
                  key: nextKey,
                  name: "Nuevo stream",
                  color: "#64748b",
                  order: (streams.at(-1)?.order ?? 0) + 1,
                  status: "PLANNED",
                  priority: "MEDIUM",
                };
                updateRoadmap({ ...roadmap, streams: [...streams, next] });
              }}
            >
              Nuevo stream
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </DndProvider>
  );
}

function StreamRow({
  stream,
  focused,
  allStreams,
  statusOptions,
  priorityOptions,
  roadmap,
  readOnly,
  onRequestNewStatus,
  onRequestNewPriority,
  onChange,
  onReorderStream,
  onReassignInitiative,
}: {
  stream: RoadmapStreamDefinition;
  focused: boolean;
  allStreams: RoadmapStreamDefinition[];
  statusOptions: Array<{ value: RoadmapStatus; label: string }>;
  priorityOptions: Array<{ value: RoadmapPriority; label: string }>;
  roadmap: ImplementationRoadmap;
  readOnly: boolean;
  onRequestNewStatus: (streamKey: string) => void;
  onRequestNewPriority: (streamKey: string) => void;
  onChange: (nextStreams: RoadmapStreamDefinition[]) => void;
  onReorderStream: (streamKey: RoadmapStreamKey, newIndex: number) => void;
  onReassignInitiative: (initiativeId: string, targetStreamKey: RoadmapStreamKey) => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!focused) return;
    const t = setTimeout(() => {
      ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
    return () => clearTimeout(t);
  }, [focused]);

  const usedCount = useMemo(() => {
    return roadmap.phases.flatMap((p) => p.initiatives).filter((i) => i.stream === stream.key).length;
  }, [roadmap.phases, stream.key]);

  const usedInitiatives = useMemo(() => {
    const list: Initiative[] = [];
    roadmap.phases.forEach((p) => {
      p.initiatives.forEach((i) => {
        if (i.stream === stream.key) list.push(i);
      });
    });
    return list;
  }, [roadmap.phases, stream.key]);

  const sortedStreams = useMemo(() => {
    return allStreams.slice().sort((a, b) => a.order - b.order);
  }, [allStreams]);

  const streamIndex = useMemo(() => {
    return Math.max(0, sortedStreams.findIndex((s) => s.key === stream.key));
  }, [sortedStreams, stream.key]);

  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: "roadmap.stream",
      item: { streamKey: stream.key, fromIndex: streamIndex },
      canDrag: !readOnly,
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [readOnly, stream.key, streamIndex]
  );

  const [, dropRef] = useDrop(
    () => ({
      accept: "roadmap.stream",
      canDrop: () => !readOnly,
      hover: (item: any) => {
        if (!item?.streamKey) return;
        if (item.streamKey === stream.key) return;
        onReorderStream(item.streamKey, streamIndex);
      },
    }),
    [readOnly, onReorderStream, stream.key, streamIndex]
  );

  const handleRef = (el: HTMLDivElement | null) => {
    dragRef(el);
    dropRef(el);
  };

  return (
    <div
      ref={ref}
      className={`rounded-2xl border bg-white dark:bg-white/[0.02] p-4 shadow-sm transition-shadow ${
        focused
          ? "border-[#28b8d5] shadow-[0_0_0_3px_rgba(40,184,213,0.18)]"
          : "border-gray-200 dark:border-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className={`min-w-[240px] flex-1 ${isDragging ? "opacity-60" : ""}`}>
          <div className="flex items-center gap-2">
            <div
              ref={handleRef}
              className={`h-9 w-9 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.03] flex items-center justify-center ${
                readOnly ? "opacity-60" : "cursor-grab active:cursor-grabbing hover:bg-gray-50 dark:hover:bg-white/[0.06]"
              }`}
              title={readOnly ? "Bloqueado" : "Arrastra para reordenar"}
            >
              <GripVertical size={16} className="text-gray-700 dark:text-white/70" />
            </div>
            <span
              className="inline-flex h-3 w-3 rounded-full border border-gray-200 dark:border-white/[0.10]"
              style={{ background: stream.color ?? "#64748b" }}
              title="Color"
            />
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{stream.name}</div>
            <span className="text-[11px] text-gray-500 dark:text-white/40 font-mono">{stream.key}</span>
            <span className="ml-1 text-[11px] font-mono text-gray-500 dark:text-white/40">
              #{streamIndex + 1}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-white/40 mt-1">
            {usedCount} iniciativa(s) asignada(s)
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={stream.name}
            disabled={readOnly}
            onChange={(e) => {
              const next = allStreams.map((s) => (s.key === stream.key ? { ...s, name: e.target.value } : s));
              onChange(next);
            }}
            className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90 w-[220px]"
            placeholder="Nombre del stream"
          />
          <input
            type="color"
            value={stream.color ?? "#64748b"}
            disabled={readOnly}
            onChange={(e) => {
              const next = allStreams.map((s) => (s.key === stream.key ? { ...s, color: e.target.value } : s));
              onChange(next);
            }}
            className="h-9 w-10 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04]"
            title="Color"
          />
          <select
            value={stream.status ?? "PLANNED"}
            disabled={readOnly}
            onChange={(e) => {
              if (e.target.value === ADD_NEW_STATUS_VALUE) {
                onRequestNewStatus(stream.key);
                return;
              }
              const next = allStreams.map((s) =>
                s.key === stream.key ? { ...s, status: e.target.value as RoadmapStatus } : s
              );
              onChange(next);
            }}
            className="h-9 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
            title="Estado del stream"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value={ADD_NEW_STATUS_VALUE}>+ Nuevo estado…</option>
          </select>
          <select
            value={stream.priority ?? "MEDIUM"}
            disabled={readOnly}
            onChange={(e) => {
              if (e.target.value === ADD_NEW_PRIORITY_VALUE) {
                onRequestNewPriority(stream.key);
                return;
              }
              const next = allStreams.map((s) =>
                s.key === stream.key ? { ...s, priority: e.target.value as RoadmapPriority } : s
              );
              onChange(next);
            }}
            className="h-9 px-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
            title="Prioridad del stream"
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            <option value={ADD_NEW_PRIORITY_VALUE}>+ Nueva prioridad…</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            disabled={readOnly || usedCount > 0 || allStreams.length <= 1}
            onClick={() => {
              onChange(allStreams.filter((s) => s.key !== stream.key));
            }}
          >
            <span
              title={
                usedCount > 0
                  ? "No se puede eliminar: primero reasigna las iniciativas"
                  : allStreams.length <= 1
                    ? "Debe existir al menos un stream"
                    : "Eliminar stream"
              }
            >
              Eliminar
            </span>
          </Button>
        </div>
      </div>

      {usedInitiatives.length ? (
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-3">
          <div className="text-xs font-medium text-gray-700 dark:text-white/80 mb-2">
            Iniciativas en este stream
          </div>
          <div className="space-y-2">
            {usedInitiatives.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-gray-500 dark:text-white/40 truncate">
                    {i.code ?? i.id}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {i.name}
                  </div>
                </div>
                <select
                  disabled={readOnly || sortedStreams.length <= 1}
                  value={stream.key}
                  onChange={(e) => onReassignInitiative(i.id, e.target.value as RoadmapStreamKey)}
                  className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-800 dark:text-white/90"
                  title="Reasignar a otro stream"
                >
                  {sortedStreams.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 dark:text-white/40">
            Reasigna todas las iniciativas antes de eliminar el stream.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3 bg-gray-50 dark:bg-white/[0.04]">
      <div className="text-xs text-gray-500 dark:text-white/40">{label}</div>
      <div className="text-base font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3 bg-gray-50 dark:bg-white/[0.04] text-center">
      <div className="text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
      <div className="text-[11px] text-gray-500 dark:text-white/40">{label}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3 bg-gray-50 dark:bg-white/[0.04]">
      <div className="text-xs text-gray-500 dark:text-white/40">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] p-4 bg-gray-50 dark:bg-white/[0.03]">
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</div>
      {children}
    </div>
  );
}

function DetailPanel({
  roadmap,
  initiative,
  phase,
  statusLabel,
  priorityLabel,
  streamLabel,
  stageBadge,
  severityBadge,
  onEditPhase,
  onEdit,
  onClose,
  readOnly,
}: {
  roadmap: ImplementationRoadmap;
  initiative: Initiative | null;
  phase: Phase | null;
  statusLabel: Record<string, string>;
  priorityLabel: Record<string, string>;
  streamLabel: Record<string, string>;
  stageBadge: Record<"AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP", string>;
  severityBadge: Record<"Alta" | "Media" | "Baja", string>;
  onEditPhase: (phaseId: string) => void;
  onEdit: (phaseId: string, initiativeId: string) => void;
  onClose: () => void;
  readOnly: boolean;
}) {
  const selected = initiative ?? null;
  const selectedPhase =
    phase ??
    (selected
      ? roadmap.phases.find((p) => p.initiatives.some((i) => i.id === selected.id)) ?? null
      : null);

  const deps = React.useMemo(() => {
    if (!selected) return [];
    const all = roadmap.phases.flatMap((p) => p.initiatives);
    const map = new Map(all.map((i) => [i.id, i] as const));
    return selected.dependency_ids.map((id) => map.get(id)).filter(Boolean) as Initiative[];
  }, [roadmap.phases, selected]);

  if (!selected && !selectedPhase) return null;

  return (
    <div className="rounded-3xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Detalle</div>
          <div className="text-xs text-gray-500 dark:text-white/40">
            {selected ? "Iniciativa" : "Fase"} seleccionada.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected && selectedPhase ? (
            <button
              type="button"
              onClick={() => onEdit(selectedPhase.id, selected.id)}
              disabled={readOnly}
              className="shrink-0 h-9 px-3 rounded-xl border border-[#28b8d5] bg-[#28b8d5] text-white text-sm hover:bg-[#1ea7c3] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Editar
            </button>
          ) : null}
          {!selected && selectedPhase ? (
            <button
              type="button"
              onClick={() => onEditPhase(selectedPhase.id)}
              disabled={readOnly}
              className="shrink-0 h-9 px-3 rounded-xl border border-[#28b8d5] bg-[#28b8d5] text-white text-sm hover:bg-[#1ea7c3] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Editar fase
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-9 px-3 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.02] text-sm text-gray-700 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {selectedPhase && !selected ? (
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedPhase.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-white/40">
                {selectedPhase.start_date} - {selectedPhase.end_date}
              </div>
              {selectedPhase.description ? (
                <div className="text-sm text-gray-600 dark:text-white/60 mt-2">
                  {selectedPhase.description}
                </div>
              ) : null}
            </div>

          <div className="grid grid-cols-2 gap-3">
            <Info label="Iniciativas" value={String(selectedPhase.initiatives.length)} />
            <Info label="Presupuesto" value={formatCurrency(selectedPhase.budget_total)} />
            <Info
              label="Completadas"
              value={String(selectedPhase.initiatives.filter((i) => i.status === "DONE").length)}
            />
            <Info
              label="Bloqueadas"
              value={String(selectedPhase.initiatives.filter((i) => i.status === "BLOCKED").length)}
            />
          </div>

          <Section title="Iniciativas en esta fase">
            <div className="space-y-2">
              {selectedPhase.initiatives.map((i) => (
                <div
                  key={i.id}
                  className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3 bg-white dark:bg-white/[0.02] flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-gray-500 dark:text-white/40">
                      {i.code ?? i.id}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {i.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-white/40 truncate">
                      {streamLabel[i.stream]} - {i.owner}
                    </div>
                  </div>
                  <button
                    onClick={() => onEdit(selectedPhase.id, i.id)}
                    disabled={readOnly}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70 text-sm hover:bg-gray-200 dark:hover:bg-white/[0.10] disabled:opacity-50"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </Section>
          </div>
        ) : null}

      {selected ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {selected.code ? (
                <span className="text-[12px] font-semibold text-gray-700 dark:text-white/70 font-mono">
                  {selected.code}
                </span>
              ) : null}
              {selected.project_ref ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70 font-mono">
                  {selected.project_ref}
                </span>
              ) : null}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{selected.name}</div>
            <div className="text-sm text-gray-500 dark:text-white/40">{selected.description}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Info label="Estado" value={statusLabel[selected.status] ?? fallbackLabel(selected.status)} />
            <Info label="Prioridad" value={priorityLabel[selected.priority] ?? fallbackLabel(selected.priority)} />
            <Info label="Stream" value={streamLabel[selected.stream]} />
            <Info label="Owner" value={selected.owner} />
          </div>

          <Section title="Estado de la iniciativa">
            <div className="text-sm text-gray-600 dark:text-white/60">
              Para cambiar estado o prioridad usa el botón <span className="font-semibold">Editar</span>.
            </div>
          </Section>

          <Section title="Quick wins">
            {selected.quick_wins?.length ? (
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-white/80">
                {selected.quick_wins.map((w, idx) => (
                  <li key={`${selected.id}-qw-${idx}`}>{w}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500 dark:text-white/40">No definidos.</div>
            )}
          </Section>

          <Section title="Dependencias">
            {deps.length ? (
              <div className="space-y-2">
                {deps.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-3 bg-gray-50 dark:bg-white/[0.03]"
                  >
                    <div className="text-xs text-gray-500 dark:text-white/40">{d.code ?? d.id}</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{d.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-white/40">Sin dependencias.</div>
            )}
          </Section>

          <Section title="Trazabilidad">
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">
                  Artefactos relacionados
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.traceability?.artifacts?.length ? (
                    selected.traceability!.artifacts!.map((a) => (
                      <span
                        key={`${selected.id}-art-${a.id}`}
                        className={`text-[11px] px-2 py-0.5 rounded-full ${stageBadge[a.stage]}`}
                      >
                        {a.stage}: {a.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-white/40">Sin referencias.</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Brechas</div>
                <div className="flex flex-wrap gap-2">
                  {selected.traceability?.gaps?.length ? (
                    selected.traceability!.gaps!.map((g) => (
                      <span
                        key={`${selected.id}-gap-${g.id}`}
                        className={`text-[11px] px-2 py-0.5 rounded-full ${severityBadge[g.severity]}`}
                        title={g.title}
                      >
                        {g.id}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-white/40">Sin brechas.</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">Madurez (DAMA)</div>
                <div className="flex flex-wrap gap-2">
                  {selected.traceability?.maturity?.length ? (
                    selected.traceability!.maturity!.map((m, idx) => (
                      <span
                        key={`${selected.id}-mat-${idx}`}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70"
                      >
                        {m.subdomain ? `${m.domain} / ${m.subdomain}` : m.domain}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-white/40">Sin dominios.</span>
                  )}
                </div>
              </div>
            </div>
          </Section>

        </div>
      ) : null}
      </div>
    </div>
  );
}



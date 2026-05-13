"use client";

import React, { useCallback, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  ImplementationRoadmap,
  RoadmapPriority,
  RoadmapStatus,
  RoadmapStreamKey,
} from "@/lib/types/roadmap.types";
import { InitiativeNode, PhaseGroupNode } from "./RoadmapPipelineNodes";

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  PLANNED: "Planeado",
  IN_PROGRESS: "En progreso",
  DONE: "Completado",
  BLOCKED: "Bloqueado",
  CANCELLED: "Cancelado",
};

const PRIORITY_LABEL: Record<RoadmapPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
};

const fallbackLabel = (raw: string) =>
  raw
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const nodeTypes: NodeTypes = {
  phaseGroup: PhaseGroupNode as unknown as NodeTypes["phaseGroup"],
  initiative: InitiativeNode as unknown as NodeTypes["initiative"],
};

type LaneLayoutItem = {
  key: RoadmapStreamKey;
  label: string;
  top: number;
  height: number;
};

const getMinimapColor = (node: Node) => {
  if (node.type === "phaseGroup") return "#111827";
  const status = (node.data as any)?.initiative?.status as RoadmapStatus | undefined;
  if (!status) return "#94a3b8";
  if (status === "DONE") return "#10b981";
  if (status === "IN_PROGRESS") return "#3b82f6";
  if (status === "BLOCKED") return "#f59e0b";
  if (status === "CANCELLED") return "#ef4444";
  return "#64748b";
};

type RoadmapPipelineCanvasProps = {
  roadmap: ImplementationRoadmap;
  selectedInitiativeId: string | null;
  onSelectInitiative: (id: string) => void;
  selectedPhaseId?: string | null;
  onSelectPhase?: (phaseId: string) => void;
  onClearSelection?: () => void;
  onAddInitiative?: (phaseId: string) => void;
  onAddStream?: (phaseId: string) => void;
  onReorderPhase?: (phaseId: string, newIndex: number) => void;
  onReorderInitiative?: (
    phaseId: string,
    initiativeId: string,
    newIndexWithinStream: number
  ) => void;
  onMoveInitiative?: (
    fromPhaseId: string,
    initiativeId: string,
    targetPhaseId: string,
    targetStreamKey: RoadmapStreamKey,
    newIndexWithinStream: number
  ) => void;
  onEditStream?: (streamKey: string) => void;
  readOnly: boolean;
  compact?: boolean;
};

export default function RoadmapPipelineCanvas({
  roadmap,
  selectedInitiativeId,
  onSelectInitiative,
  selectedPhaseId = null,
  onSelectPhase,
  onClearSelection,
  onAddInitiative,
  onAddStream,
  onReorderPhase,
  onReorderInitiative,
  onMoveInitiative,
  onEditStream,
  readOnly,
  compact = false,
}: RoadmapPipelineCanvasProps) {
  const streams = useMemo(() => {
    const list = (roadmap.streams ?? []).slice().sort((a, b) => a.order - b.order);
    return list.map((s) => ({ key: s.key, label: s.name }));
  }, [roadmap.streams]);

  const streamColor = useMemo(() => {
    const map: Record<string, string> = {};
    (roadmap.streams ?? []).forEach((s) => {
      if (s.color) map[s.key] = s.color;
    });
    return map;
  }, [roadmap.streams]);

  const laneMinHeight = compact ? 44 : 72;
  const headerHeight = compact ? 82 : 92;
  const nodeStrideY = compact ? 84 : 108; // keep in sync with drag snapping
  const laneTopOffset = compact ? 26 : 48;
  const laneBottomPadding = compact ? 14 : 28;
  const nodeVisualHeight = compact ? 44 : 82;
  const nodeCenterOffset = compact ? 24 : 37;
  const nodeWidth = compact ? 238 : 268;
  const groupWidth = 340;
  const groupGap = 56;

  const phaseStreams = useCallback(
    (phaseId: string) => {
      const phase = roadmap.phases.find((p) => p.id === phaseId);
      if (!phase) return streams;
      const enabled = phase.enabled_stream_keys;
      if (!enabled?.length) return streams;
      const set = new Set(enabled);
      const subset = streams.filter((s) => set.has(s.key));
      return subset.length ? subset : streams;
    },
    [roadmap.phases, streams]
  );

  const phaseHeights = useMemo(() => {
    return roadmap.phases.map((p) => {
      const lanes = phaseStreams(p.id);
      const laneHeights = lanes.map((s) => {
        const count = p.initiatives.filter((i) => i.stream === s.key).length;
        if (count === 0) return laneMinHeight;
        return Math.max(
          laneMinHeight,
          laneTopOffset + nodeVisualHeight + Math.max(0, count - 1) * nodeStrideY + laneBottomPadding
        );
      });
      const lanesTotal = laneHeights.reduce((a, b) => a + b, 0);
      return headerHeight + lanesTotal + 48;
    });
  }, [
    roadmap.phases,
    phaseStreams,
    headerHeight,
    laneMinHeight,
    laneTopOffset,
    nodeVisualHeight,
    nodeStrideY,
    laneBottomPadding,
  ]);

  const phaseLaneLayout = useCallback(
    (phaseId: string): LaneLayoutItem[] => {
      const phase = roadmap.phases.find((p) => p.id === phaseId);
      const lanes = phaseStreams(phaseId);
      if (!phase) {
        let curTop = 0;
        return lanes.map((l) => {
          const item = { key: l.key, label: l.label, top: curTop, height: laneMinHeight };
          curTop += laneMinHeight;
          return item;
        });
      }

      let top = 0;
      return lanes.map((l) => {
        const count = phase.initiatives.filter((i) => i.stream === l.key).length;
        const height =
          count === 0
            ? laneMinHeight
            : Math.max(
                laneMinHeight,
                laneTopOffset + nodeVisualHeight + Math.max(0, count - 1) * nodeStrideY + laneBottomPadding
              );
        const item = { key: l.key, label: l.label, top, height };
        top += height;
        return item;
      });
    },
    [laneBottomPadding, laneMinHeight, laneTopOffset, nodeStrideY, nodeVisualHeight, phaseStreams, roadmap.phases]
  );

  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    roadmap.phases.forEach((phase, phaseIndex) => {
      const lanes = phaseStreams(phase.id);
      const laneLayout = phaseLaneLayout(phase.id);
      const x = phaseIndex * (groupWidth + groupGap);
      const y = 0;
      const height = phaseHeights[phaseIndex] ?? 760;

      nodes.push({
        id: phase.id,
        type: "phaseGroup",
        position: { x, y },
        draggable: !readOnly,
        selectable: true,
        data: {
          phase,
          streams: lanes,
          laneLayout,
          laneHeight: laneMinHeight,
          headerHeight,
          onAddInitiative,
          onAddStream,
          onSelectPhase,
          selected: phase.id === selectedPhaseId,
          readOnly,
          onEditStream,
          streamColor,
        },
        style: {
          width: groupWidth,
          height,
        },
      });

      lanes.forEach((s, sIdx) => {
        const list = phase.initiatives.filter((i) => i.stream === s.key);
        list.forEach((ini, idx) => {
          const childX = 40;
          const laneTop = laneLayout[sIdx]?.top ?? sIdx * laneMinHeight;
          const childY = headerHeight + laneTop + laneTopOffset + idx * nodeStrideY;
          nodes.push({
            id: ini.id,
            type: "initiative",
            parentId: phase.id,
            extent: "parent",
            position: { x: childX, y: childY },
            draggable: !readOnly,
            data: {
              initiative: ini,
              streamLabel: s.label,
              statusLabel: STATUS_LABEL[ini.status] ?? fallbackLabel(ini.status),
              priorityLabel: PRIORITY_LABEL[ini.priority] ?? fallbackLabel(ini.priority),
              onSelect: onSelectInitiative,
              selected: ini.id === selectedInitiativeId,
              streamColor: streamColor[ini.stream],
              compact,
            },
            style: {
              width: nodeWidth,
            },
          });
        });
      });
    });

    return nodes;
  }, [
    roadmap.phases,
    streams,
    phaseLaneLayout,
    phaseHeights,
    onAddInitiative,
    onAddStream,
    onSelectInitiative,
    selectedInitiativeId,
    onSelectPhase,
    selectedPhaseId,
    readOnly,
    laneMinHeight,
    laneTopOffset,
  ]);

  const allInitiatives = useMemo(() => roadmap.phases.flatMap((p) => p.initiatives), [roadmap.phases]);

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const exists = new Set(allInitiatives.map((i) => i.id));
    allInitiatives.forEach((ini) => {
      ini.dependency_ids.forEach((dep) => {
        if (!exists.has(dep)) return;
        const highlight = ini.id === selectedInitiativeId || dep === selectedInitiativeId;
        edges.push({
          id: `dep-${dep}-${ini.id}`,
          source: dep,
          target: ini.id,
          type: "smoothstep",
          animated: true,
          className: highlight ? "roadmap-edge roadmap-edge--highlight" : "roadmap-edge",
          style: {
            // Dependencies between initiatives: distinct from phase links.
            stroke: highlight ? "#2563eb" : "#60a5fa",
            strokeWidth: highlight ? 2 : 1.25,
            strokeDasharray: highlight ? "6 6" : "5 7",
            opacity: highlight ? 1 : 0.85,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: highlight ? "#2563eb" : "#60a5fa",
          },
        });
      });
    });

    // Phase-to-phase arrows (make stage progression clearer)
    roadmap.phases.forEach((phase, idx) => {
      const next = roadmap.phases[idx + 1];
      if (!next) return;
      edges.push({
        id: `phase-link-${phase.id}-${next.id}`,
        source: phase.id,
        target: next.id,
        type: "smoothstep",
        animated: true,
        className: "roadmap-edge roadmap-edge--phase",
        style: {
          // Phase links: neutral gray, different from initiative dependencies.
          stroke: "#94a3b8",
          strokeWidth: 1.25,
          strokeDasharray: "3 9",
          opacity: 0.7,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: "#94a3b8",
        },
      });
    });
    return edges;
  }, [allInitiatives, roadmap.phases, selectedInitiativeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handlePaneClick = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      if (node.type === "phaseGroup") {
        onSelectPhase?.(node.id);
        return;
      }
      if (node.type === "initiative") {
        onSelectInitiative(node.id);
      }
    },
    [onSelectInitiative, onSelectPhase]
  );

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      if (readOnly) return;

      if (node.type === "phaseGroup") {
        const stride = groupWidth + groupGap;
        const newIndex = Math.max(
          0,
          Math.min(roadmap.phases.length - 1, Math.round(node.position.x / stride))
        );
        onReorderPhase?.(node.id, newIndex);
        return;
      }

      if (node.type === "initiative") {
        const phaseId = node.parentId;
        const ini = (node.data as any)?.initiative as { id: string; stream?: RoadmapStreamKey } | undefined;
        if (!phaseId || !ini?.id || !ini.stream) return;

        const layout = phaseLaneLayout(phaseId);
        if (!layout.length) return;

        const phase = roadmap.phases.find((p) => p.id === phaseId);
        if (!phase) return;

        // Determine lane by Y position, then compute index within that lane.
        const y = node.position.y;
        // Use center point so it "snaps" streams more intuitively.
        const centerY = y + nodeCenterOffset;
        const within = Math.max(0, centerY - headerHeight);
        const detectedLane = layout.findIndex((l) => within >= l.top && within < l.top + l.height);
        const laneIdx = Math.max(0, Math.min(layout.length - 1, detectedLane === -1 ? layout.length - 1 : detectedLane));
        const targetStream = layout[laneIdx]?.key ?? ini.stream;

        const laneBaseY = headerHeight + (layout[laneIdx]?.top ?? 0) + laneTopOffset;
        const laneInitiatives = phase.initiatives.filter((i) => i.stream === targetStream && i.id !== ini.id);
        const rel = centerY - laneBaseY;
        const rawIndex = Math.round(rel / nodeStrideY);
        const newIndex = Math.max(0, Math.min(laneInitiatives.length, rawIndex));

        if (onMoveInitiative) {
          onMoveInitiative(phaseId, ini.id, phaseId, targetStream, newIndex);
          return;
        }
        if (targetStream === ini.stream) {
          const inStream = phase.initiatives.filter((i) => i.stream === ini.stream);
          const clamped = Math.max(0, Math.min(inStream.length - 1, rawIndex));
          onReorderInitiative?.(phaseId, ini.id, clamped);
        }
      }
    },
    [
      groupGap,
      groupWidth,
      headerHeight,
      laneTopOffset,
      nodeStrideY,
      nodeCenterOffset,
      onReorderInitiative,
      onReorderPhase,
      onMoveInitiative,
      phaseLaneLayout,
      readOnly,
      roadmap.phases,
    ]
  );

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0a0a0a]">
      <style jsx global>{`
        /* Improve directionality: moving dash + arrow marker */
        .roadmap-edge path {
          stroke-linecap: round;
        }
        .react-flow__edge.animated.roadmap-edge path {
          animation: roadmap-dash 1.1s linear infinite;
        }
        .react-flow__edge.animated.roadmap-edge--highlight path {
          animation-duration: 0.85s;
        }
        .react-flow__edge.animated.roadmap-edge--phase path {
          animation-duration: 1.6s;
        }
        @keyframes roadmap-dash {
          to {
            stroke-dashoffset: -22;
          }
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.2}
        maxZoom={1.6}
        onPaneClick={handlePaneClick}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d1d5db"
          className="dark:!bg-[#0a0a0a]"
        />
        <Controls
          className="!rounded-xl !border-gray-200 dark:!border-white/[0.08] !bg-white dark:!bg-[#111111] !shadow-sm"
          showInteractive={false}
        />
        <MiniMap
          className="!rounded-xl !border-gray-200 dark:!border-white/[0.08] !bg-white dark:!bg-[#111111]"
          nodeColor={getMinimapColor}
          maskColor="rgba(0,0,0,0.08)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

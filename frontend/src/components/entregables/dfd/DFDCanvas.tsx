"use client";
import React, { useMemo, useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type FinalConnectionState,
  type NodeTypes,
  type EdgeTypes,
  ConnectionLineType,
  ConnectionMode,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";

import ProcesoNodeComponent, { type ProcesoNodeData } from "./ProcesoNode";
import AlmacenNodeComponent, { type AlmacenNodeData } from "./AlmacenNode";
import EntidadExternaNodeComponent, {
  type EntidadExternaNodeData,
} from "./EntidadExternaNode";
import FlujoEdgeComponent, { type FlujoEdgeData } from "./FlujoEdge";
import type {
  DiagramaFlujoDatos,
  EstiloLineaDFD,
  TipoRelacionDFD,
} from "@/lib/types/dfd.types";
import {
  DEFAULT_DFD_LINE_STYLE,
  DEFAULT_DFD_RELATION,
  DFD_LINE_STYLE_OPTIONS,
  DFD_RELATION_OPTIONS,
  DFD_VALID_CONNECTION_RULES,
  getInvalidConnectionMessage,
  isValidDFDConnection,
} from "./dfdNotation";

// ============================================================================
// Canvas del Diagrama de Flujo de Datos usando reactflow
// Soporta 3 tipos de nodos: proceso, almacen, entidad_externa
// y 1 tipo de edge: flujo de datos con etiqueta
// ============================================================================

interface DFDCanvasProps {
  dfd: DiagramaFlujoDatos;
  nodoSeleccionadoId: string | null;
  flujoSeleccionadoId: string | null;
  onSelectNodo: (id: string) => void;
  onSelectFlujo: (id: string) => void;
  onDeselectAll: () => void;
  onNodeDragStop: (id: string, x: number, y: number) => void;
  onNodeResize?: (id: string, width: number, height: number) => void;
  onConnectFlow?: (connection: Connection) => void;
  canCreateConnections?: boolean;
  onAddProcess?: () => void;
  onAddDataStore?: () => void;
  onAddExternalEntity?: () => void;
  onAddDataFlow?: () => void;
  onInvalidConnectionAttempt?: (message: string) => void;
  canAddDataFlow?: boolean;
  defaultLineStyle?: EstiloLineaDFD;
  onChangeDefaultLineStyle?: (style: EstiloLineaDFD) => void;
  defaultFlowRelation?: TipoRelacionDFD;
  onChangeDefaultFlowRelation?: (relation: TipoRelacionDFD) => void;
  onAddComment?: (nodeId: string, contenido: string) => Promise<void>;
}

const nodeTypes: NodeTypes = {
  proceso: ProcesoNodeComponent as unknown as NodeTypes["proceso"],
  almacen: AlmacenNodeComponent as unknown as NodeTypes["almacen"],
  entidad_externa:
    EntidadExternaNodeComponent as unknown as NodeTypes["entidad_externa"],
};

const edgeTypes: EdgeTypes = {
  flujo: FlujoEdgeComponent as unknown as EdgeTypes["flujo"],
};

const DFD_INVALID_CONNECTION_RULES: string[] = [
  "External Entity ↔ External Entity",
  "External Entity ↔ Data Store",
  "Data Store ↔ Data Store",
];

function ProcessIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function DataStoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 5v14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ExternalEntityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="14" rx="1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DataFlowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <path d="M3 12h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 8l5 4-5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getFlowRelationMarkers(
  relation: TipoRelacionDFD,
  color: string
): {
  markerStart?: {
    type: MarkerType;
    color: string;
    width: number;
    height: number;
    orient?: string;
  };
  markerEnd?: {
    type: MarkerType;
    color: string;
    width: number;
    height: number;
    orient?: string;
  };
} {
  if (relation === "linea") {
    return {};
  }

  if (relation === "flecha_cerrada") {
    return {
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    };
  }

  if (relation === "doble_flecha") {
    return {
      markerStart: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
        orient: "auto-start-reverse",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    };
  }

  return {
    markerEnd: {
      type: MarkerType.Arrow,
      color,
      width: 16,
      height: 16,
    },
  };
}

/** Color del minimap según tipo de nodo */
function getMinimapColor(tipo: string): string {
  switch (tipo) {
    case "proceso":
      return "#28b8d5";
    case "almacen":
      return "#10b981";
    case "entidad_externa":
      return "#64748b";
    default:
      return "#94a3b8";
  }
}

export default function DFDCanvas({
  dfd,
  nodoSeleccionadoId,
  flujoSeleccionadoId,
  onSelectNodo,
  onSelectFlujo,
  onDeselectAll,
  onNodeDragStop,
  onNodeResize,
  onConnectFlow,
  canCreateConnections = false,
  onAddProcess,
  onAddDataStore,
  onAddExternalEntity,
  onAddDataFlow,
  onInvalidConnectionAttempt,
  canAddDataFlow = false,
  defaultLineStyle = DEFAULT_DFD_LINE_STYLE,
  onChangeDefaultLineStyle,
  defaultFlowRelation = DEFAULT_DFD_RELATION,
  onChangeDefaultFlowRelation,
  onAddComment,
}: DFDCanvasProps) {
  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [showRelationMenu, setShowRelationMenu] = useState(false);
  const [showDataFlowHelp, setShowDataFlowHelp] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [quickCommentText, setQuickCommentText] = useState("");

  React.useEffect(() => {
    if (!canCreateConnections && isCreatingConnection) {
      setIsCreatingConnection(false);
      setIsDraggingConnection(false);
    }
    if (!canCreateConnections) {
      setShowRelationMenu(false);
    }
  }, [canCreateConnections, isCreatingConnection]);

  React.useEffect(() => {
    if (!canAddDataFlow && isCreatingConnection) {
      setIsCreatingConnection(false);
      setIsDraggingConnection(false);
    }
    if (!canAddDataFlow) {
      setShowRelationMenu(false);
    }
  }, [canAddDataFlow, isCreatingConnection]);

  React.useEffect(() => {
    if (!canCreateConnections) return;

    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTypingField = Boolean(
        target &&
          (target.isContentEditable ||
            tagName === "INPUT" ||
            tagName === "TEXTAREA" ||
            tagName === "SELECT")
      );

      if (isTypingField) return;

      if (event.key === "Escape" && isCreatingConnection) {
        event.preventDefault();
        setIsCreatingConnection(false);
        setIsDraggingConnection(false);
        setShowRelationMenu(false);
        setShowDataFlowHelp(false);
        return;
      }

      if (event.key.toLowerCase() === "l" && canAddDataFlow) {
        event.preventDefault();
        setIsCreatingConnection((prev) => !prev);
        setIsDraggingConnection(false);
        setShowRelationMenu(false);
        setShowDataFlowHelp(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [canCreateConnections, canAddDataFlow, isCreatingConnection]);

  const handleNodeRightClick = useCallback(
    (nodeId: string, x: number, y: number) => {
      setContextMenu({ nodeId, x, y });
      setQuickCommentText("");
    },
    []
  );

  // Convertir nodos del DFD a nodos de reactflow
  const initialNodes: Node[] = useMemo(
    () =>
      dfd.nodos.map((nodo) => {
        const comentariosCount = dfd.comentarios.filter(
          (c) => c.referencia_id === nodo.id && c.referencia_tipo === "nodo"
        ).length;

        const baseData = {
          nodo,
          seleccionado: nodo.id === nodoSeleccionadoId,
          onSelect: onSelectNodo,
          onNodeRightClick: handleNodeRightClick,
          comentariosCount,
          mostrarPuntosConexion: canCreateConnections && isCreatingConnection,
        };

        return {
          id: nodo.id,
          type: nodo.tipo,
          position: { x: nodo.posicion_x, y: nodo.posicion_y },
          draggable: true,
          resizing: true,
          style: {
            willChange: "transform",
          },
          width: nodo.width ?? undefined,
          height: nodo.height ?? undefined,
          data: baseData satisfies
            | ProcesoNodeData
            | AlmacenNodeData
            | EntidadExternaNodeData,
        };
      }),
    [
      dfd.nodos,
      dfd.comentarios,
      nodoSeleccionadoId,
      onSelectNodo,
      handleNodeRightClick,
      canCreateConnections,
      isCreatingConnection,
    ]
  );

  // Convertir flujos a edges de reactflow
  const initialEdges: Edge[] = useMemo(
    () =>
      dfd.flujos.map((flujo) => {
        const isSelected = flujo.id === flujoSeleccionadoId;
        const isInvalid = !isValidDFDConnection(
          dfd.nodos,
          flujo.origen_id,
          flujo.destino_id
        );
        const markerColor = isInvalid
          ? "#DC2626"
          : isSelected
            ? "#0EA5E9"
            : "#1F2937";
        const resolvedRelation: TipoRelacionDFD =
          flujo.tipo_relacion ??
          (flujo.tipo_flujo === "bidireccional"
            ? "doble_flecha"
            : DEFAULT_DFD_RELATION);
        const markers = getFlowRelationMarkers(resolvedRelation, markerColor);

        return {
          id: flujo.id,
          source: flujo.origen_id,
          sourceHandle: flujo.source_handle ?? null,
          target: flujo.destino_id,
          targetHandle: flujo.target_handle ?? null,
          type: "flujo",
          markerStart: markers.markerStart,
          markerEnd: markers.markerEnd,
          data: {
            etiqueta: flujo.etiqueta,
            seleccionado: isSelected,
            invalido: isInvalid,
            onSelect: onSelectFlujo,
            tipo_flujo: flujo.tipo_flujo,
            tipo_relacion: resolvedRelation,
            estilo_linea: flujo.estilo_linea ?? defaultLineStyle,
          } satisfies FlujoEdgeData,
        };
      }),
    [dfd.flujos, dfd.nodos, flujoSeleccionadoId, onSelectFlujo, defaultLineStyle]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sincronizar cuando cambian los datos del DFD
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Manejar cambios en los nodos (posición, tamaño, etc.)
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // Detectar cambios de tamaño — solo cuando el usuario redimensiona explícitamente
      changes.forEach((change) => {
        if (
          change.type === "dimensions" &&
          change.resizing === true &&
          onNodeResize &&
          change.dimensions?.width &&
          change.dimensions?.height
        ) {
          onNodeResize(change.id, change.dimensions.width, change.dimensions.height);
        }
      });
      // Llamar al onNodesChange original
      onNodesChange(changes);
    },
    [onNodeResize, onNodesChange]
  );

  // Guardar posición cuando se arrastra un nodo
  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeDragStop(node.id, Math.round(node.position.x), Math.round(node.position.y));
    },
    [onNodeDragStop]
  );

  // Deseleccionar al hacer click en el canvas vacío
  const handlePaneClick = useCallback(() => {
    if (isCreatingConnection) {
      setIsCreatingConnection(false);
      setIsDraggingConnection(false);
    }
    if (showRelationMenu) {
      setShowRelationMenu(false);
    }
    if (showDataFlowHelp) {
      setShowDataFlowHelp(false);
    }
    onDeselectAll();
  }, [isCreatingConnection, onDeselectAll, showDataFlowHelp, showRelationMenu]);

  const handleConnectStart = useCallback(() => {
    setIsCreatingConnection(true);
    setIsDraggingConnection(true);
    setShowRelationMenu(false);
    setShowDataFlowHelp(false);
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (onConnectFlow) {
        onConnectFlow(connection);
      }
      setIsCreatingConnection(false);
      setIsDraggingConnection(false);
      setShowRelationMenu(false);
    },
    [onConnectFlow]
  );

  const handleConnectEnd = useCallback(
    (_: unknown, connectionState?: FinalConnectionState) => {
      const sourceId = connectionState?.fromNode?.id;
      const targetId = connectionState?.toNode?.id;
      const droppedOnHandle = Boolean(connectionState?.toHandle);
      const triedInvalidConnection =
        Boolean(sourceId && targetId && droppedOnHandle) &&
        connectionState?.isValid === false;

      if (triedInvalidConnection && sourceId && targetId) {
        const invalidMessage = getInvalidConnectionMessage(
          dfd.nodos,
          sourceId,
          targetId
        );
        if (invalidMessage) {
          onInvalidConnectionAttempt?.(invalidMessage);
        }
      }

      const successfulDrop = Boolean(connectionState?.toNode && connectionState?.toHandle);

      if (successfulDrop) {
        setIsCreatingConnection(false);
        setIsDraggingConnection(false);
        setShowRelationMenu(false);
        return;
      }

      // Si no conectó en un handle válido, mantenemos el modo conexión para reintentar.
      setIsCreatingConnection(true);
      setIsDraggingConnection(false);
      setShowRelationMenu(false);
      setShowDataFlowHelp(false);
    },
    [dfd.nodos, onInvalidConnectionAttempt]
  );

  const isValidFlowConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      return isValidDFDConnection(dfd.nodos, connection.source, connection.target);
    },
    [dfd.nodos]
  );

  const showCreationToolbar = Boolean(
    onAddProcess ||
      onAddDataStore ||
      onAddExternalEntity ||
      onAddDataFlow ||
      onChangeDefaultLineStyle ||
      onChangeDefaultFlowRelation
  );

  const handleCreateDataFlow = useCallback(() => {
    if (canCreateConnections) {
      const nextShow = !showRelationMenu;
      setShowRelationMenu(nextShow);
      if (nextShow) {
        setIsCreatingConnection(false);
      }
      setIsDraggingConnection(false);
      setShowDataFlowHelp(false);
      return;
    }

    if (onAddDataFlow) {
      onAddDataFlow();
    }
  }, [canCreateConnections, onAddDataFlow, showRelationMenu]);

  const handleSelectRelationAndConnect = useCallback(
    (relation: TipoRelacionDFD) => {
      onChangeDefaultFlowRelation?.(relation);
      setShowRelationMenu(false);
      setIsCreatingConnection(true);
      setIsDraggingConnection(false);
      setShowDataFlowHelp(false);
    },
    [onChangeDefaultFlowRelation]
  );

  const toggleDataFlowHelp = useCallback(() => {
    setShowDataFlowHelp((prev) => !prev);
    setShowRelationMenu(false);
    setIsDraggingConnection(false);
  }, []);

  const handleSubmitQuickComment = useCallback(async () => {
    if (!contextMenu || !quickCommentText.trim() || !onAddComment) return;
    await onAddComment(contextMenu.nodeId, quickCommentText.trim());
    setContextMenu(null);
    setQuickCommentText("");
  }, [contextMenu, quickCommentText, onAddComment]);

  const connectionLineType = (() => {
    if (defaultLineStyle === "rectilinear") return ConnectionLineType.Step;
    if (defaultLineStyle === "round_rectilinear")
      return ConnectionLineType.SmoothStep;
    if (defaultLineStyle === "curve") return ConnectionLineType.Bezier;
    if (defaultLineStyle === "round_oblique")
      return ConnectionLineType.SimpleBezier;
    return ConnectionLineType.Straight;
  })();

  const connectionInstruction = isDraggingConnection
    ? "Suelta en un punto del elemento destino."
    : isCreatingConnection
      ? "Pasa el mouse por un elemento, arrastra desde un punto de origen y suelta en destino. Esc para cancelar."
      : null;

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-white/[0.08] dark:bg-[#0a0a0a] ${
        isCreatingConnection ? "cursor-crosshair" : ""
      }`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onConnectStart={handleConnectStart}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        isValidConnection={isValidFlowConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "flujo",
        }}
        nodeOrigin={[0.5, 0.5]}
        nodesConnectable={canCreateConnections}
        connectionMode={ConnectionMode.Loose}
        connectOnClick={false}
        connectionRadius={30}
        connectionLineType={connectionLineType}
        nodeDragThreshold={0}
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
          nodeColor={(node) => getMinimapColor(node.type ?? "proceso")}
          maskColor="rgba(0,0,0,0.08)"
          pannable
          zoomable
        />
      </ReactFlow>

      {connectionInstruction && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
          <div className="rounded-full border border-sky-300/60 bg-sky-50/95 px-3 py-1 text-[11px] font-semibold text-sky-800 shadow-md dark:border-sky-500/50 dark:bg-sky-950/70 dark:text-sky-100">
            {connectionInstruction}
          </div>
        </div>
      )}

      {showCreationToolbar && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-gray-200/90 bg-white/95 p-2 shadow-2xl shadow-black/15 backdrop-blur dark:border-white/[0.12] dark:bg-[#111111]/95 dark:shadow-black/30">
            {onAddProcess && (
              <button
                onClick={onAddProcess}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#28b8d5]/30 bg-white px-3 py-2 text-xs font-semibold text-[#0f8ba2] shadow-md shadow-[#28b8d5]/20 transition-colors hover:bg-[#ecfbff] dark:bg-[#0f172a] dark:text-[#67d9ec] dark:hover:bg-[#13253a]"
                title="Agregar Process"
              >
                <ProcessIcon />
                Process
              </button>
            )}
            {onAddDataStore && (
              <button
                onClick={onAddDataStore}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/70 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-md shadow-emerald-400/25 transition-colors hover:bg-emerald-50 dark:bg-[#0f172a] dark:text-emerald-300 dark:hover:bg-[#102b22]"
                title="Agregar Data Store"
              >
                <DataStoreIcon />
                Data Store
              </button>
            )}
            {onAddExternalEntity && (
              <button
                onClick={onAddExternalEntity}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md shadow-slate-300/40 transition-colors hover:bg-slate-50 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-[#1d2635]"
                title="Agregar External Entity"
              >
                <ExternalEntityIcon />
                External Entity
              </button>
            )}
            {onAddDataFlow && (
              <div className="relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                {showRelationMenu && canAddDataFlow && (
                  <div className="absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-black/20 dark:border-white/[0.12] dark:bg-[#0f172a]">
                    {DFD_RELATION_OPTIONS.map((option) => {
                      const selected = defaultFlowRelation === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleSelectRelationAndConnect(option.value)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold transition-colors ${
                            selected
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-100"
                              : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className="w-4 text-center text-sm leading-none">
                              {option.symbol}
                            </span>
                            <span>{option.label}</span>
                          </span>
                          {selected && <span className="text-[10px]">Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {showDataFlowHelp && (
                  <div className="absolute bottom-full left-1/2 mb-2 w-80 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl shadow-black/20 dark:border-white/[0.12] dark:bg-[#0f172a]">
                    <p className="text-[11px] font-bold tracking-wide text-gray-800 dark:text-gray-100">
                      Reglas de Data Flow
                    </p>
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-600/30 dark:bg-emerald-900/20">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 size={12} />
                        Conexiones válidas
                      </p>
                      <ul className="mt-1.5 space-y-1 text-[11px] font-medium text-emerald-900 dark:text-emerald-100">
                        {DFD_VALID_CONNECTION_RULES.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 dark:border-rose-600/30 dark:bg-rose-900/20">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                        <XCircle size={12} />
                        No permitidas
                      </p>
                      <ul className="mt-1.5 space-y-1 text-[11px] font-medium text-rose-900 dark:text-rose-100">
                        {DFD_INVALID_CONNECTION_RULES.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleCreateDataFlow}
                  disabled={!canAddDataFlow}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    isCreatingConnection
                      ? "border-sky-400 bg-sky-100 text-sky-800 shadow-sky-300/40 hover:bg-sky-200 dark:border-sky-400/70 dark:bg-sky-950/80 dark:text-sky-100 dark:hover:bg-sky-900/80"
                      : "border-gray-300/80 bg-white text-gray-700 shadow-gray-300/40 hover:bg-gray-50 dark:bg-[#0f172a] dark:text-gray-200 dark:hover:bg-[#1e293b]"
                  }`}
                  title="Selecciona tipo de relación y conecta (atajo: L, cancelar: Esc)"
                >
                  <DataFlowIcon />
                  {isCreatingConnection ? "Connecting..." : "Data Flow"}
                </button>
                <button
                  onClick={toggleDataFlowHelp}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300/90 bg-white text-xs font-bold text-gray-700 shadow-md shadow-gray-300/40 transition-colors hover:bg-gray-50 dark:bg-[#0f172a] dark:text-gray-200 dark:hover:bg-[#1e293b]"
                  title="Ver reglas de conexión de Data Flow"
                  aria-label="Ver reglas de conexión de Data Flow"
                >
                  <CircleHelp size={15} strokeWidth={2.1} />
                </button>
              </div>
            )}
            {onChangeDefaultLineStyle && (
              <select
                value={defaultLineStyle}
                onChange={(e) =>
                  onChangeDefaultLineStyle(e.target.value as EstiloLineaDFD)
                }
                className="rounded-xl border border-indigo-300/80 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-md shadow-indigo-300/35 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-[#0f172a] dark:text-indigo-200"
                title="Estilo de línea por defecto para nuevos Data Flow"
              >
                {DFD_LINE_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
      {/* Menú contextual de comentario rápido */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 50 }}
            className="w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl shadow-black/20 dark:border-white/[0.12] dark:bg-[#111111]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/40">
              Add comment
            </p>
            <textarea
              autoFocus
              rows={3}
              value={quickCommentText}
              onChange={(e) => setQuickCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmitQuickComment();
                if (e.key === "Escape") setContextMenu(null);
              }}
              placeholder="Type your comment…"
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#28b8d5] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/70"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setContextMenu(null)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-white/[0.08] dark:text-white/40 dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitQuickComment}
                disabled={!quickCommentText.trim()}
                className="rounded-lg bg-[#28b8d5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#22a4bd] disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

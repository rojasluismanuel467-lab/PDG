"use client";
import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import TablaLogicoNodeComponent, { type TablaLogicoNodeData } from "./TablaLogicoNode";
import FKEdgeComponent, { type FKEdgeData, type FKEdgeRouting } from "./FKEdge";
import type { ModeloLogico } from "@/lib/types/modelo-logico.types";

// ============================================================================
// Canvas del diagrama ERD Lógico usando reactflow
// ============================================================================

interface ERDLogicoCanvasProps {
  modelo: ModeloLogico;
  tablaSeleccionadaId: string | null;
  fkSeleccionadaId: string | null;
  onSelectTabla: (id: string) => void;
  onSelectColumna: (tablaId: string, columnaId: string) => void;
  onSelectFK: (id: string) => void;
  onDeselectAll: () => void;
  onContextMenu?: (id: string, tipo: "tabla" | "fk", x: number, y: number) => void;
  onCommentPinClick?: (id: string, tipo: "tabla" | "columna", x: number, y: number) => void;
  onUpdateTablaPosition?: (tablaId: string, x: number, y: number) => void;
  onConnectTablas?: (
    sourceTablaId: string,
    targetTablaId: string,
    sourceHandleId?: string,
    targetHandleId?: string
  ) => void;
  onUpdateFKHandles?: (
    columnaId: string,
    sourceHandleId?: string,
    targetHandleId?: string
  ) => void;
  edgeRouting?: FKEdgeRouting;
}

const nodeTypes: NodeTypes = {
  tablaLogica: TablaLogicoNodeComponent as unknown as NodeTypes["tablaLogica"],
};

const edgeTypes: EdgeTypes = {
  fkEdge: FKEdgeComponent as unknown as EdgeTypes["fkEdge"],
};

function calcularPosiciones(totalTablas: number): Array<{ x: number; y: number }> {
  const COLS = 3;
  const SPACING_X = 420;
  const SPACING_Y = 500;
  const OFFSET_X = 50;
  const OFFSET_Y = 50;

  return Array.from({ length: totalTablas }, (_, i) => ({
    x: OFFSET_X + (i % COLS) * SPACING_X,
    y: OFFSET_Y + Math.floor(i / COLS) * SPACING_Y,
  }));
}

export default function ERDLogicoCanvas({
  modelo,
  tablaSeleccionadaId,
  fkSeleccionadaId,
  onSelectTabla,
  onSelectColumna,
  onSelectFK,
  onDeselectAll,
  onContextMenu,
  onCommentPinClick,
  onUpdateTablaPosition,
  onConnectTablas,
  onUpdateFKHandles,
  edgeRouting,
}: ERDLogicoCanvasProps) {
  const posiciones = useMemo(
    () => calcularPosiciones(modelo.tablas.length),
    [modelo.tablas.length]
  );

  const initialNodes: Node[] = useMemo(
    () =>
      modelo.tablas.map((tabla, idx) => ({
        id: tabla.id,
        type: "tablaLogica",
        position:
          typeof tabla.ui_pos_x === "number" && typeof tabla.ui_pos_y === "number"
            ? { x: tabla.ui_pos_x, y: tabla.ui_pos_y }
            : (posiciones[idx] ?? { x: 0, y: 0 }),
        data: {
          tabla,
          seleccionada: tabla.id === tablaSeleccionadaId,
          onSelect: onSelectTabla,
          onSelectColumna,
          comentariosCount: modelo.comentarios.filter(
            (c) => c.referencia_tipo === "tabla" && c.referencia_id === tabla.id
          ).length,
          onContextMenu: (id: string, x: number, y: number) => onContextMenu?.(id, "tabla", x, y),
          onCommentPinClick: (id: string, x: number, y: number) => onCommentPinClick?.(id, "tabla", x, y),
        } satisfies TablaLogicoNodeData,
      })),
    [modelo.tablas, modelo.comentarios, posiciones, tablaSeleccionadaId, onSelectTabla, onSelectColumna, onContextMenu, onCommentPinClick]
  );

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    const tablaMap = new Map(modelo.tablas.map((t) => [t.nombre, t.id]));

    for (const tabla of modelo.tablas) {
      for (const col of tabla.columnas) {
        if (col.es_fk && col.fk_tabla_ref) {
          const targetTablaId = tablaMap.get(col.fk_tabla_ref);
          if (targetTablaId) {
            const edgeId = `fk-${tabla.id}-${col.id}`;
            edges.push({
              id: edgeId,
              source: tabla.id,
              target: targetTablaId,
              sourceHandle: col.fk_source_handle_id,
              targetHandle: col.fk_target_handle_id,
              type: "fkEdge",
              data: {
                columnaFK: col.nombre,
                columnaFKId: col.id,
                tablaOrigen: tabla.nombre,
                tablaDestino: col.fk_tabla_ref,
                columnaRef: col.fk_columna_ref ?? "id",
                onDelete: col.fk_on_delete,
                isNullable: col.es_nullable,
                isUnique: col.es_unique,
                isIdentifying: col.es_pk,
                seleccionada: edgeId === fkSeleccionadaId,
                onSelect: onSelectFK,
                routing: edgeRouting ?? col.fk_routing ?? "ortogonal",
                comentariosCount: modelo.comentarios.filter(
                  (c) => c.referencia_tipo === "columna" && c.referencia_id === col.id
                ).length,
                onContextMenu: (id: string, x: number, y: number) => onContextMenu?.(id, "fk", x, y),
                onCommentPinClick: (id: string, x: number, y: number) => onCommentPinClick?.(id, "columna", x, y),
              } satisfies FKEdgeData,
            });
          }
        }
      }
    }
    return edges;
  }, [modelo.tablas, modelo.comentarios, fkSeleccionadaId, onSelectFK, edgeRouting, onContextMenu, onCommentPinClick]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  React.useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const handlePaneClick = useCallback(() => { onDeselectAll(); }, [onDeselectAll]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.source !== connection.target) {
        onConnectTablas?.(
          connection.source,
          connection.target,
          connection.sourceHandle ?? undefined,
          connection.targetHandle ?? undefined
        );
      }
    },
    [onConnectTablas]
  );

  // Permite redibujar extremos de un edge arrastrando a otro handle
  const handleEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const edgeData = oldEdge.data as unknown as FKEdgeData;
      if (edgeData?.columnaFKId) {
        onUpdateFKHandles?.(
          edgeData.columnaFKId,
          newConnection.sourceHandle ?? undefined,
          newConnection.targetHandle ?? undefined
        );
      }
    },
    [onUpdateFKHandles]
  );

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0a0a0a] [--cf-bg:#f9fafb] dark:[--cf-bg:#0a0a0a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
        onReconnect={handleEdgeUpdate}
        reconnectRadius={18}
        onNodeDragStop={(_, node) => {
          onUpdateTablaPosition?.(node.id, node.position.x, node.position.y);
        }}
        onNodeContextMenu={(e) => e.preventDefault()}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        edgesReconnectable={!!onUpdateFKHandles}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
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
          nodeColor={() => "#6366f1"}
          maskColor="rgba(0,0,0,0.08)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

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

import EntidadNodeComponent, { type EntidadNodeData } from "./EntidadNode";
import RelacionEdgeComponent, { type RelacionEdgeData, type EdgeRouting } from "./RelacionEdge";
import type { ModeloER } from "@/lib/types/modelo-er.types";
import { inferRelationNotations } from "@/lib/er/crowfoot";

// ============================================================================
// Canvas del diagrama ER usando reactflow
// ============================================================================

interface ERCanvasProps {
  modelo: ModeloER;
  entidadSeleccionadaId: string | null;
  relacionSeleccionadaId: string | null;
  onSelectEntidad: (id: string) => void;
  onSelectRelacion: (id: string) => void;
  onDeselectAll: () => void;
  onNodeDragStop: (id: string, x: number, y: number) => void;
  onConnectNodes?: (
    sourceId: string,
    targetId: string,
    sourceHandleId?: string | null,
    targetHandleId?: string | null
  ) => void;
  onUpdateRelacionHandles?: (relacionId: string, sourceHandleId?: string, targetHandleId?: string) => void;
  edgeRouting?: EdgeRouting;
  onContextMenu?: (id: string, tipo: "entidad" | "relacion", x: number, y: number) => void;
  onCommentPinClick?: (id: string, tipo: "entidad" | "relacion", x: number, y: number) => void;
}

const nodeTypes: NodeTypes = {
  entidad: EntidadNodeComponent as unknown as NodeTypes["entidad"],
};

const edgeTypes: EdgeTypes = {
  relacion: RelacionEdgeComponent as unknown as EdgeTypes["relacion"],
};

export default function ERCanvas({
  modelo,
  entidadSeleccionadaId,
  relacionSeleccionadaId,
  onSelectEntidad,
  onSelectRelacion,
  onDeselectAll,
  onNodeDragStop,
  onConnectNodes,
  onUpdateRelacionHandles,
  edgeRouting,
  onContextMenu,
  onCommentPinClick,
}: ERCanvasProps) {
  // Convertir entidades a nodos de reactflow
  const initialNodes: Node[] = useMemo(
    () =>
      modelo.entidades.map((ent) => ({
        id: ent.id,
        type: "entidad",
        position: { x: ent.posicion_x, y: ent.posicion_y },
        data: {
          entidad: ent,
          seleccionada: ent.id === entidadSeleccionadaId,
          onSelect: onSelectEntidad,
          comentariosCount: modelo.comentarios.filter(
            (c) => c.referencia_id === ent.id && c.referencia_tipo === "entidad"
          ).length,
          onContextMenu: (id: string, x: number, y: number) => onContextMenu?.(id, "entidad", x, y),
          onCommentPinClick: (id: string, x: number, y: number) => onCommentPinClick?.(id, "entidad", x, y),
        } satisfies EntidadNodeData,
      })),
    [modelo.entidades, modelo.comentarios, entidadSeleccionadaId, onSelectEntidad, onContextMenu, onCommentPinClick]
  );

  // Convertir relaciones a edges de reactflow
  const initialEdges: Edge[] = useMemo(
    () => {
      const entidadesById = new Map(modelo.entidades.map((e) => [e.id, e]));
      return modelo.relaciones.map((rel) => {
        const { sourceNotation, targetNotation } = inferRelationNotations(rel, entidadesById);

        return {
          id: rel.id,
          source: rel.entidad_origen_id,
          target: rel.entidad_destino_id,
          sourceHandle: rel.source_handle_id,
          targetHandle: rel.target_handle_id,
          type: "relacion",
          data: {
            nombre: rel.nombre,
            cardinalidad: rel.cardinalidad,
            routing: edgeRouting ?? rel.routing ?? "ortogonal",
            sourceNotation,
            targetNotation,
            seleccionada: rel.id === relacionSeleccionadaId,
            onSelect: onSelectRelacion,
            comentariosCount: modelo.comentarios.filter(
              (c) => c.referencia_id === rel.id && c.referencia_tipo === "relacion"
            ).length,
            onContextMenu: (id: string, x: number, y: number) => onContextMenu?.(id, "relacion", x, y),
            onCommentPinClick: (id: string, x: number, y: number) => onCommentPinClick?.(id, "relacion", x, y),
          } satisfies RelacionEdgeData,
        };
      });
    },
    [
      modelo.relaciones,
      modelo.entidades,
      modelo.comentarios,
      relacionSeleccionadaId,
      onSelectRelacion,
      edgeRouting,
      onContextMenu,
      onCommentPinClick,
    ]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sincronizar cuando cambian los datos del modelo
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Guardar posición cuando se arrastra un nodo
  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeDragStop(node.id, node.position.x, node.position.y);
    },
    [onNodeDragStop]
  );

  // Crear relación al conectar dos handles con drag
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnectNodes?.(
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle
        );
      }
    },
    [onConnectNodes]
  );

  const handleEdgeReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      onUpdateRelacionHandles?.(
        oldEdge.id,
        newConnection.sourceHandle ?? undefined,
        newConnection.targetHandle ?? undefined
      );
    },
    [onUpdateRelacionHandles]
  );

  // Deseleccionar al hacer click en el canvas vacío
  const handlePaneClick = useCallback(() => {
    onDeselectAll();
  }, [onDeselectAll]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0a0a0a] [--cf-bg:#f9fafb] dark:[--cf-bg:#0a0a0a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
        onReconnect={handleEdgeReconnect}
        onNodeContextMenu={(e) => e.preventDefault()}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        edgesReconnectable={!!onUpdateRelacionHandles}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
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
          nodeColor={(node) => {
            const data = node.data as unknown as EntidadNodeData;
            return data?.entidad?.color ?? "#28b8d5";
          }}
          maskColor="rgba(0,0,0,0.08)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

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
import type { ModeloER, EntidadER, RelacionER, AtributoER } from "@/lib/types/modelo-er.types";
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
  previewEntidades?: EntidadER[];
  previewRelaciones?: RelacionER[];
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
  previewEntidades,
  previewRelaciones,
}: ERCanvasProps) {
  // Single memo: compute diff status map + merged entity/relation lists for preview
  const { diffStatusMap, displayEntidades, displayRelaciones } = useMemo<{
    diffStatusMap: Map<string, "added" | "removed">;
    displayEntidades: EntidadER[];
    displayRelaciones: RelacionER[];
  }>(() => {
    if (!previewEntidades) {
      return { diffStatusMap: new Map(), displayEntidades: modelo.entidades, displayRelaciones: modelo.relaciones };
    }

    const proposedNames = new Set(previewEntidades.map((e) => e.nombre.toLowerCase()));
    const currentNames = new Set(modelo.entidades.map((e) => e.nombre.toLowerCase()));
    const statusMap = new Map<string, "added" | "removed">();

    for (const e of modelo.entidades) {
      if (!proposedNames.has(e.nombre.toLowerCase())) statusMap.set(e.id, "removed");
    }

    // Map AI entity IDs (and lowercase names) → stable preview IDs or existing IDs
    const aiIdToDisplayId = new Map<string, string>();
    for (const e of modelo.entidades) {
      aiIdToDisplayId.set(e.nombre.toLowerCase(), e.id);
    }

    let addedIdx = 0;
    const addedEntidades: EntidadER[] = [];
    for (const e of previewEntidades) {
      if (!currentNames.has(e.nombre.toLowerCase())) {
        const previewId = `preview-${addedIdx}`;
        statusMap.set(previewId, "added");
        if (e.id) aiIdToDisplayId.set(e.id, previewId);
        aiIdToDisplayId.set(e.nombre.toLowerCase(), previewId);
        addedEntidades.push({
          ...e,
          id: previewId,
          // Ensure attributes have unique IDs even when AI omits them
          atributos: (e.atributos ?? []).map((a: AtributoER, ai: number) => ({
            ...a,
            id: a.id ?? `${previewId}-attr-${ai}`,
          })),
          posicion_x: e.posicion_x ?? 600 + (addedIdx % 3) * 260,
          posicion_y: e.posicion_y ?? 100 + Math.floor(addedIdx / 3) * 180,
        });
        addedIdx++;
      } else {
        // Existing entity: register its AI ID so relations can resolve
        const existing = modelo.entidades.find((ex) => ex.nombre.toLowerCase() === e.nombre.toLowerCase());
        if (existing) {
          if (e.id) aiIdToDisplayId.set(e.id, existing.id);
        }
      }
    }

    const displayEntityIds = new Set([
      ...modelo.entidades.map((e) => e.id),
      ...addedEntidades.map((e) => e.id),
    ]);

    const resolveId = (ref: string | undefined): string => {
      if (!ref) return "";
      return aiIdToDisplayId.get(ref) ?? aiIdToDisplayId.get(ref.toLowerCase()) ?? ref;
    };

    // Merge existing relations + AI-proposed preview relations (remapped IDs)
    const previewRelacionesMapped: RelacionER[] = (previewRelaciones ?? [])
      .map((r, ri) => ({
        ...r,
        id: `preview-rel-${ri}`,
        entidad_origen_id: resolveId(r.entidad_origen_id),
        entidad_destino_id: resolveId(r.entidad_destino_id),
      }))
      .filter((r) => displayEntityIds.has(r.entidad_origen_id) && displayEntityIds.has(r.entidad_destino_id));

    return {
      diffStatusMap: statusMap,
      displayEntidades: [...modelo.entidades, ...addedEntidades],
      displayRelaciones: [...modelo.relaciones, ...previewRelacionesMapped],
    };
  }, [previewEntidades, previewRelaciones, modelo.entidades, modelo.relaciones]);
  // Convertir entidades a nodos de reactflow
  const initialNodes: Node[] = useMemo(
    () =>
      displayEntidades.map((ent, idx) => ({
        id: ent.id ?? `node-${idx}`,
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
          diffStatus: diffStatusMap.get(ent.id),
        } satisfies EntidadNodeData,
      })),
    [displayEntidades, modelo.comentarios, entidadSeleccionadaId, onSelectEntidad, onContextMenu, onCommentPinClick, diffStatusMap]
  );

  // Convertir relaciones a edges de reactflow
  const initialEdges: Edge[] = useMemo(
    () => {
      const entidadesById = new Map(modelo.entidades.map((e) => [e.id, e]));
      return displayRelaciones.map((rel, idx) => {
        const { sourceNotation, targetNotation } = inferRelationNotations(rel, entidadesById);

        return {
          id: rel.id ?? `edge-${idx}`,
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
      displayRelaciones,
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

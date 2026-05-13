"use client";

import type {
  EstiloLineaDFD,
  NodoDFD,
  TipoRelacionDFD,
  TipoNodoDFD,
} from "@/lib/types/dfd.types";

export const DFD_NODE_TYPE_LABELS: Record<TipoNodoDFD, string> = {
  proceso: "Process",
  almacen: "Data Store",
  entidad_externa: "External Entity",
};

export const DFD_LINE_STYLE_OPTIONS: Array<{
  value: EstiloLineaDFD;
  label: string;
}> = [
  { value: "rectilinear", label: "Rectilinear" },
  { value: "oblique", label: "Oblique" },
  { value: "curve", label: "Curve" },
  { value: "round_oblique", label: "Round Oblique" },
  { value: "round_rectilinear", label: "Round Rectilinear" },
];

export const DEFAULT_DFD_LINE_STYLE: EstiloLineaDFD = "oblique";

export const DFD_RELATION_OPTIONS: Array<{
  value: TipoRelacionDFD;
  label: string;
  symbol: string;
}> = [
  { value: "flecha_abierta", label: "Arrow", symbol: "→" },
  { value: "flecha_cerrada", label: "Closed Arrow", symbol: "➤" },
  { value: "doble_flecha", label: "Double Arrow", symbol: "↔" },
  { value: "linea", label: "Line Only", symbol: "—" },
];

export const DEFAULT_DFD_RELATION: TipoRelacionDFD = "flecha_abierta";

export const DFD_VALID_CONNECTION_RULES: string[] = [
  "Process ↔ Process",
  "Process ↔ Data Store",
  "Process ↔ External Entity",
];

export function getNodeTypeLabel(tipo: TipoNodoDFD): string {
  return DFD_NODE_TYPE_LABELS[tipo];
}

export function buildNodeOptionLabel(nodo: NodoDFD): string {
  const typeLabel = getNodeTypeLabel(nodo.tipo);
  const suffix =
    nodo.tipo === "proceso" && nodo.numero_proceso
      ? ` #${nodo.numero_proceso}`
      : nodo.tipo === "almacen"
        ? ` [${nodo.prefijo_almacen ?? "D"}]`
        : "";
  return `${typeLabel}${suffix} - ${nodo.nombre}`;
}

export function isValidDFDConnection(
  nodes: NodoDFD[],
  sourceId: string,
  targetId: string
): boolean {
  if (!sourceId || !targetId || sourceId === targetId) {
    return false;
  }

  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);

  if (!source || !target) {
    return false;
  }

  // Regla DFD aplicada en la plataforma:
  // todo Data Flow debe iniciar o terminar en un Process.
  return source.tipo === "proceso" || target.tipo === "proceso";
}

export function getInvalidConnectionMessage(
  nodes: NodoDFD[],
  sourceId: string,
  targetId: string
): string | null {
  if (isValidDFDConnection(nodes, sourceId, targetId)) {
    return null;
  }

  if (sourceId === targetId) {
    return "Conexión inválida: un Data Flow no puede conectarse al mismo elemento.";
  }

  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);

  if (!source || !target) {
    return "Conexión inválida: el origen y el destino deben existir.";
  }

  return "Conexión inválida: un Data Flow solo puede conectar un Process con Process, Data Store o External Entity.";
}

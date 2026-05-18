"use client";
import React from "react";
import { Plus, Minus, RefreshCw } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NamedItem {
  id?: string;
  client_id?: string;
  nombre?: string;
  name?: string;
  [key: string]: unknown;
}

type DiffStatus = "added" | "removed" | "modified" | "unchanged";

interface DiffItem {
  status: DiffStatus;
  label: string;
  detail?: string;
}

export interface ArtifactDiffSummary {
  added: number;
  removed: number;
  modified: number;
  inferred: number;
  hasChanges: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getKey(item: NamedItem): string {
  return String(item.id ?? item.client_id ?? item.nombre ?? item.name ?? "");
}

function getLabel(item: NamedItem): string {
  return String(item.nombre ?? item.name ?? item.id ?? "?");
}

function diffLists(
  current: NamedItem[],
  proposed: NamedItem[],
): DiffItem[] {
  const currentMap = new Map(current.map((i) => [getKey(i), i]));
  const proposedMap = new Map(proposed.map((i) => [getKey(i), i]));

  const result: DiffItem[] = [];

  for (const [key, item] of proposedMap) {
    if (!currentMap.has(key)) {
      result.push({ status: "added", label: getLabel(item) });
    } else {
      const curr = currentMap.get(key)!;
      const isDiff =
        JSON.stringify(curr) !== JSON.stringify(item);
      result.push({
        status: isDiff ? "modified" : "unchanged",
        label: getLabel(item),
      });
    }
  }

  for (const [key, item] of currentMap) {
    if (!proposedMap.has(key)) {
      result.push({ status: "removed", label: getLabel(item) });
    }
  }

  return result;
}

function isConceptualArtifact(artifactCode: string): boolean {
  return artifactCode.includes("CONCEPTUAL") || artifactCode.includes("DIAGRAM");
}

export function computeArtifactDiffSummary(
  artifactCode: string,
  current: Record<string, unknown>,
  proposed: Record<string, unknown>,
): ArtifactDiffSummary {
  const isConceptual = isConceptualArtifact(artifactCode);

  const currentEntities = (current.entidades ?? []) as NamedItem[];
  const proposedEntities = (proposed.entidades ?? []) as NamedItem[];
  const currentRelations = (current.relaciones ?? []) as NamedItem[];
  const proposedRelations = (proposed.relaciones ?? []) as NamedItem[];
  const currentSystems = (current.sistemas ?? []) as NamedItem[];
  const proposedSystems = (proposed.sistemas ?? []) as NamedItem[];

  const entityDiff = diffLists(currentEntities, proposedEntities);
  const relationDiff = diffLists(currentRelations, proposedRelations);
  const systemDiff = diffLists(currentSystems, proposedSystems);

  const changes = isConceptual
    ? [...entityDiff, ...relationDiff].filter((d) => d.status !== "unchanged")
    : systemDiff.filter((d) => d.status !== "unchanged");

  const added = changes.filter((d) => d.status === "added").length;
  const removed = changes.filter((d) => d.status === "removed").length;
  const modified = changes.filter((d) => d.status === "modified").length;

  const inferred = isConceptual
    ? proposedRelations.filter((r) => {
        const desc = String(r.descripcion ?? "");
        return desc.toLowerCase().includes("inferida");
      }).length
    : 0;

  return {
    added,
    removed,
    modified,
    inferred,
    hasChanges: added + removed + modified > 0,
  };
}

// ── Status chip ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DiffStatus, string> = {
  added:     "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
  removed:   "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10",
  modified:  "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
  unchanged: "text-gray-500 dark:text-white/30 bg-gray-50 dark:bg-white/[0.03]",
};

function DiffRow({ item }: { item: DiffItem }) {
  if (item.status === "unchanged") return null;
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] ${STATUS_STYLES[item.status]}`}>
      {item.status === "added"    && <Plus size={10} />}
      {item.status === "removed"  && <Minus size={10} />}
      {item.status === "modified" && <RefreshCw size={10} />}
      <span className="font-medium">{item.label}</span>
      {item.detail && <span className="opacity-60 ml-1">{item.detail}</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ArtifactDiffViewerProps {
  artifactCode: string;
  current: Record<string, unknown>;
  proposed: Record<string, unknown>;
}

export function ArtifactDiffViewer({
  artifactCode,
  current,
  proposed,
}: ArtifactDiffViewerProps) {
  const isConceptual = isConceptualArtifact(artifactCode);

  const currentEntities  = (current.entidades  ?? []) as NamedItem[];
  const proposedEntities = (proposed.entidades ?? []) as NamedItem[];
  const currentRelations  = (current.relaciones  ?? []) as NamedItem[];
  const proposedRelations = (proposed.relaciones ?? []) as NamedItem[];
  const currentSystems  = (current.sistemas  ?? []) as NamedItem[];
  const proposedSystems = (proposed.sistemas ?? []) as NamedItem[];

  const entityDiff   = diffLists(currentEntities, proposedEntities);
  const relationDiff = diffLists(currentRelations, proposedRelations);
  const systemDiff   = diffLists(currentSystems, proposedSystems);

  const changes = isConceptual
    ? [...entityDiff, ...relationDiff].filter((d) => d.status !== "unchanged")
    : systemDiff.filter((d) => d.status !== "unchanged");

  const added    = changes.filter((d) => d.status === "added").length;
  const removed  = changes.filter((d) => d.status === "removed").length;
  const modified = changes.filter((d) => d.status === "modified").length;

  return (
    <div className="space-y-2">
      {/* Summary chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {added > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            +{added} añadido{added !== 1 ? "s" : ""}
          </span>
        )}
        {removed > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
            −{removed} eliminado{removed !== 1 ? "s" : ""}
          </span>
        )}
        {modified > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
            ~{modified} modificado{modified !== 1 ? "s" : ""}
          </span>
        )}
        {changes.length === 0 && (
          <span className="text-[10px] text-gray-400 dark:text-white/25">Sin cambios detectados</span>
        )}
      </div>

      {/* Detail list */}
      {isConceptual && (
        <>
          {entityDiff.some((d) => d.status !== "unchanged") && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-white/30 mb-1">Entidades</p>
              <div className="space-y-1">
                {entityDiff.filter((d) => d.status !== "unchanged").map((d, i) => (
                  <DiffRow key={i} item={d} />
                ))}
              </div>
            </div>
          )}
          {relationDiff.some((d) => d.status !== "unchanged") && (
            <div>
              <p className="text-[10px] font-medium text-gray-400 dark:text-white/30 mb-1">Relaciones</p>
              <div className="space-y-1">
                {relationDiff.filter((d) => d.status !== "unchanged").map((d, i) => (
                  <DiffRow key={i} item={d} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!isConceptual && systemDiff.some((d) => d.status !== "unchanged") && (
        <div>
          <p className="text-[10px] font-medium text-gray-400 dark:text-white/30 mb-1">Sistemas</p>
          <div className="space-y-1">
            {systemDiff.filter((d) => d.status !== "unchanged").map((d, i) => (
              <DiffRow key={i} item={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

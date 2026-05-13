import type { EntidadER, RelacionER } from "@/lib/types/modelo-er.types";

export type CardinalityMax = "1" | "N";
export type CardinalityMin = "0" | "1" | undefined;

export function getMaxByCardinality(
  cardinality: string
): { sourceMax: CardinalityMax; targetMax: CardinalityMax } {
  switch (cardinality) {
    case "1:1":
      return { sourceMax: "1", targetMax: "1" };
    case "1:N":
      return { sourceMax: "1", targetMax: "N" };
    case "N:1":
      return { sourceMax: "N", targetMax: "1" };
    case "N:M":
      return { sourceMax: "N", targetMax: "N" };
    default:
      return { sourceMax: "N", targetMax: "N" };
  }
}

export function buildCrowFoot(min: CardinalityMin, max: CardinalityMax): string {
  if (max === "1") {
    if (min === "0") return "O|";
    if (min === "1") return "||";
    return "|";
  }
  if (min === "0") return "O<";
  if (min === "1") return "|<";
  return "<";
}

export function inferRelationNotations(
  relation: RelacionER,
  entitiesById: Map<string, EntidadER>
): { sourceNotation: string; targetNotation: string } {
  const sourceEntity = entitiesById.get(relation.entidad_origen_id);
  const targetEntity = entitiesById.get(relation.entidad_destino_id);
  const { sourceMax, targetMax } = getMaxByCardinality(relation.cardinalidad);

  const sourceFkAttribute = sourceEntity?.atributos.find(
    (attr) =>
      attr.id === relation.atributo_fk_id ||
      (attr.es_fk && attr.fk_entidad_ref === relation.entidad_destino_id)
  );

  const targetFkAttribute = targetEntity?.atributos.find(
    (attr) => attr.es_fk && attr.fk_entidad_ref === relation.entidad_origen_id
  );

  const sourceMin: CardinalityMin =
    sourceFkAttribute === undefined ? undefined : sourceFkAttribute.es_nullable ? "0" : "1";
  const targetMin: CardinalityMin =
    targetFkAttribute === undefined ? undefined : targetFkAttribute.es_nullable ? "0" : "1";

  return {
    sourceNotation: buildCrowFoot(sourceMin, sourceMax),
    targetNotation: buildCrowFoot(targetMin, targetMax),
  };
}

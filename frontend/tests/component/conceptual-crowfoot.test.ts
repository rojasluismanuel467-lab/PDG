import { describe, expect, it } from "vitest";

import { buildCrowFoot, getMaxByCardinality, inferRelationNotations } from "@/lib/er/crowfoot";
import type { EntidadER, RelacionER } from "@/lib/types/modelo-er.types";

function makeEntity(id: string, attrs: EntidadER["atributos"] = []): EntidadER {
  return {
    id,
    nombre: id,
    descripcion: "",
    atributos: attrs,
    posicion_x: 0,
    posicion_y: 0,
  };
}

function makeRelation(partial: Partial<RelacionER> = {}): RelacionER {
  return {
    id: "rel-1",
    nombre: "r1",
    entidad_origen_id: "A",
    entidad_destino_id: "B",
    cardinalidad: "1:N",
    ...partial,
  };
}

describe("Conceptual crowfoot helpers", () => {
  it("maps cardinality max values correctly", () => {
    expect(getMaxByCardinality("1:1")).toEqual({ sourceMax: "1", targetMax: "1" });
    expect(getMaxByCardinality("1:N")).toEqual({ sourceMax: "1", targetMax: "N" });
    expect(getMaxByCardinality("N:1")).toEqual({ sourceMax: "N", targetMax: "1" });
    expect(getMaxByCardinality("N:M")).toEqual({ sourceMax: "N", targetMax: "N" });
  });

  it("builds crowfoot symbols for min/max combinations", () => {
    expect(buildCrowFoot("0", "1")).toBe("O|");
    expect(buildCrowFoot("1", "1")).toBe("||");
    expect(buildCrowFoot(undefined, "1")).toBe("|");
    expect(buildCrowFoot("0", "N")).toBe("O<");
    expect(buildCrowFoot("1", "N")).toBe("|<");
    expect(buildCrowFoot(undefined, "N")).toBe("<");
  });

  it("infers optionality from FK nullable in source side", () => {
    const source = makeEntity("A", [
      {
        id: "fk-a-b",
        nombre: "b_id",
        tipo_dato: "UUID",
        es_pk: false,
        es_fk: true,
        es_nullable: false,
        fk_entidad_ref: "B",
      },
    ]);
    const target = makeEntity("B");
    const relation = makeRelation({
      cardinalidad: "1:N",
      atributo_fk_id: "fk-a-b",
    });
    const result = inferRelationNotations(relation, new Map([["A", source], ["B", target]]));
    expect(result).toEqual({
      sourceNotation: "||",
      targetNotation: "<",
    });
  });

  it("infers optionality from target side fk when exists there", () => {
    const source = makeEntity("A");
    const target = makeEntity("B", [
      {
        id: "fk-b-a",
        nombre: "a_id",
        tipo_dato: "UUID",
        es_pk: false,
        es_fk: true,
        es_nullable: true,
        fk_entidad_ref: "A",
      },
    ]);
    const relation = makeRelation({
      cardinalidad: "N:1",
      entidad_origen_id: "A",
      entidad_destino_id: "B",
    });
    const result = inferRelationNotations(relation, new Map([["A", source], ["B", target]]));
    expect(result).toEqual({
      sourceNotation: "<",
      targetNotation: "O|",
    });
  });
});

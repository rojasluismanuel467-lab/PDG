import type {
  CRUDMatrix,
  CRUDComparison,
  ImpactoCRUD,
} from "@/lib/types/crud-matrix.types";
import { MOCK_MODELO_ER } from "@/lib/mocks/modelo-er.mock";
import { MOCK_MODELO_ER_TOBE } from "@/lib/mocks/modelo-er-tobe.mock";
import { mockModeloLogicoToBe } from "@/lib/mocks/modelo-logico.mock";
import { mockDFDAsIs } from "@/lib/mocks/dfd-asis.mock";
import { mockDFDToBe } from "@/lib/mocks/dfd-tobe.mock";
import { MOCK_PROYECTOS } from "@/lib/mocks/proyectos.mock";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type CRUDOps = {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
};

type EntitySnapshot = {
  nombre: string;
  atributos: number;
  fks: number;
};

type CRUDContext = {
  proyectoId: string;
  proyectoNombre: string;
  asis: EntitySnapshot[];
  tobe: EntitySnapshot[];
  dfdAsIsFlujos: number;
  dfdToBeFlujos: number;
};

const PROJECT_CONTEXT_SEEDS: Record<
  string,
  { asis: string[]; tobe: string[] }
> = {
  "proy-001": {
    asis: ["Cliente", "Cuenta", "Transaccion", "Producto", "ClienteProducto"],
    tobe: [
      "Cliente",
      "Cuenta",
      "Transaccion",
      "Producto",
      "ClienteProducto",
      "Segmento",
      "Canal",
      "EventoDigital",
    ],
  },
  "proy-002": {
    asis: [
      "Activo",
      "Medidor",
      "OrdenTrabajo",
      "LecturaConsumo",
      "ClienteServicio",
    ],
    tobe: [
      "Activo",
      "Medidor",
      "OrdenTrabajo",
      "LecturaConsumo",
      "ClienteServicio",
      "EventoSCADA",
      "CanalAtencion",
    ],
  },
  "proy-003": {
    asis: ["Producto", "Inventario", "Tienda", "Venta", "ClienteFidelidad"],
    tobe: [
      "Producto",
      "Inventario",
      "Tienda",
      "Venta",
      "ClienteFidelidad",
      "CanalVenta",
      "EventoCompra",
    ],
  },
  "proy-004": {
    asis: [
      "Usuario",
      "CuentaWallet",
      "Transaccion",
      "Dispositivo",
      "Sesion",
    ],
    tobe: [
      "Usuario",
      "CuentaWallet",
      "Transaccion",
      "Dispositivo",
      "Sesion",
      "AlertaFraude",
      "CanalDigital",
      "EventoRiesgo",
    ],
  },
};

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const buildSnapshotFromName = (nombre: string, stage: "asis" | "tobe"): EntitySnapshot => {
  const key = normalizeText(nombre);
  const isCatalog = /(catalog|categoria|tipo|segment|canal|param)/.test(key);
  const isEvent = /(evento|log|audit|hist|movim|transaccion)/.test(key);

  const baseAttrs = stage === "tobe" ? 8 : 6;
  const atributos =
    baseAttrs +
    (isCatalog ? 1 : 0) +
    (isEvent ? 1 : 0) +
    (stage === "tobe" ? 1 : 0);
  const fks = isCatalog ? 0 : isEvent ? 2 : stage === "tobe" ? 2 : 1;

  return { nombre, atributos, fks };
};

const getProyectoNombre = (proyectoId: string): string =>
  MOCK_PROYECTOS.find((proyecto) => proyecto.id === proyectoId)?.nombre ??
  "Proyecto";

const getContextByProject = (proyectoId: string): CRUDContext => {
  const asisModelo = MOCK_MODELO_ER[proyectoId];
  const tobeModelo = MOCK_MODELO_ER_TOBE[proyectoId];

  const asis =
    asisModelo?.entidades.map((entidad) => ({
      nombre: entidad.nombre,
      atributos: entidad.atributos.length,
      fks: entidad.atributos.filter((atributo) => atributo.es_fk).length,
    })) ??
    [];

  const tobe =
    tobeModelo?.entidades.map((entidad) => ({
      nombre: entidad.nombre,
      atributos: entidad.atributos.length,
      fks: entidad.atributos.filter((atributo) => atributo.es_fk).length,
    })) ??
    [];

  const logicalToBe =
    mockModeloLogicoToBe.proyecto_id === proyectoId
      ? mockModeloLogicoToBe.tablas.map((tabla) => ({
          nombre: tabla.entidad_origen || tabla.nombre,
          atributos: tabla.columnas.length,
          fks: tabla.columnas.filter((columna) => columna.es_fk).length,
        }))
      : [];

  const tobeFusionadoMap = new Map<string, EntitySnapshot>();
  [...tobe, ...logicalToBe].forEach((snapshot) => {
    const key = normalizeText(snapshot.nombre);
    if (!tobeFusionadoMap.has(key)) {
      tobeFusionadoMap.set(key, snapshot);
    }
  });
  const tobeFusionado = Array.from(tobeFusionadoMap.values());

  const dfdAsIsFlujos = proyectoId === "proy-001" ? mockDFDAsIs.flujos.length : 0;
  const dfdToBeFlujos = proyectoId === "proy-001" ? mockDFDToBe.flujos.length : 0;

  if (asis.length > 0 || tobeFusionado.length > 0) {
    return {
      proyectoId,
      proyectoNombre: getProyectoNombre(proyectoId),
      asis,
      tobe: tobeFusionado,
      dfdAsIsFlujos,
      dfdToBeFlujos,
    };
  }

  const seed = PROJECT_CONTEXT_SEEDS[proyectoId] ?? {
    asis: ["EntidadA", "EntidadB", "EntidadC"],
    tobe: ["EntidadA", "EntidadB", "EntidadC", "EntidadD"],
  };

  return {
    proyectoId,
    proyectoNombre: getProyectoNombre(proyectoId),
    asis: seed.asis.map((name) => buildSnapshotFromName(name, "asis")),
    tobe: seed.tobe.map((name) => buildSnapshotFromName(name, "tobe")),
    dfdAsIsFlujos: 0,
    dfdToBeFlujos: 0,
  };
};

const inferOps = (
  snapshot: EntitySnapshot,
  stage: "asis" | "tobe"
): CRUDOps => {
  const key = normalizeText(snapshot.nombre);
  const isCatalog = /(catalog|categoria|tipo|segment|canal|param)/.test(key);
  const isEvent = /(evento|log|audit|hist)/.test(key);
  const isBridge = snapshot.fks >= 2 && snapshot.atributos <= 7;

  if (stage === "asis") {
    if (isCatalog) {
      return { create: false, read: true, update: false, delete: false };
    }
    if (isEvent || isBridge) {
      return { create: true, read: true, update: false, delete: false };
    }
    return { create: true, read: true, update: true, delete: false };
  }

  if (isCatalog) {
    return { create: true, read: true, update: true, delete: false };
  }
  if (isEvent) {
    return { create: true, read: true, update: true, delete: false };
  }
  if (isBridge) {
    return { create: true, read: true, update: true, delete: false };
  }
  return { create: true, read: true, update: true, delete: true };
};

const evaluarImpacto = (row: CRUDComparison): ImpactoCRUD => {
  const cambios =
    Number(row.asis_create !== row.tobe_create) +
    Number(row.asis_read !== row.tobe_read) +
    Number(row.asis_update !== row.tobe_update) +
    Number(row.asis_delete !== row.tobe_delete);

  if (cambios >= 3) return "Alto";
  if (cambios === 2) return "Medio";
  return "Bajo";
};

const buildBrechaDescription = (
  entityName: string,
  asis: EntitySnapshot | undefined,
  tobe: EntitySnapshot | undefined
): string => {
  if (!asis && tobe) {
    return `Nueva entidad en TO-BE: ${entityName}. Se incorpora para cubrir brechas de trazabilidad, gobierno y analitica del proyecto.`;
  }
  if (asis && !tobe) {
    return `Entidad ${entityName} presente en AS-IS y no contemplada en TO-BE. Se recomienda consolidar su funcionalidad en componentes objetivo.`;
  }
  if (!asis || !tobe) {
    return "Brecha pendiente de analisis por falta de informacion estructural.";
  }

  const deltaAtributos = tobe.atributos - asis.atributos;
  const deltaFks = tobe.fks - asis.fks;
  const cambios: string[] = [];

  if (deltaAtributos > 0) {
    cambios.push(`se agregan ${deltaAtributos} atributos en TO-BE`);
  } else if (deltaAtributos < 0) {
    cambios.push(`se simplifican ${Math.abs(deltaAtributos)} atributos en TO-BE`);
  }

  if (deltaFks > 0) {
    cambios.push(`se incrementa la integracion con ${deltaFks} referencias adicionales`);
  } else if (deltaFks < 0) {
    cambios.push(`se reducen dependencias en ${Math.abs(deltaFks)} referencias`);
  }

  if (cambios.length === 0) {
    return `No se observan cambios estructurales fuertes para ${entityName}; la brecha principal es de estandarizacion operativa.`;
  }

  return `Para ${entityName}, ${cambios.join(" y ")}.`;
};

const inferImpacto = (
  row: CRUDComparison,
  asis: EntitySnapshot | undefined,
  tobe: EntitySnapshot | undefined
): ImpactoCRUD => {
  if (!asis || !tobe) return "Alto";

  const deltaAtributos = Math.abs(tobe.atributos - asis.atributos);
  const deltaFks = Math.abs(tobe.fks - asis.fks);
  const key = normalizeText(row.entidad);
  const esEntidadCritica = /(cliente|cuenta|transaccion|pago|orden|contrato|factura|riesgo|fraude|wallet|saldo)/.test(
    key
  );

  let score = 0;

  if (row.asis_create !== row.tobe_create) score += 2;
  if (row.asis_read !== row.tobe_read) score += 3;
  if (row.asis_update !== row.tobe_update) score += 2;
  if (row.asis_delete !== row.tobe_delete) score += 4;

  score += Math.min(deltaAtributos, 4);
  score += Math.min(deltaFks * 2, 4);
  if (esEntidadCritica) score += 2;

  if (!row.tobe_read) score += 2;
  if (!row.asis_delete && row.tobe_delete) score += 2;

  if (score >= 9) return "Alto";
  if (score >= 5) return "Medio";
  return "Bajo";
};

const buildComparaciones = (context: CRUDContext): CRUDComparison[] => {
  const asisMap = new Map<string, EntitySnapshot>();
  const tobeMap = new Map<string, EntitySnapshot>();

  context.asis.forEach((snapshot) => {
    asisMap.set(normalizeText(snapshot.nombre), snapshot);
  });
  context.tobe.forEach((snapshot) => {
    tobeMap.set(normalizeText(snapshot.nombre), snapshot);
  });

  const orderedKeys: string[] = [];

  context.asis.forEach((snapshot) => {
    const key = normalizeText(snapshot.nombre);
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  });
  context.tobe.forEach((snapshot) => {
    const key = normalizeText(snapshot.nombre);
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  });

  return orderedKeys.map((key, index) => {
    const asis = asisMap.get(key);
    const tobe = tobeMap.get(key);
    const entidad = tobe?.nombre ?? asis?.nombre ?? `Entidad ${index + 1}`;

    const asisOps = asis
      ? inferOps(asis, "asis")
      : { create: false, read: false, update: false, delete: false };
    const tobeOps = tobe
      ? inferOps(tobe, "tobe")
      : { create: false, read: false, update: false, delete: false };

    if (asis && tobe) {
      if (tobe.atributos > asis.atributos) {
        tobeOps.update = true;
      }
      if (tobe.fks > asis.fks) {
        tobeOps.create = true;
      }
    }

    const row: CRUDComparison = {
      id: `crud-${context.proyectoId}-${index + 1}`,
      entidad,
      asis_create: asisOps.create,
      asis_read: asisOps.read,
      asis_update: asisOps.update,
      asis_delete: asisOps.delete,
      tobe_create: tobeOps.create,
      tobe_read: tobeOps.read,
      tobe_update: tobeOps.update,
      tobe_delete: tobeOps.delete,
      brecha: buildBrechaDescription(entidad, asis, tobe),
      impacto: "Bajo",
    };

    return {
      ...row,
      impacto: inferImpacto(row, asis, tobe),
    };
  });
};

const getNextMinorVersion = (currentVersion: string): string => {
  const [rawMajor, rawMinor] = currentVersion.split(".");
  const major = Number.parseInt(rawMajor ?? "1", 10);
  const minor = Number.parseInt(rawMinor ?? "0", 10) + 1;
  return `${Number.isNaN(major) ? 1 : major}.${Number.isNaN(minor) ? 1 : minor}`;
};

const buildMatrix = (proyectoId: string): CRUDMatrix => {
  const context = getContextByProject(proyectoId);
  const now = new Date().toISOString();
  const comparaciones = buildComparaciones(context);

  return {
    id: `crud-matrix-${proyectoId}`,
    entregable_id: `ent-${proyectoId}-10`,
    proyecto_id: proyectoId,
    nombre: "Matriz CRUD Comparativa",
    descripcion: `Matriz comparativa CRUD contextualizada para ${context.proyectoNombre}, construida con ER AS-IS/TO-BE, Modelo Logico TO-BE y senales de DFD (${context.dfdAsIsFlujos} flujos AS-IS vs ${context.dfdToBeFlujos} flujos TO-BE).`,
    comparaciones,
    version_actual: "1.0",
    historial_versiones: [
      {
        version: "1.0",
        fecha: now,
        autor: "Carlos Mendez",
        descripcion_cambio:
          "Version inicial contextualizada por proyecto usando modelos AS-IS y TO-BE.",
      },
    ],
    created_at: now,
    updated_at: now,
  };
};

const MOCK_CRUD_MATRIX: Record<string, CRUDMatrix> = {
  "proy-001": buildMatrix("proy-001"),
  "proy-002": buildMatrix("proy-002"),
  "proy-003": buildMatrix("proy-003"),
  "proy-004": buildMatrix("proy-004"),
};

export const mockGetCRUDMatrix = async (proyectoId: string): Promise<CRUDMatrix> => {
  await delay();
  if (!MOCK_CRUD_MATRIX[proyectoId]) {
    MOCK_CRUD_MATRIX[proyectoId] = buildMatrix(proyectoId);
  }
  return clone(MOCK_CRUD_MATRIX[proyectoId]);
};

export const mockGuardarCRUDMatrix = async (matriz: CRUDMatrix): Promise<CRUDMatrix> => {
  await delay(850);

  const version = getNextMinorVersion(matriz.version_actual);
  const now = new Date().toISOString();

  const comparaciones = matriz.comparaciones.map((row) => {
    const impactoCalculado = row.impacto || evaluarImpacto(row);
    return { ...row, impacto: impactoCalculado };
  });

  const actualizado: CRUDMatrix = {
    ...matriz,
    comparaciones,
    version_actual: version,
    updated_at: now,
    historial_versiones: [
      ...matriz.historial_versiones,
      {
        version,
        fecha: now,
        autor: "Carlos Mendez",
        descripcion_cambio: "Ajustes manuales en la matriz CRUD comparativa.",
      },
    ],
  };

  MOCK_CRUD_MATRIX[matriz.proyecto_id] = clone(actualizado);
  return clone(actualizado);
};

export const mockGenerarCRUDMatrixConIA = async (
  proyectoId: string
): Promise<CRUDMatrix> => {
  await delay(1800);
  const regenerada = buildMatrix(proyectoId);
  const actual = MOCK_CRUD_MATRIX[proyectoId];

  if (!actual) {
    MOCK_CRUD_MATRIX[proyectoId] = clone(regenerada);
    return clone(regenerada);
  }

  const now = new Date().toISOString();
  const version = getNextMinorVersion(actual.version_actual);
  const actualizada: CRUDMatrix = {
    ...actual,
    descripcion: regenerada.descripcion,
    comparaciones: regenerada.comparaciones,
    version_actual: version,
    updated_at: now,
    historial_versiones: [
      ...actual.historial_versiones,
      {
        version,
        fecha: now,
        autor: "IA ARQDATA",
        descripcion_cambio:
          "Regeneracion contextualizada de la matriz a partir de artefactos AS-IS y TO-BE del proyecto.",
      },
    ],
  };

  MOCK_CRUD_MATRIX[proyectoId] = clone(actualizada);
  return clone(actualizada);
};

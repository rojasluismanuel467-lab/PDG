import type {
  ModeloER,
  EntidadER,
  RelacionER,
  ComentarioER,
  VersionModeloER,
} from "../types/modelo-er.types";

// ============================================================================
// Mock: Modelo ER del proyecto Bancolombia (proy-001)
// Representa la arquitectura conceptual AS-IS del área de analítica
// ============================================================================

const ENTIDADES: EntidadER[] = [
  {
    id: "ent-001",
    nombre: "Cliente",
    descripcion:
      "Persona natural o jurídica que tiene productos financieros activos con la entidad.",
    posicion_x: 50,
    posicion_y: 50,
    color: "#3B82F6",
    atributos: [
      { id: "attr-001", nombre: "id_cliente", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false, descripcion: "Identificador único del cliente" },
      { id: "attr-002", nombre: "tipo_documento", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "CC, NIT, CE, Pasaporte" },
      { id: "attr-003", nombre: "numero_documento", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-004", nombre: "nombre_completo", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-005", nombre: "email", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: true },
      { id: "attr-006", nombre: "telefono", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: true },
      { id: "attr-007", nombre: "segmento", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Persona, Pyme, Empresarial, Gobierno" },
      { id: "attr-008", nombre: "fecha_vinculacion", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: false },
    ],
  },
  {
    id: "ent-002",
    nombre: "Cuenta",
    descripcion:
      "Producto financiero de captación asociado a un cliente (ahorros, corriente, CDT).",
    posicion_x: 450,
    posicion_y: 50,
    color: "#10B981",
    atributos: [
      { id: "attr-010", nombre: "id_cuenta", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "attr-011", nombre: "numero_cuenta", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-012", nombre: "tipo_cuenta", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Ahorros, Corriente, CDT" },
      { id: "attr-013", nombre: "saldo_actual", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-014", nombre: "moneda", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-015", nombre: "estado", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Activa, Inactiva, Cancelada" },
      { id: "attr-016", nombre: "id_cliente", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "ent-001", fk_atributo_ref: "id_cliente" },
      { id: "attr-017", nombre: "fecha_apertura", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: false },
    ],
  },
  {
    id: "ent-003",
    nombre: "Transaccion",
    descripcion:
      "Movimiento financiero registrado sobre una cuenta (débito, crédito, transferencia).",
    posicion_x: 450,
    posicion_y: 350,
    color: "#F59E0B",
    atributos: [
      { id: "attr-020", nombre: "id_transaccion", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "attr-021", nombre: "id_cuenta", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "ent-002", fk_atributo_ref: "id_cuenta" },
      { id: "attr-022", nombre: "tipo_transaccion", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Débito, Crédito, Transferencia" },
      { id: "attr-023", nombre: "monto", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-024", nombre: "fecha_transaccion", tipo_dato: "DATETIME", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-025", nombre: "canal", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Sucursal, App, Web, ATM" },
      { id: "attr-026", nombre: "descripcion", tipo_dato: "TEXT", es_pk: false, es_fk: false, es_nullable: true },
    ],
  },
  {
    id: "ent-004",
    nombre: "Producto",
    descripcion:
      "Catálogo de productos financieros ofrecidos por la entidad.",
    posicion_x: 50,
    posicion_y: 350,
    color: "#8B5CF6",
    atributos: [
      { id: "attr-030", nombre: "id_producto", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "attr-031", nombre: "nombre_producto", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-032", nombre: "categoria", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Captación, Colocación, Seguros, Inversión" },
      { id: "attr-033", nombre: "estado", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-034", nombre: "tasa_interes", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: true },
    ],
  },
  {
    id: "ent-005",
    nombre: "ClienteProducto",
    descripcion:
      "Tabla asociativa que vincula clientes con los productos contratados.",
    posicion_x: 50,
    posicion_y: 200,
    color: "#EC4899",
    atributos: [
      { id: "attr-040", nombre: "id", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "attr-041", nombre: "id_cliente", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "ent-001", fk_atributo_ref: "id_cliente" },
      { id: "attr-042", nombre: "id_producto", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "ent-004", fk_atributo_ref: "id_producto" },
      { id: "attr-043", nombre: "fecha_contratacion", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: false },
      { id: "attr-044", nombre: "estado", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
    ],
  },
];

const RELACIONES: RelacionER[] = [
  {
    id: "rel-001",
    nombre: "tiene",
    entidad_origen_id: "ent-001",
    entidad_destino_id: "ent-002",
    cardinalidad: "1:N",
    descripcion: "Un cliente puede tener múltiples cuentas.",
  },
  {
    id: "rel-002",
    nombre: "registra",
    entidad_origen_id: "ent-002",
    entidad_destino_id: "ent-003",
    cardinalidad: "1:N",
    descripcion: "Una cuenta registra múltiples transacciones.",
  },
  {
    id: "rel-003",
    nombre: "contrata",
    entidad_origen_id: "ent-001",
    entidad_destino_id: "ent-005",
    cardinalidad: "1:N",
    descripcion: "Un cliente contrata múltiples productos.",
  },
  {
    id: "rel-004",
    nombre: "pertenece_a",
    entidad_origen_id: "ent-005",
    entidad_destino_id: "ent-004",
    cardinalidad: "N:1",
    descripcion: "Cada registro de ClienteProducto pertenece a un producto.",
  },
];

const COMENTARIOS: ComentarioER[] = [
  {
    id: "com-001",
    referencia_id: "ent-001",
    referencia_tipo: "entidad",
    autor_id: "usr-001",
    autor_nombre: "Carlos Méndez",
    autor_perfil: "CONSULTOR",
    contenido:
      "Verificar si el campo 'segmento' debería ser una entidad separada con su propio catálogo.",
    estado: "abierto",
    created_at: "2025-03-12T10:30:00Z",
  },
  {
    id: "com-002",
    referencia_id: "rel-002",
    referencia_tipo: "relacion",
    autor_id: "emp-usr-001",
    autor_nombre: "Ana Torres (Bancolombia)",
    autor_perfil: "EMPRESA",
    contenido:
      "Las transacciones también deberían vincularse al canal de origen. Actualmente el campo 'canal' es un VARCHAR libre, pero debería normalizarse.",
    estado: "abierto",
    created_at: "2025-03-13T14:15:00Z",
  },
  {
    id: "com-003",
    referencia_id: null,
    referencia_tipo: "general",
    autor_id: "usr-001",
    autor_nombre: "Carlos Méndez",
    autor_perfil: "CONSULTOR",
    contenido:
      "Falta incluir la entidad 'Sucursal' que es referenciada en varios procesos operativos. Pendiente para la siguiente iteración.",
    estado: "abierto",
    created_at: "2025-03-14T09:00:00Z",
  },
];

const HISTORIAL: VersionModeloER[] = [
  {
    version: "1.0",
    fecha: "2025-03-10T08:00:00Z",
    autor: "IA (Generación automática)",
    descripcion_cambio: "Modelo ER inicial generado a partir de documentación cargada.",
  },
  {
    version: "1.1",
    fecha: "2025-03-11T15:00:00Z",
    autor: "Carlos Méndez",
    descripcion_cambio: "Se agregó la entidad ClienteProducto y se ajustaron las relaciones N:M.",
  },
  {
    version: "1.2",
    fecha: "2025-03-14T10:00:00Z",
    autor: "Carlos Méndez",
    descripcion_cambio: "Se agregaron descripciones a todas las entidades y atributos clave.",
  },
];

// ============================================================================
// Mock completo del Modelo ER
// ============================================================================

export const MOCK_MODELO_ER: Record<string, ModeloER> = {
  "proy-001": {
    id: "mer-001",
    entregable_id: "ent-proy-001-1",
    proyecto_id: "proy-001",
    nombre: "Modelo Entidad-Relación — Bancolombia AS-IS",
    descripcion:
      "Modelo conceptual del estado actual de la arquitectura de datos del área de analítica avanzada y planeación estratégica de Bancolombia.",
    entidades: ENTIDADES,
    relaciones: RELACIONES,
    comentarios: COMENTARIOS,
    version_actual: "1.2",
    historial_versiones: HISTORIAL,
    created_at: "2025-03-10T08:00:00Z",
    updated_at: "2025-03-14T10:00:00Z",
  },
};

// ============================================================================
// Mock de un modelo ER vacío (para cuando se crea un nuevo proyecto)
// ============================================================================

export const MOCK_MODELO_ER_VACIO: ModeloER = {
  id: "",
  entregable_id: "",
  proyecto_id: "",
  nombre: "",
  descripcion: "",
  entidades: [],
  relaciones: [],
  comentarios: [],
  version_actual: "0.0",
  historial_versiones: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================================================
// Funciones mock (simulan llamadas a FastAPI)
// ============================================================================

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

/** GET /api/v1/proyectos/{id}/modelo-er */
export const mockGetModeloER = async (
  proyectoId: string
): Promise<ModeloER> => {
  await delay();
  return MOCK_MODELO_ER[proyectoId] ?? { ...MOCK_MODELO_ER_VACIO, proyecto_id: proyectoId };
};

/** PUT /api/v1/proyectos/{id}/modelo-er */
export const mockGuardarModeloER = async (
  modelo: ModeloER
): Promise<ModeloER> => {
  await delay(800);
  const versionParts = modelo.version_actual.split(".");
  const minor = parseInt(versionParts[1] ?? "0") + 1;
  const nuevaVersion = `${versionParts[0]}.${minor}`;
  modelo.version_actual = nuevaVersion;
  modelo.updated_at = new Date().toISOString();
  modelo.historial_versiones.push({
    version: nuevaVersion,
    fecha: new Date().toISOString(),
    autor: "Carlos Méndez",
    descripcion_cambio: "Cambios guardados desde el editor.",
  });
  MOCK_MODELO_ER[modelo.proyecto_id] = modelo;
  return modelo;
};

/** POST /api/v1/proyectos/{id}/modelo-er/generar (IA) */
export const mockGenerarModeloERConIA = async (
  proyectoId: string
): Promise<ModeloER> => {
  await delay(2500); // Simula latencia de LLM
  const modelo = MOCK_MODELO_ER[proyectoId];
  if (!modelo) throw new Error("PROYECTO_NO_ENCONTRADO");
  return modelo;
};

/** POST /api/v1/proyectos/{id}/modelo-er/comentarios */
export const mockAgregarComentarioER = async (
  proyectoId: string,
  comentario: Omit<ComentarioER, "id" | "created_at">
): Promise<ComentarioER> => {
  await delay(400);
  const modelo = MOCK_MODELO_ER[proyectoId];
  if (!modelo) throw new Error("PROYECTO_NO_ENCONTRADO");
  const nuevo: ComentarioER = {
    ...comentario,
    id: `com-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  modelo.comentarios.push(nuevo);
  return nuevo;
};

import type {
  ModeloER,
  EntidadER,
  RelacionER,
  ComentarioER,
  VersionModeloER,
} from "../types/modelo-er.types";

// ============================================================================
// Mock: Modelo ER TO-BE del proyecto Bancolombia (proy-001)
// Representa la arquitectura conceptual OBJETIVO del área de analítica.
// Evoluciona el AS-IS incorporando:
//   - Entidad "Canal" normalizada (antes era un VARCHAR libre)
//   - Entidad "Segmento" normalizada (antes era un campo en Cliente)
//   - Entidad "EventoDigital" para capturar comportamiento omnicanal
//   - Atributos enriquecidos en entidades existentes
//   - Nuevas relaciones de trazabilidad
// ============================================================================

const ENTIDADES_TOBE: EntidadER[] = [
  {
    id: "tobe-ent-001",
    nombre: "Cliente",
    descripcion:
      "Persona natural o jurídica con productos financieros. Enriquecido con scoring crediticio, consentimiento de datos y referencia a segmento normalizado.",
    posicion_x: 50,
    posicion_y: 120,
    color: "#3B82F6",
    atributos: [
      { id: "tobe-attr-001", nombre: "id_cliente", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false, descripcion: "Identificador único del cliente" },
      { id: "tobe-attr-002", nombre: "tipo_documento", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "CC, NIT, CE, Pasaporte" },
      { id: "tobe-attr-003", nombre: "numero_documento", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-004", nombre: "nombre_completo", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-005", nombre: "email", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: true },
      { id: "tobe-attr-006", nombre: "telefono", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: true },
      { id: "tobe-attr-007", nombre: "id_segmento", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, descripcion: "FK a catálogo de segmentos (normalizado)", fk_entidad_ref: "tobe-ent-006", fk_atributo_ref: "id_segmento" },
      { id: "tobe-attr-008", nombre: "fecha_vinculacion", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-009", nombre: "scoring_crediticio", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Score de riesgo crediticio calculado (nuevo en TO-BE)" },
      { id: "tobe-attr-010", nombre: "consentimiento_datos", tipo_dato: "BOOLEAN", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Indica si el cliente autorizó el tratamiento de datos personales" },
      { id: "tobe-attr-011", nombre: "fecha_actualizacion", tipo_dato: "DATETIME", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Timestamp de última actualización del registro" },
    ],
  },
  {
    id: "tobe-ent-002",
    nombre: "Cuenta",
    descripcion:
      "Producto financiero de captación. Se agrega referencia al canal de apertura y fecha de última actividad.",
    posicion_x: 450,
    posicion_y: 50,
    color: "#10B981",
    atributos: [
      { id: "tobe-attr-020", nombre: "id_cuenta", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "tobe-attr-021", nombre: "numero_cuenta", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-022", nombre: "tipo_cuenta", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Ahorros, Corriente, CDT" },
      { id: "tobe-attr-023", nombre: "saldo_actual", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-024", nombre: "moneda", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-025", nombre: "estado", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Activa, Inactiva, Cancelada" },
      { id: "tobe-attr-026", nombre: "id_cliente", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "tobe-ent-001", fk_atributo_ref: "id_cliente" },
      { id: "tobe-attr-027", nombre: "fecha_apertura", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-028", nombre: "id_canal_apertura", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, descripcion: "Canal donde se abrió la cuenta (nuevo en TO-BE)", fk_entidad_ref: "tobe-ent-007", fk_atributo_ref: "id_canal" },
      { id: "tobe-attr-029", nombre: "fecha_ultima_actividad", tipo_dato: "DATETIME", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Última transacción o consulta (nuevo en TO-BE)" },
    ],
  },
  {
    id: "tobe-ent-003",
    nombre: "Transaccion",
    descripcion:
      "Movimiento financiero. Se normaliza el canal como FK y se agrega geolocalización y dispositivo.",
    posicion_x: 450,
    posicion_y: 350,
    color: "#F59E0B",
    atributos: [
      { id: "tobe-attr-030", nombre: "id_transaccion", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "tobe-attr-031", nombre: "id_cuenta", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "tobe-ent-002", fk_atributo_ref: "id_cuenta" },
      { id: "tobe-attr-032", nombre: "tipo_transaccion", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Débito, Crédito, Transferencia" },
      { id: "tobe-attr-033", nombre: "monto", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-034", nombre: "fecha_transaccion", tipo_dato: "DATETIME", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-035", nombre: "id_canal", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, descripcion: "FK a catálogo de canales (normalizado en TO-BE)", fk_entidad_ref: "tobe-ent-007", fk_atributo_ref: "id_canal" },
      { id: "tobe-attr-036", nombre: "descripcion", tipo_dato: "TEXT", es_pk: false, es_fk: false, es_nullable: true },
      { id: "tobe-attr-037", nombre: "latitud", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Geolocalización de la transacción (nuevo en TO-BE)" },
      { id: "tobe-attr-038", nombre: "longitud", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Geolocalización de la transacción (nuevo en TO-BE)" },
      { id: "tobe-attr-039", nombre: "dispositivo", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Tipo de dispositivo: iOS, Android, Web, ATM (nuevo en TO-BE)" },
    ],
  },
  {
    id: "tobe-ent-004",
    nombre: "Producto",
    descripcion:
      "Catálogo de productos financieros. Se agrega categorización jerárquica y vigencia.",
    posicion_x: 50,
    posicion_y: 450,
    color: "#8B5CF6",
    atributos: [
      { id: "tobe-attr-040", nombre: "id_producto", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "tobe-attr-041", nombre: "nombre_producto", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-042", nombre: "categoria", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Captación, Colocación, Seguros, Inversión" },
      { id: "tobe-attr-043", nombre: "subcategoria", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Clasificación de segundo nivel (nuevo en TO-BE)" },
      { id: "tobe-attr-044", nombre: "estado", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-045", nombre: "tasa_interes", tipo_dato: "DECIMAL", es_pk: false, es_fk: false, es_nullable: true },
      { id: "tobe-attr-046", nombre: "fecha_vigencia_inicio", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Inicio de vigencia del producto (nuevo en TO-BE)" },
      { id: "tobe-attr-047", nombre: "fecha_vigencia_fin", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Fin de vigencia, null si está vigente (nuevo en TO-BE)" },
    ],
  },
  {
    id: "tobe-ent-005",
    nombre: "ClienteProducto",
    descripcion:
      "Tabla asociativa que vincula clientes con productos contratados. Se agrega canal de contratación.",
    posicion_x: 50,
    posicion_y: 280,
    color: "#EC4899",
    atributos: [
      { id: "tobe-attr-050", nombre: "id", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "tobe-attr-051", nombre: "id_cliente", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "tobe-ent-001", fk_atributo_ref: "id_cliente" },
      { id: "tobe-attr-052", nombre: "id_producto", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "tobe-ent-004", fk_atributo_ref: "id_producto" },
      { id: "tobe-attr-053", nombre: "fecha_contratacion", tipo_dato: "DATE", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-054", nombre: "estado", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-055", nombre: "id_canal", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, descripcion: "Canal donde se contrató el producto (nuevo en TO-BE)", fk_entidad_ref: "tobe-ent-007", fk_atributo_ref: "id_canal" },
    ],
  },
  // ── Entidades NUEVAS en TO-BE ──────────────────────────────────────────
  {
    id: "tobe-ent-006",
    nombre: "Segmento",
    descripcion:
      "Catálogo normalizado de segmentos de cliente. Antes era un VARCHAR libre en la entidad Cliente (brecha identificada en AS-IS).",
    posicion_x: 300,
    posicion_y: 120,
    color: "#06B6D4",
    atributos: [
      { id: "tobe-attr-060", nombre: "id_segmento", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "tobe-attr-061", nombre: "nombre", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Persona, Pyme, Empresarial, Gobierno, Preferente" },
      { id: "tobe-attr-062", nombre: "descripcion", tipo_dato: "TEXT", es_pk: false, es_fk: false, es_nullable: true },
      { id: "tobe-attr-063", nombre: "criterios_asignacion", tipo_dato: "TEXT", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Reglas de negocio para asignar un cliente a este segmento" },
      { id: "tobe-attr-064", nombre: "activo", tipo_dato: "BOOLEAN", es_pk: false, es_fk: false, es_nullable: false },
    ],
  },
  {
    id: "tobe-ent-007",
    nombre: "Canal",
    descripcion:
      "Catálogo normalizado de canales de atención y transacción. Antes era un VARCHAR libre en Transacción (brecha identificada en AS-IS).",
    posicion_x: 750,
    posicion_y: 200,
    color: "#F97316",
    atributos: [
      { id: "tobe-attr-070", nombre: "id_canal", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "tobe-attr-071", nombre: "nombre", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Sucursal, App Móvil, Banca Web, ATM, Corresponsal, Call Center" },
      { id: "tobe-attr-072", nombre: "tipo", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "Físico, Digital, Mixto" },
      { id: "tobe-attr-073", nombre: "activo", tipo_dato: "BOOLEAN", es_pk: false, es_fk: false, es_nullable: false },
    ],
  },
  {
    id: "tobe-ent-008",
    nombre: "EventoDigital",
    descripcion:
      "Registro de interacciones digitales del cliente (clicks, sesiones, navegación). Entidad completamente nueva para habilitar analítica omnicanal.",
    posicion_x: 750,
    posicion_y: 450,
    color: "#EF4444",
    atributos: [
      { id: "tobe-attr-080", nombre: "id_evento", tipo_dato: "UUID", es_pk: true, es_fk: false, es_nullable: false },
      { id: "tobe-attr-081", nombre: "id_cliente", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "tobe-ent-001", fk_atributo_ref: "id_cliente" },
      { id: "tobe-attr-082", nombre: "id_canal", tipo_dato: "UUID", es_pk: false, es_fk: true, es_nullable: false, fk_entidad_ref: "tobe-ent-007", fk_atributo_ref: "id_canal" },
      { id: "tobe-attr-083", nombre: "tipo_evento", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: false, descripcion: "login, click, consulta_saldo, transferencia_iniciada, etc." },
      { id: "tobe-attr-084", nombre: "timestamp", tipo_dato: "DATETIME", es_pk: false, es_fk: false, es_nullable: false },
      { id: "tobe-attr-085", nombre: "metadata", tipo_dato: "JSON", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Datos adicionales del evento en formato JSON" },
      { id: "tobe-attr-086", nombre: "sesion_id", tipo_dato: "VARCHAR", es_pk: false, es_fk: false, es_nullable: true, descripcion: "Identificador de sesión del usuario" },
    ],
  },
];

const RELACIONES_TOBE: RelacionER[] = [
  // ── Relaciones heredadas del AS-IS ──────────────────────────────────
  {
    id: "tobe-rel-001",
    nombre: "tiene",
    entidad_origen_id: "tobe-ent-001",
    entidad_destino_id: "tobe-ent-002",
    cardinalidad: "1:N",
    descripcion: "Un cliente puede tener múltiples cuentas.",
  },
  {
    id: "tobe-rel-002",
    nombre: "registra",
    entidad_origen_id: "tobe-ent-002",
    entidad_destino_id: "tobe-ent-003",
    cardinalidad: "1:N",
    descripcion: "Una cuenta registra múltiples transacciones.",
  },
  {
    id: "tobe-rel-003",
    nombre: "contrata",
    entidad_origen_id: "tobe-ent-001",
    entidad_destino_id: "tobe-ent-005",
    cardinalidad: "1:N",
    descripcion: "Un cliente contrata múltiples productos.",
  },
  {
    id: "tobe-rel-004",
    nombre: "pertenece_a",
    entidad_origen_id: "tobe-ent-005",
    entidad_destino_id: "tobe-ent-004",
    cardinalidad: "N:1",
    descripcion: "Cada registro de ClienteProducto pertenece a un producto.",
  },
  // ── Relaciones NUEVAS en TO-BE ──────────────────────────────────────
  {
    id: "tobe-rel-005",
    nombre: "pertenece_a_segmento",
    entidad_origen_id: "tobe-ent-001",
    entidad_destino_id: "tobe-ent-006",
    cardinalidad: "N:1",
    descripcion: "Cada cliente pertenece a un segmento del catálogo normalizado (antes era un VARCHAR libre).",
  },
  {
    id: "tobe-rel-006",
    nombre: "realizada_por_canal",
    entidad_origen_id: "tobe-ent-003",
    entidad_destino_id: "tobe-ent-007",
    cardinalidad: "N:1",
    descripcion: "Cada transacción se realiza a través de un canal normalizado (antes era un VARCHAR libre).",
  },
  {
    id: "tobe-rel-007",
    nombre: "apertura_por_canal",
    entidad_origen_id: "tobe-ent-002",
    entidad_destino_id: "tobe-ent-007",
    cardinalidad: "N:1",
    descripcion: "Cada cuenta fue abierta a través de un canal específico (nueva trazabilidad).",
  },
  {
    id: "tobe-rel-008",
    nombre: "contratado_por_canal",
    entidad_origen_id: "tobe-ent-005",
    entidad_destino_id: "tobe-ent-007",
    cardinalidad: "N:1",
    descripcion: "Cada contratación de producto se realizó por un canal específico (nueva trazabilidad).",
  },
  {
    id: "tobe-rel-009",
    nombre: "genera_evento",
    entidad_origen_id: "tobe-ent-001",
    entidad_destino_id: "tobe-ent-008",
    cardinalidad: "1:N",
    descripcion: "Un cliente genera múltiples eventos digitales (nueva entidad para analítica omnicanal).",
  },
  {
    id: "tobe-rel-010",
    nombre: "ocurre_en_canal",
    entidad_origen_id: "tobe-ent-008",
    entidad_destino_id: "tobe-ent-007",
    cardinalidad: "N:1",
    descripcion: "Cada evento digital ocurre en un canal específico.",
  },
];

const COMENTARIOS_TOBE: ComentarioER[] = [
  {
    id: "tobe-com-001",
    referencia_id: "tobe-ent-006",
    referencia_tipo: "entidad",
    autor_id: "usr-001",
    autor_nombre: "Carlos Méndez",
    autor_perfil: "CONSULTOR",
    contenido:
      "La entidad Segmento resuelve la brecha identificada en el AS-IS donde 'segmento' era un VARCHAR libre sin validación. Ahora es un catálogo normalizado con criterios de asignación.",
    estado: "abierto",
    created_at: "2025-03-20T10:00:00Z",
  },
  {
    id: "tobe-com-002",
    referencia_id: "tobe-ent-007",
    referencia_tipo: "entidad",
    autor_id: "usr-001",
    autor_nombre: "Carlos Méndez",
    autor_perfil: "CONSULTOR",
    contenido:
      "La entidad Canal normaliza los canales de transacción que antes eran un VARCHAR libre. Esto permite análisis omnicanal consistente y reportería por canal.",
    estado: "abierto",
    created_at: "2025-03-20T10:30:00Z",
  },
  {
    id: "tobe-com-003",
    referencia_id: "tobe-ent-008",
    referencia_tipo: "entidad",
    autor_id: "emp-usr-001",
    autor_nombre: "Ana Torres (Bancolombia)",
    autor_perfil: "EMPRESA",
    contenido:
      "La entidad EventoDigital es clave para nuestro proyecto de analítica omnicanal. Necesitamos confirmar con el equipo de tecnología si el campo 'metadata' en JSON es viable para el volumen esperado.",
    estado: "abierto",
    created_at: "2025-03-21T14:00:00Z",
  },
  {
    id: "tobe-com-004",
    referencia_id: null,
    referencia_tipo: "general",
    autor_id: "usr-001",
    autor_nombre: "Carlos Méndez",
    autor_perfil: "CONSULTOR",
    contenido:
      "Este modelo TO-BE incorpora 3 entidades nuevas (Segmento, Canal, EventoDigital) y 6 relaciones nuevas respecto al AS-IS. Las principales mejoras son: normalización de catálogos, trazabilidad de canales y habilitación de analítica digital.",
    estado: "abierto",
    created_at: "2025-03-22T09:00:00Z",
  },
];

const HISTORIAL_TOBE: VersionModeloER[] = [
  {
    version: "1.0",
    fecha: "2025-03-18T08:00:00Z",
    autor: "IA (Generación automática)",
    descripcion_cambio:
      "Modelo ER TO-BE inicial generado a partir del AS-IS aprobado y las brechas identificadas.",
  },
  {
    version: "1.1",
    fecha: "2025-03-19T11:00:00Z",
    autor: "Carlos Méndez",
    descripcion_cambio:
      "Se agregaron las entidades Segmento y Canal para normalizar catálogos identificados como brechas.",
  },
  {
    version: "1.2",
    fecha: "2025-03-20T16:00:00Z",
    autor: "Carlos Méndez",
    descripcion_cambio:
      "Se agregó la entidad EventoDigital y las relaciones de trazabilidad omnicanal.",
  },
  {
    version: "1.3",
    fecha: "2025-03-22T10:00:00Z",
    autor: "Carlos Méndez",
    descripcion_cambio:
      "Se enriquecieron atributos de Cliente (scoring, consentimiento) y Producto (vigencia, subcategoría).",
  },
];

// ============================================================================
// Mock completo del Modelo ER TO-BE
// ============================================================================

export const MOCK_MODELO_ER_TOBE: Record<string, ModeloER> = {
  "proy-001": {
    id: "mer-tobe-001",
    entregable_id: "ent-proy-001-5",
    proyecto_id: "proy-001",
    nombre: "Modelo Entidad-Relación — Bancolombia TO-BE",
    descripcion:
      "Modelo conceptual del estado OBJETIVO de la arquitectura de datos. Incorpora normalización de catálogos (Segmento, Canal), trazabilidad omnicanal y entidad de eventos digitales.",
    entidades: ENTIDADES_TOBE,
    relaciones: RELACIONES_TOBE,
    comentarios: COMENTARIOS_TOBE,
    version_actual: "1.3",
    historial_versiones: HISTORIAL_TOBE,
    created_at: "2025-03-18T08:00:00Z",
    updated_at: "2025-03-22T10:00:00Z",
  },
};

// ============================================================================
// Funciones mock (simulan llamadas a FastAPI)
// ============================================================================

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

/** GET /api/v1/proyectos/{id}/modelo-er-tobe */
export const mockGetModeloERToBe = async (
  proyectoId: string
): Promise<ModeloER> => {
  await delay();
  return (
    MOCK_MODELO_ER_TOBE[proyectoId] ?? {
      id: "",
      entregable_id: "",
      proyecto_id: proyectoId,
      nombre: "",
      descripcion: "",
      entidades: [],
      relaciones: [],
      comentarios: [],
      version_actual: "0.0",
      historial_versiones: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  );
};

/** PUT /api/v1/proyectos/{id}/modelo-er-tobe */
export const mockGuardarModeloERToBe = async (
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
  MOCK_MODELO_ER_TOBE[modelo.proyecto_id] = modelo;
  return modelo;
};

/** POST /api/v1/proyectos/{id}/modelo-er-tobe/generar (IA) */
export const mockGenerarModeloERToBeConIA = async (
  proyectoId: string
): Promise<ModeloER> => {
  await delay(2500);
  const modelo = MOCK_MODELO_ER_TOBE[proyectoId];
  if (!modelo) throw new Error("PROYECTO_NO_ENCONTRADO");
  return modelo;
};

/** POST /api/v1/proyectos/{id}/modelo-er-tobe/comentarios */
export const mockAgregarComentarioERToBe = async (
  proyectoId: string,
  comentario: Omit<ComentarioER, "id" | "created_at">
): Promise<ComentarioER> => {
  await delay(400);
  const modelo = MOCK_MODELO_ER_TOBE[proyectoId];
  if (!modelo) throw new Error("PROYECTO_NO_ENCONTRADO");
  const nuevo: ComentarioER = {
    ...comentario,
    id: `tobe-com-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  modelo.comentarios.push(nuevo);
  return nuevo;
};

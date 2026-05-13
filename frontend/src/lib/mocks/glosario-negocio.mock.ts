// ============================================================================
// Mock: Glosario de Negocio TO-BE
// Caso de estudio: Bancolombia — Arquitectura de datos objetivo
// Artefacto #7 de la etapa TO-BE
// ============================================================================

import type {
  GlosarioNegocio,
  ComentarioGlosario,
} from "@/lib/types/glosario-negocio.types";

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

const MOCK_GLOSARIO: Record<string, GlosarioNegocio> = {
  "proy-001": {
    id: "glos-001",
    entregable_id: "ent-proy-001-7",
    proyecto_id: "proy-001",
    nombre: "Glosario de Negocio TO-BE — Bancolombia",
    descripcion:
      "Diccionario estandarizado de términos de negocio para la arquitectura de datos objetivo de Bancolombia. Define entidades, atributos y relaciones clave que deben ser consistentes en todos los sistemas del ecosistema TO-BE.",
    terminos: [
      {
        id: "ter-001",
        termino: "Cliente Único",
        definicion:
          "Representación consolidada y canónica de una persona natural o jurídica que tiene o ha tenido algún producto o relación comercial con Bancolombia. Elimina duplicidades entre sucursales y canales.",
        propietario: "Vicepresidencia Comercial",
        entidades_relacionadas: ["Cuenta", "Producto Financiero", "Segmento"],
        sinonimos: ["Golden Record", "Vista Única de Cliente", "Master Customer"],
        notas:
          "Piedra angular del MDM (Master Data Management). Identificado por un UUID global único, independiente del número de documento.",
      },
      {
        id: "ter-002",
        termino: "Cuenta",
        definicion:
          "Contrato financiero que registra los derechos y obligaciones entre Bancolombia y un Cliente Único. Puede ser de ahorro, corriente, CDT o fiducia. Su estado y saldo son atributos maestros gestionados por el Core Bancario TO-BE.",
        propietario: "Vicepresidencia de Operaciones",
        entidades_relacionadas: ["Cliente Único", "Transacción", "Producto Financiero"],
        sinonimos: ["Account", "Producto Pasivo"],
        notas: "Identificada por número de cuenta con dígito verificador. No confundir con 'Producto Financiero'.",
      },
      {
        id: "ter-003",
        termino: "Transacción",
        definicion:
          "Operación atómica e inmutable que modifica el saldo de una o más cuentas. Incluye transferencias, pagos, consignaciones, retiros y débitos automáticos. Toda transacción genera un registro de auditoría permanente.",
        propietario: "Gerencia de Operaciones Bancarias",
        entidades_relacionadas: ["Cuenta", "Canal", "Producto Financiero"],
        sinonimos: ["Movimiento", "Operación", "Transaction"],
        notas: "Inmutable por diseño. El estado solo puede ser PENDIENTE, APROBADA, RECHAZADA o REVERTIDA.",
      },
      {
        id: "ter-004",
        termino: "Segmento de Cliente",
        definicion:
          "Clasificación estratégica de un Cliente Único basada en su comportamiento financiero, patrimonio, potencial de negocio y perfil de riesgo. Determina el portafolio de productos ofrecibles y el nivel de servicio.",
        propietario: "Vicepresidencia de Estrategia y Marketing",
        entidades_relacionadas: ["Cliente Único", "Producto Financiero", "Asesor"],
        sinonimos: ["Perfil de Cliente", "Customer Segment", "Tier"],
        notas:
          "Valores posibles: MASIVO, PREFERENCIAL, PYME, EMPRESARIAL, CORPORATIVO, PRIVADO. Recalculado mensualmente por el motor de segmentación.",
      },
      {
        id: "ter-005",
        termino: "Producto Financiero",
        definicion:
          "Servicio financiero contratado por un Cliente Único: crédito de consumo, hipotecario, tarjeta de crédito, seguro, inversión o fondo. Tiene un ciclo de vida propio (SOLICITUD → ACTIVO → EN_MORA → CANCELADO).",
        propietario: "Vicepresidencia de Productos",
        entidades_relacionadas: ["Cliente Único", "Cuenta", "Canal"],
        sinonimos: ["Producto", "Facility", "Financial Product"],
        notas: "Un cliente puede tener N productos. Cada producto tiene su propia tabla de amortización si aplica.",
      },
      {
        id: "ter-006",
        termino: "Canal",
        definicion:
          "Medio a través del cual un Cliente Único interactúa con Bancolombia para realizar transacciones o consultas. En el TO-BE, todos los canales comparten la misma capa de servicios a través del API Gateway unificado.",
        propietario: "Vicepresidencia Digital",
        entidades_relacionadas: ["Transacción", "Cliente Único", "Sesión"],
        sinonimos: ["Channel", "Punto de Contacto", "Touchpoint"],
        notas:
          "Canales: APP_MOVIL, PORTAL_WEB, CAJERO_ATM, SUCURSAL_FISICA, BANCA_TELEFONICA, CORRESPONSAL_BANCARIO, API_EMPRESAS.",
      },
      {
        id: "ter-007",
        termino: "Entidad de Datos Maestra",
        definicion:
          "Objeto de negocio de alto valor cuya información es compartida y reutilizada por múltiples sistemas del ecosistema. Su gestión centralizada en el MDM TO-BE garantiza unicidad, calidad y trazabilidad.",
        propietario: "Gerencia de Arquitectura de Datos",
        entidades_relacionadas: ["Cliente Único", "Producto Financiero", "Sucursal"],
        sinonimos: ["Master Data", "Dato Maestro", "Golden Record"],
        notas: "Las entidades maestras del TO-BE son: Cliente, Producto, Sucursal, Empleado y Proveedor.",
      },
      {
        id: "ter-008",
        termino: "Indicador Clave (KPI)",
        definicion:
          "Métrica cuantificable que mide el desempeño de la arquitectura de datos frente a los objetivos estratégicos del banco. Los KPIs son calculados en tiempo real desde el Data Lakehouse TO-BE.",
        propietario: "Vicepresidencia de Estrategia",
        entidades_relacionadas: ["Dashboard de Métricas", "Transacción", "Cliente Único"],
        sinonimos: ["KPI", "Métrica", "Indicador de Gestión"],
        notas:
          "KPIs primarios de arquitectura: Latencia de datos (<5 min), Tasa de duplicidad (<0.1%), Disponibilidad del API Gateway (>99.9%).",
      },
      {
        id: "ter-009",
        termino: "Calidad de Dato",
        definicion:
          "Dimensiones que determinan si un dato es apto para su uso en decisiones de negocio: completitud, exactitud, consistencia, oportunidad, unicidad y validez. En el TO-BE se mide automáticamente en el pipeline de ingesta.",
        propietario: "Gerencia de Gobierno de Datos",
        entidades_relacionadas: ["Entidad de Datos Maestra", "Pipeline de Datos"],
        sinonimos: ["Data Quality", "DQ", "Calidad del Dato"],
        notas: "Score mínimo aceptable por entidad: 95%. Por debajo activa alerta al Data Steward responsable.",
      },
      {
        id: "ter-010",
        termino: "Pipeline de Datos",
        definicion:
          "Flujo automatizado de extracción, transformación y carga (ETL/ELT) que mueve datos desde los sistemas fuente hasta el Data Lakehouse TO-BE. Reemplaza los procesos batch nocturnos del AS-IS por streaming near-real-time.",
        propietario: "Gerencia de Ingeniería de Datos",
        entidades_relacionadas: ["Transacción", "Entidad de Datos Maestra", "Calidad de Dato"],
        sinonimos: ["ETL", "ELT", "Data Pipeline", "Flujo de Datos"],
        notas: "Tecnología TO-BE: Apache Kafka (streaming) + Apache Spark (batch pesado). SLA: datos disponibles en <5 minutos.",
      },
    ],
    comentarios: [
      {
        id: "com-glos-001",
        referencia_id: "ter-001",
        referencia_tipo: "termino",
        autor_id: "usr-001",
        autor_nombre: "Carlos Méndez",
        autor_perfil: "CONSULTOR",
        contenido:
          "Validar con el equipo de MDM si el UUID global ya está definido o si se usará el número de cédula como surrogate key durante la transición.",
        estado: "abierto",
        created_at: "2026-03-15T09:00:00Z",
      },
    ],
    version_actual: "1.0",
    historial_versiones: [
      {
        version: "1.0",
        fecha: "2026-03-15T08:00:00Z",
        autor: "Agente TO-BE",
        descripcion_cambio:
          "Versión inicial generada con IA a partir del Diagrama Conceptual TO-BE y el Modelo Lógico aprobados.",
        total_terminos: 10,
      },
    ],
    created_at: "2026-03-15T08:00:00Z",
    updated_at: "2026-03-15T08:00:00Z",
  },
};

// ── Funciones mock (simulan llamadas a FastAPI) ───────────────────────────────

export const mockGetGlosarioNegocio = async (
  idProyecto: string
): Promise<GlosarioNegocio> => {
  await delay();
  const data = MOCK_GLOSARIO[idProyecto];
  if (!data) throw new Error("GLOSARIO_NO_ENCONTRADO");
  return data;
};

export const mockGuardarGlosarioNegocio = async (
  glosario: GlosarioNegocio
): Promise<GlosarioNegocio> => {
  await delay(400);
  const existente = MOCK_GLOSARIO[glosario.proyecto_id];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");

  const [major, minor] = existente.version_actual.split(".").map(Number);
  const nuevaVersion = `${major}.${(minor ?? 0) + 1}`;

  const actualizado: GlosarioNegocio = {
    ...glosario,
    version_actual: nuevaVersion,
    updated_at: new Date().toISOString(),
    historial_versiones: [
      ...existente.historial_versiones,
      {
        version: nuevaVersion,
        fecha: new Date().toISOString(),
        autor: "Carlos Méndez",
        descripcion_cambio: "Edición manual del glosario de negocio.",
        total_terminos: glosario.terminos.length,
      },
    ],
  };

  MOCK_GLOSARIO[glosario.proyecto_id] = actualizado;
  return actualizado;
};

export const mockGenerarGlosarioNegocioConIA = async (
  idProyecto: string
): Promise<GlosarioNegocio> => {
  await delay(1800);
  const existente = MOCK_GLOSARIO[idProyecto];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");

  const [major] = existente.version_actual.split(".").map(Number);
  const nuevaVersion = `${(major ?? 1) + 1}.0`;

  const generado: GlosarioNegocio = {
    ...existente,
    version_actual: nuevaVersion,
    updated_at: new Date().toISOString(),
    historial_versiones: [
      ...existente.historial_versiones,
      {
        version: nuevaVersion,
        fecha: new Date().toISOString(),
        autor: "Agente TO-BE",
        descripcion_cambio:
          "Regeneración completa vía IA a partir del Diagrama Conceptual TO-BE y Modelo Lógico aprobados.",
        total_terminos: existente.terminos.length,
      },
    ],
  };

  MOCK_GLOSARIO[idProyecto] = generado;
  return generado;
};

export const mockAgregarComentarioGlosario = async (
  idProyecto: string,
  comentario: Omit<ComentarioGlosario, "id" | "created_at">
): Promise<void> => {
  await delay(300);
  const existente = MOCK_GLOSARIO[idProyecto];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");
  existente.comentarios.push({
    ...comentario,
    id: `com-glos-${Date.now()}`,
    created_at: new Date().toISOString(),
  });
};

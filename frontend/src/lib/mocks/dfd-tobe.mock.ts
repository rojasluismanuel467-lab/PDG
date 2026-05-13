// ============================================================================
// Mock: DFD TO-BE — Diagrama de Flujo de Datos del Estado Objetivo
// Caso de estudio: Bancolombia — Arquitectura Moderna de Datos
// Nivel 1: Descomposición de procesos principales
// Evolución del DFD AS-IS hacia una arquitectura orientada a eventos,
// con procesamiento en tiempo real, Data Lake y visión 360° del cliente.
// ============================================================================

import type { DiagramaFlujoDatos } from "@/lib/types/dfd.types";

export const mockDFDToBe: DiagramaFlujoDatos = {
  id: "dfd-tobe-001",
  entregable_id: "ent-proy-001-9",
  proyecto_id: "proj-001",
  nombre: "DFD TO-BE — Bancolombia",
  descripcion:
    "Diagrama de Flujo de Datos del estado objetivo (TO-BE) que representa la arquitectura moderna de datos de Bancolombia. Incorpora procesamiento en tiempo real, Data Lake centralizado, motor analítico con ML, Gateway API unificado y visión 360° del cliente. Nivel 1 de descomposición.",
  nivel: 1,

  // ── Nodos ─────────────────────────────────────────────────────────────
  nodos: [
    // ── Procesos (4) ──────────────────────────────────────────────────
    {
      id: "proc-t01",
      tipo: "proceso",
      nombre: "Gateway API Unificado",
      descripcion:
        "Punto de entrada único para todas las interacciones con el sistema. Gestiona autenticación OAuth 2.0, rate limiting, enrutamiento inteligente y transformación de payloads. Reemplaza las múltiples interfaces punto a punto del AS-IS.",
      numero_proceso: "1",
      posicion_x: 420,
      posicion_y: 30,
      fase: "Diseño",
      categoria: "Integración",
      etiquetas: ["OAuth 2.0", "API Gateway"],
    },
    {
      id: "proc-t02",
      tipo: "proceso",
      nombre: "Procesador de Eventos en Tiempo Real",
      descripcion:
        "Motor de procesamiento de eventos basado en Apache Kafka y Flink. Captura, transforma y enruta eventos de negocio en tiempo real. Elimina el procesamiento batch nocturno del AS-IS, permitiendo visibilidad inmediata de transacciones.",
      numero_proceso: "2",
      posicion_x: 420,
      posicion_y: 220,
      fase: "Diseño",
      categoria: "Procesamiento",
      etiquetas: ["Kafka", "Tiempo Real"],
    },
    {
      id: "proc-t03",
      tipo: "proceso",
      nombre: "ETL / ELT Consolidador",
      descripcion:
        "Pipeline de datos que extrae de fuentes heterogéneas, transforma y carga en el Data Lake y la BD Analítica. Orquestado con Apache Airflow, ejecuta jobs incrementales cada hora en lugar de los procesos manuales mensuales del AS-IS.",
      numero_proceso: "3",
      posicion_x: 420,
      posicion_y: 420,
      fase: "Diseño",
      categoria: "Transformación",
      etiquetas: ["Airflow", "ETL/ELT"],
    },
    {
      id: "proc-t04",
      tipo: "proceso",
      nombre: "Motor Analítico e IA",
      descripcion:
        "Plataforma de análisis avanzado y machine learning que genera insights predictivos, scoring de riesgo crediticio, detección de fraude en tiempo real y reportes regulatorios automatizados. Reemplaza la generación manual de reportes del AS-IS.",
      numero_proceso: "4",
      posicion_x: 420,
      posicion_y: 610,
      fase: "Diseño",
      categoria: "Reportes",
      etiquetas: ["ML", "IA"],
    },

    // ── Almacenes de datos (5) ────────────────────────────────────────
    {
      id: "alm-t01",
      tipo: "almacen",
      nombre: "Data Lake (S3 / ADLS)",
      descripcion:
        "Almacén centralizado de datos crudos y procesados en formato Parquet/Delta Lake sobre almacenamiento en la nube. Zona raw, curated y consumption. Reemplaza los archivos planos dispersos del AS-IS.",
      prefijo_almacen: "D",
      posicion_x: 850,
      posicion_y: 320,
      fase: "Diseño",
    },
    {
      id: "alm-t02",
      tipo: "almacen",
      nombre: "BD Clientes 360°",
      descripcion:
        "Base de datos PostgreSQL con modelo unificado de cliente que consolida datos demográficos, transaccionales, de comportamiento digital y preferencias. Elimina la duplicación del AS-IS entre BD Legacy y archivos planos.",
      prefijo_almacen: "D",
      posicion_x: 850,
      posicion_y: 100,
      fase: "Diseño",
    },
    {
      id: "alm-t03",
      tipo: "almacen",
      nombre: "Cache Redis",
      descripcion:
        "Capa de caché distribuida para sesiones de usuario, datos de consulta frecuente y resultados de scoring en tiempo real. TTL configurable por tipo de dato.",
      prefijo_almacen: "T",
      posicion_x: 850,
      posicion_y: 0,
      fase: "Diseño",
    },
    {
      id: "alm-t04",
      tipo: "almacen",
      nombre: "BD Analítica (Snowflake)",
      descripcion:
        "Data Warehouse en la nube para análisis OLAP, reportes regulatorios y dashboards ejecutivos. Esquema estrella optimizado para consultas complejas.",
      fase: "Diseño",
      prefijo_almacen: "D",
      posicion_x: 850,
      posicion_y: 530,
    },
    {
      id: "alm-t05",
      tipo: "almacen",
      nombre: "Event Store (Kafka Topics)",
      descripcion:
        "Almacén de eventos inmutables en Apache Kafka con retención de 30 días. Permite replay de eventos y auditoría completa del flujo de datos.",
      prefijo_almacen: "T",
      posicion_x: 850,
      posicion_y: 210,
    },

    // ── Entidades externas (4) ────────────────────────────────────────
    {
      id: "ext-t01",
      tipo: "entidad_externa",
      nombre: "Cliente",
      descripcion:
        "Clientes personas naturales y jurídicas que interactúan a través de canales digitales (app móvil, web), sucursales físicas y Open Banking. Experiencia omnicanal.",
      posicion_x: 30,
      posicion_y: 30,
      fase: "Diseño",
    },
    {
      id: "ext-t02",
      tipo: "entidad_externa",
      nombre: "App Móvil / Web",
      descripcion:
        "Aplicaciones frontend que capturan eventos de comportamiento del usuario en tiempo real. Integradas con el Procesador de Eventos para analytics en vivo.",
      posicion_x: 30,
      posicion_y: 200,
      fase: "Diseño",
    },
    {
      id: "ext-t03",
      tipo: "entidad_externa",
      nombre: "Superintendencia Financiera (SFC)",
      descripcion:
        "Ente regulador que recibe reportes automatizados vía API REST del portal XBRL. Eliminación del envío manual por correo del AS-IS.",
      posicion_x: 30,
      posicion_y: 610,
      fase: "Diseño",
    },
    {
      id: "ext-t04",
      tipo: "entidad_externa",
      nombre: "Pasarela de Pagos / Open Banking",
      descripcion:
        "Ecosistema de pagos y APIs de Open Banking que se integran vía el Gateway API con estándares OAuth 2.0 y webhooks en tiempo real.",
      posicion_x: 30,
      posicion_y: 420,
      fase: "Diseño",
    },
  ],

  // ── Flujos de datos ─────────────────────────────────────────────────
  flujos: [
    // Cliente → Gateway API
    {
      id: "flujo-t01",
      origen_id: "ext-t01",
      destino_id: "proc-t01",
      etiqueta: "solicitud_api",
      datos_descripcion: "Solicitud autenticada del cliente vía canales digitales o sucursal",
      datos_campos: ["token_jwt", "tipo_operacion", "payload", "canal", "device_id"],
      fase: "Diseño",
      tipo_flujo: "entrada",
    },
    // App Móvil → Procesador Eventos
    {
      id: "flujo-t02",
      origen_id: "ext-t02",
      destino_id: "proc-t02",
      etiqueta: "eventos_comportamiento",
      datos_descripcion: "Stream de eventos de comportamiento del usuario en la app",
      datos_campos: ["event_type", "timestamp", "user_id", "session_id", "metadata"],
      fase: "Diseño",
      tipo_flujo: "entrada",
    },
    // Gateway API → Cache Redis
    {
      id: "flujo-t03",
      origen_id: "proc-t01",
      destino_id: "alm-t03",
      etiqueta: "datos_sesión",
      datos_descripcion: "Datos de sesión y tokens almacenados en caché para acceso rápido",
      datos_campos: ["session_token", "user_context", "permisos", "ttl"],
      fase: "Diseño",
      tipo_flujo: "salida",
    },
    // Gateway API → BD Clientes 360°
    {
      id: "flujo-t04",
      origen_id: "proc-t01",
      destino_id: "alm-t02",
      etiqueta: "consulta_perfil_cliente",
      datos_descripcion: "Lectura/escritura del perfil unificado del cliente",
      datos_campos: ["id_cliente", "datos_demograficos", "productos", "preferencias", "score_riesgo"],
      fase: "Diseño",
      tipo_flujo: "bidireccional",
    },
    // Gateway API → Procesador Eventos
    {
      id: "flujo-t05",
      origen_id: "proc-t01",
      destino_id: "proc-t02",
      etiqueta: "evento_transacción",
      datos_descripcion: "Evento de transacción publicado al bus de eventos para procesamiento en tiempo real",
      datos_campos: ["transaction_id", "tipo", "monto", "cuenta_origen", "cuenta_destino", "timestamp"],
    },
    // Procesador Eventos → Event Store
    {
      id: "flujo-t06",
      origen_id: "proc-t02",
      destino_id: "alm-t05",
      etiqueta: "evento_persistido",
      datos_descripcion: "Evento inmutable almacenado en Kafka para auditoría y replay",
      datos_campos: ["event_id", "topic", "partition", "offset", "payload", "timestamp"],
    },
    // Procesador Eventos → BD Clientes 360°
    {
      id: "flujo-t07",
      origen_id: "proc-t02",
      destino_id: "alm-t02",
      etiqueta: "actualización_tiempo_real",
      datos_descripcion: "Actualización inmediata del perfil del cliente tras cada evento procesado",
      datos_campos: ["id_cliente", "ultimo_evento", "saldo_actualizado", "timestamp"],
    },
    // Pasarela / Open Banking → Gateway API
    {
      id: "flujo-t08",
      origen_id: "ext-t04",
      destino_id: "proc-t01",
      etiqueta: "webhook_pago",
      datos_descripcion: "Notificación webhook de pago procesado por la pasarela o partner Open Banking",
      datos_campos: ["webhook_id", "payment_status", "reference", "amount", "provider"],
    },
    // Event Store → ETL Consolidador
    {
      id: "flujo-t09",
      origen_id: "alm-t05",
      destino_id: "proc-t03",
      etiqueta: "stream_eventos",
      datos_descripcion: "Consumo de eventos desde Kafka para procesamiento batch incremental",
      datos_campos: ["consumer_group", "topic", "batch_events", "watermark"],
    },
    // BD Clientes 360° → ETL Consolidador
    {
      id: "flujo-t10",
      origen_id: "alm-t02",
      destino_id: "proc-t03",
      etiqueta: "snapshot_clientes",
      datos_descripcion: "Snapshot periódico de datos de clientes para enriquecer el Data Lake",
      datos_campos: ["id_cliente", "segmento", "productos", "score", "fecha_snapshot"],
    },
    // ETL Consolidador → Data Lake
    {
      id: "flujo-t11",
      origen_id: "proc-t03",
      destino_id: "alm-t01",
      etiqueta: "datos_curados",
      datos_descripcion: "Datos transformados y validados almacenados en zona curated del Data Lake",
      datos_campos: ["dataset_id", "formato_parquet", "particion", "schema_version", "row_count"],
    },
    // ETL Consolidador → BD Analítica
    {
      id: "flujo-t12",
      origen_id: "proc-t03",
      destino_id: "alm-t04",
      etiqueta: "carga_dimensional",
      datos_descripcion: "Carga incremental en esquema estrella para análisis OLAP",
      datos_campos: ["tabla_destino", "tipo_carga", "registros_nuevos", "registros_actualizados"],
    },
    // Data Lake → Motor Analítico
    {
      id: "flujo-t13",
      origen_id: "alm-t01",
      destino_id: "proc-t04",
      etiqueta: "datos_entrenamiento",
      datos_descripcion: "Datasets para entrenamiento y re-entrenamiento de modelos de ML",
      datos_campos: ["dataset_path", "features", "target", "train_test_split", "version"],
    },
    // BD Analítica → Motor Analítico
    {
      id: "flujo-t14",
      origen_id: "alm-t04",
      destino_id: "proc-t04",
      etiqueta: "datos_reportes",
      datos_descripcion: "Consultas analíticas para generación automatizada de reportes regulatorios",
      datos_campos: ["query_id", "periodo", "metricas", "dimensiones", "filtros"],
    },
    // Motor Analítico → SFC
    {
      id: "flujo-t15",
      origen_id: "proc-t04",
      destino_id: "ext-t03",
      etiqueta: "reporte_automatizado_api",
      datos_descripcion: "Reporte regulatorio enviado automáticamente vía API REST al portal XBRL de la SFC",
      datos_campos: ["formato_XBRL", "periodo", "firma_digital", "hash_validacion", "api_response"],
    },
    // Motor Analítico → BD Clientes 360°
    {
      id: "flujo-t16",
      origen_id: "proc-t04",
      destino_id: "alm-t02",
      etiqueta: "scores_predicciones",
      datos_descripcion: "Scores de riesgo, propensión y predicciones de ML escritos en el perfil del cliente",
      datos_campos: ["id_cliente", "score_riesgo", "score_propension", "prediccion_churn", "fecha_calculo"],
    },
  ],

  // ── Comentarios ─────────────────────────────────────────────────────
  comentarios: [
    {
      id: "com-tobe-001",
      referencia_id: "proc-t02",
      referencia_tipo: "nodo",
      autor_id: "usr-001",
      autor_nombre: "Carlos Méndez",
      autor_perfil: "CONSULTOR",
      contenido:
        "El Procesador de Eventos en Tiempo Real es la pieza clave que resuelve el cuello de botella del procesamiento batch nocturno identificado en el AS-IS. Con Kafka + Flink, las transacciones se reflejan en menos de 2 segundos.",
      estado: "abierto",
      created_at: "2026-03-01T10:30:00Z",
    },
    {
      id: "com-tobe-002",
      referencia_id: "alm-t01",
      referencia_tipo: "nodo",
      autor_id: "usr-002",
      autor_nombre: "Laura Gómez",
      autor_perfil: "EMPRESA",
      contenido:
        "El Data Lake centralizado elimina completamente los archivos planos dispersos. Necesitamos definir la política de retención por zona (raw: 2 años, curated: 5 años, consumption: 1 año).",
      estado: "abierto",
      created_at: "2026-03-02T14:15:00Z",
    },
    {
      id: "com-tobe-003",
      referencia_id: null,
      referencia_tipo: "general",
      autor_id: "usr-001",
      autor_nombre: "Carlos Méndez",
      autor_perfil: "CONSULTOR",
      contenido:
        "El DFD TO-BE resuelve los 3 problemas principales del AS-IS: (1) procesamiento en tiempo real en lugar de batch, (2) Data Lake centralizado que elimina datos duplicados, (3) reportes regulatorios automatizados vía API. Además, agrega capacidades nuevas: visión 360° del cliente, motor de ML predictivo y arquitectura orientada a eventos.",
      estado: "abierto",
      created_at: "2026-03-03T09:00:00Z",
    },
    {
      id: "com-tobe-004",
      referencia_id: "flujo-t15",
      referencia_tipo: "flujo",
      autor_id: "usr-002",
      autor_nombre: "Laura Gómez",
      autor_perfil: "EMPRESA",
      contenido:
        "La SFC confirmó que su portal XBRL estará disponible para integración API en Q3 2026. Mientras tanto, podemos generar los reportes automáticamente y enviarlos por el canal actual como paso intermedio.",
      estado: "abierto",
      created_at: "2026-03-04T11:45:00Z",
    },
    {
      id: "com-tobe-005",
      referencia_id: "proc-t04",
      referencia_tipo: "nodo",
      autor_id: "usr-001",
      autor_nombre: "Carlos Méndez",
      autor_perfil: "CONSULTOR",
      contenido:
        "El Motor Analítico e IA debe incluir modelos de detección de fraude en tiempo real como prioridad. Según el benchmark de la industria, esto puede reducir las pérdidas por fraude en un 40-60%.",
      estado: "abierto",
      created_at: "2026-03-05T16:20:00Z",
    },
  ],

  // ── Versionamiento ──────────────────────────────────────────────────
  version_actual: "1.2",
  historial_versiones: [
    {
      version: "1.0",
      fecha: "2026-02-25T08:00:00Z",
      autor: "Carlos Méndez",
      descripcion_cambio:
        "Versión inicial del DFD TO-BE generada con IA a partir del análisis de brechas del DFD AS-IS y benchmarks de arquitectura de datos moderna.",
    },
    {
      version: "1.1",
      fecha: "2026-03-02T10:00:00Z",
      autor: "Carlos Méndez",
      descripcion_cambio:
        "Se agregó el Event Store (Kafka Topics) como almacén intermedio y se detalló el flujo de scores/predicciones del Motor Analítico hacia BD Clientes 360°.",
    },
    {
      version: "1.2",
      fecha: "2026-03-05T16:30:00Z",
      autor: "Carlos Méndez",
      descripcion_cambio:
        "Ajustes tras revisión con el equipo de TI: se incorporó Open Banking como parte de la Pasarela de Pagos, se detalló la integración API con la SFC y se agregó el flujo de datos de entrenamiento de ML.",
    },
  ],

  created_at: "2026-02-25T08:00:00Z",
  updated_at: "2026-03-05T16:30:00Z",
};

// ── Mock API functions ──────────────────────────────────────────────────

export async function mockGetDFDToBe(
  _proyectoId: string
): Promise<DiagramaFlujoDatos> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ...mockDFDToBe }), 400)
  );
}

export async function mockGuardarDFDToBe(
  dfd: DiagramaFlujoDatos
): Promise<DiagramaFlujoDatos> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          ...dfd,
          updated_at: new Date().toISOString(),
        }),
      600
    )
  );
}

export async function mockGenerarDFDToBeConIA(
  _proyectoId: string
): Promise<DiagramaFlujoDatos> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ...mockDFDToBe }), 2000)
  );
}

export async function mockAgregarComentarioDFDToBe(
  _proyectoId: string,
  _comentario: Omit<
    import("@/lib/types/dfd.types").ComentarioDFD,
    "id" | "created_at"
  >
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

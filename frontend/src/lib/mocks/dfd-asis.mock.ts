// ============================================================================
// Mock: DFD AS-IS — Diagrama de Flujo de Datos del Estado Actual
// Caso de estudio: Bancolombia — Sistemas Legacy de Gestión de Datos
// Nivel 1: Descomposición de procesos principales
// ============================================================================

import type { DiagramaFlujoDatos } from "@/lib/types/dfd.types";

export const mockDFDAsIs: DiagramaFlujoDatos = {
  id: "dfd-asis-001",
  entregable_id: "ent-proy-001-4",
  proyecto_id: "proj-001",
  nombre: "DFD AS-IS — Bancolombia",
  descripcion:
    "Diagrama de Flujo de Datos del estado actual (AS-IS) que representa los procesos, almacenes de datos, entidades externas y flujos de información del sistema legacy de gestión de datos de Bancolombia. Nivel 1 de descomposición.",
  nivel: 1,

  // ── Nodos ─────────────────────────────────────────────────────────────
  nodos: [
    // ── Procesos ──────────────────────────────────────────────────────
    {
      id: "proc-001",
      tipo: "proceso",
      nombre: "Procesamiento de Transacciones",
      descripcion:
        "Proceso batch que recibe transacciones del core bancario, las valida y las registra en la base de datos transaccional. Opera con ventanas de procesamiento nocturnas.",
      numero_proceso: "1",
      posicion_x: 450,
      posicion_y: 80,
      fase: "Análisis",
      categoria: "Validación",
      etiquetas: ["Batch", "Nocturno"],
    },
    {
      id: "proc-002",
      tipo: "proceso",
      nombre: "Gestión de Clientes",
      descripcion:
        "Proceso que administra la información de clientes a través de formularios manuales y archivos planos importados desde sucursales. Actualización semanal.",
      numero_proceso: "2",
      posicion_x: 450,
      posicion_y: 280,
      fase: "Análisis",
      categoria: "Transformación",
      etiquetas: ["Manual", "Semanal"],
    },
    {
      id: "proc-003",
      tipo: "proceso",
      nombre: "Generación de Reportes Regulatorios",
      descripcion:
        "Proceso manual que consolida datos de múltiples fuentes para generar reportes requeridos por la Superintendencia Financiera de Colombia (SFC). Frecuencia mensual con alta carga operativa.",
      numero_proceso: "3",
      posicion_x: 450,
      posicion_y: 480,
      fase: "Análisis",
      categoria: "Reportes",
      etiquetas: ["Regulatorio", "Mensual"],
    },

    // ── Almacenes de datos ────────────────────────────────────────────
    {
      id: "alm-001",
      tipo: "almacen",
      nombre: "BD Clientes Legacy",
      descripcion:
        "Base de datos Oracle 11g con información de clientes. Esquema no normalizado con datos duplicados entre sucursales. Más de 12 millones de registros.",
      prefijo_almacen: "D",
      posicion_x: 820,
      posicion_y: 180,
      fase: "Análisis",
    },
    {
      id: "alm-002",
      tipo: "almacen",
      nombre: "BD Transacciones",
      descripcion:
        "Base de datos DB2 del core bancario con historial transaccional. Particionada por fecha. Retención de 5 años.",
      prefijo_almacen: "D",
      posicion_x: 820,
      posicion_y: 30,
      fase: "Análisis",
    },
    {
      id: "alm-003",
      tipo: "almacen",
      nombre: "Archivos Planos",
      descripcion:
        "Repositorio de archivos CSV y TXT en servidor de archivos compartido. Contiene datos de sucursales, extractos y reportes intermedios. Sin control de versiones.",
      prefijo_almacen: "M",
      posicion_x: 820,
      posicion_y: 360,
      fase: "Análisis",
    },
    {
      id: "alm-004",
      tipo: "almacen",
      nombre: "BD Reportes",
      descripcion:
        "Base de datos SQL Server con tablas de reportes pre-calculados. Actualización mensual mediante scripts ETL manuales.",
      prefijo_almacen: "D",
      posicion_x: 820,
      posicion_y: 520,
      fase: "Análisis",
    },

    // ── Entidades externas ────────────────────────────────────────────
    {
      id: "ext-001",
      tipo: "entidad_externa",
      nombre: "Cliente",
      descripcion:
        "Clientes personas naturales y jurídicas que interactúan con el banco a través de sucursales físicas y banca en línea básica.",
      posicion_x: 50,
      posicion_y: 80,
      fase: "Análisis",
    },
    {
      id: "ext-002",
      tipo: "entidad_externa",
      nombre: "Superintendencia Financiera (SFC)",
      descripcion:
        "Ente regulador que exige reportes periódicos de operaciones, riesgo crediticio y lavado de activos.",
      posicion_x: 50,
      posicion_y: 480,
      fase: "Análisis",
    },
    {
      id: "ext-003",
      tipo: "entidad_externa",
      nombre: "Pasarela de Pagos",
      descripcion:
        "Proveedor externo de procesamiento de pagos electrónicos (PSE, tarjetas). Comunicación vía archivos batch.",
      posicion_x: 50,
      posicion_y: 280,
      fase: "Análisis",
    },
  ],

  // ── Flujos de datos ─────────────────────────────────────────────────
  flujos: [
    // Cliente → Procesamiento Transacciones
    {
      id: "flujo-001",
      origen_id: "ext-001",
      destino_id: "proc-001",
      etiqueta: "solicitud_transacción",
      datos_descripcion: "Solicitud de transacción bancaria desde sucursal o banca en línea",
      datos_campos: ["tipo_transaccion", "monto", "cuenta_origen", "cuenta_destino", "fecha"],
      fase: "Análisis",
      tipo_flujo: "entrada",
    },
    // Procesamiento Transacciones → BD Transacciones
    {
      id: "flujo-002",
      origen_id: "proc-001",
      destino_id: "alm-002",
      etiqueta: "registro_transacción",
      datos_descripcion: "Transacción validada y registrada en el core bancario",
      datos_campos: ["id_transaccion", "estado", "monto_validado", "timestamp", "codigo_respuesta"],
      fase: "Análisis",
      tipo_flujo: "salida",
    },
    // Procesamiento Transacciones → BD Clientes Legacy
    {
      id: "flujo-003",
      origen_id: "proc-001",
      destino_id: "alm-001",
      etiqueta: "actualización_saldo",
      datos_descripcion: "Actualización del saldo del cliente tras la transacción",
      datos_campos: ["id_cliente", "nuevo_saldo", "fecha_actualizacion"],
      fase: "Análisis",
      tipo_flujo: "salida",
    },
    // Pasarela de Pagos → Procesamiento Transacciones
    {
      id: "flujo-004",
      origen_id: "ext-003",
      destino_id: "proc-001",
      etiqueta: "notificación_pago",
      datos_descripcion: "Notificación de pago procesado por la pasarela externa",
      datos_campos: ["id_pago", "estado_pago", "referencia", "monto", "comision"],
      fase: "Análisis",
      tipo_flujo: "entrada",
    },
    // Cliente → Gestión de Clientes
    {
      id: "flujo-005",
      origen_id: "ext-001",
      destino_id: "proc-002",
      etiqueta: "datos_personales",
      datos_descripcion: "Información personal del cliente capturada en formularios de sucursal",
      datos_campos: ["nombre", "cedula", "direccion", "telefono", "email", "tipo_cliente"],
      fase: "Análisis",
      tipo_flujo: "entrada",
    },
    // Gestión de Clientes → BD Clientes Legacy
    {
      id: "flujo-006",
      origen_id: "proc-002",
      destino_id: "alm-001",
      etiqueta: "registro_cliente",
      datos_descripcion: "Datos del cliente almacenados en la base de datos legacy",
      datos_campos: ["id_cliente", "datos_demograficos", "productos_asociados", "fecha_vinculacion"],
      fase: "Análisis",
      tipo_flujo: "salida",
    },
    // Gestión de Clientes → Archivos Planos
    {
      id: "flujo-007",
      origen_id: "proc-002",
      destino_id: "alm-003",
      etiqueta: "exportación_sucursales",
      datos_descripcion: "Archivos CSV exportados para consolidación entre sucursales",
      datos_campos: ["archivo_csv", "sucursal_origen", "fecha_exportacion", "total_registros"],
      fase: "Análisis",
      tipo_flujo: "salida",
    },
    // Pasarela de Pagos → Gestión de Clientes
    {
      id: "flujo-008",
      origen_id: "ext-003",
      destino_id: "proc-002",
      etiqueta: "datos_medio_pago",
      datos_descripcion: "Información de medios de pago asociados al cliente",
      datos_campos: ["tipo_medio", "ultimos_4_digitos", "fecha_vencimiento", "estado"],
    },
    // BD Clientes Legacy → Generación Reportes
    {
      id: "flujo-009",
      origen_id: "alm-001",
      destino_id: "proc-003",
      etiqueta: "datos_clientes",
      datos_descripcion: "Consulta de datos de clientes para consolidación de reportes",
      datos_campos: ["id_cliente", "segmento", "productos", "saldo_total", "estado_riesgo"],
    },
    // BD Transacciones → Generación Reportes
    {
      id: "flujo-010",
      origen_id: "alm-002",
      destino_id: "proc-003",
      etiqueta: "datos_transaccionales",
      datos_descripcion: "Historial de transacciones para análisis regulatorio",
      datos_campos: ["id_transaccion", "tipo", "monto", "fecha", "canal", "estado"],
    },
    // Archivos Planos → Generación Reportes
    {
      id: "flujo-011",
      origen_id: "alm-003",
      destino_id: "proc-003",
      etiqueta: "archivos_consolidados",
      datos_descripcion: "Archivos planos de sucursales para cruce de información",
      datos_campos: ["archivo_path", "tipo_archivo", "sucursal", "periodo"],
    },
    // Generación Reportes → BD Reportes
    {
      id: "flujo-012",
      origen_id: "proc-003",
      destino_id: "alm-004",
      etiqueta: "reporte_generado",
      datos_descripcion: "Reporte consolidado almacenado para consulta histórica",
      datos_campos: ["id_reporte", "tipo_reporte", "periodo", "datos_consolidados", "fecha_generacion"],
    },
    // Generación Reportes → SFC
    {
      id: "flujo-013",
      origen_id: "proc-003",
      destino_id: "ext-002",
      etiqueta: "reporte_regulatorio",
      datos_descripcion: "Reporte oficial enviado a la Superintendencia Financiera",
      datos_campos: ["formato_SFC", "periodo_reporte", "datos_riesgo", "datos_operaciones", "firma_digital"],
    },
  ],

  // ── Comentarios ─────────────────────────────────────────────────────
  comentarios: [
    {
      id: "com-dfd-001",
      referencia_id: "proc-001",
      referencia_tipo: "nodo",
      autor_id: "usr-001",
      autor_nombre: "Carlos Méndez",
      autor_perfil: "CONSULTOR",
      contenido:
        "El procesamiento batch nocturno genera un cuello de botella. Los clientes no ven reflejadas sus transacciones hasta el día siguiente. Esto debe ser un punto clave en el análisis de brechas.",
      estado: "abierto",
      created_at: "2026-02-15T10:30:00Z",
    },
    {
      id: "com-dfd-002",
      referencia_id: "alm-003",
      referencia_tipo: "nodo",
      autor_id: "usr-002",
      autor_nombre: "Laura Gómez",
      autor_perfil: "EMPRESA",
      contenido:
        "Los archivos planos son un riesgo operativo importante. No hay control de versiones y frecuentemente se pierden archivos entre sucursales.",
      estado: "abierto",
      created_at: "2026-02-16T14:15:00Z",
    },
    {
      id: "com-dfd-003",
      referencia_id: null,
      referencia_tipo: "general",
      autor_id: "usr-001",
      autor_nombre: "Carlos Méndez",
      autor_perfil: "CONSULTOR",
      contenido:
        "El DFD AS-IS evidencia tres problemas principales: (1) procesamiento batch en lugar de tiempo real, (2) datos duplicados entre BD Legacy y archivos planos, (3) generación manual de reportes regulatorios con alto riesgo de error.",
      estado: "abierto",
      created_at: "2026-02-17T09:00:00Z",
    },
    {
      id: "com-dfd-004",
      referencia_id: "flujo-013",
      referencia_tipo: "flujo",
      autor_id: "usr-002",
      autor_nombre: "Laura Gómez",
      autor_perfil: "EMPRESA",
      contenido:
        "El envío de reportes a la SFC actualmente se hace por correo electrónico con archivos adjuntos. La SFC está migrando a un portal web con API REST.",
      estado: "abierto",
      created_at: "2026-02-18T11:45:00Z",
    },
  ],

  // ── Versionamiento ──────────────────────────────────────────────────
  version_actual: "1.1",
  historial_versiones: [
    {
      version: "1.0",
      fecha: "2026-02-10T08:00:00Z",
      autor: "Carlos Méndez",
      descripcion_cambio: "Versión inicial del DFD AS-IS generada con IA a partir de entrevistas y documentación del core bancario.",
    },
    {
      version: "1.1",
      fecha: "2026-02-18T16:00:00Z",
      autor: "Carlos Méndez",
      descripcion_cambio:
        "Ajustes tras revisión con el equipo de TI de Bancolombia: se agregó la pasarela de pagos como entidad externa y se detallaron los flujos de datos entre almacenes y el proceso de reportes.",
    },
  ],

  created_at: "2026-02-10T08:00:00Z",
  updated_at: "2026-02-18T16:00:00Z",
};

// ── Mock API functions ──────────────────────────────────────────────────

export async function mockGetDFDAsIs(_proyectoId: string): Promise<DiagramaFlujoDatos> {
  return new Promise((resolve) => setTimeout(() => resolve({ ...mockDFDAsIs }), 400));
}

export async function mockGuardarDFDAsIs(
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

export async function mockGenerarDFDAsIsConIA(
  _proyectoId: string
): Promise<DiagramaFlujoDatos> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ...mockDFDAsIs }), 2000)
  );
}

export async function mockAgregarComentarioDFDAsIs(
  _proyectoId: string,
  _comentario: Omit<import("@/lib/types/dfd.types").ComentarioDFD, "id" | "created_at">
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

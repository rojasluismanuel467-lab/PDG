// Mock data para entregables con documentos y aprobaciones duales

export type EstadoEntregable = "EN_PROGRESO" | "PENDIENTE_APROBACION_EMPRESA" | "APROBADO" | "NO_APLICA";

export interface Documento {
  id: string;
  nombre: string;
  descripcion: string;
  archivo: string;
  tamano: number;
  tipo: string;
  fechaCarga: string;
  cargadoPor: string;
  estado: "PROCESANDO" | "LISTO" | "ERROR";
}

export interface AprobacionEntregable {
  consultorAprobado: boolean;
  empresaAprobado: boolean;
  fechaAprobacionConsultor?: string;
  fechaAprobacionEmpresa?: string;
}

export interface EntregableDetallado {
  id: string;
  nombre: string;
  descripcion: string;
  etapa: "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP";
  estado: EstadoEntregable;
  contenido: string;
  documentos: Documento[];
  aprobacion: AprobacionEntregable;
  comentarios: Comentario[];
  fechaCreacion: string;
  fechaUltimaActualizacion: string;
}

export interface Comentario {
  id: string;
  autor: string;
  rol: "CONSULTOR" | "EMPRESA";
  contenido: string;
  fecha: string;
}

// Mock de entregables con documentos
export const MOCK_ENTREGABLES_DETALLADOS: EntregableDetallado[] = [
  {
    id: "entregable-1",
    nombre: "Cuestionario de Madurez",
    descripcion: "Evaluación de madurez de gobernanza de datos",
    etapa: "AS_IS",
    estado: "EN_PROGRESO",
    contenido: "Cuestionario dinámico basado en DAMA DMBook con 18 preguntas...",
    documentos: [
      {
        id: "doc-1",
        nombre: "Respuestas_Cuestionario_v1.xlsx",
        descripcion: "Respuestas iniciales del cuestionario",
        archivo: "respuestas_v1.xlsx",
        tamano: 125000,
        tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fechaCarga: "2026-03-20T10:30:00Z",
        cargadoPor: "empresa@example.com",
        estado: "LISTO",
      },
      {
        id: "doc-2",
        nombre: "Análisis_Preliminar.pdf",
        descripcion: "Análisis de los resultados del cuestionario",
        archivo: "analisis.pdf",
        tamano: 250000,
        tipo: "application/pdf",
        fechaCarga: "2026-03-21T09:15:00Z",
        cargadoPor: "consultor@example.com",
        estado: "LISTO",
      },
    ],
    aprobacion: {
      consultorAprobado: false,
      empresaAprobado: false,
    },
    comentarios: [
      {
        id: "com-1",
        autor: "Juan Pérez",
        rol: "EMPRESA",
        contenido: "Hemos completado las respuestas del cuestionario. Falta validar algunos datos.",
        fecha: "2026-03-20T14:30:00Z",
      },
      {
        id: "com-2",
        autor: "María García",
        rol: "CONSULTOR",
        contenido: "Excelente, revisaré los datos y generaré el análisis.",
        fecha: "2026-03-21T08:00:00Z",
      },
    ],
    fechaCreacion: "2026-03-15T10:00:00Z",
    fechaUltimaActualizacion: "2026-03-21T09:15:00Z",
  },
  {
    id: "entregable-2",
    nombre: "Mapeo de Procesos AS-IS",
    descripcion: "Documentación de procesos actuales de datos",
    etapa: "AS_IS",
    estado: "PENDIENTE_APROBACION_EMPRESA",
    contenido: "Diagrama de flujo de procesos de datos actuales...",
    documentos: [
      {
        id: "doc-3",
        nombre: "Procesos_AS_IS_v2.pdf",
        descripcion: "Diagrama de procesos actualizado",
        archivo: "procesos_v2.pdf",
        tamano: 450000,
        tipo: "application/pdf",
        fechaCarga: "2026-03-19T11:20:00Z",
        cargadoPor: "consultor@example.com",
        estado: "LISTO",
      },
    ],
    aprobacion: {
      consultorAprobado: true,
      empresaAprobado: false,
      fechaAprobacionConsultor: "2026-03-20T15:45:00Z",
    },
    comentarios: [
      {
        id: "com-3",
        autor: "María García",
        rol: "CONSULTOR",
        contenido: "He completado el mapeo de procesos. Requiere aprobación de la empresa.",
        fecha: "2026-03-20T15:45:00Z",
      },
    ],
    fechaCreacion: "2026-03-10T09:00:00Z",
    fechaUltimaActualizacion: "2026-03-20T15:45:00Z",
  },
  {
    id: "entregable-3",
    nombre: "Arquitectura de Datos AS-IS",
    descripcion: "Diseño de la arquitectura de datos actual",
    etapa: "AS_IS",
    estado: "APROBADO",
    contenido: "Descripción de la arquitectura actual, componentes, flujos de datos...",
    documentos: [
      {
        id: "doc-4",
        nombre: "Arquitectura_AS_IS_Final.pdf",
        descripcion: "Arquitectura aprobada",
        archivo: "arquitectura_final.pdf",
        tamano: 600000,
        tipo: "application/pdf",
        fechaCarga: "2026-03-15T10:00:00Z",
        cargadoPor: "consultor@example.com",
        estado: "LISTO",
      },
      {
        id: "doc-5",
        nombre: "Componentes_Detallados.xlsx",
        descripcion: "Listado de componentes",
        archivo: "componentes.xlsx",
        tamano: 180000,
        tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fechaCarga: "2026-03-16T14:30:00Z",
        cargadoPor: "empresa@example.com",
        estado: "LISTO",
      },
    ],
    aprobacion: {
      consultorAprobado: true,
      empresaAprobado: true,
      fechaAprobacionConsultor: "2026-03-17T16:00:00Z",
      fechaAprobacionEmpresa: "2026-03-18T10:30:00Z",
    },
    comentarios: [
      {
        id: "com-4",
        autor: "María García",
        rol: "CONSULTOR",
        contenido: "Arquitectura completada y lista para aprobación.",
        fecha: "2026-03-17T16:00:00Z",
      },
      {
        id: "com-5",
        autor: "Juan Pérez",
        rol: "EMPRESA",
        contenido: "Aprobado. Excelente trabajo.",
        fecha: "2026-03-18T10:30:00Z",
      },
    ],
    fechaCreacion: "2026-03-10T09:00:00Z",
    fechaUltimaActualizacion: "2026-03-18T10:30:00Z",
  },
];

// Función para obtener entregable por ID
export function obtenerEntregablePorId(id: string): EntregableDetallado | undefined {
  return MOCK_ENTREGABLES_DETALLADOS.find((e) => e.id === id);
}

// Función para obtener entregables por etapa
export function obtenerEntregablesPorEtapa(
  etapa: "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP"
): EntregableDetallado[] {
  return MOCK_ENTREGABLES_DETALLADOS.filter((e) => e.etapa === etapa);
}

// Función para actualizar estado de aprobación (mock)
export function actualizarAprobacionEntregable(
  id: string,
  rol: "CONSULTOR" | "EMPRESA",
  aprobado: boolean
): EntregableDetallado | null {
  const entregable = MOCK_ENTREGABLES_DETALLADOS.find((e) => e.id === id);
  if (!entregable) return null;

  if (rol === "CONSULTOR") {
    entregable.aprobacion.consultorAprobado = aprobado;
    if (aprobado) {
      entregable.aprobacion.fechaAprobacionConsultor = new Date().toISOString();
      // Si empresa ya aprobó, marcar como APROBADO
      if (entregable.aprobacion.empresaAprobado) {
        entregable.estado = "APROBADO";
      } else {
        entregable.estado = "PENDIENTE_APROBACION_EMPRESA";
      }
    } else {
      entregable.estado = "EN_PROGRESO";
      entregable.aprobacion.fechaAprobacionConsultor = undefined;
    }
  } else if (rol === "EMPRESA") {
    entregable.aprobacion.empresaAprobado = aprobado;
    if (aprobado) {
      entregable.aprobacion.fechaAprobacionEmpresa = new Date().toISOString();
      // Si consultor ya aprobó, marcar como APROBADO
      if (entregable.aprobacion.consultorAprobado) {
        entregable.estado = "APROBADO";
      }
    } else {
      entregable.estado = "EN_PROGRESO";
      entregable.aprobacion.fechaAprobacionEmpresa = undefined;
    }
  }

  entregable.fechaUltimaActualizacion = new Date().toISOString();
  return entregable;
}

// Función para agregar documento (mock)
export function agregarDocumentoAEntregable(
  entregableId: string,
  documento: Documento
): EntregableDetallado | null {
  const entregable = MOCK_ENTREGABLES_DETALLADOS.find((e) => e.id === entregableId);
  if (!entregable) return null;

  // No permitir agregar documentos si está APROBADO
  if (entregable.estado === "APROBADO") {
    return null;
  }

  entregable.documentos.push(documento);
  entregable.fechaUltimaActualizacion = new Date().toISOString();
  return entregable;
}

// Función para agregar comentario (mock)
export function agregarComentarioAEntregable(
  entregableId: string,
  comentario: Comentario
): EntregableDetallado | null {
  const entregable = MOCK_ENTREGABLES_DETALLADOS.find((e) => e.id === entregableId);
  if (!entregable) return null;

  entregable.comentarios.push(comentario);
  entregable.fechaUltimaActualizacion = new Date().toISOString();
  return entregable;
}

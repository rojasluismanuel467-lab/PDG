import type {
  User,
  Project,
  ADMPhase,
  DocumentPhase,
  DocumentSection,
  Comment,
} from "./types";

// ── Users ──────────────────────────────────────────────────────────────────

export const MOCK_CONSULTOR: User = {
  id: "u1",
  email: "consultor@demo.com",
  nombre: "José Luis Jurado",
  rol: "consultor",
};

export const MOCK_EMPRESA: User = {
  id: "u2",
  email: "empresa@demo.com",
  nombre: "Ana Torres",
  rol: "empresa",
};

// ── Project ────────────────────────────────────────────────────────────────

export const MOCK_PROJECT: Project = {
  id: "p1",
  nombre: "Transformación Digital - Empresa ABC",
  consultor_id: "u1",
  empresa_id: "u2",
  fase_activa: "B",
  modo_demo: true,
};

// ── ADM Phases ─────────────────────────────────────────────────────────────

export const MOCK_PHASES: ADMPhase[] = [
  {
    id: "f0",
    proyecto_id: "p1",
    codigo_fase: "preliminar",
    nombre: "Preliminar",
    estado: "completado",
    fecha_completado: "2026-01-15",
  },
  {
    id: "f1",
    proyecto_id: "p1",
    codigo_fase: "A",
    nombre: "Visión de Arquitectura",
    estado: "en_revision",
  },
  {
    id: "f2",
    proyecto_id: "p1",
    codigo_fase: "B",
    nombre: "Arquitectura de Negocio",
    estado: "en_progreso",
  },
  {
    id: "f3",
    proyecto_id: "p1",
    codigo_fase: "C",
    nombre: "Arquitectura de Sistemas de Información",
    estado: "pendiente",
  },
  {
    id: "f4",
    proyecto_id: "p1",
    codigo_fase: "D",
    nombre: "Arquitectura de Tecnología",
    estado: "pendiente",
  },
  {
    id: "f5",
    proyecto_id: "p1",
    codigo_fase: "E",
    nombre: "Oportunidades y Soluciones",
    estado: "pendiente",
  },
  {
    id: "f6",
    proyecto_id: "p1",
    codigo_fase: "F",
    nombre: "Planificación de la Migración",
    estado: "pendiente",
  },
  {
    id: "f7",
    proyecto_id: "p1",
    codigo_fase: "G",
    nombre: "Gobernanza de Implementación",
    estado: "pendiente",
  },
  {
    id: "f8",
    proyecto_id: "p1",
    codigo_fase: "H",
    nombre: "Gestión del Cambio",
    estado: "pendiente",
  },
];

// ── Documents ──────────────────────────────────────────────────────────────

export const MOCK_DOCUMENTS: DocumentPhase[] = [
  { id: "d0", fase_id: "f0", version_actual: 1, estado: "aprobado", aprobado_por: "u2", fecha_aprobacion: "2026-01-20" },
  { id: "d1", fase_id: "f1", version_actual: 2, estado: "en_revision" },
  { id: "d2", fase_id: "f2", version_actual: 1, estado: "borrador" },
];

// ── Sections — Fase A (en_revision) ────────────────────────────────────────

export const SECTIONS_FASE_A: DocumentSection[] = [
  {
    id: "s1-1",
    documento_id: "d1",
    codigo_seccion: "A.1",
    titulo: "Declaración del Alcance",
    estado: "completo",
    contenido_actual:
      "El presente proyecto abarca la transformación digital de Empresa ABC S.A.S., incluyendo los dominios de negocio, sistemas de información, datos e infraestructura tecnológica. El alcance geográfico comprende las sedes de Bogotá y Medellín. Se excluyen las filiales internacionales y el sistema ERP heredado hasta la Fase F.",
  },
  {
    id: "s1-2",
    documento_id: "d1",
    codigo_seccion: "A.2",
    titulo: "Declaración de Trabajo de Arquitectura",
    estado: "completo",
    contenido_actual:
      "El trabajo de arquitectura comprenderá un ciclo ADM completo de 6 meses. El equipo consultor estará conformado por un arquitecto empresarial líder y dos especialistas de dominio. Los entregables incluyen documentos de arquitectura por fase, un análisis de brechas consolidado y una hoja de ruta de implementación priorizada por valor de negocio.",
  },
  {
    id: "s1-3",
    documento_id: "d1",
    codigo_seccion: "A.3",
    titulo: "Visión de Arquitectura",
    estado: "completo",
    contenido_actual:
      "La visión objetivo es una organización digitalmente integrada donde los procesos de negocio estén automatizados en un 60%, los datos sean accesibles en tiempo real para la toma de decisiones y la infraestructura opere sobre plataformas cloud con disponibilidad del 99.9%. El agente de IA actuará como asistente permanente del equipo consultor durante todo el ciclo.",
  },
];

// ── Sections — Fase B (en_progreso, partial) ──────────────────────────────

export const SECTIONS_FASE_B: DocumentSection[] = [
  {
    id: "s2-1",
    documento_id: "d2",
    codigo_seccion: "B.1",
    titulo: "Arquitectura de Negocio As-Is",
    estado: "completo",
    contenido_actual:
      "La organización cuenta con 4 unidades de negocio: Ventas, Operaciones, Finanzas y Recursos Humanos. Los procesos actuales son mayoritariamente manuales, con dependencia de hojas de cálculo para la coordinación entre áreas. Se identificaron 23 procesos críticos, de los cuales solo 8 cuentan con soporte tecnológico formal.",
  },
  {
    id: "s2-2",
    documento_id: "d2",
    codigo_seccion: "B.2",
    titulo: "Arquitectura de Negocio To-Be",
    estado: "incompleto",
    contenido_actual:
      "La arquitectura objetivo contempla la automatización de los 23 procesos críticos identificados en el estado actual.",
    contenido_anterior: "",
  },
  {
    id: "s2-3",
    documento_id: "d2",
    codigo_seccion: "B.3",
    titulo: "Análisis de Brechas de Negocio",
    estado: "vacio",
    contenido_actual: "",
  },
];

// ── Comments ───────────────────────────────────────────────────────────────

export const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    seccion_id: "s1-2",
    autor_id: "u2",
    autor_nombre: "Ana Torres (Empresa ABC)",
    contenido:
      "Por favor ampliar el detalle sobre los especialistas de dominio — necesitamos saber si incluyen un experto en procesos de manufactura.",
    tipo: "empresa",
    estado: "abierto",
    created_at: "2026-02-20T14:30:00Z",
  },
];

// ── Helper: get sections by fase ───────────────────────────────────────────

export function getSectionsByFase(faseId: string): DocumentSection[] {
  if (faseId === "f1") return SECTIONS_FASE_A;
  if (faseId === "f2") return SECTIONS_FASE_B;
  return [];
}

export function getDocumentByFase(faseId: string): DocumentPhase | undefined {
  return MOCK_DOCUMENTS.find((d) => d.fase_id === faseId);
}

export function getPhaseByCode(code: string): ADMPhase | undefined {
  return MOCK_PHASES.find((p) => p.codigo_fase === code);
}

export function getCommentsBySection(sectionId: string): Comment[] {
  return MOCK_COMMENTS.filter((c) => c.seccion_id === sectionId);
}

export type Role = "consultor" | "empresa";

export type PhaseCode =
  | "preliminar"
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H";

export type PhaseStatus =
  | "pendiente"
  | "en_progreso"
  | "en_revision"
  | "completado";

export type SectionStatus = "vacio" | "incompleto" | "completo";

export type DocumentStatus = "borrador" | "en_revision" | "aprobado";

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: Role;
}

export interface Project {
  id: string;
  nombre: string;
  consultor_id: string;
  empresa_id: string;
  fase_activa: PhaseCode;
  modo_demo: boolean;
}

export interface ADMPhase {
  id: string;
  proyecto_id: string;
  codigo_fase: PhaseCode;
  nombre: string;
  estado: PhaseStatus;
  fecha_completado?: string;
}

export interface DocumentPhase {
  id: string;
  fase_id: string;
  version_actual: number;
  estado: DocumentStatus;
  aprobado_por?: string;
  fecha_aprobacion?: string;
}

export interface DocumentSection {
  id: string;
  documento_id: string;
  codigo_seccion: string;
  titulo: string;
  contenido_actual: string;
  contenido_anterior?: string;
  estado: SectionStatus;
}

export interface Comment {
  id: string;
  seccion_id: string;
  autor_id: string;
  autor_nombre: string;
  contenido: string;
  tipo: "consultor" | "empresa";
  estado: "abierto" | "resuelto";
  created_at: string;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// ============================================================================
// Types: Glosario de Negocio TO-BE
// Artefacto #7 — Etapa TO-BE
// Diccionario de términos de negocio con definiciones, propietarios,
// entidades relacionadas y sinónimos
// ============================================================================

export type EstadoComentarioGlosario = "abierto" | "resuelto";

export interface TerminoGlosario {
  id: string;
  termino: string;
  definicion: string;
  propietario: string;
  entidades_relacionadas: string[];
  sinonimos: string[];
  notas: string;
}

export interface ComentarioGlosario {
  id: string;
  referencia_id: string | null; // null = comentario general
  referencia_tipo: "termino" | "general";
  autor_id: string;
  autor_nombre: string;
  autor_perfil: string;
  contenido: string;
  estado: EstadoComentarioGlosario;
  created_at: string;
}

export interface VersionGlosario {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
  total_terminos: number;
}

/** Payload completo del Glosario de Negocio TO-BE */
export interface GlosarioNegocio {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  terminos: TerminoGlosario[];
  comentarios: ComentarioGlosario[];
  version_actual: string;
  historial_versiones: VersionGlosario[];
  created_at: string;
  updated_at: string;
}

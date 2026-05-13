// ============================================================================
// Types: Matriz RACI / Roles — AS-IS
// Artefacto #4 de la etapa AS-IS
// ============================================================================

/** Asignación RACI: Responsible, Accountable, Consulted, Informed */
export type AsignacionRaci = "R" | "A" | "C" | "I";

/** Categoría de actividad de datos */
export type CategoriaActividad =
  | "gobernanza"
  | "calidad"
  | "seguridad"
  | "integracion"
  | "reportes"
  | "operaciones"
  | "arquitectura"
  | "otro";

/** Rol o persona responsable en la organización */
export interface RolRaci {
  id: string;
  nombre: string;
  area?: string;
  descripcion?: string;
}

/** Actividad o proceso de datos con sus asignaciones RACI */
export interface ActividadRaci {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: CategoriaActividad;
  /** Mapa rol_id → asignación RACI (ausente = sin asignación) */
  asignaciones: Record<string, AsignacionRaci>;
  notas?: string;
}

/** Comentario sobre una actividad o el proceso en general */
export interface ComentarioMatrizRaci {
  id: string;
  referencia_id: string | null;
  referencia_tipo: "actividad" | "rol" | "general";
  autor_id: string;
  autor_nombre: string;
  autor_perfil: string;
  contenido: string;
  estado: "abierto" | "resuelto";
  created_at: string;
}

/** Versión del artefacto */
export interface VersionMatrizRaci {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
  total_actividades: number;
  total_roles: number;
}

/** Artefacto completo: Matriz RACI */
export interface MatrizRaci {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  roles: RolRaci[];
  actividades: ActividadRaci[];
  comentarios: ComentarioMatrizRaci[];
  version_actual: string;
  historial_versiones: VersionMatrizRaci[];
  created_at: string;
  updated_at: string;
}

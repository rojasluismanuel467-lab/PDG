// ============================================================================
// Tipos del Modelo Entidad-Relación (ER) — Arquitectura Conceptual AS-IS
// Diseñados para ser serializables a JSON (compatibles con FastAPI Pydantic)
// ============================================================================

/** Tipos de dato soportados para atributos */
export type TipoDato =
  | "VARCHAR"
  | "INT"
  | "BIGINT"
  | "DECIMAL"
  | "BOOLEAN"
  | "DATE"
  | "DATETIME"
  | "TEXT"
  | "BLOB"
  | "UUID"
  | "JSON";

/** Cardinalidad de una relación */
export type Cardinalidad = "1:1" | "1:N" | "N:1" | "N:M";
export type RelationRouting = "ortogonal" | "lineal" | "libre";

/** Estado de un comentario */
export type EstadoComentario = "abierto" | "resuelto";

/** Atributo de una entidad */
export interface AtributoER {
  id: string;
  nombre: string;
  tipo_dato: TipoDato;
  es_pk: boolean;
  es_fk: boolean;
  es_nullable: boolean;
  descripcion?: string;
  /** Referencia FK: id de la entidad destino */
  fk_entidad_ref?: string;
  /** Referencia FK: nombre del atributo destino */
  fk_atributo_ref?: string;
}

/** Entidad del modelo ER */
export interface EntidadER {
  id: string;
  nombre: string;
  descripcion: string;
  atributos: AtributoER[];
  /** Posición X en el canvas (para reactflow) */
  posicion_x: number;
  /** Posición Y en el canvas (para reactflow) */
  posicion_y: number;
  /** Color de la entidad en el diagrama */
  color?: string;
}

/** Relación entre dos entidades */
export interface RelacionER {
  id: string;
  nombre: string;
  entidad_origen_id: string;
  entidad_destino_id: string;
  source_handle_id?: string;
  target_handle_id?: string;
  cardinalidad: Cardinalidad;
  routing?: RelationRouting;
  descripcion?: string;
  /** Atributo FK en la entidad origen */
  atributo_fk_id?: string;
}

/** Comentario sobre el modelo ER */
export interface ComentarioER {
  id: string;
  /** ID de la entidad o relación comentada, null = comentario general */
  referencia_id: string | null;
  referencia_tipo: "entidad" | "relacion" | "general";
  autor_id: string;
  autor_nombre: string;
  autor_perfil: "CONSULTOR" | "EMPRESA";
  contenido: string;
  estado: EstadoComentario;
  created_in_version_number?: number;
  outdated_at?: string | null;
  es_desactualizado?: boolean;
  created_at: string;
}

/** Versión del modelo ER */
export interface VersionModeloER {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
}

/** Modelo ER completo (payload serializable para FastAPI) */
export interface ModeloER {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  entidades: EntidadER[];
  relaciones: RelacionER[];
  comentarios: ComentarioER[];
  version_actual: string;
  historial_versiones: VersionModeloER[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Tipos del Modelo Lógico de Datos — Artefacto 6 (TO-BE)
// Diseñados para ser serializables a JSON (compatibles con FastAPI Pydantic)
// Referencia: CMS Logical Data Design + DAMA-DMBOK Cap. 4
// ============================================================================

/** Tipos de dato SQL soportados para columnas */
export type TipoDatoSQL =
  | "VARCHAR"
  | "CHAR"
  | "TEXT"
  | "INT"
  | "BIGINT"
  | "SMALLINT"
  | "DECIMAL"
  | "FLOAT"
  | "DOUBLE"
  | "BOOLEAN"
  | "DATE"
  | "TIME"
  | "DATETIME"
  | "TIMESTAMP"
  | "BLOB"
  | "UUID"
  | "JSON"
  | "JSONB"
  | "ARRAY"
  | "ENUM";

/** Tipo de índice */
export type TipoIndice = "PRIMARY" | "UNIQUE" | "INDEX" | "FULLTEXT" | "SPATIAL";

/** Tipo de constraint */
export type TipoConstraint = "CHECK" | "UNIQUE" | "FOREIGN_KEY" | "NOT_NULL" | "DEFAULT";

/** Tipo de acción referencial (ON DELETE / ON UPDATE) */
export type AccionReferencial = "CASCADE" | "SET_NULL" | "SET_DEFAULT" | "RESTRICT" | "NO_ACTION";

/** Estado de un comentario */
export type EstadoComentarioLogico = "abierto" | "resuelto";

// ── Columna ─────────────────────────────────────────────────────────────────

/** Columna de una tabla lógica */
export interface ColumnaLogica {
  id: string;
  nombre: string;
  tipo_dato: TipoDatoSQL;
  /** Longitud/precisión (ej: VARCHAR(255), DECIMAL(10,2)) */
  longitud?: string | number;
  es_pk: boolean;
  es_fk: boolean;
  es_nullable: boolean;
  es_unique: boolean;
  /** Valor por defecto */
  valor_default?: string;
  descripcion: string;
  /** Si es FK: tabla referenciada */
  fk_tabla_ref?: string;
  /** Si es FK: columna referenciada */
  fk_columna_ref?: string;
  /** Si es FK: acción ON DELETE */
  fk_on_delete?: AccionReferencial;
  /** Si es FK: acción ON UPDATE */
  fk_on_update?: AccionReferencial;
  /** Orden de la columna en la tabla */
  orden: number;
  /** UI only — tipo de enrutamiento del edge FK en el diagrama */
  fk_routing?: "ortogonal" | "lineal" | "personalizado";
  /** UI only — handle de origen seleccionado en el diagrama */
  fk_source_handle_id?: string;
  /** UI only — handle de destino seleccionado en el diagrama */
  fk_target_handle_id?: string;
}

// ── Índice ──────────────────────────────────────────────────────────────────

/** Índice de una tabla lógica */
export interface IndiceLogico {
  id: string;
  nombre: string;
  tipo: TipoIndice;
  columnas: string[];
  es_unico: boolean;
  descripcion?: string;
}

// ── Constraint ──────────────────────────────────────────────────────────────

/** Constraint adicional de una tabla */
export interface ConstraintLogico {
  id: string;
  nombre: string;
  tipo: TipoConstraint;
  /** Expresión del constraint (ej: "edad >= 0", "estado IN ('A','I')") */
  expresion: string;
  columnas: string[];
  descripcion?: string;
}

// ── Tabla ────────────────────────────────────────────────────────────────────

/** Tabla del modelo lógico */
export interface TablaLogica {
  id: string;
  nombre: string;
  /** Esquema/namespace (ej: "dbo", "public", "core") */
  esquema: string;
  descripcion: string;
  columnas: ColumnaLogica[];
  indices: IndiceLogico[];
  constraints: ConstraintLogico[];
  /** Entidad conceptual de la que deriva (referencia al Diagrama Conceptual) */
  entidad_origen?: string;
  /** Volumen estimado de registros */
  volumen_estimado?: string;
  /** Frecuencia de actualización */
  frecuencia_actualizacion?: string;
  /** UI only — posición X del nodo en el canvas */
  ui_pos_x?: number;
  /** UI only — posición Y del nodo en el canvas */
  ui_pos_y?: number;
}

// ── Comentarios y Versiones ─────────────────────────────────────────────────

/** Comentario sobre el modelo lógico */
export interface ComentarioLogico {
  id: string;
  /** ID de la tabla o columna comentada, null = comentario general */
  referencia_id: string | null;
  referencia_tipo: "tabla" | "columna" | "general";
  autor_id?: string;
  autor: string; // Cambio de autor_nombre a autor para coincidir con el componente
  rol: "CONSULTOR" | "EMPRESA"; // Cambio de autor_perfil a rol
  texto: string; // Cambio de contenido a texto
  estado: EstadoComentarioLogico;
  fecha: string; // Cambio de created_at a fecha
  tabla_ref?: string; // Nuevo campo opcional usado en el componente
}

/** Versión del modelo lógico */
export interface VersionLogico { // Cambio de VersionModeloLogico a VersionLogico
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
}

// ── Modelo Lógico Completo ──────────────────────────────────────────────────

/** Modelo Lógico completo (payload serializable para FastAPI) */
export interface ModeloLogico {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  tablas: TablaLogica[];
  /** Código SQL DDL generado automáticamente */
  sql_ddl: string;
  /** Notas complementarias en Markdown */
  notas_markdown: string;
  comentarios: ComentarioLogico[];
  version_actual: string;
  versiones: VersionLogico[]; // Cambio de historial_versiones a versiones
  created_at: string;
  updated_at: string;
}

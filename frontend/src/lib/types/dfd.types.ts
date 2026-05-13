// ============================================================================
// Tipos del Diagrama de Flujo de Datos (DFD) — AS-IS y TO-BE
// Diseñados para ser serializables a JSON (compatibles con FastAPI Pydantic)
// Notación basada en Yourdon-DeMarco / Gane-Sarson
// ============================================================================

/** Tipo de nodo en el DFD */
export type TipoNodoDFD = "proceso" | "almacen" | "entidad_externa";

/** Prefijo del almacén de datos según su persistencia */
export type PrefijoAlmacen = "D" | "T" | "M";
// D = Data store (persistente), T = Transient, M = Manual

/** Estilo de línea del flujo (equivalente a estilos de conector DFD) */
export type EstiloLineaDFD =
  | "rectilinear"
  | "oblique"
  | "curve"
  | "round_oblique"
  | "round_rectilinear";

/** Tipo de relación visual del flujo (terminaciones de línea) */
export type TipoRelacionDFD =
  | "linea"
  | "flecha_abierta"
  | "flecha_cerrada"
  | "doble_flecha";

/** Nivel jerárquico del DFD */
export type NivelDFD = 0 | 1 | 2;

/** Estado de un comentario */
export type EstadoComentarioDFD = "abierto" | "resuelto";

// ── Nodos ─────────────────────────────────────────────────────────────────

/** Nodo base del DFD (proceso, almacén o entidad externa) */
export interface NodoDFD {
  id: string;
  tipo: TipoNodoDFD;
  nombre: string;
  descripcion: string;
  /** Número del proceso (solo para tipo "proceso"), ej: "1", "1.1", "2" */
  numero_proceso?: string;
  /** Ubicación/responsable físico del proceso (solo para tipo "proceso") */
  ubicacion_proceso?: string;
  /** Prefijo del almacén (solo para tipo "almacen") */
  prefijo_almacen?: PrefijoAlmacen;
  /** Tipo de dato almacenado (solo para tipo "almacen") */
  tipo_dato_almacen?: string;
  /** Posición X en el canvas (para reactflow) */
  posicion_x: number;
  /** Posición Y en el canvas (para reactflow) */
  posicion_y: number;
  /** Ancho del nodo en el canvas (para reactflow, auto-ajustable) */
  width?: number;
  /** Alto del nodo en el canvas (para reactflow, auto-ajustable) */
  height?: number;
  /** Color personalizado (opcional, se usa el color por defecto del tipo) */
  color?: string;
  /** Fase/etapa a la que pertenece el nodo (ej: "AS-IS", "TO-BE", "Análisis", "Implementación") */
  fase?: string;
  /** Categoría personalizada del proceso (solo para tipo "proceso", ej: "Validación", "Transformación", "Reportes") */
  categoria?: string;
  /** Etiquetas personalizadas del nodo (tags que aparecen debajo de la fase) */
  etiquetas?: string[];
}

// ── Flujos ────────────────────────────────────────────────────────────────

/** Flujo de datos entre nodos */
export interface FlujoDatos {
  id: string;
  /** ID del nodo origen */
  origen_id: string;
  /** ID del nodo destino */
  destino_id: string;
  /** ID del handle origen en React Flow (opcional, para conservar el punto exacto) */
  source_handle?: string | null;
  /** ID del handle destino en React Flow (opcional, para conservar el punto exacto) */
  target_handle?: string | null;
  /** Etiqueta del flujo (nombre del dato que se transporta) */
  etiqueta: string;
  /** Descripción detallada de los datos que fluyen */
  datos_descripcion?: string;
  /** Lista de campos/atributos que se transportan */
  datos_campos?: string[];
  /** Fase/etapa a la que pertenece el flujo (ej: "AS-IS", "TO-BE", "Análisis", "Implementación") */
  fase?: string;
  /** Tipo de flujo para mejor clasificación (ej: "entrada", "salida", "bidireccional") */
  tipo_flujo?: "entrada" | "salida" | "bidireccional";
  /** Tipo de relación visual (línea/flechas/extremos) */
  tipo_relacion?: TipoRelacionDFD;
  /** Estilo visual de la línea del flujo */
  estilo_linea?: EstiloLineaDFD;
}

// ── Comentarios y Versiones ───────────────────────────────────────────────

/** Comentario sobre el DFD */
export interface ComentarioDFD {
  id: string;
  /** ID del nodo o flujo comentado */
  referencia_id: string | null;
  referencia_tipo: "nodo" | "flujo";
  autor_id: string;
  autor_nombre: string;
  autor_perfil: "CONSULTOR" | "EMPRESA";
  contenido: string;
  estado: EstadoComentarioDFD;
  created_at: string;
}

/** Versión del DFD */
export interface VersionDFD {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
}

// ── Modelo completo ───────────────────────────────────────────────────────

/** DFD completo (payload serializable para FastAPI) */
export interface DiagramaFlujoDatos {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  /** Nivel jerárquico del DFD (0 = contexto, 1 = descomposición, 2 = detalle) */
  nivel: NivelDFD;
  nodos: NodoDFD[];
  flujos: FlujoDatos[];
  comentarios: ComentarioDFD[];
  version_actual: string;
  historial_versiones: VersionDFD[];
  created_at: string;
  updated_at: string;
}

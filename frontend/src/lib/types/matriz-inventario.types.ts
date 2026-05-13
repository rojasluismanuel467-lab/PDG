// ============================================================================
// Types: Matriz de Inventario de Sistemas
// Artefacto #3 — Etapa AS-IS
// Catálogo de aplicaciones, bases de datos y plataformas con sus características
// ============================================================================

export type TipoSistema =
  | "aplicacion"
  | "base_de_datos"
  | "plataforma"
  | "servicio_externo"
  | "infraestructura";

export type EstadoSistema =
  | "produccion"
  | "desarrollo"
  | "mantenimiento"
  | "legado"
  | "deprecado";

export type NivelCriticidad = "critico" | "alto" | "medio" | "bajo";

export type EstadoComentarioMatriz = "abierto" | "resuelto";

export interface SistemaInventario {
  id: string;
  nombre: string;
  tipo: TipoSistema;
  descripcion: string;
  
  tecnologia?: string;
  version?: string;
  proveedor?: string;
  propietario_negocio?: string;
  propietario_tecnico?: string;
  criticidad?: NivelCriticidad;
  estado?: EstadoSistema;
  /** Entornos donde opera: ["Producción", "Staging", "Desarrollo"] */
  ambientes: string[];
  /** Tipos de datos que gestiona: ["Datos personales", "Transacciones", ...] */
  datos_que_maneja: string[];
  /** Procesos o áreas estratégicas a las que apoya */
  areas_estrategicas?: string[];
  notas?: string;
}

export interface ComentarioMatrizInventario {
  id: string;
  referencia_id: string | null; // null = comentario general
  referencia_tipo: "sistema" | "general" | "celda";
  campo: string | null; // nombre del campo/columna para comentarios de celda
  autor_id: string;
  autor_nombre: string;
  autor_perfil: string;
  contenido: string;
  estado: EstadoComentarioMatriz;
  created_at: string;
}

export interface VersionMatrizInventario {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
  total_sistemas: number;
}

/** Payload completo de la Matriz de Inventario de Sistemas */
export interface MatrizInventarioSistemas {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  sistemas: SistemaInventario[];
  comentarios: ComentarioMatrizInventario[];
  version_actual: string;
  historial_versiones: VersionMatrizInventario[];
  created_at: string;
  updated_at: string;
}

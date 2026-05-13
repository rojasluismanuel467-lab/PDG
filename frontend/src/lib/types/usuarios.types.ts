/**
 * Tipos para la gestión de usuarios en la plataforma
 * 
 * MODELO CORRECTO:
 * - SOLO 2 tipos de usuarios: CONSULTOR y EMPRESA
 * - Consultor Gerente es un CONSULTOR con permisos máximos en SU proyecto
 * - Consultores son creados por el gerente con permisos limitados
 * - Empresa es el usuario del cliente con permisos limitados
 * 
 * IMPORTANTE: Los permisos son POR PROYECTO
 * - Un usuario puede tener permisos diferentes en proyectos distintos
 * - El Consultor Gerente es gerente SOLO en el proyecto que creó
 */

export type TipoUsuario = "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA";
export type EstadoUsuario = "ACTIVO" | "INACTIVO";

/**
 * Niveles de permiso (0-5)
 * 0 = Sin acceso, 1 = Ver, 2 = Comentar, 3 = Editar, 4 = Aprobar, 5 = Delegar
 */
export type NivelPermiso = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Bloques del proyecto
 */
export type BloqueProyecto = "AS_IS" | "TO_BE" | "BRECHAS";

/**
 * Permisos de un usuario en un proyecto específico
 */
export interface PermisosPorProyecto {
  proyecto_id: string;
  nivel_asis: NivelPermiso;
  nivel_tobe: NivelPermiso;
  nivel_brechas: NivelPermiso;
  es_gerente_proyecto: boolean;  // true si es el gerente de ESTE proyecto
}

/**
 * Usuario de la plataforma
 * 
 * IMPORTANTE:
 * - Si tipo = "CONSULTOR", puede tener rol_gerente = true (es el gerente)
 * - Si tipo = "EMPRESA", siempre es usuario del cliente (sin privilegios)
 * - Los permisos se guardan por proyecto en `permisos_por_proyecto`
 */
export interface Usuario {
  id: string;
  tipo_usuario: TipoUsuario;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
  avatar?: string | null;
  
  // Permisos por proyecto (vacío si no tiene acceso a ningún proyecto)
  permisos_por_proyecto?: PermisosPorProyecto[];
  
  creado_en: string;
  creado_por: string;
  ultimo_acceso?: string | null;
}

/**
 * Usuario con información de permisos para un proyecto específico
 */
export interface UsuarioConPermisos extends Usuario {
  proyecto_id: string;
  nivel_asis: NivelPermiso;
  nivel_tobe: NivelPermiso;
  nivel_brechas: NivelPermiso;
  es_gerente_proyecto: boolean;
}

/**
 * Usuario con información extendida para la tabla
 */
export interface UsuarioTableData extends Usuario {
  proyectos_count: number;
  ultimo_acceso_rel: string; // "hace 2 horas", "hace 1 día", etc.
}

/**
 * Datos para crear usuario (formulario)
 */
export interface CrearUsuarioRequest {
  tipo_usuario: TipoUsuario;
  nombre: string;
  email: string;
  company_id?: string;
  password?: string;
}

export type CrearUsuarioFormData = CrearUsuarioRequest;

/**
 * Datos para editar usuario
 */
export interface EditarUsuarioRequest {
  nombre?: string;
  estado?: EstadoUsuario;
}

/**
 * Filtros para la lista de usuarios globales
 */
export interface UsuariosFiltros {
  tipo_usuario?: TipoUsuario | "TODOS";
  estado?: EstadoUsuario | "TODOS";
  busqueda?: string;
  proyecto_id?: string | "TODOS";
}

/**
 * Helper: Obtener permisos de un usuario para un proyecto específico
 */
export const getPermisosParaProyecto = (
  usuario: Usuario,
  proyectoId: string
): PermisosPorProyecto | undefined => {
  return usuario.permisos_por_proyecto?.find(
    (p) => p.proyecto_id === proyectoId
  );
};

/**
 * Helper: Verificar si usuario tiene permiso suficiente para un bloque
 * Returns true si el nivel del usuario >= nivel requerido
 */
export const verificarPermiso = (
  usuario: Usuario,
  proyectoId: string,
  bloque: BloqueProyecto,
  nivelRequerido: NivelPermiso
): boolean => {
  const permisos = getPermisosParaProyecto(usuario, proyectoId);
  
  if (!permisos) return false;
  
  // Si es gerente del proyecto, tiene todos los permisos
  if (permisos.es_gerente_proyecto) return true;
  
  // Obtener nivel del usuario para el bloque
  const nivelUsuario =
    bloque === "AS_IS" ? permisos.nivel_asis :
    bloque === "TO_BE" ? permisos.nivel_tobe :
    permisos.nivel_brechas;
  
  return nivelUsuario >= nivelRequerido;
};

/**
 * Helper: Obtener descripción del nivel de permiso
 */
export const getNivelPermisoDescripcion = (nivel: NivelPermiso): string => {
  const descripciones = [
    "Sin acceso",
    "Solo ver",
    "Comentar",
    "Editar",
    "Aprobar",
    "Delegar",
  ];
  return descripciones[nivel] || "Desconocido";
};

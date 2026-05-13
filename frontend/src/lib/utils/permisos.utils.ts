import type { NivelPermiso } from "../mocks/equipo.mock";

export const ETIQUETAS_NIVEL: Record<NivelPermiso, string> = {
  0: "Sin acceso",
  1: "Solo lectura",
  2: "Puede comentar",
  3: "Puede editar",
  4: "Puede aprobar",
  5: "Delegado",
};

export const DESCRIPCION_NIVEL: Record<NivelPermiso, string> = {
  0: "No puede ver el bloque ni sus entregables.",
  1: "Puede ver el contenido de todos los entregables.",
  2: "Puede ver y agregar comentarios informativos.",
  3: "Puede editar contenido y solicitar regeneración de IA.",
  4: "Puede aprobar entregables además de editar.",
  5: "Puede asignar hasta nivel 4 a otros consultores del proyecto.",
};

/**
 * Clases de color Tailwind para cada nivel de permiso.
 * Basado en la paleta disponible en el template (Badge usa color words).
 * Mapeamos a clases inline que el Badge no soporta, por eso
 * se usan directamente en el componente NivelPermisoSelector.
 */
export const COLOR_NIVEL: Record<NivelPermiso, string> = {
  0: "gray",
  1: "blue",
  2: "cyan",
  3: "yellow",
  4: "green",
  5: "purple",
};

/**
 * Clases Tailwind para el badge de color de nivel en la tabla.
 * Solo los colores light que el Badge del template soporta.
 */
export const BADGE_COLOR_NIVEL: Record<
  NivelPermiso,
  "light" | "info" | "primary" | "warning" | "success" | "error" | "dark"
> = {
  0: "light",
  1: "info",
  2: "primary",
  3: "warning",
  4: "success",
  5: "dark",
};

/**
 * Devuelve el nivel máximo que el usuario actual puede asignar a otros.
 * - Gerente: puede asignar hasta 5.
 * - Nivel 5 en un bloque: puede asignar hasta 4 en ese bloque.
 * - Cualquier otro: no puede asignar (retorna 0).
 */
export const nivelMaxAsignable = (
  nivelActual: NivelPermiso,
  esGerente: boolean
): NivelPermiso => {
  if (esGerente) return 5;
  if (nivelActual === 5) return 4;
  return 0;
};

/**
 * Determina si el usuario actual puede modificar los permisos de otro miembro.
 */
export const puedeModificarPermisos = (
  esGerente: boolean,
  nivelBloque: NivelPermiso
): boolean => esGerente || nivelBloque === 5;

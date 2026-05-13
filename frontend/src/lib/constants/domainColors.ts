/**
 * Configuración de colores oficiales para los 11 dominios del DAMA-DMBOK
 * Estos colores deben usarse consistentemente en toda la aplicación
 * para identificar visualmente cada dominio.
 */

export interface DomainColorConfig {
  primary: string;      // Color principal (gráficos, badges)
  light: string;        // Color claro (fondos, hover)
  dark: string;         // Color oscuro (texto, bordes)
  gradient: string;     // Gradiente para gráficos
}

export const DOMAIN_COLORS: Record<string, DomainColorConfig> = {
  "Gobernanza de Datos": {
    primary: "#3B82F6",    // blue-500
    light: "#EFF6FF",      // blue-50
    dark: "#1D4ED8",       // blue-700
    gradient: "from-blue-400 to-blue-600",
  },
  "Arquitectura de Datos": {
    primary: "#A855F7",    // purple-500
    light: "#F5F3FF",      // purple-50
    dark: "#7C3AED",       // purple-600
    gradient: "from-purple-400 to-purple-600",
  },
  "Modelado y Diseño de Datos": {
    primary: "#EC4899",    // pink-500
    light: "#FDF2F8",      // pink-50
    dark: "#DB2777",       // pink-600
    gradient: "from-pink-400 to-pink-600",
  },
  "Almacenamiento y Operaciones": {
    primary: "#6B7280",    // gray-500
    light: "#F9FAFB",      // gray-50
    dark: "#4B5563",       // gray-600
    gradient: "from-gray-400 to-gray-600",
  },
  "Seguridad de Datos": {
    primary: "#EF4444",    // red-500
    light: "#FEF2F2",      // red-50
    dark: "#DC2626",       // red-600
    gradient: "from-red-400 to-red-600",
  },
  "Integración e Interoperabilidad": {
    primary: "#F97316",    // orange-500
    light: "#FFF7ED",      // orange-50
    dark: "#EA580C",       // orange-600
    gradient: "from-orange-400 to-orange-600",
  },
  "Documentos y Contenido": {
    primary: "#EAB308",    // yellow-500
    light: "#FEFCE8",      // yellow-50
    dark: "#CA8A04",       // yellow-600
    gradient: "from-yellow-400 to-yellow-600",
  },
  "Datos de Referencia y Maestros": {
    primary: "#14B8A6",    // teal-500
    light: "#F0FDFA",      // teal-50
    dark: "#0D9488",       // teal-600
    gradient: "from-teal-400 to-teal-600",
  },
  "Data Warehousing y BI": {
    primary: "#6366F1",    // indigo-500
    light: "#EEF2FF",      // indigo-50
    dark: "#4F46E5",       // indigo-600
    gradient: "from-indigo-400 to-indigo-600",
  },
  "Metadatos": {
    primary: "#06B6D4",    // cyan-500
    light: "#ECFEFF",      // cyan-50
    dark: "#0891B2",       // cyan-600
    gradient: "from-cyan-400 to-cyan-600",
  },
  "Calidad de Datos": {
    primary: "#22C55E",    // green-500
    light: "#F0FDF4",      // green-50
    dark: "#16A34A",       // green-600
    gradient: "from-green-400 to-green-600",
  },
};

/**
 * Obtiene el color principal de un dominio
 */
export const getDomainColor = (domainName: string): string => {
  return DOMAIN_COLORS[domainName]?.primary || "#6B7280"; // gray-500 por defecto
};

/**
 * Obtiene la configuración completa de colores de un dominio
 */
export const getDomainColorConfig = (domainName: string): DomainColorConfig => {
  return DOMAIN_COLORS[domainName] || {
    primary: "#6B7280",
    light: "#F9FAFB",
    dark: "#4B5563",
    gradient: "from-gray-400 to-gray-600",
  };
};

/**
 * Obtiene el color claro (para fondos) de un dominio
 */
export const getDomainLightColor = (domainName: string): string => {
  return DOMAIN_COLORS[domainName]?.light || "#F9FAFB";
};

/**
 * Obtiene el gradiente de un dominio (para gráficos)
 */
export const getDomainGradient = (domainName: string): string => {
  return DOMAIN_COLORS[domainName]?.gradient || "from-gray-400 to-gray-600";
};

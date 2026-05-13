/**
 * Mocks para la gestión de usuarios
 * 
 * MODELO CORRECTO:
 * - Carlos Méndez es el Consultor Gerente (es_gerente_proyecto = true en proy-001)
 * - Ana, Felipe, Valentina son consultores miembros (es_gerente_proyecto = false)
 * - Constructora Bolívar es usuario EMPRESA
 * 
 * IMPORTANTE: Los permisos son POR PROYECTO
 * - Un usuario puede tener permisos diferentes en proyectos distintos
 */

import type {
  Usuario,
  TipoUsuario,
  EstadoUsuario,
  UsuariosFiltros,
  UsuarioTableData,
  PermisosPorProyecto,
} from "@/lib/types/usuarios.types";
import { MOCK_CONSULTOR_AUTH, MOCK_EMPRESA } from "./auth.mock";

// Extender mocks existentes
export const MOCK_USUARIOS: Usuario[] = [
  {
    id: MOCK_CONSULTOR_AUTH.id,
    tipo_usuario: "CONSULTOR",
    nombre: MOCK_CONSULTOR_AUTH.nombre,
    email: MOCK_CONSULTOR_AUTH.email,
    estado: "ACTIVO",
    avatar: MOCK_CONSULTOR_AUTH.avatar,
    permisos_por_proyecto: [
      {
        proyecto_id: "proy-001",
        nivel_asis: 5,
        nivel_tobe: 5,
        nivel_brechas: 5,
        es_gerente_proyecto: true,  // ← Carlos es gerente en proy-001
      },
      {
        proyecto_id: "proy-002",
        nivel_asis: 5,
        nivel_tobe: 5,
        nivel_brechas: 5,
        es_gerente_proyecto: true,  // ← También gerente en proy-002
      },
    ] as PermisosPorProyecto[],
    creado_en: "2025-01-10",
    creado_por: "admin-001",
    ultimo_acceso: "2026-03-25T10:30:00Z",
  },
  {
    id: "usr-002",
    tipo_usuario: "CONSULTOR",
    nombre: "Ana Lucía Torres",
    email: "ana.torres@arqdata.co",
    estado: "ACTIVO",
    avatar: null,
    permisos_por_proyecto: [
      {
        proyecto_id: "proy-001",
        nivel_asis: 3,
        nivel_tobe: 2,
        nivel_brechas: 1,
        es_gerente_proyecto: false,  // ← No es gerente
      },
      {
        proyecto_id: "proy-002",
        nivel_asis: 2,
        nivel_tobe: 3,
        nivel_brechas: 2,
        es_gerente_proyecto: false,  // ← Mismos usuario, DIFERENTES permisos
      },
    ] as PermisosPorProyecto[],
    creado_en: "2025-02-15",
    creado_por: "usr-001",  // ← Creada por Carlos (el gerente)
    ultimo_acceso: "2026-03-25T09:15:00Z",
  },
  {
    id: "usr-003",
    tipo_usuario: "CONSULTOR",
    nombre: "Felipe Rincón",
    email: "felipe.rincon@arqdata.co",
    estado: "ACTIVO",
    avatar: null,
    permisos_por_proyecto: [
      {
        proyecto_id: "proy-001",
        nivel_asis: 3,
        nivel_tobe: 2,
        nivel_brechas: 1,
        es_gerente_proyecto: false,  // ← Consultor miembro
      },
    ] as PermisosPorProyecto[],
    creado_en: "2025-03-01",
    creado_por: "usr-001",  // ← Creado por Carlos
    ultimo_acceso: "2026-03-24T16:45:00Z",
  },
  {
    id: MOCK_EMPRESA.id,
    tipo_usuario: "EMPRESA",
    nombre: MOCK_EMPRESA.nombre,
    email: MOCK_EMPRESA.email,
    estado: "ACTIVO",
    avatar: MOCK_EMPRESA.avatar,
    permisos_por_proyecto: [
      {
        proyecto_id: "proy-001",
        nivel_asis: 1,
        nivel_tobe: 1,
        nivel_brechas: 1,
        es_gerente_proyecto: false,  // ← Empresa (solo ver)
      },
    ] as PermisosPorProyecto[],
    creado_en: "2025-01-05",
    creado_por: "usr-001",
    ultimo_acceso: "2026-03-25T08:00:00Z",
  },
  {
    id: "usr-005",
    tipo_usuario: "EMPRESA",
    nombre: "Constructora Bolívar S.A.",
    email: "datos@constructorabolivar.com.co",
    estado: "ACTIVO",
    avatar: null,
    permisos_por_proyecto: [
      {
        proyecto_id: "proy-002",
        nivel_asis: 1,
        nivel_tobe: 1,
        nivel_brechas: 1,
        es_gerente_proyecto: false,
      },
    ] as PermisosPorProyecto[],
    creado_en: "2025-02-20",
    creado_por: "admin-001",
    ultimo_acceso: "2026-03-23T14:30:00Z",
  },
  {
    id: "usr-006",
    tipo_usuario: "CONSULTOR",
    nombre: "Valentina Ospina",
    email: "v.ospina@arqdata.co",
    estado: "PENDIENTE",
    avatar: null,
    permisos_por_proyecto: [
      {
        proyecto_id: "proy-003",
        nivel_asis: 2,
        nivel_tobe: 2,
        nivel_brechas: 2,
        es_gerente_proyecto: false,
      },
    ] as PermisosPorProyecto[],
    creado_en: "2026-03-20",
    creado_por: "usr-001",
    ultimo_acceso: null,
  },
  {
    id: "usr-007",
    tipo_usuario: "CONSULTOR",
    nombre: "Sebastián Cárdenas (Inactivo)",
    email: "s.cardenas@arqdata.co",
    estado: "INACTIVO",
    avatar: null,
    permisos_por_proyecto: [] as PermisosPorProyecto[],
    creado_en: "2024-11-10",
    creado_por: "admin-001",
    ultimo_acceso: "2025-01-15T11:00:00Z",
  },
];

// Utilidad para formatear tiempo relativo
const formatTimeAgo = (dateString: string | null | undefined): string => {
  if (!dateString) return "Nunca";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "hace un momento";
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)} días`;
  
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Convertir Usuario a UsuarioTableData
export const toTableData = (usuario: Usuario): UsuarioTableData => ({
  ...usuario,
  proyectos_count: usuario.permisos_por_proyecto?.length || 0,
  ultimo_acceso_rel: formatTimeAgo(usuario.ultimo_acceso),
});

// Filtros
const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

/**
 * Obtener permisos de un usuario para un proyecto específico
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
 * Verificar si usuario tiene permiso suficiente para un bloque
 */
export const verificarPermiso = (
  usuario: Usuario,
  proyectoId: string,
  bloque: "AS_IS" | "TO_BE" | "BRECHAS",
  nivelRequerido: number
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

export const mockGetUsuarios = async (
  filtros?: UsuariosFiltros
): Promise<UsuarioTableData[]> => {
  await delay();
  
  let resultados = [...MOCK_USUARIOS];
  
  // Aplicar filtros
  if (filtros?.tipo_usuario && filtros.tipo_usuario !== "TODOS") {
    resultados = resultados.filter((u) => u.tipo_usuario === filtros.tipo_usuario);
  }
  
  if (filtros?.estado && filtros.estado !== "TODOS") {
    resultados = resultados.filter((u) => u.estado === filtros.estado);
  }
  
  if (filtros?.proyecto_id && filtros.proyecto_id !== "TODOS") {
    resultados = resultados.filter((u) =>
      u.permisos_por_proyecto?.some(p => p.proyecto_id === filtros.proyecto_id)
    );
  }
  
  if (filtros?.busqueda) {
    const busqueda = filtros.busqueda.toLowerCase();
    resultados = resultados.filter(
      (u) =>
        u.nombre.toLowerCase().includes(busqueda) ||
        u.email.toLowerCase().includes(busqueda)
    );
  }
  
  return resultados.map(toTableData);
};

export const mockCrearUsuario = async (
  data: { tipo_usuario: TipoUsuario; nombre: string; email: string }
): Promise<Usuario> => {
  await delay(900);
  
  // Verificar si email ya existe
  if (MOCK_USUARIOS.some((u) => u.email === data.email)) {
    throw new Error("EMAIL_YA_EXISTE");
  }
  
  const nuevo: Usuario = {
    id: `usr-${Date.now()}`,
    tipo_usuario: data.tipo_usuario,
    nombre: data.nombre,
    email: data.email,
    estado: "PENDIENTE",
    avatar: null,
    permisos_por_proyecto: [],
    creado_en: new Date().toISOString().split("T")[0],
    creado_por: MOCK_CONSULTOR_AUTH.id,
    ultimo_acceso: null,
  };
  
  MOCK_USUARIOS.push(nuevo);
  return nuevo;
};

export const mockActualizarUsuario = async (
  id: string,
  data: { nombre?: string; estado?: EstadoUsuario }
): Promise<Usuario> => {
  await delay(500);
  
  const usuario = MOCK_USUARIOS.find((u) => u.id === id);
  if (!usuario) throw new Error("USUARIO_NO_ENCONTRADO");
  
  Object.assign(usuario, data);
  return usuario;
};

export const mockEliminarUsuario = async (id: string): Promise<void> => {
  await delay(500);
  
  const idx = MOCK_USUARIOS.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("USUARIO_NO_ENCONTRADO");
  
  // No se puede eliminar el usuario actual
  if (id === MOCK_CONSULTOR_AUTH.id) {
    throw new Error("NO_SE_PUEDE_ELIMINAR_USUARIO_ACTUAL");
  }
  
  MOCK_USUARIOS.splice(idx, 1);
};

export const mockGetProyectosDisponibles = async (): Promise<
  Array<{ id: string; nombre: string }>
> => {
  await delay(300);
  
  return [
    { id: "proy-001", nombre: "Banco ABC - AS-IS" },
    { id: "proy-002", nombre: "Empresa XYZ - TO-BE" },
    { id: "proy-003", nombre: "Startup 123 - Brechas" },
    { id: "proy-004", nombre: "Constructora Bolívar - AS-IS" },
  ];
};

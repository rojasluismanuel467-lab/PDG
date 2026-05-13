import type {
  Usuario,
  CrearUsuarioRequest,
  EditarUsuarioRequest,
  UsuariosFiltros,
} from "@/lib/types/usuarios.types";
import { apiClient } from "@/lib/api/client";
import axios from "axios";

type BackendUser = {
  id: string;
  nombre: string;
  email: string;
  tipo_usuario: Usuario["tipo_usuario"];
  estado: Usuario["estado"];
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapUser(user: BackendUser): Usuario {
  return {
    id: user.id,
    tipo_usuario: user.tipo_usuario,
    nombre: user.nombre,
    email: user.email,
    estado: user.estado,
    avatar: null,
    permisos_por_proyecto: [],
    creado_en: user.created_at,
    creado_por: user.created_by_user_id ?? "sistema",
    ultimo_acceso: null,
  };
}

export const usuariosApi = {
  getUsuarios: async (filtros?: UsuariosFiltros): Promise<Usuario[]> => {
    const params: Record<string, string> = {};
    if (filtros?.tipo_usuario && filtros.tipo_usuario !== "TODOS") params.tipo_usuario = filtros.tipo_usuario;
    if (filtros?.estado && filtros.estado !== "TODOS") params.estado = filtros.estado;
    if (filtros?.busqueda) params.search = filtros.busqueda;

    const { data } = await apiClient.get<{ items: BackendUser[]; total: number }>("/users", {
      params,
    });
    return data.items.map(mapUser);
  },

  crearUsuario: async (payload: CrearUsuarioRequest): Promise<Usuario> => {
    try {
      const { data } = await apiClient.post<BackendUser>("/users", payload);
      return mapUser(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const code = error.response?.data?.error?.code;
        const message = error.response?.data?.error?.message;
        if (error.response?.status === 409 && code === "CONFLICT" && message === "Email is already registered") {
          throw new Error("EMAIL_YA_EXISTE");
        }
      }
      throw error;
    }
  },

  editarUsuario: async (userId: string, payload: EditarUsuarioRequest): Promise<Usuario> => {
    try {
      const { data } = await apiClient.patch<BackendUser>(`/users/${userId}`, payload);
      return mapUser(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message;
        if (error.response?.status === 422 && message === "At least one field must be provided") {
          throw new Error("SIN_CAMBIOS");
        }
      }
      throw error;
    }
  },

  desactivarUsuario: async (userId: string): Promise<void> => {
    try {
      await apiClient.patch(`/users/${userId}/deactivate`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message;
        if (error.response?.status === 422 && message === "You cannot deactivate your own account") {
          throw new Error("NO_SE_PUEDE_ELIMINAR_USUARIO_ACTUAL");
        }
      }
      throw error;
    }
  },
};

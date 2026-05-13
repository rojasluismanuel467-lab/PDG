"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UsuarioTable, ModalCrearUsuario, ModalEditarUsuario } from "@/components/usuarios";
import { usuariosApi } from "@/lib/api/usuarios";
import { useAuth } from "@/context/AuthContext";
import type {
  UsuarioTableData,
  CrearUsuarioFormData,
  UsuariosFiltros,
  Usuario,
} from "@/lib/types/usuarios.types";
import { UserPlus, Filter } from "lucide-react";

export default function AdminUsuariosPage() {
  const { user, isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioTableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState<UsuariosFiltros>({
    tipo_usuario: "TODOS",
    estado: "TODOS",
    busqueda: "",
  });

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usuariosApi.getUsuarios(filtros);
      const mappedData: UsuarioTableData[] = data.map(u => ({
        ...u,
        proyectos_count: u.permisos_por_proyecto?.length || 0,
        ultimo_acceso_rel: u.ultimo_acceso ? "Recientemente" : "Nunca"
      }));
      setUsuarios(mappedData);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/signin");
      return;
    }
    if (user?.perfil !== "ADMIN") {
      router.replace("/consultor/proyectos");
      return;
    }
    cargarUsuarios();
  }, [cargarUsuarios, isAuthenticated, isReady, router, user?.perfil]);

  if (!isReady || !isAuthenticated || user?.perfil !== "ADMIN") {
    return null;
  }

  // Handlers
  const handleCrearUsuario = async (data: CrearUsuarioFormData) => {
    setCreando(true);
    try {
      await usuariosApi.crearUsuario(data);
      await cargarUsuarios();
    } catch (error: any) {
      if (error instanceof Error && error.message === "EMAIL_YA_EXISTE") {
        alert("El email ya está registrado. Usa otro email.");
      } else {
        alert("Error al crear usuario. Intenta de nuevo.");
      }
      throw error;
    } finally {
      setCreando(false);
    }
  };

  const handleDesactivarUsuario = async (usuario: UsuarioTableData) => {
    if (
      !confirm(
        `¿Estás seguro de desactivar a ${usuario.nombre}? El usuario ya no podrá iniciar sesión.`
      )
    ) {
      return;
    }

    try {
      await usuariosApi.desactivarUsuario(usuario.id);
      await cargarUsuarios();
    } catch (error: any) {
      if (
        error instanceof Error &&
        error.message === "NO_SE_PUEDE_ELIMINAR_USUARIO_ACTUAL"
      ) {
        alert("No puedes desactivarte a ti mismo.");
      } else {
        alert("Error al desactivar usuario. Intenta de nuevo.");
      }
    }
  };

  const handleActualizarUsuario = async (data: { nombre?: string; estado?: string }) => {
    if (!usuarioSeleccionado) return;
    
    setEditando(true);
    try {
      await usuariosApi.editarUsuario(usuarioSeleccionado.id, data as any);
      await cargarUsuarios();
    } finally {
      setEditando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            👥 Gestionar Usuarios
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Administra los usuarios de la plataforma (Consultores y Empresas)
          </p>
        </div>
        <button
          onClick={() => setShowCrearModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-white/90">
            Filtros
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Tipo
            </label>
            <select
              value={filtros.tipo_usuario}
              onChange={(e) =>
                setFiltros({ ...filtros, tipo_usuario: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:text-white/90"
            >
              <option value="TODOS">Todos</option>
              <option value="ADMINISTRADOR">Administradores</option>
              <option value="CONSULTOR">Consultores</option>
              <option value="EMPRESA">Empresas</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) =>
                setFiltros({ ...filtros, estado: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:text-white/90"
            >
              <option value="TODOS">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={filtros.busqueda}
              onChange={(e) =>
                setFiltros({ ...filtros, busqueda: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:text-white/90"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <UsuarioTable
          usuarios={usuarios}
          onEditar={(u) => { setUsuarioSeleccionado(u as any); setShowEditarModal(true); }}
          onDesactivar={handleDesactivarUsuario}
        />
      )}

      {/* Resumen */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Mostrando {usuarios.length} de {usuarios.length} usuarios
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {usuarios.filter((u) => u.estado === "ACTIVO").length} Activos
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {usuarios.filter((u) => u.estado === "INACTIVO").length} Inactivos
          </span>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      <ModalCrearUsuario
        isOpen={showCrearModal}
        onClose={() => setShowCrearModal(false)}
        onSubmit={handleCrearUsuario}
        isLoading={creando}
      />

      {/* Modal Editar Usuario */}
      <ModalEditarUsuario
        isOpen={showEditarModal}
        onClose={() => {
          setShowEditarModal(false);
          setUsuarioSeleccionado(null);
        }}
        usuario={usuarioSeleccionado}
        onSubmit={handleActualizarUsuario}
        isLoading={editando}
      />


    </div>
  );
}

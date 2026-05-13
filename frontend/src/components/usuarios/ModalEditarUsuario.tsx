"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import type { Usuario, EstadoUsuario } from "@/lib/types/usuarios.types";

// Schema de validación con Zod
const editarUsuarioSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
});

type EditarUsuarioFormData = z.infer<typeof editarUsuarioSchema>;

interface ModalEditarUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario | null;
  onSubmit: (data: EditarUsuarioFormData) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Modal SIMPLIFICADO para editar usuario existente
 * 
 * SOLO muestra:
 * - Nombre
 * - Estado
 * 
 * Los permisos se editan en un modal separado (ModalEditarPermisos)
 */
export const ModalEditarUsuario: React.FC<ModalEditarUsuarioProps> = ({
  isOpen,
  onClose,
  usuario,
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditarUsuarioFormData>({
    resolver: zodResolver(editarUsuarioSchema),
    defaultValues: {
      nombre: usuario?.nombre || "",
      estado: usuario?.estado || "ACTIVO",
    },
  });

  // Actualizar form cuando cambia el usuario
  React.useEffect(() => {
    if (usuario) {
      reset({
        nombre: usuario.nombre,
        estado: usuario.estado,
      });
    }
  }, [usuario, reset]);

  const handleFormSubmit = async (data: EditarUsuarioFormData) => {
    await onSubmit(data);
    onClose();
  };

  if (!usuario) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl mx-4 p-6"
      showCloseButton={true}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar Usuario
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {usuario.email}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/90 mb-1">
            Nombre completo *
          </label>
          <input
            type="text"
            {...register("nombre")}
            placeholder="Ej: Juan Pérez"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-white/90 ${
              errors.nombre
                ? "border-red-500"
                : "border-gray-300 dark:border-white/[0.08]"
            }`}
            disabled={isLoading}
          />
          {errors.nombre && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.nombre.message}
            </p>
          )}
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/90 mb-1">
            Estado *
          </label>
          <select
            {...register("estado")}
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:text-white/90"
            disabled={isLoading}
          >
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
          {errors.estado && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.estado.message}
            </p>
          )}
        </div>

        {/* Info box */}
        <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Nota:</strong> El tipo de usuario (Consultor/Empresa) no se puede modificar. Para cambiar el tipo, crea un usuario nuevo.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button variant="primary" size="sm" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar Cambios
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

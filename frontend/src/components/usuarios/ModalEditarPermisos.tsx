"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { FolderIcon, TaskIcon, TimeIcon, LockIcon } from "@/icons";
import type { Usuario } from "@/lib/types/usuarios.types";

/**
 * Niveles de permiso por bloque
 * 0 = Sin acceso, 1 = Ver, 2 = Comentar, 3 = Editar, 4 = Aprobar, 5 = Delegar
 */
const NIVELES_PERMISO = [
  { value: 0, label: "Sin acceso", description: "No puede ver este bloque" },
  { value: 1, label: "Solo ver", description: "Puede ver pero no editar" },
  { value: 2, label: "Comentar", description: "Puede ver y comentar" },
  { value: 3, label: "Editar", description: "Puede editar contenido" },
  { value: 4, label: "Aprobar", description: "Puede aprobar artefactos" },
  { value: 5, label: "Delegar", description: "Puede asignar permisos a otros" },
];

interface PermisoPorBloque {
  asis: number;
  tobe: number;
  brechas: number;
}

interface ModalEditarPermisosProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario | null;
  onSubmit: (permisos: PermisoPorBloque) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Modal para editar permisos por bloque
 * 
 * Muestra:
 * - Nivel de permiso para AS-IS (0-5)
 * - Nivel de permiso para TO-BE (0-5)
 * - Nivel de permiso para Brechas (0-5)
 */
export const ModalEditarPermisos: React.FC<ModalEditarPermisosProps> = ({
  isOpen,
  onClose,
  usuario,
  onSubmit,
  isLoading = false,
}) => {
  const [permisos, setPermisos] = useState<PermisoPorBloque>({
    asis: 3,
    tobe: 2,
    brechas: 1,
  });

  // Cargar permisos actuales cuando se abre el modal
  useEffect(() => {
    if (usuario) {
      // En producción: cargar permisos reales desde el backend para el proyecto actual
      // Por ahora usamos valores por defecto basados en si es gerente del proyecto
      const permisosActuales = usuario.permisos_por_proyecto?.[0];
      setPermisos({
        asis: permisosActuales?.nivel_asis || (permisosActuales?.es_gerente_proyecto ? 5 : 3),
        tobe: permisosActuales?.nivel_tobe || (permisosActuales?.es_gerente_proyecto ? 5 : 2),
        brechas: permisosActuales?.nivel_brechas || (permisosActuales?.es_gerente_proyecto ? 5 : 1),
      });
    }
  }, [usuario]);

  const handleFormSubmit = async () => {
    await onSubmit(permisos);
    onClose();
  };

  const getLevelColor = (value: number) => {
    if (value === 0) return "text-gray-500";
    if (value <= 2) return "text-blue-600";
    if (value <= 4) return "text-green-600";
    return "text-purple-600";
  };

  if (!usuario) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl mx-4 p-6"
      showCloseButton={true}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <LockIcon className="w-6 h-6" />
          Editar Permisos
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {usuario.nombre} • {usuario.email}
        </p>
      </div>

      {/* Permisos por Bloque */}
      <div className="space-y-6">
        {/* AS-IS */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FolderIcon className="w-5 h-5 text-gray-500" />
            <label className="block text-sm font-medium text-gray-700 dark:text-white/90">
              Bloque AS-IS
            </label>
          </div>
          <select
            value={permisos.asis}
            onChange={(e) =>
              setPermisos({ ...permisos, asis: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:text-white/90"
            disabled={isLoading}
          >
            {NIVELES_PERMISO.map((nivel) => (
              <option key={nivel.value} value={nivel.value}>
                Nivel {nivel.value}: {nivel.label}
              </option>
            ))}
          </select>
          <p className={`text-xs mt-1 ${getLevelColor(permisos.asis)}`}>
            {NIVELES_PERMISO.find((n) => n.value === permisos.asis)?.description}
          </p>
        </div>

        {/* TO-BE */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TaskIcon className="w-5 h-5 text-gray-500" />
            <label className="block text-sm font-medium text-gray-700 dark:text-white/90">
              Bloque TO-BE
            </label>
          </div>
          <select
            value={permisos.tobe}
            onChange={(e) =>
              setPermisos({ ...permisos, tobe: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:text-white/90"
            disabled={isLoading}
          >
            {NIVELES_PERMISO.map((nivel) => (
              <option key={nivel.value} value={nivel.value}>
                Nivel {nivel.value}: {nivel.label}
              </option>
            ))}
          </select>
          <p className={`text-xs mt-1 ${getLevelColor(permisos.tobe)}`}>
            {NIVELES_PERMISO.find((n) => n.value === permisos.tobe)?.description}
          </p>
        </div>

        {/* Brechas */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TimeIcon className="w-5 h-5 text-gray-500" />
            <label className="block text-sm font-medium text-gray-700 dark:text-white/90">
              Bloque Brechas
            </label>
          </div>
          <select
            value={permisos.brechas}
            onChange={(e) =>
              setPermisos({ ...permisos, brechas: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:text-white/90"
            disabled={isLoading}
          >
            {NIVELES_PERMISO.map((nivel) => (
              <option key={nivel.value} value={nivel.value}>
                Nivel {nivel.value}: {nivel.label}
              </option>
            ))}
          </select>
          <p className={`text-xs mt-1 ${getLevelColor(permisos.brechas)}`}>
            {NIVELES_PERMISO.find((n) => n.value === permisos.brechas)?.description}
          </p>
        </div>
      </div>

      {/* Leyenda de Niveles */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-white/[0.08]">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-white/90 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Guía de Niveles:
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {NIVELES_PERMISO.map((nivel) => (
            <div key={nivel.value} className="flex items-start gap-2">
              <span className={`font-bold ${getLevelColor(nivel.value)}`}>
                {nivel.value}.
              </span>
              <div>
                <span className="font-medium text-gray-700 dark:text-white/90">
                  {nivel.label}
                </span>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  {nivel.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleFormSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Guardando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Guardar Permisos
            </span>
          )}
        </Button>
      </div>
    </Modal>
  );
};

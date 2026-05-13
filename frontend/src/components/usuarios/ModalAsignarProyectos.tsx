"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import type { Usuario } from "@/lib/types/usuarios.types";
import { mockGetProyectosDisponibles } from "@/lib/mocks/usuarios.mock";

interface ProyectoDisponible {
  id: string;
  nombre: string;
}

interface ProyectoAsignado {
  proyecto_id: string;
  nivel_asis?: number;
  nivel_tobe?: number;
  nivel_brechas?: number;
}

interface ModalAsignarProyectosProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: Usuario | null;
  onSubmit: (proyectos: ProyectoAsignado[]) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Modal para asignar proyectos a un usuario
 * Reutiliza componentes: Modal, Button
 */
export const ModalAsignarProyectos: React.FC<ModalAsignarProyectosProps> = ({
  isOpen,
  onClose,
  usuario,
  onSubmit,
  isLoading = false,
}) => {
  const [proyectos, setProyectos] = useState<ProyectoDisponible[]>([]);
  const [proyectosSeleccionados, setProyectosSeleccionados] = useState<
    Record<string, boolean>
  >({});
  const [cargando, setCargando] = useState(true);

  // Cargar proyectos disponibles
  useEffect(() => {
    const cargarProyectos = async () => {
      setCargando(true);
      try {
        const data = await mockGetProyectosDisponibles();
        setProyectos(data);

        // Marcar proyectos ya asignados
        const seleccionados: Record<string, boolean> = {};
        data.forEach((p) => {
          seleccionados[p.id] = usuario?.permisos_por_proyecto?.some(perm => perm.proyecto_id === p.id) || false;
        });
        setProyectosSeleccionados(seleccionados);
      } catch (error) {
        console.error("Error al cargar proyectos:", error);
      } finally {
        setCargando(false);
      }
    };

    if (isOpen && usuario) {
      cargarProyectos();
    }
  }, [isOpen, usuario]);

  const handleToggleProyecto = (proyectoId: string) => {
    setProyectosSeleccionados((prev) => ({
      ...prev,
      [proyectoId]: !prev[proyectoId],
    }));
  };

  const handleFormSubmit = async () => {
    const proyectosAsignados: ProyectoAsignado[] = Object.entries(
      proyectosSeleccionados
    )
      .filter(([_, seleccionado]) => seleccionado)
      .map(([proyectoId, _]) => ({
        proyecto_id: proyectoId,
        // En producción: permitir configurar niveles por bloque
        nivel_asis: 3,
        nivel_tobe: 2,
        nivel_brechas: 1,
      }));

    await onSubmit(proyectosAsignados);
    onClose();
  };

  const countSeleccionados = Object.values(proyectosSeleccionados).filter(
    (v) => v
  ).length;

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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Asignar Proyectos
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {usuario.nombre} • {usuario.email}
        </p>
      </div>

      {/* Lista de Proyectos */}
      {cargando ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {proyectos.map((proyecto) => (
            <label
              key={proyecto.id}
              className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={proyectosSeleccionados[proyecto.id] || false}
                onChange={() => handleToggleProyecto(proyecto.id)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white/90">
                  {proyecto.nombre}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ID: {proyecto.id}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Resumen */}
      <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-700 dark:text-white/90">
          <strong>Resumen:</strong> {countSeleccionados} proyectos seleccionados
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Los permisos por defecto son: AS-IS (3), TO-BE (2), Brechas (1). Puedes
          editarlos después en la página del proyecto.
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
        <Button
          variant="primary"
          size="sm"
          onClick={handleFormSubmit}
          disabled={isLoading || countSeleccionados === 0}
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
              Asignar {countSeleccionados > 0 ? `(${countSeleccionados})` : ""}
            </span>
          )}
        </Button>
      </div>
    </Modal>
  );
};

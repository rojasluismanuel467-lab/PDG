"use client";

import React, { useState } from "react";

interface NewRole {
  name: string;
  description: string;
}

interface ModalAddRoleProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (role: NewRole & { id: string; isCustom: boolean }) => void;
}

export const ModalAddRole: React.FC<ModalAddRoleProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [newRole, setNewRole] = useState<NewRole>({
    name: "",
    description: "",
  });

  const handleAdd = () => {
    if (!newRole.name.trim() || !newRole.description.trim()) {
      alert("Por favor completa el nombre y la descripción");
      return;
    }

    // Generar ID único basado en el nombre
    const id = newRole.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    onAdd({
      ...newRole,
      id,
      isCustom: true,
    });

    setNewRole({ name: "", description: "" });
    onClose();
  };

  const handleClose = () => {
    setNewRole({ name: "", description: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            Agregar Rol Personalizado
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              Crea un rol específico de tu organización que no está en la lista
              estándar de DAMA. Este rol aparecerá disponible para asignar en
              las preguntas del cuestionario.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Rol *
            </label>
            <input
              type="text"
              value={newRole.name}
              onChange={(e) =>
                setNewRole({ ...newRole, name: e.target.value })
              }
              placeholder="Ej: Coordinador de Datos, Líder de Analytics..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Usa un nombre claro y reconocible en tu organización
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              value={newRole.description}
              onChange={(e) =>
                setNewRole({ ...newRole, description: e.target.value })
              }
              placeholder="Describe las responsabilidades principales de este rol..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo 200 caracteres. Explica el propósito del rol
            </p>
          </div>

          {/* Preview del ID */}
          {newRole.name.trim() && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">
                ID generado:
              </p>
              <code className="text-xs bg-gray-200 px-2 py-1 rounded">
                {newRole.name
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "")}
              </code>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={!newRole.name.trim() || !newRole.description.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✓ Agregar Rol
          </button>
        </div>
      </div>
    </div>
  );
};

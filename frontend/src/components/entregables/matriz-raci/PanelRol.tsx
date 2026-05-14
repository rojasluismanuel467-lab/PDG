"use client";
import React, { useState, useEffect } from "react";
import type { RolRaci, ActividadRaci, AsignacionRaci } from "@/lib/types/matriz-raci.types";

const RACI_BADGE: Record<AsignacionRaci, string> = {
  R: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  A: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
  I: "bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-white/40",
};
const RACI_LABEL: Record<AsignacionRaci, string> = {
  R: "Responsable",
  A: "Aprobador",
  C: "Consultado",
  I: "Informado",
};

interface PanelRolProps {
  rol: RolRaci;
  actividades: ActividadRaci[];
  onUpdate: (updated: RolRaci) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export default function PanelRol({
  rol,
  actividades,
  onUpdate,
  onDelete,
  onClose,
  readOnly = false,
}: PanelRolProps) {
  const [form, setForm] = useState<RolRaci>(rol);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const stats = (["R", "A", "C", "I"] as AsignacionRaci[]).reduce(
    (acc, type) => {
      acc[type] = actividades.filter((a) => a.asignaciones[rol.id] === type).length;
      return acc;
    },
    {} as Record<AsignacionRaci, number>
  );
  const assignedActivities = actividades.filter((a) => a.asignaciones[rol.id] !== undefined);

  useEffect(() => {
    setForm(rol);
    setHasChanges(false);
    setShowDeleteConfirm(false);
  }, [rol.id]);

  const update = (patch: Partial<RolRaci>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  return (
    <aside className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-white/70 uppercase tracking-wide">
            Rol
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 dark:text-white/30 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1">
            Nombre del rol
          </label>
          {readOnly ? (
            <p className="text-gray-800 dark:text-white/80 font-medium">{form.nombre}</p>
          ) : (
            <input
              value={form.nombre}
              onChange={(e) => update({ nombre: e.target.value })}
              className="w-full bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-gray-800 dark:text-white/80 focus:outline-none focus:border-[#28b8d5]/50 text-xs"
            />
          )}
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1">
            Área / Departamento
          </label>
          {readOnly ? (
            <p className="text-gray-600 dark:text-white/50">{form.area || "—"}</p>
          ) : (
            <input
              value={form.area ?? ""}
              onChange={(e) => update({ area: e.target.value })}
              placeholder="Ej. Tecnología, Operaciones..."
              className="w-full bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-[#28b8d5]/50 text-xs"
            />
          )}
        </div>

        {/* Assignment summary */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-2">
            Participación ({assignedActivities.length} actividades)
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["R", "A", "C", "I"] as AsignacionRaci[]).map((type) => (
              <div
                key={type}
                className={`flex flex-col items-center rounded py-1.5 ${RACI_BADGE[type]}`}
              >
                <span className="text-base font-bold leading-none">{stats[type]}</span>
                <span className="text-[9px] font-semibold mt-0.5 opacity-80">{RACI_LABEL[type].slice(0, 4)}</span>
              </div>
            ))}
          </div>
          {assignedActivities.length > 0 && (
            <div className="mt-2 space-y-1">
              {assignedActivities.map((a) => {
                const asig = a.asignaciones[rol.id] as AsignacionRaci;
                return (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className={`w-5 h-5 flex-shrink-0 rounded text-[10px] font-bold flex items-center justify-center ${RACI_BADGE[asig]}`}>
                      {asig}
                    </span>
                    <span className="text-[11px] text-gray-600 dark:text-white/50 truncate">{a.nombre}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1">
            Descripción
          </label>
          {readOnly ? (
            <p className="text-gray-600 dark:text-white/50 leading-relaxed">{form.descripcion || "—"}</p>
          ) : (
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => update({ descripcion: e.target.value })}
              rows={4}
              placeholder="Responsabilidades y alcance del rol..."
              className="w-full bg-transparent border border-gray-200 dark:border-white/[0.08] rounded px-2 py-1.5 text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 focus:outline-none focus:border-[#28b8d5]/50 text-xs resize-none"
            />
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="border-t border-gray-200 dark:border-white/[0.08] px-4 py-3 flex items-center gap-2">
          {!showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-shrink-0 px-3 py-1.5 rounded text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 transition-colors"
              >
                Eliminar rol
              </button>
              <button
                onClick={() => {
                  onUpdate(form);
                  setHasChanges(false);
                }}
                disabled={!hasChanges}
                className="flex-1 py-1.5 rounded text-xs font-semibold bg-[#28b8d5] text-white hover:bg-[#28b8d5]/90 disabled:opacity-40 transition-colors"
              >
                Guardar cambios
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-gray-500 dark:text-white/40 flex-1 leading-tight">
                ¿Eliminar rol y sus asignaciones?
              </span>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded text-xs border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                No
              </button>
              <button
                onClick={() => onDelete(rol.id)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Sí
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

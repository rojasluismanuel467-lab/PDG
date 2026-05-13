"use client";
import React, { useState } from "react";
import type { NivelPermiso } from "@/lib/mocks/equipo.mock";
import { ETIQUETAS_NIVEL, DESCRIPCION_NIVEL } from "@/lib/utils/permisos.utils";

interface NivelPermisoSelectorProps {
  label: string;
  value: NivelPermiso;
  onChange: (nivel: NivelPermiso) => void;
  maxNivel: NivelPermiso;
  disabled?: boolean;
  disabledTooltip?: string;
}

const NIVELES: NivelPermiso[] = [0, 1, 2, 3, 4, 5];

/**
 * Clases de color activo para cada nivel (pill seleccionado).
 * Se construyen con valores estáticos para que Tailwind las incluya en el build.
 */
const ACTIVE_CLASSES: Record<NivelPermiso, string> = {
  0: "bg-gray-200 text-gray-700 border-gray-400 dark:bg-white/10 dark:text-white dark:border-white/20",
  1: "bg-blue-light-100 text-blue-light-700 border-blue-light-300 dark:bg-blue-light-400/20 dark:text-blue-light-300 dark:border-blue-light-400/30",
  2: "bg-[#28b8d5]/15 text-[#28b8d5] border-[#28b8d5]/40 dark:bg-[#28b8d5]/20 dark:text-[#28b8d5] dark:border-[#28b8d5]/30",
  3: "bg-warning-100 text-warning-700 border-warning-300 dark:bg-warning-400/20 dark:text-warning-300 dark:border-warning-400/30",
  4: "bg-success-100 text-success-700 border-success-300 dark:bg-success-400/20 dark:text-success-300 dark:border-success-400/30",
  5: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-400/20 dark:text-purple-300 dark:border-purple-400/30",
};

const INACTIVE_CLASSES =
  "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-white/[0.03] dark:text-white/40 dark:border-white/[0.08] dark:hover:bg-white/[0.07]";

const DISABLED_CLASSES =
  "opacity-30 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200 dark:bg-white/[0.02] dark:text-white/20 dark:border-white/[0.05]";

export default function NivelPermisoSelector({
  label,
  value,
  onChange,
  maxNivel,
  disabled = false,
  disabledTooltip,
}: NivelPermisoSelectorProps) {
  const [tooltip, setTooltip] = useState<NivelPermiso | null>(null);

  return (
    <div className={disabled ? "opacity-60" : ""} title={disabled ? disabledTooltip : undefined}>
      {/* Label del bloque */}
      <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">
        {label}
      </p>

      {/* Fila de niveles */}
      <div className="flex flex-wrap gap-1.5">
        {NIVELES.map((nivel) => {
          const bloqueado = nivel > maxNivel || disabled;
          const seleccionado = nivel === value;

          return (
            <div key={nivel} className="relative">
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => !bloqueado && onChange(nivel)}
                onMouseEnter={() => setTooltip(nivel)}
                onMouseLeave={() => setTooltip(null)}
                className={`
                  text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all duration-150
                  ${bloqueado
                    ? DISABLED_CLASSES
                    : seleccionado
                    ? ACTIVE_CLASSES[nivel]
                    : INACTIVE_CLASSES
                  }
                `}
              >
                {ETIQUETAS_NIVEL[nivel]}
              </button>

              {/* Tooltip */}
              {tooltip === nivel && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 text-xs bg-gray-900 text-white rounded-lg px-3 py-2 shadow-lg dark:bg-white dark:text-gray-900 pointer-events-none">
                  <p className="font-semibold mb-0.5">{ETIQUETAS_NIVEL[nivel]}</p>
                  <p>{DESCRIPCION_NIVEL[nivel]}</p>
                  {/* Flecha del tooltip */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advertencia nivel 5 */}
      {value === 5 && !disabled && maxNivel >= 5 && (
        <p className="mt-2 text-[11px] text-warning-600 dark:text-warning-400">
          Este consultor podrá asignar permisos a otros en este bloque.
        </p>
      )}
    </div>
  );
}

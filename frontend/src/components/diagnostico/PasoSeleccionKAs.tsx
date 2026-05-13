"use client";

import { useState } from "react";
import type { AreaConocimiento } from "@/lib/mocks/mad.mock";

interface Props {
  kasDisponibles: AreaConocimiento[];
  seleccionadas: string[];
  onSiguiente: (kas: string[]) => void;
  onAtras: () => void;
}

export default function PasoSeleccionKAs({
  kasDisponibles,
  seleccionadas,
  onSiguiente,
  onAtras,
}: Props) {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set(seleccionadas));
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setError(null);
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSiguiente = () => {
    if (seleccion.size === 0) {
      setError("Debes seleccionar al menos un área de conocimiento.");
      return;
    }
    // Mantener el orden original de kasDisponibles
    const ordenadas = kasDisponibles.filter((ka) => seleccion.has(ka.id)).map((ka) => ka.id);
    onSiguiente(ordenadas);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
        ¿Qué áreas aplican a tu organización?
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Selecciona las áreas de conocimiento DAMA-DMBOK2 presentes en tu empresa. Solo evaluarás
        las que marques aquí.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2.5 mb-6">
        {kasDisponibles.map((ka) => {
          const checked = seleccion.has(ka.id);
          return (
            <button
              key={ka.id}
              type="button"
              onClick={() => toggle(ka.id)}
              className={`w-full text-left flex items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-all duration-150 ${
                checked
                  ? "border-[#0F172A] bg-[#0F172A]/5 dark:border-white/60 dark:bg-white/[0.06]"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20"
              }`}
            >
              {/* Checkbox visual */}
              <span
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                  checked
                    ? "bg-[#0F172A] border-[#0F172A] dark:bg-white dark:border-white"
                    : "border-gray-300 dark:border-white/30"
                }`}
              >
                {checked && (
                  <svg
                    className="w-3 h-3 text-white dark:text-black"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>

              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  <span className="text-gray-400 dark:text-gray-500 font-normal mr-1.5">{ka.id}</span>
                  {ka.nombre}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {ka.descripcion}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
        {seleccion.size} de {kasDisponibles.length} áreas seleccionadas
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAtras}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 bg-white text-[#0F172A] border border-[#334155] hover:bg-slate-50 dark:bg-white/[0.07] dark:text-white/85 dark:border-white/[0.18] dark:hover:bg-white/[0.12]"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={handleSiguiente}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 bg-[#0F172A] text-white hover:bg-[#1e293b] active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

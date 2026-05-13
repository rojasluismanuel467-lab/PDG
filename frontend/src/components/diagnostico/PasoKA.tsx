"use client";

import { useState } from "react";
import {
  type AreaConocimiento,
  type RespuestaKA,
  type FactorEvaluacion,
  type PuntuacionFactor,
  NIVELES_MADUREZ,
} from "@/lib/mocks/mad.mock";

interface Props {
  ka: AreaConocimiento;
  respuestaActual: RespuestaKA;
  indice: number;
  total: number;
  onSiguiente: (respuesta: RespuestaKA) => void;
  onAtras: () => void;
}

export default function PasoKA({ ka, respuestaActual, indice, total, onSiguiente, onAtras }: Props) {
  const [factores, setFactores] = useState<Partial<Record<FactorEvaluacion, PuntuacionFactor>>>(
    respuestaActual?.factores ?? {}
  );
  const [obs, setObs] = useState({
    obs_proceso: respuestaActual?.obs_proceso ?? "",
    obs_personas: respuestaActual?.obs_personas ?? "",
    obs_tecnologia: respuestaActual?.obs_tecnologia ?? "",
  });
  const [intentoEnvio, setIntentoEnvio] = useState(false);

  const factoresSinResponder = ka.factores.filter((f) => factores[f.tipo] === undefined);
  const completo = factoresSinResponder.length === 0;

  const handleSiguiente = () => {
    setIntentoEnvio(true);
    if (!completo) return;
    onSiguiente({
      ka_id: ka.id,
      factores,
      ...obs,
    });
  };

  return (
    <div>
      {/* Cabecera del KA */}
      <div className="mb-6">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
          Área {indice + 1} de {total}
        </p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          <span className="text-gray-400 dark:text-gray-500 font-normal mr-2">{ka.id}</span>
          {ka.nombre}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          {ka.descripcion}
        </p>
      </div>

      {/* Alerta si intentó avanzar sin completar */}
      {intentoEnvio && !completo && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
          Debes calificar todos los factores antes de continuar.
          {factoresSinResponder.length > 0 && (
            <span className="ml-1 font-medium">
              Falta{factoresSinResponder.length > 1 ? "n" : ""}: {factoresSinResponder.map((f) => f.label).join(", ")}.
            </span>
          )}
        </div>
      )}

      {/* Factores */}
      <div className="space-y-6 mb-8">
        {ka.factores.map((factor) => {
          const seleccionado = factores[factor.tipo];
          const sinResponder = intentoEnvio && seleccionado === undefined;

          return (
            <div
              key={factor.tipo}
              className={`rounded-xl border p-4 transition-colors ${
                sinResponder
                  ? "border-amber-300 dark:border-amber-400/40"
                  : "border-gray-200 dark:border-white/[0.08]"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                {factor.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                {factor.guia}
              </p>

              {/* Selector 0-4 */}
              <div className="grid grid-cols-5 gap-2">
                {NIVELES_MADUREZ.map((nivel) => {
                  const activo = seleccionado === nivel.valor;
                  return (
                    <button
                      key={nivel.valor}
                      type="button"
                      onClick={() =>
                        setFactores((prev) => ({ ...prev, [factor.tipo]: nivel.valor }))
                      }
                      title={nivel.descripcion}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all duration-150 ${
                        activo
                          ? "border-[#0F172A] bg-[#0F172A] text-white dark:border-white dark:bg-white dark:text-black"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-white/30"
                      }`}
                    >
                      <span className="text-lg font-bold leading-none">{nivel.valor}</span>
                      <span className="text-[10px] leading-tight font-medium">{nivel.etiqueta}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Observaciones (opcionales) */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-4 mb-8">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Observaciones <span className="text-xs font-normal text-gray-400">(opcional)</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Agrega contexto adicional que el consultor deba tener en cuenta al interpretar tus
          respuestas sobre esta área.
        </p>
        <div className="space-y-3">
          {(
            [
              { key: "obs_proceso", label: "Proceso", placeholder: "¿Hay procesos formales? ¿Qué tan maduros son?" },
              { key: "obs_personas", label: "Personas", placeholder: "¿Qué capacidades y roles existen en el equipo?" },
              { key: "obs_tecnologia", label: "Tecnología", placeholder: "¿Qué herramientas o plataformas usa la organización?" },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>
              <textarea
                rows={2}
                value={obs[key]}
                placeholder={placeholder}
                onChange={(e) => setObs((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navegación */}
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
          {indice < total - 1 ? "Siguiente →" : "Revisar respuestas →"}
        </button>
      </div>
    </div>
  );
}

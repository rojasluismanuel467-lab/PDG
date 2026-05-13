"use client";

import type { SesionCuestionario, AreaConocimiento, FactorEvaluacion } from "@/lib/mocks/mad.mock";

interface Props {
  sesion: SesionCuestionario;
  kasSeleccionadas: AreaConocimiento[];
  enviando: boolean;
  error: string | null;
  onEnviar: () => void;
  onAtras: () => void;
}

const FACTOR_LABELS: Record<FactorEvaluacion, string> = {
  ACTIVIDADES: "Actividades",
  TECNICAS: "Técnicas",
  ROLES_RESPONSABILIDADES: "Roles y Resp.",
  ORGANIZACION_CULTURA: "Org. y Cultura",
  HERRAMIENTAS: "Herramientas",
  ENTREGABLES: "Entregables",
};

function promedioKA(factores: Partial<Record<FactorEvaluacion, number>>): number {
  const vals = Object.values(factores).filter((v): v is number => v !== undefined);
  if (vals.length === 0) return 0;
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
}

function colorBadge(prom: number) {
  if (prom >= 3) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (prom >= 2) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

export default function PasoConfirmacion({
  sesion,
  kasSeleccionadas,
  enviando,
  error,
  onEnviar,
  onAtras,
}: Props) {
  const { datos_respondente: respondente } = sesion;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
        Revisa tus respuestas
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Una vez enviadas no podrás modificarlas. Asegúrate de que todo sea correcto.
      </p>

      {/* Datos del respondente */}
      {respondente && (
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            Respondente
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
              <p className="font-medium text-gray-900 dark:text-white">{respondente.nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Cargo</p>
              <p className="font-medium text-gray-900 dark:text-white">{respondente.cargo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Área</p>
              <p className="font-medium text-gray-900 dark:text-white">{respondente.area}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen por KA */}
      <div className="space-y-3 mb-6">
        {kasSeleccionadas.map((ka) => {
          const respuesta = sesion.respuestas[ka.id];
          const prom = promedioKA(respuesta?.factores ?? {});

          return (
            <div
              key={ka.id}
              className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="text-gray-400 dark:text-gray-500 font-normal mr-1.5">{ka.id}</span>
                    {ka.nombre}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${colorBadge(prom)}`}
                >
                  Promedio: {prom}
                </span>
              </div>

              {/* Factores en grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ka.factores.map((f) => {
                  const val = respuesta?.factores[f.tipo];
                  return (
                    <div
                      key={f.tipo}
                      className="flex flex-col items-center gap-1 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] px-2 py-2"
                    >
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                        {FACTOR_LABELS[f.tipo]}
                      </span>
                      <span className="text-base font-bold text-gray-900 dark:text-white">
                        {val ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Observaciones si las hay */}
              {(respuesta?.obs_proceso || respuesta?.obs_personas || respuesta?.obs_tecnologia) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06] space-y-1.5">
                  {respuesta.obs_proceso && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Proceso: </span>
                      {respuesta.obs_proceso}
                    </p>
                  )}
                  {respuesta.obs_personas && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Personas: </span>
                      {respuesta.obs_personas}
                    </p>
                  )}
                  {respuesta.obs_tecnologia && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-600 dark:text-gray-300">Tecnología: </span>
                      {respuesta.obs_tecnologia}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error de envío */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAtras}
          disabled={enviando}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 bg-white text-[#0F172A] border border-[#334155] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-white/[0.07] dark:text-white/85 dark:border-white/[0.18] dark:hover:bg-white/[0.12]"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={onEnviar}
          disabled={enviando}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 bg-[#0F172A] text-white hover:bg-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-gray-100"
        >
          {enviando ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enviando...
            </>
          ) : (
            "Enviar diagnóstico"
          )}
        </button>
      </div>
    </div>
  );
}

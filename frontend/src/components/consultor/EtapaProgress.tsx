"use client";
import React, { useState } from "react";
import type { Entregable, EtapaEntregable } from "@/lib/mocks/entregables.mock";
import {
  etapaHabilitada,
  etapaCompletada,
  progresoEtapa,
  mensajeBloqueoEtapa,
} from "@/lib/utils/etapas.utils";

interface EtapaProgressProps {
  entregables: Entregable[];
  etapaActiva: EtapaEntregable;
  onEtapaClick: (etapa: EtapaEntregable) => void;
}

const ETAPAS: EtapaEntregable[] = ["AS_IS", "TO_BE", "BRECHAS", "ROADMAP"];

const ETAPA_LABEL: Record<EtapaEntregable, string> = {
  AS_IS: "AS-IS",
  TO_BE: "TO-BE",
  BRECHAS: "Brechas",
  ROADMAP: "Roadmap",
};

// Ícono check
const CheckIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M20 6L9 17L4 12"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Ícono candado
const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
    <path
      d="M7 11V7a5 5 0 0 1 10 0v4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function EtapaProgress({
  entregables,
  etapaActiva,
  onEtapaClick,
}: EtapaProgressProps) {
  const [mensajeBloqueo, setMensajeBloqueo] = useState<string | null>(null);

  const handleClick = (etapa: EtapaEntregable) => {
    const habilitada = etapaHabilitada(entregables, etapa);
    if (!habilitada) {
      setMensajeBloqueo(mensajeBloqueoEtapa(etapa));
      return;
    }
    setMensajeBloqueo(null);
    onEtapaClick(etapa);
  };

  return (
    <div className="w-full">
      {/* Fila de etapas */}
      <div className="flex items-center gap-0">
        {ETAPAS.map((etapa, index) => {
          const habilitada = etapaHabilitada(entregables, etapa);
          const completada = etapaCompletada(entregables, etapa);
          const progreso = progresoEtapa(entregables, etapa);
          const esActiva = etapaActiva === etapa;
          const esUltima = index === ETAPAS.length - 1;
          // El separador izquierdo se ilumina si la etapa anterior está completa
          const etapaAnterior = index > 0 ? ETAPAS[index - 1] : null;
          const separadorIluminado =
            etapaAnterior !== null && etapaCompletada(entregables, etapaAnterior);

          return (
            <React.Fragment key={etapa}>
              {/* Separador */}
              {index > 0 && (
                <div
                  className={`h-0.5 w-6 flex-shrink-0 transition-colors duration-500 ${
                    separadorIluminado
                      ? "bg-[#28b8d5]"
                      : "bg-gray-200 dark:bg-white/[0.08]"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Botón de etapa */}
              <button
                type="button"
                onClick={() => handleClick(etapa)}
                disabled={!habilitada}
                title={!habilitada ? mensajeBloqueoEtapa(etapa) : undefined}
                className={`
                  flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 min-w-[100px] transition-all duration-200 border
                  ${!habilitada
                    ? "cursor-not-allowed opacity-50 border-gray-200 bg-gray-50 dark:bg-white/[0.02] dark:border-white/[0.06]"
                    : esActiva
                    ? "border-[#28b8d5] bg-[#28b8d5]/10 dark:bg-[#28b8d5]/10"
                    : "cursor-pointer border-gray-200 bg-white hover:border-[#28b8d5]/50 hover:bg-[#28b8d5]/5 dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-[#28b8d5]/30"
                  }
                `}
                aria-current={esActiva ? "step" : undefined}
                aria-label={`${ETAPA_LABEL[etapa]}${!habilitada ? " (bloqueada)" : ""}`}
              >
                {/* Ícono de estado */}
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                    completada
                      ? "bg-success-100 text-success-600 dark:bg-success-400/20 dark:text-success-400"
                      : !habilitada
                      ? "bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-white/30"
                      : esActiva
                      ? "bg-[#28b8d5]/20 text-[#28b8d5]"
                      : "bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-white/50"
                  }`}
                >
                  {!habilitada ? (
                    <LockIcon />
                  ) : completada ? (
                    <CheckIcon />
                  ) : (
                    <span className="text-[10px] font-bold">{progreso}%</span>
                  )}
                </span>

                {/* Etiqueta */}
                <span
                  className={`text-xs font-semibold tracking-wide ${
                    esActiva
                      ? "text-[#28b8d5]"
                      : completada
                      ? "text-success-600 dark:text-success-400"
                      : !habilitada
                      ? "text-gray-400 dark:text-white/30"
                      : "text-gray-600 dark:text-white/60"
                  }`}
                >
                  {ETAPA_LABEL[etapa]}
                </span>

                {/* Barra de progreso (solo si habilitada y no completada) */}
                {habilitada && !completada && (
                  <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progreso > 0
                          ? "bg-[#28b8d5] animate-pulse"
                          : "bg-gray-300 dark:bg-white/[0.12]"
                      }`}
                      style={{ width: `${Math.max(progreso, 4)}%` }}
                    />
                  </div>
                )}

                {/* Barra completa (si completada) */}
                {completada && (
                  <div className="w-full h-1 rounded-full bg-success-200 dark:bg-success-400/20 overflow-hidden">
                    <div className="h-full w-full rounded-full bg-success-500 dark:bg-success-400" />
                  </div>
                )}

                {/* Separador visual para etapa bloqueada sin barra */}
                {!habilitada && (
                  <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
                )}
              </button>

              {/* Última etapa no lleva separador a la derecha */}
              {esUltima && null}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mensaje de bloqueo inline */}
      {mensajeBloqueo && (
        <p
          role="alert"
          className="mt-3 text-sm text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-400/10 border border-warning-200 dark:border-warning-400/15 rounded-lg px-4 py-2"
        >
          {mensajeBloqueo}
        </p>
      )}
    </div>
  );
}

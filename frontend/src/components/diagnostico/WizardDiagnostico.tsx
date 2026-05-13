"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type SesionCuestionario,
  type InfoDiagnostico,
  type DatosRespondente,
  type RespuestaKA,
  sesionVacia,
  SESION_KEY,
  mockEnviarRespuestas,
  getKAsHabilitadas,
} from "@/lib/mocks/mad.mock";
import PasoRespondente from "./PasoRespondente";
import PasoSeleccionKAs from "./PasoSeleccionKAs";
import PasoKA from "./PasoKA";
import PasoConfirmacion from "./PasoConfirmacion";

interface Props {
  info: InfoDiagnostico;
}

export default function WizardDiagnostico({ info }: Props) {
  const [sesion, setSesion] = useState<SesionCuestionario>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(SESION_KEY(info.token));
      if (saved) {
        try {
          return JSON.parse(saved) as SesionCuestionario;
        } catch {
          // sesión corrupta → reiniciar
        }
      }
    }
    return sesionVacia(info.token, info.kas_habilitadas);
  });

  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // Persistir en sessionStorage en cada cambio
  useEffect(() => {
    if (sesion.estado !== "ENVIADO") {
      sessionStorage.setItem(SESION_KEY(info.token), JSON.stringify(sesion));
    }
  }, [sesion, info.token]);

  // ─── Handlers de navegación ───────────────────────────────────────────────

  const irARespondente = useCallback(() => {
    setSesion((prev) => ({ ...prev, estado: "DATOS_RESPONDENTE" }));
  }, []);

  const confirmarRespondente = useCallback((datos: DatosRespondente) => {
    setSesion((prev) => ({ ...prev, datos_respondente: datos, estado: "SELECCION_KAS" }));
  }, []);

  const confirmarSeleccion = useCallback((kas: string[]) => {
    setSesion((prev) => ({
      ...prev,
      kas_seleccionadas: kas,
      ka_actual_index: 0,
      estado: "EN_CUESTIONARIO",
    }));
  }, []);

  const confirmarRespuestaKA = useCallback((kaId: string, respuesta: RespuestaKA) => {
    setSesion((prev) => {
      const esUltima = prev.ka_actual_index >= prev.kas_seleccionadas.length - 1;
      return {
        ...prev,
        respuestas: { ...prev.respuestas, [kaId]: respuesta },
        ka_actual_index: esUltima ? prev.ka_actual_index : prev.ka_actual_index + 1,
        estado: esUltima ? "CONFIRMACION" : "EN_CUESTIONARIO",
      };
    });
  }, []);

  const retrocederEnKAs = useCallback(() => {
    setSesion((prev) => {
      if (prev.ka_actual_index === 0) {
        return { ...prev, estado: "SELECCION_KAS" };
      }
      return { ...prev, ka_actual_index: prev.ka_actual_index - 1 };
    });
  }, []);

  const irASeleccion = useCallback(() => {
    setSesion((prev) => ({ ...prev, estado: "SELECCION_KAS" }));
  }, []);

  const enviar = useCallback(async () => {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await mockEnviarRespuestas(info.token, sesion);
      setSesion((prev) => ({ ...prev, estado: "ENVIADO" }));
      sessionStorage.removeItem(SESION_KEY(info.token));
    } catch (e) {
      setErrorEnvio(
        e instanceof Error ? e.message : "Ocurrió un error al enviar. Intenta de nuevo."
      );
    } finally {
      setEnviando(false);
    }
  }, [info.token, sesion]);

  // ─── Pantalla final de éxito ───────────────────────────────────────────────

  if (sesion.estado === "ENVIADO") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          ¡Diagnóstico enviado!
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Gracias por completar la evaluación de madurez. El equipo consultor analizará tus
          respuestas y recibirás el informe de diagnóstico a través de tu contacto en ARQDATA.
        </p>
      </div>
    );
  }

  // ─── Datos para el wizard ──────────────────────────────────────────────────

  const kasHabilitadas = getKAsHabilitadas(info.kas_habilitadas);
  const kasSeleccionadas = getKAsHabilitadas(sesion.kas_seleccionadas);
  const kaActual = kasSeleccionadas[sesion.ka_actual_index];

  const totalPasos = 2 + kasSeleccionadas.length + 1; // respondente + selección + KAs + confirmación
  let pasoActual = 0;
  if (sesion.estado === "SELECCION_KAS") pasoActual = 1;
  else if (sesion.estado === "EN_CUESTIONARIO") pasoActual = 2 + sesion.ka_actual_index;
  else if (sesion.estado === "CONFIRMACION") pasoActual = totalPasos - 1;

  const pct = totalPasos > 1 ? Math.round((pasoActual / (totalPasos - 1)) * 100) : 0;

  return (
    <div className="w-full">
      {/* Barra de progreso */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
          <span>Paso {pasoActual + 1} de {totalPasos}</span>
          <span>{pct}% completado</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0F172A] dark:bg-white rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Pasos */}
      {sesion.estado === "DATOS_RESPONDENTE" && (
        <PasoRespondente
          inicial={sesion.datos_respondente}
          onSiguiente={confirmarRespondente}
        />
      )}

      {sesion.estado === "SELECCION_KAS" && (
        <PasoSeleccionKAs
          kasDisponibles={kasHabilitadas}
          seleccionadas={sesion.kas_seleccionadas}
          onSiguiente={confirmarSeleccion}
          onAtras={irARespondente}
        />
      )}

      {sesion.estado === "EN_CUESTIONARIO" && kaActual && (
        <PasoKA
          ka={kaActual}
          respuestaActual={sesion.respuestas[kaActual.id]}
          indice={sesion.ka_actual_index}
          total={kasSeleccionadas.length}
          onSiguiente={(respuesta) => confirmarRespuestaKA(kaActual.id, respuesta)}
          onAtras={retrocederEnKAs}
        />
      )}

      {sesion.estado === "CONFIRMACION" && (
        <PasoConfirmacion
          sesion={sesion}
          kasSeleccionadas={kasSeleccionadas}
          enviando={enviando}
          error={errorEnvio}
          onEnviar={enviar}
          onAtras={irASeleccion}
        />
      )}
    </div>
  );
}

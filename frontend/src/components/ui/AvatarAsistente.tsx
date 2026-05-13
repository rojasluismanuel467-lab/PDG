"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const MENSAJES_DEFAULT = [
  "¡Hola! Soy Archi 🦉 Estoy aquí para ayudarte en la etapa AS-IS. ¡Haz clic en cualquier artefacto para comenzar!",
  "Tip: Empieza por el Cuestionario de Madurez — establece la línea base de toda la arquitectura.",
  "El Diagrama Conceptual AS-IS captura las entidades de negocio actuales y sus relaciones.",
  "El Inventario de Sistemas registra todas las aplicaciones, bases de datos y plataformas activas.",
  "El DFD AS-IS muestra cómo fluyen los datos entre los sistemas de la organización hoy.",
  "La Matriz RACI define quién es Responsable, Aprobador, Consultado e Informado en cada actividad.",
  "Una buena etapa AS-IS es la diferencia entre un TO-BE realista y uno que nunca se implementa. 🎯",
  "¿Sabías que DAMA-DMBOK2 define 11 áreas de conocimiento? El cuestionario evalúa todas ellas.",
];

interface AvatarAsistenteProps {
  mensajes?: string[];
}

export default function AvatarAsistente({ mensajes = MENSAJES_DEFAULT }: AvatarAsistenteProps) {
  const [visible, setVisible] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [mensajeIdx, setMensajeIdx] = useState(0);
  const [animando, setAnimando] = useState(false);
  const [parpadeo, setParpadeo] = useState(false);

  // Posición arrastrable — inicia en esquina inferior derecha
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fija posición inicial — top del contenedor (burbuja + búho ~220px de alto)
  useEffect(() => {
    setPos({
      x: window.innerWidth - 300,
      y: window.innerHeight - 260,
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setParpadeo(true);
      setTimeout(() => setParpadeo(false), 150);
    }, 3500);
    return () => clearInterval(intervalo);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Solo arrastrar desde el búho, no desde la burbuja
    isDragging.current = true;
    const rect = containerRef.current!.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth ?? 90);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight ?? 110);
      setPos({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const siguienteMensaje = () => {
    setAnimando(true);
    setTimeout(() => {
      setMensajeIdx((i) => (i + 1) % mensajes.length);
      setAnimando(false);
    }, 180);
  };

  if (!visible || pos === null) return null;

  // La burbuja aparece encima del búho, alineada a la derecha
  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex flex-col items-end gap-2 select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Burbuja de diálogo */}
      {!minimizado && (
        <div
          className="relative max-w-[260px] rounded-2xl rounded-br-sm border border-[#28b8d5]/30 bg-white dark:bg-[#1a1a1a] shadow-xl px-4 py-3"
          style={{ animation: "archi-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          {/* Botón cerrar */}
          <button
            onClick={() => setMinimizado(true)}
            className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 dark:text-white/20 dark:hover:text-white/50 transition-colors"
            title="Cerrar"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Mensaje */}
          <p
            className="text-xs text-gray-700 dark:text-white/75 leading-relaxed pr-4"
            style={{
              opacity: animando ? 0 : 1,
              transform: animando ? "translateY(4px)" : "translateY(0)",
              transition: "opacity 0.18s ease, transform 0.18s ease",
            }}
          >
            {mensajes[mensajeIdx]}
          </p>

          {/* Siguiente tip */}
          <button
            onClick={siguienteMensaje}
            className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#28b8d5] hover:text-[#1e9bb5] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            Siguiente tip
          </button>

          {/* Cola de la burbuja */}
          <span className="absolute -bottom-2 right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white dark:border-t-[#1a1a1a]" />
          <span className="absolute -bottom-[9px] right-[22px] w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[9px] border-t-[#28b8d5]/30" />
        </div>
      )}

      {/* Búho — agarrarlo para arrastrar */}
      <button
        onMouseDown={onMouseDown}
        onClick={() => !isDragging.current && setMinimizado((v) => !v)}
        title={minimizado ? "Abrir asistente" : "Arrastrar / minimizar"}
        className="group relative flex items-end cursor-grab active:cursor-grabbing"
        style={{ animation: "archi-bounce 2.8s ease-in-out infinite" }}
      >
        <svg
          width="72"
          height="80"
          viewBox="0 0 72 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* ── Cuerpo ── */}
          <ellipse cx="36" cy="58" rx="22" ry="20" fill="#0e7a95" />
          <ellipse cx="36" cy="58" rx="16" ry="14" fill="#28b8d5" opacity="0.25" />

          {/* ── Alas ── */}
          <ellipse cx="13" cy="56" rx="10" ry="14" fill="#0e7a95" transform="rotate(-15 13 56)" />
          <ellipse cx="59" cy="56" rx="10" ry="14" fill="#0e7a95" transform="rotate(15 59 56)" />

          {/* ── Cabeza ── */}
          <circle cx="36" cy="32" r="24" fill="#28b8d5" />

          {/* ── Orejas/plumas ── */}
          <polygon points="18,14 13,3 23,10" fill="#0e7a95" />
          <polygon points="54,14 59,3 49,10" fill="#0e7a95" />
          <polygon points="19,13 15,6 22,10" fill="#1aa3bf" />
          <polygon points="53,13 57,6 50,10" fill="#1aa3bf" />

          {/* ── Cara — fondo ojos ── */}
          <circle cx="26" cy="30" r="10" fill="white" />
          <circle cx="46" cy="30" r="10" fill="white" />

          {/* ── Iris ── */}
          <circle cx="26" cy="30" r="6.5" fill="#0e7a95" />
          <circle cx="46" cy="30" r="6.5" fill="#0e7a95" />

          {/* ── Pupilas (con parpadeo) ── */}
          {parpadeo ? (
            <>
              <rect x="21" y="29" width="10" height="2.5" rx="1.25" fill="#0a2a33" />
              <rect x="41" y="29" width="10" height="2.5" rx="1.25" fill="#0a2a33" />
            </>
          ) : (
            <>
              <circle cx="26" cy="30" r="3.5" fill="#0a2a33" />
              <circle cx="46" cy="30" r="3.5" fill="#0a2a33" />
              <circle cx="27.5" cy="28.5" r="1.2" fill="white" opacity="0.9" />
              <circle cx="47.5" cy="28.5" r="1.2" fill="white" opacity="0.9" />
            </>
          )}

          {/* ── Pico ── */}
          <polygon points="36,36 30,42 42,42" fill="#fbbf24" />
          <line x1="30" y1="42" x2="42" y2="42" stroke="#f59e0b" strokeWidth="1" />

          {/* ── Pecho — patrón plumas ── */}
          <ellipse cx="36" cy="55" rx="10" ry="12" fill="#1aa3bf" opacity="0.4" />
          <path d="M30 50 Q36 46 42 50" stroke="#0e7a95" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M28 55 Q36 51 44 55" stroke="#0e7a95" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M29 60 Q36 56 43 60" stroke="#0e7a95" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* ── Patas ── */}
          <path d="M28 76 L24 80 M28 76 L28 80 M28 76 L32 80" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 76 L40 80 M44 76 L44 80 M44 76 L48 80" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />

          {/* ── Birrete de arquitecto ── */}
          <rect x="18" y="10" width="36" height="5" rx="2" fill="#0a2a33" />
          <rect x="26" y="5" width="20" height="6" rx="2" fill="#0a2a33" />
          <line x1="46" y1="10" x2="52" y2="16" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
          <circle cx="52" cy="17" r="2.5" fill="#fbbf24" />
        </svg>

        {/* Indicador de mensaje si minimizado */}
        {minimizado && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#28b8d5] text-[9px] font-bold text-white shadow-sm">
            !
          </span>
        )}
      </button>

      <style>{`
        @keyframes archi-bounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes archi-pop {
          0%   { opacity: 0; transform: scale(0.8) translateY(8px); }
          100% { opacity: 1; transform: scale(1)   translateY(0px); }
        }
      `}</style>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";

const TIPS = [
  { titulo: "DAMA-DMBOK2", texto: "Define 11 áreas de conocimiento en gestión de datos, desde gobernanza hasta calidad y seguridad." },
  { titulo: "TOGAF ADM", texto: "El Architecture Development Method guía la creación de arquitecturas empresariales en fases iterativas." },
  { titulo: "Arquitectura AS-IS", texto: "Documenta el estado actual de los sistemas, datos y procesos antes de proponer cualquier cambio." },
  { titulo: "Arquitectura TO-BE", texto: "Define el estado futuro deseado: cómo deben evolucionar los sistemas y datos para cumplir los objetivos de negocio." },
  { titulo: "Matriz de Brechas", texto: "Identifica las diferencias entre el AS-IS y el TO-BE, priorizando los cambios necesarios para la transformación." },
  { titulo: "Modelo Conceptual", texto: "Representa las entidades de negocio y sus relaciones sin entrar en detalles técnicos de implementación." },
  { titulo: "Inventario de Sistemas", texto: "Cataloga todas las aplicaciones, bases de datos y plataformas activas, su criticidad y propietarios técnicos." },
  { titulo: "Matriz RACI", texto: "Asigna roles: Responsable, Aprobador, Consultado e Informado para cada actividad del proyecto." },
  { titulo: "DFD AS-IS", texto: "El Diagrama de Flujo de Datos muestra cómo circula la información entre sistemas en el estado actual." },
  { titulo: "Gobierno del Dato", texto: "Establece políticas, estándares y responsabilidades para garantizar la calidad y seguridad de los datos." },
];

export default function LoginPanel() {
  const [tipIdx, setTipIdx] = useState(0);
  const [animando, setAnimando] = useState(false);
  const [parpadeo, setParpadeo] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimando(true);
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % TIPS.length);
        setAnimando(false);
      }, 280);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setParpadeo(true);
      setTimeout(() => setParpadeo(false), 150);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const tip = TIPS[tipIdx];

  const irATip = (i: number) => {
    setAnimando(true);
    setTimeout(() => { setTipIdx(i); setAnimando(false); }, 280);
  };

  return (
    <div
      className="lg:w-1/2 w-full h-full lg:grid items-center hidden relative overflow-hidden border-l border-white/[0.08]"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(40,184,213,0.5), transparent)" }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto text-center px-8">

        {/* Burbuja de diálogo */}
        <div
          className="relative w-full rounded-2xl rounded-bl-sm border border-[#28b8d5]/30 bg-[#0d1a1e] shadow-2xl px-5 py-4 mb-2"
          style={{
            opacity: animando ? 0 : 1,
            transform: animando ? "translateY(-6px)" : "translateY(0)",
            transition: "opacity 0.28s ease, transform 0.28s ease",
          }}
        >
          <p className="text-[10px] font-semibold text-[#28b8d5] uppercase tracking-widest mb-1.5 text-left">
            {tip.titulo}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed text-left">
            {tip.texto}
          </p>

          {/* Cola de la burbuja apuntando hacia el búho */}
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#0d1a1e]" />
          <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[9px] border-t-[#28b8d5]/30" />
        </div>

        {/* Búho Archi */}
        <div
          style={{ animation: "archi-bounce 2.8s ease-in-out infinite" }}
        >
          <svg width="150" height="167" viewBox="0 0 72 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
            <ellipse cx="36" cy="58" rx="22" ry="20" fill="#0e7a95" />
            <ellipse cx="36" cy="58" rx="16" ry="14" fill="#28b8d5" opacity="0.25" />
            <ellipse cx="13" cy="56" rx="10" ry="14" fill="#0e7a95" transform="rotate(-15 13 56)" />
            <ellipse cx="59" cy="56" rx="10" ry="14" fill="#0e7a95" transform="rotate(15 59 56)" />
            <circle cx="36" cy="32" r="24" fill="#28b8d5" />
            <polygon points="18,14 13,3 23,10" fill="#0e7a95" />
            <polygon points="54,14 59,3 49,10" fill="#0e7a95" />
            <polygon points="19,13 15,6 22,10" fill="#1aa3bf" />
            <polygon points="53,13 57,6 50,10" fill="#1aa3bf" />
            <circle cx="26" cy="30" r="10" fill="white" />
            <circle cx="46" cy="30" r="10" fill="white" />
            <circle cx="26" cy="30" r="6.5" fill="#0e7a95" />
            <circle cx="46" cy="30" r="6.5" fill="#0e7a95" />
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
            <polygon points="36,36 30,42 42,42" fill="#fbbf24" />
            <line x1="30" y1="42" x2="42" y2="42" stroke="#f59e0b" strokeWidth="1" />
            <ellipse cx="36" cy="55" rx="10" ry="12" fill="#1aa3bf" opacity="0.4" />
            <path d="M30 50 Q36 46 42 50" stroke="#0e7a95" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M28 55 Q36 51 44 55" stroke="#0e7a95" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M29 60 Q36 56 43 60" stroke="#0e7a95" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M28 76 L24 80 M28 76 L28 80 M28 76 L32 80" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <path d="M44 76 L40 80 M44 76 L44 80 M44 76 L48 80" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <rect x="18" y="10" width="36" height="5" rx="2" fill="#0a2a33" />
            <rect x="26" y="5" width="20" height="6" rx="2" fill="#0a2a33" />
            <line x1="46" y1="10" x2="52" y2="16" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <circle cx="52" cy="17" r="2.5" fill="#fbbf24" />
          </svg>
        </div>

        {/* Título */}
        <h3 className="text-white font-semibold text-xl mt-6 mb-2 tracking-tight">
          Agente IA · TOGAF ADM
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-2">
          Automatiza tu arquitectura empresarial con agentes de IA autónomos que guían cada fase del ciclo ADM.
        </p>

        {/* Indicadores de progreso */}
        <div className="flex items-center gap-1.5 mt-5">
          {TIPS.map((_, i) => (
            <button
              key={i}
              onClick={() => irATip(i)}
              className={`rounded-full transition-all duration-300 ${
                i === tipIdx
                  ? "w-4 h-1.5 bg-[#28b8d5]"
                  : "w-1.5 h-1.5 bg-white/[0.15] hover:bg-white/[0.30]"
              }`}
            />
          ))}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 mt-5 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#28b8d5] animate-pulse flex-shrink-0" />
          <span className="text-xs text-[#28b8d5] font-medium">Archi · Online</span>
        </div>
      </div>

      <style>{`
        @keyframes archi-bounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

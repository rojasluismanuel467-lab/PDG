"use client";
import Link from "next/link";
import type { Project, ADMPhase } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  completado: "Completado",
  en_revision: "En revisión",
  en_progreso: "En progreso",
  pendiente: "Pendiente",
};

const STATUS_COLOR: Record<string, string> = {
  completado:  "bg-gray-900 text-white         dark:bg-white/[0.08] dark:text-white/80",
  en_revision: "bg-gray-200 text-gray-700      dark:bg-white/[0.05] dark:text-white/60",
  en_progreso: "bg-gray-100 text-gray-600      dark:bg-white/[0.04] dark:text-white/50",
  pendiente:   "bg-gray-50  text-gray-400      dark:bg-white/[0.02] dark:text-white/25",
};

interface ProjectCardProps {
  project: Project;
  phases: ADMPhase[];
  consultorNombre: string;
}

export default function ProjectCard({ project, phases, consultorNombre }: ProjectCardProps) {
  const completadas = phases.filter((p) => p.estado === "completado").length;

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-white/[0.04] space-y-4 overflow-hidden">
      {/* Top accent line */}
      <div className="absolute -top-px left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-gray-300/60 dark:via-white/20 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-800 dark:text-white/90 text-base">
            {project.nombre}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Consultor: {consultorNombre}
          </p>
        </div>
        {/* Phase counter badge — glass pill matching landing style */}
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/[0.06] dark:border dark:border-white/[0.08] dark:text-white/60">
          {completadas}/{phases.length} fases
        </span>
      </div>

      {/* Phase grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 p-2 dark:border-white/[0.06] dark:bg-white/[0.02]"
          >
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase">
              {phase.codigo_fase}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[phase.estado]}`}
            >
              {STATUS_LABEL[phase.estado]}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <Link
          href={`/consultor/proyectos/${project.id}`}
          className="flex-1 py-2 text-center btn-secondary"
        >
          Ver proyecto
        </Link>
        <Link
          href={`/consultor/proyectos/${project.id}/agente`}
          className="flex-1 py-2 text-center btn-primary"
        >
          Activar agente
        </Link>
      </div>
    </div>
  );
}

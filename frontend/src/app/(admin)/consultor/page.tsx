import { MOCK_PROJECT, MOCK_PHASES, MOCK_CONSULTOR } from "@/lib/mock-data";
import ProjectCard from "@/components/consultor/ProjectCard";

export const metadata = { title: "Mis Proyectos — Agente ADM" };

export default function ConsultorDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Mis proyectos
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Hola,{" "}
            <span className="text-gray-700 dark:text-white/80 font-medium">
              {MOCK_CONSULTOR.nombre}
            </span>
            . Tienes 1 proyecto activo.
          </p>
        </div>
      </div>

      <ProjectCard
        project={MOCK_PROJECT}
        phases={MOCK_PHASES}
        consultorNombre={MOCK_CONSULTOR.nombre}
      />
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

import { MaturityConsultorView } from "@/components/maturity/MaturityConsultorView";
import AvatarAsistente from "@/components/ui/AvatarAsistente";

const MENSAJES_CUESTIONARIO = [
  "El Cuestionario de Madurez evalúa las 11 áreas de conocimiento de DAMA-DMBOK2. ¡Es el punto de partida de todo el AS-IS!",
  "Cada dimensión tiene un nivel del 1 al 5. Sé honesto: un diagnóstico realista vale más que uno optimista.",
  "Tip: revisa las respuestas con el equipo de TI y el de negocio por separado — sus percepciones suelen diferir.",
  "Las áreas con nivel 1 o 2 son las que más impactarán la hoja de ruta TO-BE. Márcalas bien.",
  "¿Ya tienes los resultados de entrevistas previas? Úsalos como referencia para validar las respuestas.",
  "El cuestionario genera automáticamente el puntaje de madurez global del proyecto.",
  "Recuerda que el nivel de madurez AS-IS es la línea base; sin ella no se puede medir el progreso.",
  "Una vez aprobado el cuestionario, el Diagrama Conceptual AS-IS se desbloquea. ¡Continúa el flujo!",
];

export default function CuestionarioMadurezPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/40">
        <Link
          href="/consultor/proyectos"
          className="hover:text-[#28b8d5] hover:underline transition-colors"
        >
          Proyectos
        </Link>
        <span>→</span>
        <Link
          href={`/consultor/proyectos/${id}`}
          className="hover:text-[#28b8d5] hover:underline transition-colors"
        >
          Proyecto
        </Link>
        <span>→</span>
        <span className="text-gray-700 dark:text-white/70">Cuestionario de Madurez</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Cuestionario de Madurez
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona configuracion, respuestas, validacion y resultados del cuestionario.
          </p>
        </div>
        <Link
          href={`/consultor/proyectos/${id}`}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
        >
          Volver al Proyecto
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <MaturityConsultorView projectId={id} />
      </div>

      <AvatarAsistente mensajes={MENSAJES_CUESTIONARIO} />
    </div>
  );
}

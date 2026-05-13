import Link from "next/link";

export default function MaturityAssessmentPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Cuestionario de Madurez
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Esta ruta legacy de demo ya no usa datos mock. El flujo activo del cuestionario vive dentro
          de cada proyecto y consume plantilla, respuestas y resultados directamente desde el backend.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/signin"
            className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] dark:bg-white dark:text-black"
          >
            Ir a iniciar sesion
          </Link>
          <Link
            href="/responder-cuestionario"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white"
          >
            Abrir ruta publica de cuestionario
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import AgentPanel from "@/components/consultor/AgentPanel";

export const metadata = { title: "Agente IA — Archi" };

export default function AgentePage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/consultor/proyectos/${params.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-white/30 dark:hover:text-white/60 transition-colors"
        >
          ← Volver al proyecto
        </Link>
        <h1 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Sesión con Archi
        </h1>
      </div>
      <AgentPanel />
    </div>
  );
}

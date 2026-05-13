"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

import { MaturityEmpresaReadOnlyView } from "@/components/maturity/MaturityEmpresaReadOnlyView";

export default function CuestionarioMadurezEmpresaPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <nav className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/40">
        <Link
          href="/empresa/proyectos"
          className="hover:text-[#28b8d5] hover:underline transition-colors"
        >
          Proyectos
        </Link>
        <span>→</span>
        <Link
          href={`/empresa/proyectos/${id}`}
          className="hover:text-[#28b8d5] hover:underline transition-colors"
        >
          Proyecto
        </Link>
        <span>→</span>
        <span className="text-gray-700 dark:text-white/70">Cuestionario de Madurez</span>
      </nav>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <MaturityEmpresaReadOnlyView projectId={id} />
      </div>
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { EntregableDetalleEmpresa } from "@/components/entregables/EntregableDetalleEmpresa";

export default function EntregableDetalleEmpresaPage() {
  const { id, entregableId } = useParams<{ id: string; entregableId: string }>();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
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
        <span className="text-gray-700 dark:text-white/70">Entregable</span>
      </nav>

      {/* Contenido Principal */}
      <EntregableDetalleEmpresa entregableId={entregableId} projectId={id} />
    </div>
  );
}

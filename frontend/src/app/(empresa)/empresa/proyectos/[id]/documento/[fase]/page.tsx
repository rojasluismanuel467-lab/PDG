"use client";
import Link from "next/link";
import { use, useState } from "react";
import DocumentSection from "@/components/documento/DocumentSection";
import {
  MOCK_PHASES,
  getSectionsByFase,
  getDocumentByFase,
  getCommentsBySection,
  MOCK_COMMENTS,
} from "@/lib/mock-data";
import { MOCK_EMPRESA, MOCK_PROJECT } from "@/lib/mock-data";
import type { Comment } from "@/lib/types";

export default function EmpresaDocumentoPage({
  params,
}: {
  params: Promise<{ id: string; fase: string }>;
}) {
  const { fase } = use(params);
  const phase = MOCK_PHASES.find((p) => p.codigo_fase === fase);
  const document = phase ? getDocumentByFase(phase.id) : undefined;
  const [sections] = useState(() => (phase ? getSectionsByFase(phase.id) : []));
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
  const [approved, setApproved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!phase || !document) {
    return <p className="text-sm text-gray-500 p-6">Documento no disponible.</p>;
  }

  const handleComment = (sectionId: string, text: string) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      seccion_id: sectionId,
      autor_id: MOCK_EMPRESA.id,
      autor_nombre: `${MOCK_EMPRESA.nombre} (Empresa)`,
      contenido: text,
      tipo: "empresa",
      estado: "abierto",
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);
  };

  const handleApprove = () => {
    setApproved(true);
    setShowConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/empresa/dashboard">← Panel empresa</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium">
          Fase {phase.codigo_fase} · {phase.nombre}
        </span>
      </div>

      {/* Approved banner */}
      {approved && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/80">
            Documento aprobado. El hito de la Fase {phase.codigo_fase} ha sido marcado como Completado.
          </p>
          <p className="text-xs text-gray-600 dark:text-white/50 mt-1">
            Fecha de aprobación: {new Date().toLocaleDateString("es-CO")}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {phase.nombre}
        </h1>
        {!approved && (
          <button
            onClick={() => setShowConfirm(true)}
            className="self-start sm:self-auto btn-primary"
          >
            Aprobar documento
          </button>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 space-y-4">
            <h2 className="font-semibold text-gray-800 dark:text-white/90">
              ¿Confirma la aprobación?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Confirma la aprobación del documento de Fase {phase.codigo_fase} ·{" "}
              {phase.nombre}? Esta acción marcará el hito como completado.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 btn-primary"
              >
                Confirmar aprobación
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <DocumentSection
            key={section.id}
            section={section}
            comments={comments.filter((c) => c.seccion_id === section.id)}
            onComment={!approved ? handleComment : undefined}
          />
        ))}
      </div>
    </div>
  );
}

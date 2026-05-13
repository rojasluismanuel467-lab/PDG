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
import type { Comment } from "@/lib/types";

export default function DocumentoPage({
  params,
}: {
  params: Promise<{ id: string; fase: string }>;
}) {
  const { id, fase } = use(params);
  const phase = MOCK_PHASES.find((p) => p.codigo_fase === fase);
  const document = phase ? getDocumentByFase(phase.id) : undefined;
  const [sections, setSections] = useState(() =>
    phase ? getSectionsByFase(phase.id) : []
  );
  const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);

  if (!phase || !document) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-6">
        Documento no disponible para esta fase.
      </div>
    );
  }

  const handleComment = (sectionId: string, text: string) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      seccion_id: sectionId,
      autor_id: "u1",
      autor_nombre: "José Luis Jurado (Consultor)",
      contenido: text,
      tipo: "consultor",
      estado: "abierto",
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, newComment]);
  };

  const handleSendToReview = () => {
    alert("Documento enviado a revisión. El estado de la fase cambió a 'En revisión'.");
  };

  const allComplete = sections.every((s) => s.estado === "completo");

  const STATUS_LABEL: Record<string, string> = {
    borrador: "Borrador",
    en_revision: "En revisión",
    aprobado: "Aprobado",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/consultor/proyectos/${id}`}
          className="text-gray-500 hover:text-gray-700 dark:text-white/30 dark:hover:text-white/60 transition-colors"
        >
          ← Proyecto
        </Link>
        <span className="text-gray-300 dark:text-white/20">·</span>
        <span className="text-gray-700 dark:text-white/70 font-medium">
          Fase {phase.codigo_fase} · {phase.nombre}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {phase.nombre}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Versión {document.version_actual} ·{" "}
            <span className="font-medium text-gray-700 dark:text-white/60">
              {STATUS_LABEL[document.estado]}
            </span>
          </p>
        </div>
        {document.estado === "borrador" && allComplete && (
          <button onClick={handleSendToReview} className="self-start sm:self-auto btn-primary">
            Enviar a revisión
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <DocumentSection
            key={section.id}
            section={section}
            comments={comments.filter((c) => c.seccion_id === section.id)}
            onComment={document.estado === "borrador" ? handleComment : undefined}
          />
        ))}
      </div>
    </div>
  );
}

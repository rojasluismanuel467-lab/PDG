"use client";
import React, { useState } from "react";
import type { DocumentSection as DSType, Comment } from "@/lib/types";

interface DocumentSectionProps {
  section: DSType;
  comments: Comment[];
  onComment?: (sectionId: string, text: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  completo:   "bg-gray-900 text-white      dark:bg-white/[0.08] dark:text-white/80",
  incompleto: "bg-gray-200 text-gray-600   dark:bg-white/[0.05] dark:text-white/50",
  vacio:      "bg-gray-50  text-gray-400   dark:bg-white/[0.02] dark:text-white/25",
};

const STATUS_LABEL: Record<string, string> = {
  completo: "Completo",
  incompleto: "Incompleto",
  vacio: "Vacío",
};

export default function DocumentSection({ section, comments, onComment }: DocumentSectionProps) {
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleSaveComment = () => {
    if (!commentText.trim()) return;
    onComment?.(section.id, commentText.trim());
    setCommentText("");
    setShowComment(false);
  };

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 font-mono">
            {section.codigo_seccion}
          </span>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {section.titulo}
          </h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[section.estado]}`}>
          {STATUS_LABEL[section.estado]}
        </span>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {section.contenido_actual ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {section.contenido_actual}
          </p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            Esta sección aún no tiene contenido.
          </p>
        )}
      </div>

      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 dark:bg-white/[0.04] dark:border-white/[0.08]"
            >
              <p className="text-xs font-medium text-gray-600 dark:text-white/50">
                {c.autor_nombre}
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{c.contenido}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comment controls */}
      {onComment && (
        <div className="px-5 pb-4">
          {showComment ? (
            <div className="space-y-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                placeholder="Añade tu comentario sobre esta sección…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400
                  dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:placeholder:text-gray-600 dark:focus:border-white/30"
              />
              <div className="flex gap-2">
                {/* Primary: white on black */}
                <button onClick={handleSaveComment} className="btn-primary-sm">
                  Guardar
                </button>
                <button onClick={() => setShowComment(false)} className="btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowComment(true)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-white/40 dark:hover:text-white/70 transition-colors"
            >
              + Añadir comentario
            </button>
          )}
        </div>
      )}
    </div>
  );
}

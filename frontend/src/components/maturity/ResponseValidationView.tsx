"use client";

import React, { useState } from "react";
import type { LegacyValidationResponse } from "@/lib/types/maturity-legacy";
import { getScoreColor } from "@/lib/maturity/scoring";

interface ResponseValidationViewProps {
  respuesta: LegacyValidationResponse;
  onValidate: (answerId: number, estado: "APROBADA" | "RECHAZADA", comentarios?: string) => void;
  onValidateAll: (estado: "APROBADA" | "RECHAZADA", comentarios?: string) => void;
}

export const ResponseValidationView: React.FC<ResponseValidationViewProps> = ({
  respuesta,
  onValidate,
  onValidateAll,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [comentarios, setComentarios] = useState("");

  const handleApprove = (answerId: number) => {
    onValidate(answerId, "APROBADA", comentarios || undefined);
    setComentarios("");
    setSelectedAnswer(null);
  };

  const handleReject = (answerId: number) => {
    onValidate(answerId, "RECHAZADA", comentarios || undefined);
    setComentarios("");
    setSelectedAnswer(null);
  };

  const handleApproveAll = () => {
    onValidateAll("APROBADA", comentarios || undefined);
    setComentarios("");
  };

  const handleRejectAll = () => {
    onValidateAll("RECHAZADA", comentarios || undefined);
    setComentarios("");
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
      EN_REVISION: "bg-blue-100 text-blue-800 border-blue-200",
      APROBADA: "bg-green-100 text-green-800 border-green-200",
      RECHAZADA: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = {
      PENDIENTE: "Pendiente",
      EN_REVISION: "En Revisión",
      APROBADA: "Aprobada",
      RECHAZADA: "Rechazada",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colors[estado as keyof typeof colors]}`}>
        {labels[estado as keyof typeof labels]}
      </span>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileIcon = (tipo?: string) => {
    if (!tipo) return "📄";
    if (tipo.includes("pdf")) return "📕";
    if (tipo.includes("word") || tipo.includes("document")) return "📘";
    if (tipo.includes("excel") || tipo.includes("sheet")) return "📗";
    if (tipo.includes("image")) return "🖼️";
    return "📄";
  };

  const pendingCount = respuesta.answers.filter(a => a.estadoValidacion === "PENDIENTE").length;
  const approvedCount = respuesta.answers.filter(a => a.estadoValidacion === "APROBADA").length;
  const rejectedCount = respuesta.answers.filter(a => a.estadoValidacion === "RECHAZADA").length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header de la Respuesta */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{respuesta.respondentName}</h3>
            <p className="text-sm text-gray-600">{respuesta.respondentEmail}</p>
            <p className="text-xs text-gray-500 mt-1">
              Rol: <span className="font-medium">{respuesta.role}</span> • 
              Enviado: <span className="font-medium">{respuesta.submittedAt.toLocaleDateString("es-CO")}</span>
            </p>
          </div>
          <div className="text-right">
            {getEstadoBadge(respuesta.estadoValidacion)}
            {respuesta.validadoPor && (
              <p className="text-xs text-gray-500 mt-2">
                Validado por: {respuesta.validadoPor}
              </p>
            )}
          </div>
        </div>

        {/* Estadísticas de Validación */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-gray-600">Pendientes: <strong>{pendingCount}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-gray-600">Aprobadas: <strong>{approvedCount}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="text-gray-600">Rechazadas: <strong>{rejectedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Lista de Respuestas con Evidencia */}
      <div className="divide-y divide-gray-200">
        {respuesta.answers.map((answer, index) => (
          <div key={answer.questionId} className="p-4 hover:bg-gray-50 transition-colors">
            {/* Header de la Pregunta */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-gray-500">Pregunta {index + 1}</span>
                  {getEstadoBadge(answer.estadoValidacion)}
                </div>
                <p className="text-sm font-medium text-gray-900">{answer.questionText}</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-xs text-gray-500 mb-1">Score</p>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: getScoreColor(answer.score) }}
                >
                  {answer.score}
                </div>
              </div>
            </div>

            {/* Evidencia */}
            {answer.evidenciaUrl ? (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(answer.evidenciaTipo)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 truncate">
                      {answer.evidenciaNombre}
                    </p>
                    <p className="text-xs text-blue-700">
                      {formatFileSize(answer.evidenciaSize)} • {answer.evidenciaTipo?.split("/")[1]?.toUpperCase() || "DOC"}
                    </p>
                  </div>
                  <a
                    href={answer.evidenciaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors"
                  >
                    📄 Ver
                  </a>
                </div>
              </div>
            ) : (
              <div className="mb-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">⚠️ Sin evidencia documental</p>
              </div>
            )}

            {/* Comentarios de Validación (si existen) */}
            {answer.validacionComentarios && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1">Comentarios del validador:</p>
                <p className="text-sm text-gray-700">{answer.validacionComentarios}</p>
              </div>
            )}

            {/* Acciones de Validación (solo si está pendiente) */}
            {answer.estadoValidacion === "PENDIENTE" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedAnswer(answer.questionId);
                    setComentarios("");
                  }}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors"
                >
                  ✏️ Validar
                </button>
              </div>
            )}

            {/* Formulario de Validación (cuando se selecciona) */}
            {selectedAnswer === answer.questionId && answer.estadoValidacion === "PENDIENTE" && (
              <div className="mt-3 p-3 bg-white rounded-lg border-2 border-blue-300">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Comentarios de validación (opcional):
                </label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Ej: La evidencia es completa y correcta..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(answer.questionId)}
                    className="flex-1 px-3 py-2 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(answer.questionId)}
                    className="flex-1 px-3 py-2 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                  >
                    ❌ Rechazar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAnswer(null);
                      setComentarios("");
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer con Acciones Masivas */}
      {pendingCount > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700 mb-3">
            Acciones masivas ({pendingCount} pendientes):
          </p>
          <div className="flex gap-2">
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Comentarios generales (opcional)..."
              rows={2}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleApproveAll}
                className="px-4 py-2 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600 transition-colors flex items-center gap-1"
              >
                ✅ Aprobar Todas
              </button>
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                ❌ Rechazar Todas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comentarios Generales de Validación (si ya fue validada) */}
      {respuesta.validacionComentarios && respuesta.estadoValidacion !== "PENDIENTE" && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700 mb-2">Comentarios generales del validador:</p>
          <p className="text-sm text-gray-700">{respuesta.validacionComentarios}</p>
        </div>
      )}
    </div>
  );
};

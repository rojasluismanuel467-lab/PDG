"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  EntregableDetallado,
  obtenerEntregablePorId,
  actualizarAprobacionEntregable,
  agregarComentarioAEntregable,
  agregarDocumentoAEntregable,
  Documento,
  Comentario,
} from "@/data/entregablesMock";

interface EntregableDetalleConsultorProps {
  entregableId: string;
  projectId: string;
}

export const EntregableDetalleConsultor: React.FC<EntregableDetalleConsultorProps> = ({
  entregableId,
  projectId,
}) => {
  const [entregable, setEntregable] = useState<EntregableDetallado | null>(
    obtenerEntregablePorId(entregableId) || null
  );
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [mostrarFormComentario, setMostrarFormComentario] = useState(false);
  const [mostrarFormDocumento, setMostrarFormDocumento] = useState(false);
  const [mostrarGestionPreguntas, setMostrarGestionPreguntas] = useState(false);

  if (!entregable) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">Entregable no encontrado</p>
      </div>
    );
  }

  const puedeSubirDocumentos = entregable.estado !== "APROBADO";
  const puedeAprobar = entregable.estado !== "APROBADO";
  const puedeEditar = entregable.estado !== "APROBADO";

  const handleAgregarComentario = () => {
    if (!nuevoComentario.trim()) return;

    const comentario: Comentario = {
      id: `com-${Date.now()}`,
      autor: "Consultor",
      rol: "CONSULTOR",
      contenido: nuevoComentario,
      fecha: new Date().toISOString(),
    };

    const actualizado = agregarComentarioAEntregable(entregableId, comentario);
    if (actualizado) {
      setEntregable(actualizado);
      setNuevoComentario("");
      setMostrarFormComentario(false);
    }
  };

  const handleAgregarDocumento = () => {
    if (!archivoSeleccionado) return;

    const documento: Documento = {
      id: `doc-${Date.now()}`,
      nombre: archivoSeleccionado.name,
      descripcion: "",
      archivo: archivoSeleccionado.name,
      tamano: archivoSeleccionado.size,
      tipo: archivoSeleccionado.type,
      fechaCarga: new Date().toISOString(),
      cargadoPor: "consultor@example.com",
      estado: "LISTO",
    };

    const actualizado = agregarDocumentoAEntregable(entregableId, documento);
    if (actualizado) {
      setEntregable(actualizado);
      setArchivoSeleccionado(null);
      setMostrarFormDocumento(false);
    }
  };

  const handleAprobarConsultor = () => {
    const actualizado = actualizarAprobacionEntregable(entregableId, "CONSULTOR", true);
    if (actualizado) {
      setEntregable(actualizado);
    }
  };

  const handleRechazarConsultor = () => {
    const actualizado = actualizarAprobacionEntregable(entregableId, "CONSULTOR", false);
    if (actualizado) {
      setEntregable(actualizado);
    }
  };

  const getBadgeEstado = () => {
    const estados: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      EN_PROGRESO: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-800 dark:text-blue-300",
        label: "En Progreso",
      },
      PENDIENTE_APROBACION_EMPRESA: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        text: "text-blue-800 dark:text-blue-300",
        label: "Revisión Empresa (Opcional)",
      },
      APROBADO: {
        bg: "bg-green-100 dark:bg-green-900/30",
        text: "text-green-800 dark:text-green-300",
        label: "Aprobado",
      },
      NO_APLICA: {
        bg: "bg-gray-100 dark:bg-gray-900/30",
        text: "text-gray-800 dark:text-gray-300",
        label: "No Aplica",
      },
    };

    const estado = estados[entregable.estado] || estados.EN_PROGRESO;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${estado.bg} ${estado.text}`}>
        {estado.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/consultor/proyectos/${projectId}`}
            className="text-sm text-[#28b8d5] hover:underline mb-2 inline-block"
          >
            {"<-"} Volver al Proyecto
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {entregable.nombre}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{entregable.descripcion}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getBadgeEstado()}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Etapa: <span className="font-semibold">{entregable.etapa}</span>
          </p>
        </div>
      </div>

      {/* Estado de Aprobación Dual */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-lg border border-gray-200 dark:border-white/[0.08] p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Aprobación Dual (Consultor + Empresa)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.05]">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Consultor (Tú)</p>
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  entregable.aprobacion.consultorAprobado
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <span className="font-semibold text-gray-900 dark:text-white">
                {entregable.aprobacion.consultorAprobado ? "Aprobado" : "Pendiente"}
              </span>
            </div>
            {puedeAprobar && !entregable.aprobacion.consultorAprobado && (
              <div className="flex gap-2">
                <button
                  onClick={handleAprobarConsultor}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 font-medium dark:bg-green-600 dark:hover:bg-green-700"
                >
                  Aprobar
                </button>
              </div>
            )}
            {entregable.aprobacion.consultorAprobado && (
              <button
                onClick={handleRechazarConsultor}
                className="w-full px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 font-medium dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                Desaprobar
              </button>
            )}
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.05]">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Empresa</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  entregable.aprobacion.empresaAprobado
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
              <span className="font-semibold text-gray-900 dark:text-white">
                {entregable.aprobacion.empresaAprobado ? "Aprobado" : "Pendiente"}
              </span>
            </div>
          </div>
        </div>

        {entregable.estado === "APROBADO" && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-800 dark:text-green-300">
            Este entregable ha sido aprobado por ambas partes y es inmutable.
          </div>
        )}

        {entregable.estado === "PENDIENTE_APROBACION_EMPRESA" && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
            Aprobación del Consultor completada. La revisión de Empresa es opcional y no bloquea el avance.
          </div>
        )}
      </div>

      {/* Botones de Acciones */}
      {puedeEditar && (
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarGestionPreguntas(!mostrarGestionPreguntas)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Gestionar Preguntas
          </button>
        </div>
      )}

      {/* Gestión de Preguntas (para cuestionario) */}
      {mostrarGestionPreguntas && (
        <div className="bg-white dark:bg-[#0f0f0f] rounded-lg border border-gray-200 dark:border-white/[0.08] p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Gestionar Preguntas del Cuestionario
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Aquí puedes editar preguntas, agregar nuevas, definir pesos y criterios de evaluación.
          </p>
          <button
            onClick={() => setMostrarGestionPreguntas(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Contenido */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-lg border border-gray-200 dark:border-white/[0.08] p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Contenido</h3>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {entregable.contenido}
        </p>
      </div>

      {/* Documentos */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-lg border border-gray-200 dark:border-white/[0.08] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Documentos</h3>
          {puedeSubirDocumentos && (
            <button
              onClick={() => setMostrarFormDocumento(!mostrarFormDocumento)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Subir Documento
            </button>
          )}
        </div>

        {mostrarFormDocumento && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-white/[0.05] rounded-lg border border-gray-200 dark:border-white/[0.08]">
            <input
              type="file"
              onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] || null)}
              className="w-full mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAgregarDocumento}
                disabled={!archivoSeleccionado}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 font-medium text-sm dark:bg-green-600 dark:hover:bg-green-700"
              >
                Confirmar
              </button>
              <button
                onClick={() => setMostrarFormDocumento(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {entregable.documentos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay documentos</p>
        ) : (
          <div className="space-y-2">
            {entregable.documentos.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.05] rounded-lg border border-gray-200 dark:border-white/[0.08]"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{doc.nombre}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(doc.tamano / 1024).toFixed(1)} KB - Cargado el{" "}
                    {new Date(doc.fechaCarga).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded font-medium ${
                    doc.estado === "LISTO"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                  }`}
                >
                  {doc.estado}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comentarios */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-lg border border-gray-200 dark:border-white/[0.08] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Comentarios</h3>
          <button
            onClick={() => setMostrarFormComentario(!mostrarFormComentario)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Agregar Comentario
          </button>
        </div>

        {mostrarFormComentario && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-white/[0.05] rounded-lg border border-gray-200 dark:border-white/[0.08]">
            <textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe tu comentario..."
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-900 dark:border-gray-700 dark:text-white mb-2"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAgregarComentario}
                disabled={!nuevoComentario.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 font-medium text-sm dark:bg-green-600 dark:hover:bg-green-700"
              >
                Comentar
              </button>
              <button
                onClick={() => setMostrarFormComentario(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium text-sm dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {entregable.comentarios.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay comentarios</p>
        ) : (
          <div className="space-y-3">
            {entregable.comentarios.map((com) => (
              <div key={com.id} className="p-3 bg-gray-50 dark:bg-white/[0.05] rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900 dark:text-white">{com.autor}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      com.rol === "EMPRESA"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    }`}
                  >
                    {com.rol === "EMPRESA" ? "Empresa" : "Consultor"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{com.contenido}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(com.fecha).toLocaleDateString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

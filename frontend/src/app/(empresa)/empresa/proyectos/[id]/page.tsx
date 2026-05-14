"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/lib/api/projects";
import {
  toLegacyArtifact,
  toLegacyProject,
  type LegacyArtifact as Entregable,
  type LegacyProject as Proyecto,
} from "@/lib/adapters/project.adapter";
import {
  mockCargarDocumentoContextoEmpresa,
  mockConfigDocumentosContexto,
  mockConsultarEstadoDocumentoContextoEmpresa,
  mockListarDocumentosContextoEmpresa,
  type DocumentoContexto,
} from "@/lib/mocks/documentos-contexto.mock";
import { calcularProgreso, formatearFecha } from "@/lib/utils/proyecto.utils";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import FileInput from "@/components/form/input/FileInput";

const ESTADO_BADGE: Record<
  "ACTIVO" | "EN_PAUSA",
  { color: "success" | "warning"; label: string }
> = {
  ACTIVO: { color: "success", label: "Activo" },
  EN_PAUSA: { color: "warning", label: "En pausa" },
};

const ETAPA_LABEL: Record<Entregable["etapa"], string> = {
  CUESTIONARIO: "Diagnóstico",
  AS_IS: "AS-IS",
  TO_BE: "TO-BE",
  BRECHAS: "Brechas",
  ROADMAP: "Roadmap",
};

const ESTADO_DOCUMENTO_BADGE: Record<
  DocumentoContexto["estado"],
  { color: "warning" | "success" | "error"; label: string }
> = {
  PROCESANDO: { color: "warning", label: "Procesando" },
  LISTO: { color: "success", label: "Listo" },
  ERROR: { color: "error", label: "Error" },
};

const formatearTamanoArchivo = (tamanoBytes: number): string => {
  if (tamanoBytes < 1024) return `${tamanoBytes} B`;
  if (tamanoBytes < 1024 * 1024) return `${(tamanoBytes / 1024).toFixed(1)} KB`;
  return `${(tamanoBytes / (1024 * 1024)).toFixed(1)} MB`;
};

function esCuestionarioMadurez(entregable: Entregable): boolean {
  return (
    entregable.code === "ASIS_MATURITY_QUESTIONNAIRE" ||
    entregable.nombre === "Cuestionario de Madurez"
  );
}

const mapearErrorDocumento = (error: unknown): string => {
  if (!(error instanceof Error)) return "No se pudo cargar el documento.";

  switch (error.message) {
    case "FORMATO_NO_PERMITIDO":
      return "Formato no permitido. Usa PDF, DOCX, XLSX, CSV o TXT.";
    case "ARCHIVO_SUPERA_TAMANO_MAXIMO":
      return `El archivo supera el limite de ${mockConfigDocumentosContexto.max_size_mb} MB.`;
    case "PROYECTO_NO_ACTIVO":
      return "Solo se pueden cargar documentos cuando el proyecto esta en estado Activo.";
    default:
      return "No se pudo cargar el documento. Intenta nuevamente.";
  }
};

export default function DetalleProyectoEmpresaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [todosEntregables, setTodosEntregables] = useState<Entregable[]>([]);
  const [documentosContexto, setDocumentosContexto] = useState<DocumentoContexto[]>([]);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [archivoInputKey, setArchivoInputKey] = useState(0);
  const [cargandoDocumento, setCargandoDocumento] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState<string | null>(null);
  const [mensajeDocumento, setMensajeDocumento] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [etapaActiva, setEtapaActiva] = useState<"AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP">(
    "AS_IS"
  );

  useEffect(() => {
    Promise.all([
      projectsApi.getById(id),
      mockListarDocumentosContextoEmpresa(id),
    ])
      .then(([projectDetail, documentosData]) => {
        setProyecto(toLegacyProject(projectDetail));
        setTodosEntregables(projectDetail.artifact_items.map(toLegacyArtifact));
        setDocumentosContexto(documentosData);
      })
      .catch(() => {
        router.replace("/empresa/proyectos?error=acceso_denegado");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const documentosProcesandoIds = useMemo(
    () =>
      documentosContexto
        .filter((doc) => doc.estado === "PROCESANDO")
        .map((doc) => doc.id),
    [documentosContexto]
  );

  useEffect(() => {
    if (documentosProcesandoIds.length === 0) return;

    const interval = setInterval(() => {
      Promise.all(
        documentosProcesandoIds.map((idDocumento) =>
          mockConsultarEstadoDocumentoContextoEmpresa(id, idDocumento)
        )
      )
        .then((estados) => {
          setDocumentosContexto((prev) =>
            prev.map((doc) => {
              const estado = estados.find((e) => e.id === doc.id);
              if (!estado) return doc;
              return {
                ...doc,
                estado: estado.estado,
                progreso: estado.progreso,
                fecha_actualizacion: estado.fecha_actualizacion,
              };
            })
          );
        })
        .catch(() => {
          // Silencio intencional: siguiente ciclo de polling reintenta.
        });
    }, 5000);

    return () => clearInterval(interval);
  }, [id, documentosProcesandoIds]);

  const handleArchivoSeleccionado = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0] ?? null;
    setArchivoSeleccionado(archivo);
    setErrorDocumento(null);
    setMensajeDocumento(null);
  };

  const handleCargarDocumento = async () => {
    if (!archivoSeleccionado) {
      setErrorDocumento("Selecciona un archivo antes de cargar.");
      return;
    }

    setCargandoDocumento(true);
    setErrorDocumento(null);
    setMensajeDocumento(null);

    try {
      const nuevo = await mockCargarDocumentoContextoEmpresa(id, archivoSeleccionado);
      setDocumentosContexto((prev) => [nuevo, ...prev]);
      setArchivoSeleccionado(null);
      setArchivoInputKey((prev) => prev + 1);
      setMensajeDocumento("Documento cargado. El procesamiento asincrono fue iniciado.");
    } catch (error) {
      setErrorDocumento(mapearErrorDocumento(error));
    } finally {
      setCargandoDocumento(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl animate-pulse space-y-4">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-24 w-full rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
      </div>
    );
  }

  if (!proyecto) return null;

  const progreso = calcularProgreso(
    proyecto.entregables.aprobados,
    proyecto.entregables.no_aplica
  );
  const estado = proyecto.estado as "ACTIVO" | "EN_PAUSA";
  const badge = ESTADO_BADGE[estado];

  const entregablesPorEtapa = todosEntregables.filter(
    (e) => e.etapa === etapaActiva
  );

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <Link
        href="/empresa/proyectos"
        className="text-sm text-[#28b8d5] hover:underline inline-block"
      >
        {"<-"} Volver a mis proyectos
      </Link>

      <div className="flex flex-wrap items-start gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
          {proyecto.nombre}
        </h1>
        {badge && (
          <Badge variant="light" color={badge.color} size="md">
            {badge.label}
          </Badge>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">{proyecto.descripcion}</p>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-white/70">
            Progreso general
          </span>
          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {progreso}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#28b8d5] transition-all duration-500"
            style={{ width: `${progreso}%` }}
            role="progressbar"
            aria-valuenow={progreso}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
          {proyecto.entregables.aprobados} de {proyecto.entregables.total} entregables aprobados
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25 mb-1">
            Consultor gerente
          </p>
          <p className="text-sm text-gray-800 dark:text-white/90">
            {proyecto.consultor_gerente.nombre}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25 mb-1">
            Fecha estimada de cierre
          </p>
          <p className="text-sm text-gray-800 dark:text-white/90">
            {formatearFecha(proyecto.fecha_estimada_cierre)}
          </p>
        </div>
      </div>

      {/* Tabs de Etapas */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-white/[0.08]">
        {(["AS_IS", "TO_BE", "BRECHAS", "ROADMAP"] as const).map((etapa) => (
          <button
            key={etapa}
            onClick={() => setEtapaActiva(etapa)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              etapaActiva === etapa
                ? "border-[#28b8d5] text-[#28b8d5]"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            }`}
          >
            {ETAPA_LABEL[etapa]}
          </button>
        ))}
      </div>

      {/* Entregables por Etapa */}
      <div className="space-y-3">
        {entregablesPorEtapa.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-white/[0.12] px-4 py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay entregables en esta etapa.
            </p>
          </div>
        ) : (
          entregablesPorEtapa.map((entregable) => (
            <div
              key={entregable.id}
              className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {entregable.nombre}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {entregable.descripcion}
                  </p>
                </div>
                <Badge
                  variant="light"
                  color={
                    entregable.estado === "APROBADO"
                      ? "success"
                      : entregable.estado === "PENDIENTE_APROBACION_EMPRESA"
                        ? "warning"
                        : entregable.estado === "EN_PROGRESO"
                          ? "info"
                          : entregable.estado === "NO_APLICA"
                            ? "light"
                            : "primary"
                  }
                  size="sm"
                >
                  {entregable.estado === "APROBADO"
                    ? "Aprobado"
                    : entregable.estado === "PENDIENTE_APROBACION_EMPRESA"
                      ? "Requiere tu aprobación"
                      : entregable.estado === "EN_PROGRESO"
                        ? "En Progreso"
                        : entregable.estado === "NO_APLICA"
                          ? "No Aplica"
                          : "Pendiente"}
                </Badge>
              </div>
              <div className="flex gap-2">
                {esCuestionarioMadurez(entregable) ? (
                  <Link
                    href={`/empresa/proyectos/${id}/cuestionario-madurez`}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-[#334155] bg-white text-[#0F172A] hover:bg-slate-50 transition-all duration-200 dark:bg-white/[0.07] dark:text-white/85 dark:border-white/[0.18] dark:hover:bg-white/[0.12] dark:hover:text-white"
                  >
                    Ver
                  </Link>
                ) : entregable.estado === "PENDIENTE_APROBACION_EMPRESA" ? (
                  <Link
                    href={`/empresa/proyectos/${id}/entregable/${entregable.id}`}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-all duration-200"
                  >
                    Revisar y aprobar
                  </Link>
                ) : (
                  <Link
                    href={`/empresa/proyectos/${id}/entregable/${entregable.id}`}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-[#334155] bg-white text-[#0F172A] hover:bg-slate-50 transition-all duration-200 dark:bg-white/[0.07] dark:text-white/85 dark:border-white/[0.18] dark:hover:bg-white/[0.12] dark:hover:text-white"
                  >
                    Ver Detalles
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>


    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Columns2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  HelpCircle,
  ListChecks,
  MessageSquareText,
  Scale,
  ShieldCheck,
  Target,
  Users,
  RefreshCw,
  X,
  Download,
} from "lucide-react";

import { maturityApi } from "@/lib/api/maturity";
import { projectsApi } from "@/lib/api/projects";
import { toLegacyMaturityResults, toMaturityRadarData } from "@/lib/adapters/maturity-results.adapter";
import { MaturityRadarChart } from "@/components/maturity/MaturityRadarChart";
import { MaturityResultsSummary } from "@/components/maturity/MaturityResultsSummary";
import { RichTextViewer } from "@/components/maturity/RichTextEditor";
import type {
  CuestionarioConfigResponse,
  GetResponsesResponse,
  MaturityResultsResponse,
  ResponseDTO,
} from "@/lib/types/maturity.types";
import type { ProjectArtifact } from "@/lib/types/project.types";

const QUESTIONNAIRE_ARTIFACT_CODE = "ASIS_MATURITY_QUESTIONNAIRE";

function getStatusLabel(artifact: ProjectArtifact | null): {
  label: string;
  color: string;
} {
  if (!artifact) return { label: "Cargando...", color: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-white/60" };
  if (artifact.consultant_approved)
    return { label: "Validación final del consultor completada", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
  return { label: "Validación final del consultor pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
}

function validationBadgeClass(status: string): string {
  switch (status) {
    case "APROBADA":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "RECHAZADA":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "EN_REVISION":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    default:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  }
}

interface MaturityEmpresaReadOnlyViewProps {
  projectId: string;
}

export const MaturityEmpresaReadOnlyView: React.FC<MaturityEmpresaReadOnlyViewProps> = ({
  projectId,
}) => {
  const [activeTab, setActiveTab] = useState<"results" | "responses">("results");
  const [collapsedResponses, setCollapsedResponses] = useState<Record<string, boolean>>({});
  const [selectedResponse, setSelectedResponse] = useState<ResponseDTO | null>(null);
  const [detailTab, setDetailTab] = useState<"respuesta" | "evaluacion" | "comparativa">("respuesta");
  const [config, setConfig] = useState<CuestionarioConfigResponse | null>(null);
  const [responses, setResponses] = useState<GetResponsesResponse | null>(null);
  const [results, setResults] = useState<MaturityResultsResponse | null>(null);
  const [artifact, setArtifact] = useState<ProjectArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareLink = useMemo(() => {
    if (!config?.access_code || typeof window === "undefined") return null;
    return `${window.location.origin}/diagnostico/${config.access_code}`;
  }, [config?.access_code]);

  const legacyResults = useMemo(
    () => (results ? toLegacyMaturityResults(results) : []),
    [results]
  );

  const radarData = useMemo(
    () => (results ? toMaturityRadarData(results) : []),
    [results]
  );

  const loadData = useCallback(async (showLoader: boolean) => {
    if (showLoader) setLoading(true);
    if (!showLoader) setRefreshing(true);
    setError(null);
    try {
      const [configData, responsesData, resultsData, artifactsData] = await Promise.all([
        maturityApi.getConfig(projectId),
        maturityApi.getResponses(projectId),
        maturityApi.getResultados(projectId),
        projectsApi.listArtifacts(projectId),
      ]);
      setConfig(configData);
      setResponses(responsesData);
      setResults(resultsData);
      setArtifact(
        artifactsData.find((a) => a.code === QUESTIONNAIRE_ARTIFACT_CODE) ?? null
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la vista del cuestionario.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const handleCopyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
  };

  const consultantApproved = artifact?.consultant_approved ?? false;
  const statusInfo = getStatusLabel(artifact);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-1/2 rounded-lg bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
          <div className="h-20 rounded-xl bg-gray-200 dark:bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <BarChart3 className="h-6 w-6 text-[#28b8d5]" />
              Cuestionario de Madurez
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Monitorea el estado del cuestionario y sus resultados en tiempo real. La validación final del cuestionario la realiza el consultor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                config?.is_closed
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              }`}
            >
              {config?.is_closed ? "Cuestionario cerrado" : "Cuestionario abierto"}
            </span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
        {shareLink && !config?.is_closed ? (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-white/[0.03] dark:text-white/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Enlace público:</span>
              <span className="truncate">{shareLink}</span>
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                aria-label="Copiar enlace público"
                title="Copiar enlace público"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
          <HelpCircle className="h-4 w-4 text-[#28b8d5]" />
          ¿Qué puedes hacer desde esta vista?
        </h3>
        <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-2">
          <p className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
            Ver respuestas y resultados en tiempo real.
          </p>
          <p className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
            Revisar comentarios y puntajes validados por el consultor.
          </p>
          <p className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
            Compartir el enlace público del cuestionario cuando aplique.
          </p>
        </div>
      </div>

      {!consultantApproved && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            El consultor aún está revisando y validando este cuestionario. Puedes seguir monitoreando resultados y respuestas en tiempo real.
          </p>
        </div>
      )}

      {consultantApproved && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-950/20">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            ✓ El consultor ya completó la validación final del cuestionario.
          </p>
        </div>
      )}

      <div className="sticky top-20 z-30 rounded-xl border border-gray-200 bg-white/95 p-2 backdrop-blur dark:border-white/[0.08] dark:bg-[#0f0f0f]/95">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-white/[0.12]">
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === "results"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
            }`}
          >
            <Target className="h-4 w-4" />
            Resultados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("responses")}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === "responses"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
            }`}
          >
            <Users className="h-4 w-4" />
            Respuestas
          </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <button
              type="button"
              onClick={() => void loadData(false)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 font-medium hover:bg-gray-50 dark:border-white/[0.12] dark:hover:bg-white/[0.05]"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <p className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Target className="h-4 w-4" />
            Puntaje general
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{results?.overall_score ?? 0}/5</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <p className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <BarChart3 className="h-4 w-4" />
            Nivel de madurez
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{results?.maturity_level ?? "No evaluado"}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <p className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4" />
            Respondentes
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{results?.respondent_count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <p className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="h-4 w-4" />
            Respuestas validadas
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{results?.validated_response_count ?? 0}</p>
        </div>
      </div>

      {activeTab === "results" ? (
        <>
          {results ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
              <MaturityRadarChart
                data={radarData}
                results={legacyResults}
                title="Gráfico de Araña — Evaluación de Madurez"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:bg-[#0f0f0f] dark:text-gray-400">
              Aún no hay resultados calculados.
            </div>
          )}

          {results ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
              <MaturityResultsSummary
                results={legacyResults}
                overallScore={results.overall_score}
                overallPercent={results.overall_percent}
                respondentCount={results.respondent_count}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-1.5 text-lg font-semibold text-gray-900 dark:text-white">
              <Users className="h-5 w-5 text-[#28b8d5]" />
              Respondentes ({responses?.responses.length ?? 0})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCollapsedResponses(
                    Object.fromEntries(
                      (responses?.responses ?? []).map((response) => [response.id, false])
                    )
                  )
                }
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Expandir
              </button>
              <button
                type="button"
                onClick={() =>
                  setCollapsedResponses(
                    Object.fromEntries(
                      (responses?.responses ?? []).map((response) => [response.id, true])
                    )
                  )
                }
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Minimizar
              </button>
            </div>
          </div>
          {responses?.responses.length ? (
            <div className="space-y-4">
              {responses.responses.map((response) => (
                <div
                  key={response.id}
                  onClick={() => {
                    setSelectedResponse(response);
                    setDetailTab("respuesta");
                  }}
                  className="cursor-pointer rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:hover:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {response.respondent_name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {response.respondent_email} · {response.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${validationBadgeClass(response.estado_validacion)}`}
                      >
                        {response.estado_validacion}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedResponses((prev) => ({
                            ...prev,
                            [response.id]: !prev[response.id],
                          }))
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
                      >
                        {collapsedResponses[response.id] ? (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Expandir
                          </>
                        ) : (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Minimizar
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedResponse(response);
                          setDetailTab("respuesta");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-300 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>

                  {!collapsedResponses[response.id] && (
                    <div className="mt-4 space-y-3">
                      {response.validacion_comentarios && (
                        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900/40 dark:bg-cyan-950/20">
                          <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-800 dark:text-cyan-300">
                            <MessageSquareText className="h-3.5 w-3.5" />
                            Evaluación general del consultor
                          </p>
                          <p className="text-sm text-cyan-900 dark:text-cyan-100/90">
                            {response.validacion_comentarios}
                          </p>
                        </div>
                      )}

                      {response.answers.map((answer, index) => (
                        <div
                          key={answer.id ?? `${response.id}-${index}`}
                          className="rounded-lg border border-gray-200 p-3 dark:border-white/[0.08]"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {index + 1}. {answer.question_text ?? `Pregunta ${index + 1}`}
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                            <p className="text-gray-600 dark:text-gray-400">
                              Puntaje respondente:{" "}
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {answer.respondent_score ?? answer.score}
                              </span>
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              Puntaje validado:{" "}
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {answer.validated_score ?? "Sin validar"}
                              </span>
                            </p>
                          </div>
                          {answer.validacion_comentarios && (
                            <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                              Comentario del consultor: {answer.validacion_comentarios}
                            </p>
                          )}
                          {answer.evidencia_nombre && (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <FileText className="h-3.5 w-3.5" />
                              Evidencia adjunta: {answer.evidencia_nombre}
                            </p>
                          )}
                          {answer.respondent_comentarios && (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <MessageSquareText className="h-3.5 w-3.5" />
                              Comentario del respondente disponible.
                            </p>
                          )}
                          <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Estado: {answer.estado_validacion}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
              Aún no hay respuestas registradas.
            </div>
          )}
        </div>
      )}

      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#0f0f0f]">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-white/[0.08]">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Detalle de respuesta
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedResponse.respondent_name} · {selectedResponse.respondent_email} · {selectedResponse.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/70 dark:hover:bg-white/[0.05]"
                aria-label="Cerrar detalle"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
              <div className="mb-4 inline-flex rounded-lg border border-gray-200 p-1 dark:border-white/[0.12]">
                <button
                  type="button"
                  onClick={() => setDetailTab("respuesta")}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                    detailTab === "respuesta"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Respuesta
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("evaluacion")}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                    detailTab === "evaluacion"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Evaluación
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab("comparativa")}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                    detailTab === "comparativa"
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  Comparativa
                </button>
              </div>

              {selectedResponse.validacion_comentarios && (
                <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900/40 dark:bg-cyan-950/20">
                  <p className="mb-1 text-xs font-semibold text-cyan-800 dark:text-cyan-300">
                    Evaluación general del consultor
                  </p>
                  <p className="text-sm text-cyan-900 dark:text-cyan-100/90">
                    {selectedResponse.validacion_comentarios}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {selectedResponse.answers.map((answer, index) => (
                  <div
                    key={answer.id ?? `${selectedResponse.id}-${index}`}
                    className="rounded-lg border border-gray-200 p-4 dark:border-white/[0.08]"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {index + 1}. {answer.question_text ?? `Pregunta ${index + 1}`}
                    </p>
                    {detailTab === "respuesta" ? (
                      <>
                        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                          <p className="text-gray-600 dark:text-gray-400">
                            Respuesta del cuestionado:{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {answer.respondent_score ?? answer.score}
                            </span>
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            Estado de validación:{" "}
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${validationBadgeClass(answer.estado_validacion)}`}>
                              {answer.estado_validacion}
                            </span>
                          </p>
                        </div>
                        {answer.respondent_comentarios && (
                          <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                            Comentario del cuestionado: {answer.respondent_comentarios}
                          </p>
                        )}
                        {answer.evidencia_url && (
                          <a
                            href={answer.evidencia_url}
                            target="_blank"
                            rel="noreferrer"
                            download={answer.evidencia_nombre ?? undefined}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Descargar evidencia{answer.evidencia_nombre ? `: ${answer.evidencia_nombre}` : ""}
                          </a>
                        )}
                      </>
                    ) : detailTab === "evaluacion" ? (
                      <>
                        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                          <p className="text-gray-600 dark:text-gray-400">
                            Evaluación del consultor:{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {answer.validated_score ?? "Sin validar"}
                            </span>
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            Estado de validación:{" "}
                            <span className={`rounded-full px-2 py-0.5 font-semibold ${validationBadgeClass(answer.estado_validacion)}`}>
                              {answer.estado_validacion}
                            </span>
                          </p>
                        </div>
                        {answer.validacion_comentarios && (
                          <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                            <p className="mb-1 font-medium">Comentario del consultor:</p>
                            <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
                              <RichTextViewer html={answer.validacion_comentarios} />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                          <p className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1.5 text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-semibold">Cuestionado:</span>{" "}
                            {answer.respondent_score ?? answer.score}
                          </p>
                          <p className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1.5 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span className="font-semibold">Consultor:</span>{" "}
                            {answer.validated_score ?? "Sin validar"}
                          </p>
                        </div>
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Scale className="h-3.5 w-3.5" />
                          Diferencia:{" "}
                          <span className="font-semibold">
                            {answer.validated_score === null
                              ? "Pendiente de validación"
                              : Math.abs((answer.respondent_score ?? answer.score) - answer.validated_score)}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          Estado:{" "}
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${validationBadgeClass(answer.estado_validacion)}`}>
                            {answer.estado_validacion}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

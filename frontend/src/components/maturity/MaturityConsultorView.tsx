"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Layers,
  Lock,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from "lucide-react";

import { maturityApi } from "@/lib/api/maturity";
import { projectsApi } from "@/lib/api/projects";
import { toLegacyMaturityResults, toMaturityRadarData } from "@/lib/adapters/maturity-results.adapter";
import { getScoreColor } from "@/lib/maturity/scoring";
import { MaturityRadarChart } from "@/components/maturity/MaturityRadarChart";
import { MaturityResultsSummary } from "@/components/maturity/MaturityResultsSummary";
import { RichTextEditor, RichTextViewer } from "@/components/maturity/RichTextEditor";
import type {
  CuestionarioConfigResponse,
  GetResponsesResponse,
  MaturityResultsResponse,
  QuestionDTO,
  ResponseDTO,
} from "@/lib/types/maturity.types";
import type { ProjectArtifact } from "@/lib/types/project.types";

interface MaturityConsultorViewProps {
  projectId: string;
}

type ValidationDraftState = Record<
  string,
  {
    validatedScore: string;
    comments: string;
  }
>;

type QuestionnaireTemplateSelection = Record<string, boolean>;
type QuestionDraftMap = Record<
  string,
  {
    text: string;
    weight: string;
    applicable_roles: string[];
    score_criteria: Array<{ score: number; name: string; description: string }>;
  }
>;
type DimensionWeightDraftMap = Record<number, string>;
type CustomRoleMap = Record<string, string>;
type CustomRoleDescriptionMap = Record<string, string>;
type ScoreCriteriaDraftMap = Record<number, { name: string; description: string }>;
type PendingTabChange = "results" | "responses" | "template" | null;

function getStatusBadgeClass(status: string): string {
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

function StatusBadge({ status }: { status: string }) {
  const icons: Record<string, React.ReactNode> = {
    APROBADA: <CheckCircle2 className="h-3 w-3" />,
    RECHAZADA: <Ban className="h-3 w-3" />,
    EN_REVISION: <Clock className="h-3 w-3" />,
    PENDIENTE: <Clock className="h-3 w-3" />,
  };
  const icon = icons[status] ?? <Clock className="h-3 w-3" />;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}>
      {icon}
      {status}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveQuestionCriteria(
  questionId: string,
  config: CuestionarioConfigResponse | null
): Array<{ score: number; name: string; description: string }> {
  const allQuestions = config?.template_questions ?? config?.questions ?? [];
  const question = allQuestions.find((q) => q.id === questionId);
  if (question?.score_criteria && question.score_criteria.length >= 2) {
    return [...question.score_criteria].sort((a, b) => a.score - b.score);
  }
  if (config?.score_criteria && config.score_criteria.length >= 2) {
    return [...config.score_criteria].sort((a, b) => a.score - b.score);
  }
  return DEFAULT_SCORE_CRITERIA;
}

function buildQuestionDrafts(questions: QuestionDTO[]): QuestionDraftMap {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        text: question.text,
        weight: `${question.weight}`,
        applicable_roles: [...question.applicable_roles],
        score_criteria: (question.score_criteria && question.score_criteria.length
          ? [...question.score_criteria]
          : [...DEFAULT_SCORE_CRITERIA]
        ).sort((left, right) => left.score - right.score),
      },
    ])
  );
}

function normalizeRoleId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function roleLabelFromId(roleId: string): string {
  return roleId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function nextCriteriaScore(criteria: Array<{ score: number }>): number {
  if (!criteria.length) return 0;
  return Math.max(...criteria.map((item) => item.score)) + 1;
}

function normalizeQuestionText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function questionMatchKey(question: {
  dimension_id: number;
  subdomain_id: number;
  text: string;
}): string {
  return `${question.dimension_id}|${question.subdomain_id}|${normalizeQuestionText(question.text)}`;
}

function buildSelectionFromConfig(
  templateQuestions: Array<{
    id: string;
    dimension_id: number;
    subdomain_id: number;
    text: string;
  }>,
  activeQuestions: Array<{
    id: string;
    dimension_id: number;
    subdomain_id: number;
    text: string;
  }>
): Record<string, boolean> {
  const activeById = new Set(activeQuestions.map((question) => question.id));
  const activeByKey = new Set(activeQuestions.map((question) => questionMatchKey(question)));
  return Object.fromEntries(
    templateQuestions.map((question) => [
      question.id,
      activeById.has(question.id) || activeByKey.has(questionMatchKey(question)),
    ])
  );
}

const DEFAULT_SCORE_CRITERIA: Array<{ score: number; name: string; description: string }> = [
  { score: 0, name: "Inexistente", description: "No existe evidencia de la práctica o capacidad evaluada." },
  { score: 1, name: "Inicial", description: "Existe de forma ad hoc, sin estandarización ni repetibilidad." },
  { score: 2, name: "Básico", description: "Hay prácticas parciales con aplicación limitada." },
  { score: 3, name: "Definido", description: "La práctica está definida y aplicada de manera consistente." },
  { score: 4, name: "Gestionado", description: "Está formalizada, medida y gobernada activamente." },
  { score: 5, name: "Optimizado", description: "Se mejora de forma continua con evidencia transversal." },
];

const QUESTIONNAIRE_ARTIFACT_CODE = "ASIS_MATURITY_QUESTIONNAIRE";

function getApiErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (axios.isAxiosError(error)) {
    const responseError = error.response?.data as
      | { error?: { message?: string } }
      | undefined;
    if (responseError?.error?.message) {
      return responseError.error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function InfoHint({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/[0.16] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.08]"
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-6 top-1/2 z-20 w-72 -translate-y-1/2 rounded-md border border-gray-200 bg-white p-2 text-[11px] text-gray-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-white/[0.12] dark:bg-[#151515] dark:text-gray-300"
      >
        {text}
      </span>
    </span>
  );
}

function buildScoreCriteriaDraft(
  criteria?: Array<{ score: number; name: string; description: string }>
): ScoreCriteriaDraftMap {
  const source = criteria && criteria.length ? criteria : DEFAULT_SCORE_CRITERIA;
  return Object.fromEntries(
    source.map((item) => [
      item.score,
      {
        name: item.name,
        description: item.description,
      },
    ])
  ) as ScoreCriteriaDraftMap;
}

export const MaturityConsultorView: React.FC<MaturityConsultorViewProps> = ({
  projectId,
}) => {
  const [config, setConfig] = useState<CuestionarioConfigResponse | null>(null);
  const [responses, setResponses] = useState<GetResponsesResponse | null>(null);
  const [results, setResults] = useState<MaturityResultsResponse | null>(null);
  const [questionnaireArtifact, setQuestionnaireArtifact] = useState<ProjectArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationDrafts, setValidationDrafts] = useState<ValidationDraftState>({});
  const [selectionDraft, setSelectionDraft] = useState<QuestionnaireTemplateSelection>({});
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraftMap>({});
  const [dimensionWeightDrafts, setDimensionWeightDrafts] = useState<DimensionWeightDraftMap>({});
  const [customRoles, setCustomRoles] = useState<CustomRoleMap>({});
  const [customRoleDescriptions, setCustomRoleDescriptions] = useState<CustomRoleDescriptionMap>({});
  const [editingCustomRoleIds, setEditingCustomRoleIds] = useState<Record<string, boolean>>({});
  const [editingQuestionCriteriaByKey, setEditingQuestionCriteriaByKey] = useState<Record<string, boolean>>({});
  const [scoreCriteriaDrafts, setScoreCriteriaDrafts] = useState<ScoreCriteriaDraftMap>(
    buildScoreCriteriaDraft()
  );
  const [editingDefaultScaleByScore, setEditingDefaultScaleByScore] = useState<Record<number, boolean>>({});
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [templateTab, setTemplateTab] = useState<"domains" | "roles" | "criteria">("domains");
  const [domainFilter, setDomainFilter] = useState("");
  const [onlyActiveDomains, setOnlyActiveDomains] = useState(false);
  const [expandedDomainIds, setExpandedDomainIds] = useState<number[]>([]);
  const [responseSearch, setResponseSearch] = useState("");
  const [responseStatusFilter, setResponseStatusFilter] = useState<"all" | "pending" | "finalized" | "annulled">("all");
  const [activeTab, setActiveTab] = useState<"results" | "responses" | "template">("results");
  const [collapsedResponses, setCollapsedResponses] = useState<Record<string, boolean>>({});
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [annulModal, setAnnulModal] = useState<{ responseId: string; reason: string } | null>(null);
  const [finalizeModal, setFinalizeModal] = useState<{
    responseId: string;
    respondentName: string;
    answerCount: number;
  } | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ title: string; message: string } | null>(null);
  const [pendingTabChange, setPendingTabChange] = useState<PendingTabChange>(null);
  const [baselineTemplateSnapshot, setBaselineTemplateSnapshot] = useState<string>("");

  const shareLink = useMemo(() => {
    if (!config?.access_code || typeof window === "undefined") {
      return null;
    }
    return `${window.location.origin}/diagnostico/${config.access_code}`;
  }, [config?.access_code]);

  const roleNameMap = useMemo(() => {
    const map = new Map((config?.roles ?? []).map((role) => [role.id, role.name]));
    Object.entries(customRoles).forEach(([roleId, roleName]) => {
      map.set(roleId, roleName);
    });
    Object.values(questionDrafts).forEach((draft) => {
      draft.applicable_roles.forEach((roleId) => {
        if (!map.has(roleId)) {
          map.set(roleId, roleLabelFromId(roleId));
        }
      });
    });
    return map;
  }, [config?.roles, customRoles, questionDrafts]);

  const roleOptions = useMemo(
    () =>
      Array.from(roleNameMap.entries()).map(([id, name]) => {
        const apiRole = (config?.roles ?? []).find((r) => r.id === id);
        return {
          id,
          name,
          description: customRoleDescriptions[id] ?? apiRole?.description ?? name,
          is_system: apiRole ? apiRole.is_system !== false : false,
        };
      }),
    [roleNameMap, customRoleDescriptions, config?.roles]
  );

  const legacyResults = useMemo(
    () => (results ? toLegacyMaturityResults(results) : []),
    [results]
  );

  const radarData = useMemo(
    () => (results ? toMaturityRadarData(results) : []),
    [results]
  );

  const templateQuestionsByDimension = useMemo(() => {
    const baseQuestions = config?.template_questions ?? config?.questions ?? [];
    if (!config?.dimensions?.length || !baseQuestions.length) {
      return [];
    }

    return config.dimensions.map((dimension) => ({
      ...dimension,
      questions: baseQuestions.filter(
        (question) => question.dimension_id === dimension.id
      ).map((question) => ({
        ...question,
        text: questionDrafts[question.id]?.text ?? question.text,
        weight: Number.parseFloat(questionDrafts[question.id]?.weight ?? `${question.weight}`),
        applicable_roles: questionDrafts[question.id]?.applicable_roles ?? question.applicable_roles,
        score_criteria: questionDrafts[question.id]?.score_criteria ?? question.score_criteria ?? DEFAULT_SCORE_CRITERIA,
      })),
    }));
  }, [config?.dimensions, config?.template_questions, config?.questions, questionDrafts]);

  const currentTemplateSnapshot = useMemo(
    () =>
      JSON.stringify({
        selectionDraft,
        questionDrafts,
        dimensionWeightDrafts,
        customRoles,
        customRoleDescriptions,
        scoreCriteriaDrafts,
      }),
    [
      selectionDraft,
      questionDrafts,
      dimensionWeightDrafts,
      customRoles,
      customRoleDescriptions,
      scoreCriteriaDrafts,
    ]
  );

  const hasUnsavedTemplateChanges =
    activeTab === "template" &&
    baselineTemplateSnapshot.length > 0 &&
    currentTemplateSnapshot !== baselineTemplateSnapshot;

  const filteredTemplateDimensions = useMemo(() => {
    const normalizedFilter = domainFilter.trim().toLowerCase();
    return templateQuestionsByDimension.filter((dimension) => {
      const hasFilterMatch =
        !normalizedFilter ||
        dimension.name.toLowerCase().includes(normalizedFilter) ||
        dimension.questions.some((question) => question.text.toLowerCase().includes(normalizedFilter));
      if (!hasFilterMatch) {
        return false;
      }
      if (!onlyActiveDomains) {
        return true;
      }
      return dimension.questions.some((question) => selectionDraft[question.id]);
    });
  }, [templateQuestionsByDimension, domainFilter, onlyActiveDomains, selectionDraft]);

  useEffect(() => {
    const visibleIds = new Set(filteredTemplateDimensions.map((dimension) => dimension.id));
    setExpandedDomainIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredTemplateDimensions]);

  const loadData = async (showLoader: boolean) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
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
      setCollapsedResponses((prev) => {
        const next: Record<string, boolean> = {};
        for (const response of responsesData.responses ?? []) {
          next[response.id] = prev[response.id] ?? false;
        }
        return next;
      });
      setResults(resultsData);
      setQuestionnaireArtifact(
        artifactsData.find((artifact) => artifact.code === QUESTIONNAIRE_ARTIFACT_CODE) ?? null
      );
      const templateQuestions = configData.template_questions ?? configData.questions;
      setSelectionDraft(buildSelectionFromConfig(templateQuestions, configData.questions));
      setQuestionDrafts(buildQuestionDrafts(templateQuestions));
      setDimensionWeightDrafts(
        Object.fromEntries(configData.dimensions.map((dimension) => [dimension.id, `${dimension.weight}`]))
      );
      const catalogRoleIds = new Set(
        (configData.roles ?? [])
          .filter((role) => role.is_system !== false)
          .map((role) => role.id)
      );
      const discoveredCustomRoles: CustomRoleMap = {};
      const discoveredCustomRoleDescriptions: CustomRoleDescriptionMap = {};
      for (const role of configData.roles ?? []) {
        if (role.is_system === false) {
          discoveredCustomRoles[role.id] = role.name;
          discoveredCustomRoleDescriptions[role.id] = role.description;
        }
      }
      templateQuestions.forEach((question) => {
        question.applicable_roles.forEach((roleId) => {
          if (!catalogRoleIds.has(roleId)) {
            discoveredCustomRoles[roleId] = discoveredCustomRoles[roleId] ?? roleLabelFromId(roleId);
            discoveredCustomRoleDescriptions[roleId] = discoveredCustomRoleDescriptions[roleId] ?? roleLabelFromId(roleId);
          }
        });
      });
      setCustomRoles(discoveredCustomRoles);
      setCustomRoleDescriptions(discoveredCustomRoleDescriptions);
      setScoreCriteriaDrafts(buildScoreCriteriaDraft(configData.score_criteria));
      setBaselineTemplateSnapshot(
        JSON.stringify({
          selectionDraft: buildSelectionFromConfig(templateQuestions, configData.questions),
          questionDrafts: buildQuestionDrafts(templateQuestions),
          dimensionWeightDrafts: Object.fromEntries(
            configData.dimensions.map((dimension) => [dimension.id, `${dimension.weight}`])
          ),
          customRoles: discoveredCustomRoles,
          customRoleDescriptions: discoveredCustomRoleDescriptions,
          scoreCriteriaDrafts: buildScoreCriteriaDraft(configData.score_criteria),
        })
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el cuestionario.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData(true);
  }, [projectId]);

  useEffect(() => {
    if (!editingTemplate) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditingTemplate(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingTemplate]);

  const handleToggleClosed = async () => {
    if (!config) return;
    setBusyKey("toggle");
    try {
      await maturityApi.updateEstado(projectId, !config.is_closed);
      await loadData(false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleApproveQuestionnaire = async () => {
    if (!questionnaireArtifact) {
      setError("No se encontro el artefacto del cuestionario para registrar la aprobacion.");
      return;
    }
    if (!canApproveQuestionnaire) {
      return;
    }
    setBusyKey("approve");
    setError(null);
    try {
      await projectsApi.reviewArtifactConsultant(projectId, questionnaireArtifact.id, {
        approved: true,
      });
      await loadData(false);
    } finally {
      setBusyKey(null);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
  };

  const handleAnulateResponse = async (responseId: string, reason: string) => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError("Debes indicar el motivo de anulación.");
      return;
    }
    setBusyKey(`anular-${responseId}`);
    try {
      await maturityApi.anularResponse(responseId, { reason: normalizedReason });
      await loadData(false);
      setAnnulModal(null);
    } finally {
      setBusyKey(null);
    }
  };

  const handleReactivateResponse = async (responseId: string) => {
    setBusyKey(`reactivar-${responseId}`);
    try {
      await maturityApi.reactivarResponse(responseId);
      await loadData(false);
    } finally {
      setBusyKey(null);
    }
  };

  const buildAnswerDraftPayload = (
    response: ResponseDTO,
    answer: NonNullable<ResponseDTO["answers"]>[number]
  ) => {
    if (!answer.id) return;
    const draftKey = `${response.id}:${answer.id}`;
    const draft = validationDrafts[draftKey] ?? {
      validatedScore: answer.validated_score?.toString() ?? answer.respondent_score?.toString() ?? answer.score.toString(),
      comments: answer.validacion_comentarios ?? "",
    };
    const parsedScore = Number.parseInt(draft.validatedScore || `${answer.score}`, 10);
    if (!Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 5) {
      setError("El puntaje validado debe estar entre 0 y 5.");
      return null;
    }
    return {
      answerId: answer.id,
      payload: {
        validacion_comentarios: draft.comments || undefined,
        validated_score: parsedScore,
      } as const,
    };
  };

  const handleSaveDraftResponse = async (response: ResponseDTO) => {
    if (response.estado_validacion === "APROBADA") {
      return;
    }
    setError(null);
    setBusyKey(`save-draft-${response.id}`);
    try {
      for (const answer of response.answers) {
        const draftPayload = buildAnswerDraftPayload(response, answer);
        if (!draftPayload) {
          return;
        }
        await maturityApi.validateAnswer(response.id, draftPayload.answerId, draftPayload.payload);
      }
      await loadData(false);
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          "No se pudo guardar el borrador de evaluacion."
        )
      );
    } finally {
      setBusyKey(null);
    }
  };


  const handleFinalizeEvaluation = async (responseId: string) => {
    setBusyKey(`finalize-${responseId}`);
    try {
      const response = responses?.responses.find((item) => item.id === responseId);
      if (response && response.estado_validacion !== "APROBADA") {
        for (const answer of response.answers) {
          const draftPayload = buildAnswerDraftPayload(response, answer);
          if (!draftPayload) {
            return;
          }
          await maturityApi.validateAnswer(response.id, draftPayload.answerId, draftPayload.payload);
        }
      }
      await maturityApi.finalizeEvaluation(responseId, { confirmation: true });
      setFinalizeModal(null);
      await loadData(false);
    } catch (finalizeError) {
      setError(
        getApiErrorMessage(
          finalizeError,
          "No se pudo finalizar la evaluacion de esta respuesta."
        )
      );
    } finally {
      setBusyKey(null);
    }
  };

  const filteredResponses = useMemo(() => {
    const source = responses?.responses ?? [];
    const query = responseSearch.trim().toLowerCase();
    return source.filter((response) => {
      const matchesQuery =
        !query ||
        response.respondent_name.toLowerCase().includes(query) ||
        response.respondent_email.toLowerCase().includes(query) ||
        response.role.toLowerCase().includes(query);
      if (!matchesQuery) {
        return false;
      }
      if (responseStatusFilter === "all") {
        return true;
      }
      if (responseStatusFilter === "annulled") {
        return response.status !== "active";
      }
      if (responseStatusFilter === "finalized") {
        return response.status === "active" && response.estado_validacion === "APROBADA";
      }
      return response.status === "active" && response.estado_validacion !== "APROBADA";
    });
  }, [responses?.responses, responseSearch, responseStatusFilter]);

  const statusCounts = useMemo(() => {
    const source = responses?.responses ?? [];
    return {
      all: source.length,
      pending: source.filter((response) => response.status === "active" && response.estado_validacion !== "APROBADA").length,
      finalized: source.filter((response) => response.status === "active" && response.estado_validacion === "APROBADA").length,
      annulled: source.filter((response) => response.status !== "active").length,
    };
  }, [responses?.responses]);

  const visibleCounts = useMemo(() => {
    return {
      all: filteredResponses.length,
      pending: filteredResponses.filter((response) => response.status === "active" && response.estado_validacion !== "APROBADA").length,
      finalized: filteredResponses.filter((response) => response.status === "active" && response.estado_validacion === "APROBADA").length,
      annulled: filteredResponses.filter((response) => response.status !== "active").length,
    };
  }, [filteredResponses]);

  const canApproveQuestionnaire = useMemo(() => {
    if (!config || questionnaireArtifact?.consultant_approved) {
      return false;
    }
    const activeCount = responses?.active ?? 0;
    const pendingCount = responses?.pendientes_validacion ?? 0;
    return activeCount > 0 && pendingCount === 0;
  }, [config, questionnaireArtifact?.consultant_approved, responses?.active, responses?.pendientes_validacion]);

  const approveDisabledReason = useMemo(() => {
    if (!config || questionnaireArtifact?.consultant_approved || canApproveQuestionnaire) {
      return null;
    }
    const activeCount = responses?.active ?? 0;
    const pendingCount = responses?.pendientes_validacion ?? 0;
    if (activeCount === 0) {
      return "Debes tener al menos una respuesta activa para aprobar el cuestionario.";
    }
    if (pendingCount > 0) {
      return `Faltan ${pendingCount} respuestas por finalizar evaluacion.`;
    }
    return "No se puede aprobar el cuestionario todavia.";
  }, [canApproveQuestionnaire, config, questionnaireArtifact?.consultant_approved, responses?.active, responses?.pendientes_validacion]);

  const isConsultantApproved = questionnaireArtifact?.consultant_approved ?? false;

  const handleToggleTemplateQuestion = (questionId: string) => {
    setSelectionDraft((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleQuestionDraftChange = (
    questionId: string,
    field: "text" | "weight",
    value: string
  ) => {
    setQuestionDrafts((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? { text: "", weight: "1", applicable_roles: [], score_criteria: [...DEFAULT_SCORE_CRITERIA] }),
        [field]: value,
      },
    }));
  };

  const handleToggleQuestionRole = (questionId: string, roleId: string) => {
    setQuestionDrafts((prev) => {
      const draft = prev[questionId] ?? { text: "", weight: "1", applicable_roles: [], score_criteria: [...DEFAULT_SCORE_CRITERIA] };
      const alreadySelected = draft.applicable_roles.includes(roleId);
      return {
        ...prev,
        [questionId]: {
          ...draft,
          applicable_roles: alreadySelected
            ? draft.applicable_roles.filter((id) => id !== roleId)
            : [...draft.applicable_roles, roleId],
        },
      };
    });
  };

  const handleQuestionScoreCriteriaChange = (
    questionId: string,
    score: number,
    field: "name" | "description",
    value: string
  ) => {
    setQuestionDrafts((prev) => {
      const draft = prev[questionId] ?? {
        text: "",
        weight: "1",
        applicable_roles: [],
        score_criteria: [...DEFAULT_SCORE_CRITERIA],
      };
      const nextCriteria = (draft.score_criteria.length ? draft.score_criteria : DEFAULT_SCORE_CRITERIA).map((item) =>
        item.score === score ? { ...item, [field]: value } : item
      );
      return {
        ...prev,
        [questionId]: {
          ...draft,
          score_criteria: nextCriteria,
        },
      };
    });
  };

  const handleAddQuestionScoreCriteria = (questionId: string) => {
    setQuestionDrafts((prev) => {
      const draft = prev[questionId] ?? {
        text: "",
        weight: "1",
        applicable_roles: [],
        score_criteria: [...DEFAULT_SCORE_CRITERIA],
      };
      const baseCriteria = draft.score_criteria.length ? draft.score_criteria : DEFAULT_SCORE_CRITERIA;
      const nextScore = nextCriteriaScore(baseCriteria);
      return {
        ...prev,
        [questionId]: {
          ...draft,
          score_criteria: [
            ...baseCriteria,
            {
              score: nextScore,
              name: `Nivel ${nextScore}`,
              description: "Describe este nivel de madurez.",
            },
          ],
        },
      };
    });
  };

  const handleDeleteQuestionScoreCriteria = (questionId: string, score: number) => {
    setQuestionDrafts((prev) => {
      const draft = prev[questionId] ?? {
        text: "",
        weight: "1",
        applicable_roles: [],
        score_criteria: [...DEFAULT_SCORE_CRITERIA],
      };
      const baseCriteria = draft.score_criteria.length ? draft.score_criteria : DEFAULT_SCORE_CRITERIA;
      if (baseCriteria.length <= 2) {
        setError("Cada pregunta debe tener al menos 2 niveles de criterio.");
        return prev;
      }
      const nextCriteria = baseCriteria.filter((item) => item.score !== score);
      return {
        ...prev,
        [questionId]: {
          ...draft,
          score_criteria: nextCriteria,
        },
      };
    });
  };

  const handleDimensionWeightChange = (dimensionId: number, value: string) => {
    setDimensionWeightDrafts((prev) => ({
      ...prev,
      [dimensionId]: value,
    }));
  };

  const handleAddCustomRole = () => {
    const normalizedId = normalizeRoleId(newRoleId || newRoleName);
    const normalizedName = newRoleName.trim() || roleLabelFromId(normalizedId);
    const normalizedDescription = newRoleDescription.trim() || normalizedName;

    if (!normalizedId) {
      setError("Define un identificador o nombre para el rol.");
      return;
    }
    if (roleNameMap.has(normalizedId)) {
      setError("Ese rol ya existe.");
      return;
    }

    setCustomRoles((prev) => ({
      ...prev,
      [normalizedId]: normalizedName,
    }));
    setCustomRoleDescriptions((prev) => ({
      ...prev,
      [normalizedId]: normalizedDescription,
    }));
    setNewRoleId("");
    setNewRoleName("");
    setNewRoleDescription("");
    setError(null);
  };

  const handleUpdateCustomRole = (
    roleId: string,
    field: "name" | "description",
    value: string
  ) => {
    if (field === "name") {
      setCustomRoles((prev) => ({
        ...prev,
        [roleId]: value,
      }));
      return;
    }
    setCustomRoleDescriptions((prev) => ({
      ...prev,
      [roleId]: value,
    }));
  };

  const handleDeleteCustomRole = (roleId: string) => {
    setCustomRoles((prev) => {
      const next = { ...prev };
      delete next[roleId];
      return next;
    });
    setCustomRoleDescriptions((prev) => {
      const next = { ...prev };
      delete next[roleId];
      return next;
    });
    setQuestionDrafts((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([questionId, draft]) => [
          questionId,
          {
            ...draft,
            applicable_roles: draft.applicable_roles.filter((role) => role !== roleId),
          },
        ])
      )
    );
    setEditingCustomRoleIds((prev) => {
      const next = { ...prev };
      delete next[roleId];
      return next;
    });
  };

  const handleScoreCriteriaChange = (
    score: number,
    field: "name" | "description",
    value: string
  ) => {
    setScoreCriteriaDrafts((prev) => ({
      ...prev,
      [score]: {
        ...(prev[score] ?? { name: "", description: "" }),
        [field]: value,
      },
    }));
  };

  const handleResetScoreCriteria = () => {
    setScoreCriteriaDrafts(buildScoreCriteriaDraft(config?.score_criteria));
    setEditingDefaultScaleByScore({});
  };

  const handleToggleDomainExpanded = (dimensionId: number) => {
    setExpandedDomainIds((prev) =>
      prev.includes(dimensionId)
        ? prev.filter((id) => id !== dimensionId)
        : [...prev, dimensionId]
    );
  };

  const handleResetTemplateSelection = () => {
    if (!config) return;
    const templateQuestions = config.template_questions ?? config.questions;
    setSelectionDraft(buildSelectionFromConfig(templateQuestions, config.questions));
    setQuestionDrafts(buildQuestionDrafts(templateQuestions));
    setDimensionWeightDrafts(
      Object.fromEntries(config.dimensions.map((dimension) => [dimension.id, `${dimension.weight}`]))
    );
    const restoredCustomRoles: CustomRoleMap = {};
    const restoredCustomRoleDescriptions: CustomRoleDescriptionMap = {};
    for (const role of config.roles ?? []) {
      if (role.is_system === false) {
        restoredCustomRoles[role.id] = role.name;
        restoredCustomRoleDescriptions[role.id] = role.description;
      }
    }
    setCustomRoles(restoredCustomRoles);
    setCustomRoleDescriptions(restoredCustomRoleDescriptions);
    setScoreCriteriaDrafts(buildScoreCriteriaDraft(config.score_criteria));
    setEditingQuestionCriteriaByKey({});
    setDomainFilter("");
    setOnlyActiveDomains(false);
    setExpandedDomainIds([]);
    setBaselineTemplateSnapshot(
      JSON.stringify({
        selectionDraft: buildSelectionFromConfig(templateQuestions, config.questions),
        questionDrafts: buildQuestionDrafts(templateQuestions),
        dimensionWeightDrafts: Object.fromEntries(
          config.dimensions.map((dimension) => [dimension.id, `${dimension.weight}`])
        ),
        customRoles: restoredCustomRoles,
        customRoleDescriptions: restoredCustomRoleDescriptions,
        scoreCriteriaDrafts: buildScoreCriteriaDraft(config.score_criteria),
      })
    );
  };

  const handleSaveTemplate = async (): Promise<boolean> => {
    if (!config) return false;
    const baseQuestions = config?.template_questions ?? config?.questions ?? [];
    if (!baseQuestions.length) return false;
    const systemRoles = (config.roles ?? []).filter((role) => role.is_system !== false);
    const customRoleEntries = Object.entries(customRoles).map(([id, name]) => ({
      id: normalizeRoleId(id),
      name: name.trim(),
      description: (customRoleDescriptions[id] ?? name).trim(),
    }));
    const invalidCustomRole = customRoleEntries.find(
      (role) => !role.id || role.name.length < 2 || role.description.length < 2
    );
    if (invalidCustomRole) {
      setError("Cada rol debe tener id, nombre y descripcion validos.");
      return false;
    }
    const rolePayload = [
      ...systemRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      })),
      ...customRoleEntries,
    ];
    const allowedRoleIds = new Set(rolePayload.map((role) => role.id));

    const selectedQuestions = baseQuestions
      .filter((question) => selectionDraft[question.id])
      .map((question) => {
        const draft = questionDrafts[question.id] ?? {
          text: question.text,
          weight: `${question.weight}`,
          applicable_roles: question.applicable_roles,
          score_criteria: question.score_criteria && question.score_criteria.length
            ? question.score_criteria
            : [...DEFAULT_SCORE_CRITERIA],
        };
        return {
          dimension_id: question.dimension_id,
          subdomain_id: question.subdomain_id,
          text: draft.text.trim(),
          applicable_roles: draft.applicable_roles.map((role) => role.trim()).filter(Boolean),
          weight: Number.parseFloat(draft.weight),
          score_criteria: [...draft.score_criteria]
            .sort((left, right) => left.score - right.score)
            .map((item) => ({
              score: item.score,
              name: item.name.trim(),
              description: item.description.trim(),
            })),
        };
      });

    if (!selectedQuestions.length) {
      setSaveNotice({
        title: "Plantilla incompleta",
        message:
          "Debes incluir al menos una pregunta activa para publicar el cuestionario.",
      });
      return false;
    }

    const invalidQuestion = selectedQuestions.find(
      (question) =>
        !question.text ||
        question.text.length < 5 ||
        !Number.isFinite(question.weight) ||
        question.weight <= 0 ||
        question.weight > 5 ||
        question.applicable_roles.length === 0 ||
        question.applicable_roles.some((role) => !allowedRoleIds.has(role)) ||
        question.score_criteria.length < 2 ||
        new Set(question.score_criteria.map((item) => item.score)).size !== question.score_criteria.length ||
        question.score_criteria.some((item) => item.name.length < 2 || item.description.length < 5)
    );
    if (invalidQuestion) {
      setSaveNotice({
        title: "Revisión requerida",
        message:
          "Revisa las preguntas activas: cada una debe tener texto válido, peso, roles y al menos 2 criterios con puntajes únicos.",
      });
      return false;
    }

    const dimensionWeights = Object.fromEntries(
      config.dimensions.map((dimension) => [
        dimension.id,
        Number.parseFloat(dimensionWeightDrafts[dimension.id] ?? `${dimension.weight}`),
      ])
    ) as Record<number, number>;

    const hasInvalidDimensionWeight = Object.values(dimensionWeights).some(
      (value) => !Number.isFinite(value) || value <= 0 || value > 5
    );
    if (hasInvalidDimensionWeight) {
      setSaveNotice({
        title: "Peso inválido",
        message: "Cada dimensión debe tener un peso entre 0.1 y 5.0.",
      });
      return false;
    }

    const scoreCriteriaPayload = [0, 1, 2, 3, 4, 5].map((score) => ({
      score,
      name: (scoreCriteriaDrafts[score]?.name ?? "").trim(),
      description: (scoreCriteriaDrafts[score]?.description ?? "").trim(),
    }));
    const invalidScoreCriteria = scoreCriteriaPayload.find(
      (item) => item.name.length < 2 || item.description.length < 5
    );
    if (invalidScoreCriteria) {
      setSaveNotice({
        title: "Escala por defecto incompleta",
        message:
          "Cada criterio de la escala por defecto debe tener nombre (mínimo 2 caracteres) y descripción (mínimo 5).",
      });
      return false;
    }

    const normalizeQuestions = (
      questions: Array<{
        dimension_id: number;
        subdomain_id: number;
        text: string;
        applicable_roles: string[];
        weight: number;
        score_criteria: Array<{ score: number; name: string; description: string }>;
      }>
    ) =>
      questions
        .map((question) => ({
          dimension_id: question.dimension_id,
          subdomain_id: question.subdomain_id,
          text: question.text.trim(),
          applicable_roles: [...question.applicable_roles].sort(),
          weight: Number(question.weight.toFixed(4)),
          score_criteria: [...question.score_criteria]
            .map((item) => ({
              score: item.score,
              name: item.name.trim(),
              description: item.description.trim(),
            }))
            .sort((left, right) => left.score - right.score),
        }))
        .sort((left, right) =>
          `${left.dimension_id}-${left.subdomain_id}-${left.text}`.localeCompare(
            `${right.dimension_id}-${right.subdomain_id}-${right.text}`
          )
        );

    const normalizeRoles = (
      roles: Array<{ id: string; name: string; description: string }>
    ) =>
      roles
        .map((role) => ({
          id: role.id.trim(),
          name: role.name.trim(),
          description: role.description.trim(),
        }))
        .sort((left, right) => left.id.localeCompare(right.id));

    const normalizeScoreCriteria = (
      criteria: Array<{ score: number; name: string; description: string }>
    ) =>
      criteria
        .map((item) => ({
          score: item.score,
          name: item.name.trim(),
          description: item.description.trim(),
        }))
        .sort((left, right) => left.score - right.score);

    const currentQuestions = normalizeQuestions(
      (config.questions ?? []).map((question) => ({
        dimension_id: question.dimension_id,
        subdomain_id: question.subdomain_id,
        text: question.text,
        applicable_roles: question.applicable_roles,
        weight: Number(question.weight),
        score_criteria:
          question.score_criteria && question.score_criteria.length
            ? question.score_criteria
            : scoreCriteriaPayload,
      }))
    );
    const nextQuestions = normalizeQuestions(selectedQuestions);

    const currentDimensionWeights = Object.fromEntries(
      (config.dimensions ?? []).map((dimension) => [
        dimension.id,
        Number(Number(dimension.weight).toFixed(4)),
      ])
    );
    const nextDimensionWeights = Object.fromEntries(
      Object.entries(dimensionWeights).map(([id, weight]) => [
        Number(id),
        Number(Number(weight).toFixed(4)),
      ])
    );

    const currentRoles = normalizeRoles(
      (config.roles ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
      }))
    );
    const nextRoles = normalizeRoles(rolePayload);

    const currentDefaultCriteria = normalizeScoreCriteria(
      (config.score_criteria ?? []).length ? config.score_criteria ?? [] : scoreCriteriaPayload
    );
    const nextDefaultCriteria = normalizeScoreCriteria(scoreCriteriaPayload);

    const hasNoChanges =
      JSON.stringify(currentQuestions) === JSON.stringify(nextQuestions) &&
      JSON.stringify(currentDimensionWeights) === JSON.stringify(nextDimensionWeights) &&
      JSON.stringify(currentRoles) === JSON.stringify(nextRoles) &&
      JSON.stringify(currentDefaultCriteria) === JSON.stringify(nextDefaultCriteria);

    if (hasNoChanges) {
      return true;
    }

    setBusyKey("save-template");
    setError(null);
    try {
      await maturityApi.updateConfig(projectId, {
        questions: selectedQuestions,
        dimension_weights: dimensionWeights,
        roles: rolePayload,
        score_criteria: scoreCriteriaPayload,
      });
      setEditingTemplate(false);
      await loadData(false);
      setBaselineTemplateSnapshot(currentTemplateSnapshot);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la plantilla.");
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const handleTabChange = (targetTab: "results" | "responses" | "template") => {
    if (targetTab === activeTab) {
      return;
    }
    if (activeTab === "template" && hasUnsavedTemplateChanges) {
      setPendingTabChange(targetTab);
      return;
    }
    if (targetTab === "template") {
      handleResetTemplateSelection();
    }
    setActiveTab(targetTab);
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Cargando cuestionario...</div>;
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
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cuestionario de Madurez</h2>
              <InfoHint
                label="Ayuda de esta vista"
                text="Desde aquí gestionas el enlace público, bloqueas nuevos envíos, validas respuestas y apruebas el cuestionario cuando ya no hay pendientes."
              />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Revisa respuestas, valida evidencias y monitorea los resultados actuales del AS-IS.
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              Preguntas configuradas: {config?.questions.length ?? 0}
              <InfoHint
                label="Ayuda sobre preguntas configuradas"
                text="Este valor corresponde al total de preguntas activas de la plantilla del proyecto. Puedes editarlo en la pestaña Editar plantilla."
              />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          </div>
        </div>
        {isConsultantApproved ? (
          <p className="mt-3 text-xs text-green-700 dark:text-green-300">
            Cuestionario aprobado por consultor. Edición y enlace público bloqueados.
          </p>
        ) : null}
        {shareLink && !isConsultantApproved && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-white/[0.03] dark:text-white/60">
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Estado de recepción</span>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  config?.is_closed
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }`}
              >
                {config?.is_closed ? "Bloqueado: no acepta respuestas" : "Abierto: acepta respuestas"}
              </span>
              <InfoHint
                label="Ayuda sobre estado de recepción"
                text="Bloquear nuevas respuestas no elimina respuestas existentes. Solo impide que se envíen nuevos formularios desde el enlace público."
              />
              <button
                onClick={() => void handleToggleClosed()}
                disabled={busyKey === "toggle"}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                {config?.is_closed ? "Permitir nuevas respuestas" : "Bloquear nuevas respuestas"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              Bloquear no elimina respuestas existentes; solo impide nuevos envíos.
            </p>
          </div>
        )}
      </div>

      {activeTab === "template" ? (
        <div className="sticky top-20 z-30 rounded-xl border border-gray-200 bg-white/95 p-2 backdrop-blur dark:border-white/[0.08] dark:bg-[#0f0f0f]/95">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-white/[0.12]">
              <button
                type="button"
                onClick={() => handleTabChange("results")}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Resultados
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("responses")}
                className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Respuestas
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Editar plantilla
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === "template" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Puntaje general
            </div>
            <p className="mt-2 text-2xl font-bold leading-none" style={{ color: getScoreColor(results?.overall_score ?? 0) }}>
              {(results?.overall_score ?? 0).toFixed(2)}<span className="text-sm font-normal text-gray-400">/5</span>
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Target className="h-3.5 w-3.5" />
              Nivel de madurez
            </div>
            <p className="mt-2 text-base font-bold text-gray-900 dark:text-white leading-tight">{results?.maturity_level ?? "No evaluado"}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Users className="h-3.5 w-3.5" />
              Respondentes
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{results?.respondent_count ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <UserCheck className="h-3.5 w-3.5" />
              Validadas
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{results?.validated_response_count ?? 0}</p>
          </div>
        </div>
      ) : null}

      {config && activeTab === "template" && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#0f0f0f]">

          {/* ── Cabecera sticky del editor ── */}
          <div className="sticky top-20 z-10 rounded-t-2xl border-b border-gray-200 bg-white/95 backdrop-blur dark:border-white/[0.08] dark:bg-[#0f0f0f]/95">
            {/* Título + acciones */}
            <div className="flex flex-col gap-3 px-6 pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Editor de plantilla del cuestionario
                  </h3>
                  <InfoHint
                    label="Ayuda del editor de plantilla"
                    text="Los cambios de plantilla afectan qué preguntas responde el usuario final y cómo se calcula el puntaje de madurez del proyecto."
                  />
                  {hasUnsavedTemplateChanges && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Sin guardar
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Preguntas activas:{" "}
                    <strong className="text-gray-700 dark:text-white/80">
                      {Object.values(selectionDraft).filter(Boolean).length}
                    </strong>
                    /{config.template_questions?.length ?? config.questions.length}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pb-1">
                <button
                  onClick={handleResetTemplateSelection}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
                  title="Descartar cambios y volver al estado guardado"
                  aria-label="Restablecer plantilla"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restablecer
                </button>
                <button
                  onClick={() => void handleSaveTemplate()}
                  disabled={busyKey === "save-template"}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e293b] disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                  title="Guardar todos los cambios de la plantilla"
                  aria-label="Guardar plantilla"
                >
                  <Save className="h-3.5 w-3.5" />
                  {busyKey === "save-template" ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>

            {/* Sub-tabs con íconos */}
            <div className="flex gap-0 overflow-x-auto px-6 pb-0 pt-3">
              {(
                [
                  { key: "domains", label: "Dominios y preguntas", icon: <Layers className="h-3.5 w-3.5" /> },
                  { key: "roles",   label: "Roles",                icon: <Users className="h-3.5 w-3.5" /> },
                  { key: "criteria",label: "Escala por defecto",   icon: <Sliders className="h-3.5 w-3.5" /> },
                ] as const
              ).map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTemplateTab(key)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                    templateTab === key
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-white/50 dark:hover:border-white/20 dark:hover:text-white/80"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

            <div className="p-6">

              {templateTab === "roles" ? (
                <div className="mt-4 space-y-5">

                  {/* Crear rol */}
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Nuevo rol personalizado</h4>
                      <InfoHint label="Ayuda sobre roles" text="Los roles personalizados amplían los roles base del sistema. Puedes asignarlos a preguntas específicas del cuestionario." />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Nombre visible</label>
                        <input
                          type="text"
                          value={newRoleName}
                          onChange={(event) => setNewRoleName(event.target.value)}
                          placeholder="ej. Data Product Owner"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Descripción breve</label>
                        <input
                          type="text"
                          value={newRoleDescription}
                          onChange={(event) => setNewRoleDescription(event.target.value)}
                          placeholder="ej. Responsable del producto de datos"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                          ID técnico
                          <InfoHint label="ID técnico" text="Identificador interno único. Si lo dejas vacío se genera automáticamente a partir del nombre." />
                        </label>
                        <input
                          type="text"
                          value={newRoleId}
                          onChange={(event) => setNewRoleId(event.target.value)}
                          placeholder="ej. data-product-owner"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddCustomRole}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 md:w-auto"
                          title="Agregar rol"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Listado de roles */}
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Roles del cuestionario
                    </h4>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Los roles del sistema no pueden editarse ni eliminarse.
                    </p>

                    {/* Cabeceras */}
                    <div className="mt-3 hidden grid-cols-[1fr_1fr_auto] gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 md:grid">
                      <span>Nombre</span>
                      <span>Descripción</span>
                      <span className="text-right">Acciones</span>
                    </div>

                    <div className="mt-1 space-y-2">
                      {roleOptions.map((role) => (
                        (() => {
                          const isEditing = Boolean(editingCustomRoleIds[role.id]);
                          return (
                        <div
                          key={role.id}
                          className={`grid grid-cols-1 gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto] ${
                            role.is_system
                              ? "border-gray-200 bg-gray-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]"
                              : "border-gray-200 dark:border-white/[0.08]"
                          }`}
                        >
                          {/* Nombre */}
                          <div className="space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-white/30 md:hidden">Nombre</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={customRoles[role.id] ?? role.name}
                                onChange={(event) => handleUpdateCustomRole(role.id, "name", event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {role.is_system ? role.name : (customRoles[role.id] ?? role.name)}
                                </span>
                                {role.is_system && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-white/[0.08] dark:text-white/40">
                                    <Lock className="h-2.5 w-2.5" />
                                    Sistema
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Descripción */}
                          <div className="space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-white/30 md:hidden">Descripción</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={customRoleDescriptions[role.id] ?? role.description}
                                onChange={(event) => handleUpdateCustomRole(role.id, "description", event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                              />
                            ) : (
                              <span className="text-sm text-gray-600 dark:text-white/60">
                                {role.is_system ? role.description : (customRoleDescriptions[role.id] ?? role.description)}
                              </span>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center justify-between gap-2 md:justify-end">
                            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-500 dark:bg-white/[0.06] dark:text-white/50">
                              <Tag className="h-2.5 w-2.5" />
                              {role.id}
                            </span>
                            {!role.is_system && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingCustomRoleIds((prev) => ({ ...prev, [role.id]: !prev[role.id] }))}
                                  className="rounded-lg border border-blue-300 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                                  title={isEditing ? "Confirmar edición" : "Editar rol"}
                                >
                                  {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomRole(role.id)}
                                  className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-950/20"
                                  title="Eliminar rol"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                          );
                        })()
                      ))}
                    </div>
                  </div>
                </div>
              ) : templateTab === "criteria" ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Escala de evaluación por defecto</h4>
                          <InfoHint
                            label="¿Cuándo se usa esta escala?"
                            text="Esta escala se aplica a las preguntas que no tienen una escala propia definida. Si una pregunta define su propia escala en la pestaña Dominios, esa tiene prioridad sobre esta."
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Define los niveles de madurez que el consultor usará para evaluar las respuestas.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetScoreCriteria}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
                        title="Restablecer a la escala original del sistema"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restablecer escala
                      </button>
                    </div>

                    {/* Cabeceras de columna */}
                    <div className="mt-4 hidden grid-cols-[72px_200px_1fr_40px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 md:grid">
                      <span className="text-center">Nivel</span>
                      <span>Nombre</span>
                      <span>Descripción</span>
                      <span />
                    </div>

                    <div className="mt-1 space-y-2">
                      {[0, 1, 2, 3, 4, 5].map((score) => (
                        (() => {
                          const isEditing = Boolean(editingDefaultScaleByScore[score]);
                          return (
                        <div
                          key={`criteria-${score}`}
                          className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-[72px_200px_1fr_40px] dark:border-white/[0.08]"
                        >
                          <div className="flex items-center justify-center rounded-lg bg-blue-50 px-2 py-2 text-sm font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            {score}
                          </div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={scoreCriteriaDrafts[score]?.name ?? ""}
                              onChange={(event) => handleScoreCriteriaChange(score, "name", event.target.value)}
                              placeholder="Nombre del nivel"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                            />
                          ) : (
                            <div className="flex items-center text-sm font-medium text-gray-800 dark:text-white/80">
                              {scoreCriteriaDrafts[score]?.name ?? "—"}
                            </div>
                          )}
                          {isEditing ? (
                            <input
                              type="text"
                              value={scoreCriteriaDrafts[score]?.description ?? ""}
                              onChange={(event) => handleScoreCriteriaChange(score, "description", event.target.value)}
                              placeholder="Descripción del criterio"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                            />
                          ) : (
                            <div className="flex items-center text-sm text-gray-600 dark:text-white/60">
                              {scoreCriteriaDrafts[score]?.description ?? "—"}
                            </div>
                          )}
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingDefaultScaleByScore((prev) => ({ ...prev, [score]: !prev[score] }))}
                              className="rounded-lg border border-blue-300 p-1.5 text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                              title={isEditing ? "Confirmar edición" : "Editar nivel"}
                            >
                              {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                          );
                        })()
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  {/* Barra de filtros */}
                  <div className="rounded-xl border border-gray-200 p-3 dark:border-white/[0.08]">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Búsqueda */}
                      <div className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={domainFilter}
                          onChange={(event) => setDomainFilter(event.target.value)}
                          placeholder="Filtrar dominios o preguntas..."
                          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                        />
                      </div>
                      {/* Toggle solo activos */}
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]">
                        <input
                          type="checkbox"
                          checked={onlyActiveDomains}
                          onChange={(event) => setOnlyActiveDomains(event.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                        />
                        Solo dominios con activas
                      </label>
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 dark:text-white/30">
                          {filteredTemplateDimensions.length} dominios
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedDomainIds(filteredTemplateDimensions.map((d) => d.id))}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                          Expandir todo
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedDomainIds([])}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                          Compactar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    {filteredTemplateDimensions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:text-gray-400">
                        No hay dominios que coincidan con el filtro actual.
                      </div>
                    ) : null}
                    {filteredTemplateDimensions.map((dimension) => {
                      const activeInDomain = dimension.questions.filter((q) => Boolean(selectionDraft[q.id])).length;
                      const isExpanded = expandedDomainIds.includes(dimension.id);
                      return (
                  <div
                    key={dimension.id}
                    className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]"
                  >
                    {/* Cabecera del dominio */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{dimension.name}</h4>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{dimension.description}</p>
                      </div>
                      {/* Peso del dominio */}
                      <div className="flex shrink-0 items-end gap-2">
                        <div className="w-36">
                          <label className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            Peso del dominio
                            <InfoHint label="Peso del dominio" text="Influye en cuánto contribuye este dominio al puntaje global de madurez. Rango: 0.1 a 5.0." />
                          </label>
                          <input
                            type="number"
                            min={0.1}
                            max={5}
                            step={0.01}
                            value={dimensionWeightDrafts[dimension.id] ?? `${dimension.weight}`}
                            onChange={(event) => handleDimensionWeightChange(dimension.id, event.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Resumen + acciones */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{dimension.questions.length} preguntas</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                          activeInDomain > 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                            : "bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-white/40"
                        }`}>
                          {activeInDomain}/{dimension.questions.length} activas
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleDomainExpanded(dimension.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
                      >
                        {isExpanded
                          ? <><ChevronUp className="h-3.5 w-3.5" /> Ocultar preguntas</>
                          : <><ChevronRight className="h-3.5 w-3.5" /> Ver preguntas</>}
                      </button>
                    </div>
                    {isExpanded ? (
                    <div className="mt-3 space-y-3">
                      {dimension.questions.map((question) => {
                        const isActive = Boolean(selectionDraft[question.id]);
                        const questionCriteria = (questionDrafts[question.id]?.score_criteria ?? question.score_criteria ?? DEFAULT_SCORE_CRITERIA)
                          .slice().sort((a, b) => a.score - b.score);
                        return (
                        <div
                          key={question.id}
                          className={`rounded-lg border p-4 transition-colors ${
                            isActive
                              ? "border-blue-200 bg-blue-50/30 dark:border-blue-400/20 dark:bg-blue-900/5"
                              : "border-gray-200 dark:border-white/[0.08]"
                          }`}
                        >
                          {/* Fila de activación */}
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleTemplateQuestion(question.id)}
                              className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition-colors ${
                                isActive
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-gray-300 bg-gray-200 dark:border-white/20 dark:bg-white/10"
                              }`}
                              role="switch"
                              aria-checked={isActive}
                              title={isActive ? "Desactivar: no se mostrará en el cuestionario" : "Activar: se mostrará en el cuestionario"}
                            >
                              <span className={`h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-3.5" : "translate-x-0.5"}`} />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-semibold ${isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-400 dark:text-white/30"}`}>
                                  {isActive ? "Activa — se mostrará al respondente" : "Inactiva — no aparecerá en el cuestionario"}
                                </span>
                                <InfoHint
                                  label="Activar / desactivar pregunta"
                                  text="Solo las preguntas activas aparecen en el formulario público que responden los participantes del proyecto."
                                />
                              </div>
                            </div>
                          </div>

                          {/* Texto de la pregunta */}
                          <div className="mt-3">
                            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                              Texto de la pregunta
                            </label>
                            <textarea
                              rows={2}
                              value={questionDrafts[question.id]?.text ?? question.text}
                              onChange={(event) => handleQuestionDraftChange(question.id, "text", event.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                            />
                          </div>

                          {/* Peso + roles */}
                          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[130px_1fr]">
                            <div>
                              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                Peso de la pregunta
                                <InfoHint label="Peso de la pregunta" text="Influye en cuánto pondera esta pregunta dentro del dominio. Rango: 0.1 a 5.0." />
                              </label>
                              <input
                                type="number"
                                min={0.1}
                                max={5}
                                step={0.1}
                                value={questionDrafts[question.id]?.weight ?? `${question.weight}`}
                                onChange={(event) => handleQuestionDraftChange(question.id, "weight", event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                Roles que ven esta pregunta
                                <InfoHint label="Roles aplicables" text="Solo los participantes con estos roles verán esta pregunta en el cuestionario." />
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {roleOptions.map((roleOption) => {
                                  const selected = (questionDrafts[question.id]?.applicable_roles ?? []).includes(roleOption.id);
                                  return (
                                    <button
                                      key={roleOption.id}
                                      type="button"
                                      onClick={() => handleToggleQuestionRole(question.id, roleOption.id)}
                                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                        selected
                                          ? "border-blue-400 bg-blue-100 text-blue-800 dark:border-blue-400/40 dark:bg-blue-900/40 dark:text-blue-300"
                                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-transparent dark:text-white/50 dark:hover:border-white/20"
                                      }`}
                                    >
                                      {roleNameMap.get(roleOption.id) ?? roleOption.id}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Escala propia de la pregunta */}
                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between">
                              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                Escala de evaluación propia
                                <InfoHint label="Escala propia de la pregunta" text="Si defines una escala aquí, tiene prioridad sobre la escala por defecto del cuestionario. Deja los criterios del sistema si no necesitas personalizar." />
                                <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-white/[0.06] dark:text-white/40">
                                  {questionCriteria.length} niveles
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAddQuestionScoreCriteria(question.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                                title="Agregar nuevo nivel a la escala de esta pregunta"
                              >
                                <Plus className="h-3 w-3" />
                                Agregar nivel
                              </button>
                            </div>

                            {/* Cabeceras de la tabla de criterios */}
                            <div className="hidden grid-cols-[52px_150px_1fr_72px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 md:grid">
                              <span className="text-center">Nv.</span>
                              <span>Nombre</span>
                              <span>Descripción</span>
                              <span />
                            </div>

                            <div className="mt-1 space-y-1.5">
                              {questionCriteria.map((item) => {
                                const editKey = `${question.id}:${item.score}`;
                                const isEditing = Boolean(editingQuestionCriteriaByKey[editKey]);
                                return (
                                  <div
                                    key={`${question.id}-crit-${item.score}`}
                                    className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-2 md:grid-cols-[52px_150px_1fr_72px] dark:border-white/[0.08]"
                                  >
                                    {/* Score */}
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min={0}
                                        value={item.score}
                                        onChange={(event) => {
                                          const rawValue = Number.parseInt(event.target.value, 10);
                                          if (!Number.isFinite(rawValue) || rawValue < 0) return;
                                          setQuestionDrafts((prev) => {
                                            const draft = prev[question.id] ?? { text: "", weight: "1", applicable_roles: [], score_criteria: [...DEFAULT_SCORE_CRITERIA] };
                                            const source = draft.score_criteria.length ? draft.score_criteria : DEFAULT_SCORE_CRITERIA;
                                            if (source.some((e) => e.score === rawValue && e.score !== item.score)) return prev;
                                            return { ...prev, [question.id]: { ...draft, score_criteria: source.map((e) => e.score === item.score ? { ...e, score: rawValue } : e) } };
                                          });
                                        }}
                                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-center text-xs dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                        {item.score}
                                      </div>
                                    )}
                                    {/* Nombre */}
                                    {isEditing ? (
                                      <input type="text" value={item.name}
                                        onChange={(e) => handleQuestionScoreCriteriaChange(question.id, item.score, "name", e.target.value)}
                                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white" />
                                    ) : (
                                      <span className="flex items-center text-xs font-medium text-gray-800 dark:text-white/80">{item.name}</span>
                                    )}
                                    {/* Descripción */}
                                    {isEditing ? (
                                      <input type="text" value={item.description}
                                        onChange={(e) => handleQuestionScoreCriteriaChange(question.id, item.score, "description", e.target.value)}
                                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white" />
                                    ) : (
                                      <span className="flex items-center text-xs text-gray-600 dark:text-white/60">{item.description}</span>
                                    )}
                                    {/* Acciones */}
                                    <div className="flex items-center justify-end gap-1">
                                      <button type="button"
                                        onClick={() => setEditingQuestionCriteriaByKey((prev) => ({ ...prev, [editKey]: !prev[editKey] }))}
                                        className="rounded border border-blue-300 p-1.5 text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                                        title={isEditing ? "Confirmar" : "Editar nivel"}>
                                        {isEditing ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                                      </button>
                                      <button type="button"
                                        onClick={() => handleDeleteQuestionScoreCriteria(question.id, item.score)}
                                        className="rounded border border-red-300 p-1.5 text-red-700 hover:bg-red-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-950/20"
                                        title="Quitar nivel">
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    ) : null}
                  </div>
                  );
                })}
                  </div>
                </div>
              )}
            </div>
        </div>
      )}

      {activeTab !== "template" ? (
      <div className="sticky top-20 z-30 rounded-xl border border-gray-200 bg-white/95 p-2 backdrop-blur dark:border-white/[0.08] dark:bg-[#0f0f0f]/95">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 dark:border-white/[0.12]">
          <button
            type="button"
            onClick={() => handleTabChange("results")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === "results"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
            }`}
          >
            Resultados
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("responses")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === "responses"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/[0.05]"
            }`}
          >
            Respuestas
          </button>
          <button
            type="button"
            onClick={() => {
              handleTabChange("template");
            }}
            disabled={isConsultantApproved}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              (activeTab as string) === "template"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-white/80 dark:hover:bg-white/[0.05]"
            }`}
          >
            Editar plantilla
          </button>
        </div>
      </div>
      ) : null}

      {activeTab !== "template" ? (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-3.5 w-3.5" />
            Puntaje general
          </div>
          <p className="mt-2 text-2xl font-bold leading-none" style={{ color: getScoreColor(results?.overall_score ?? 0) }}>
            {(results?.overall_score ?? 0).toFixed(2)}<span className="text-sm font-normal text-gray-400">/5</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Target className="h-3.5 w-3.5" />
            Nivel de madurez
          </div>
          <p className="mt-2 text-base font-bold leading-tight text-gray-900 dark:text-white">{results?.maturity_level ?? "No evaluado"}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Users className="h-3.5 w-3.5" />
            Respondentes
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{results?.respondent_count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <UserCheck className="h-3.5 w-3.5" />
            Validadas
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{results?.validated_response_count ?? 0}</p>
        </div>
      </div>
      ) : null}

      {activeTab === "results" ? (
        <>
          {results ? (
            <MaturityRadarChart
              data={radarData}
              results={legacyResults}
              title="Evaluación de Madurez — Vista General"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-white/[0.12] dark:bg-[#0f0f0f] dark:text-gray-400">
              Aún no hay resultados calculados. Valida respuestas para generar el puntaje.
            </div>
          )}

          {results ? (
            <MaturityResultsSummary
              results={legacyResults}
              overallScore={results.overall_score}
              overallPercent={results.overall_percent}
              respondentCount={results.respondent_count}
            />
          ) : null}
        </>
      ) : activeTab === "responses" ? (
      <div className="space-y-4">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Respuestas ({responses?.total ?? 0})
            </h3>
            <InfoHint
              label="Ayuda sobre respuestas"
              text="Activas: respuestas en evaluación. Anuladas: excluidas del cálculo final. Pendientes: respuestas activas que aún no tienen estado APROBADA."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void loadData(false)}
              disabled={refreshing}
              title="Recargar respuestas desde el servidor"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              onClick={() => void handleApproveQuestionnaire()}
              disabled={busyKey === "approve" || !canApproveQuestionnaire}
              title="Cierra el cuestionario definitivamente. Solo disponible cuando todas las respuestas activas están finalizadas."
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                questionnaireArtifact?.consultant_approved
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-400/30 dark:text-green-300 dark:hover:bg-green-950/20"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {questionnaireArtifact?.consultant_approved
                ? "Cuestionario aprobado"
                : busyKey === "approve"
                  ? "Aprobando..."
                  : "Aprobar cuestionario"}
            </button>
          </div>
        </div>

        {/* ── Stats chips ── */}
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <Users className="h-3.5 w-3.5" />
            Activas: {responses?.active ?? 0}
            <InfoHint label="Qué son las activas" text="Respuestas que están siendo evaluadas. Se incluyen en el cálculo de resultados." />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-300">
            <Ban className="h-3.5 w-3.5" />
            Anuladas: {responses?.anuladas ?? 0}
            <InfoHint label="Qué son las anuladas" text="Respuestas excluidas del cálculo. Pueden reactivarse si fue un error." />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5" />
            Pendientes de validación: {responses?.pendientes_validacion ?? 0}
            <InfoHint label="Qué son las pendientes" text="Respuestas activas que aún no alcanzaron el estado APROBADA. Debes finalizarlas antes de aprobar el cuestionario." />
          </div>
        </div>

        {/* ── Aviso de estado ── */}
        {!isConsultantApproved && approveDisabledReason ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{approveDisabledReason}</span>
          </div>
        ) : null}
        {isConsultantApproved ? (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Aprobación final aplicada: edición y enlace público bloqueados.</span>
          </div>
        ) : null}

        {/* ── Barra de filtros sticky ── */}
        <div className="sticky top-20 z-20 space-y-3 rounded-xl border border-gray-200 bg-white/95 p-3 backdrop-blur dark:border-white/[0.08] dark:bg-[#0f0f0f]/95">
          <div className="flex flex-wrap items-center gap-2">
            <InfoHint
              label="Ayuda sobre filtros"
              text="Filtra las respuestas por estado para revisarlas antes de aprobar el cuestionario. Revisa primero las Pendientes."
            />
            <button
              type="button"
              onClick={() => setResponseStatusFilter("all")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                responseStatusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/80"
              }`}
            >
              <Users className="h-3 w-3" />
              Todos ({statusCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setResponseStatusFilter("pending")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                responseStatusFilter === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/80"
              }`}
            >
              <Clock className="h-3 w-3" />
              Pendientes ({statusCounts.pending})
            </button>
            <button
              type="button"
              onClick={() => setResponseStatusFilter("finalized")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                responseStatusFilter === "finalized"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/80"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Finalizadas ({statusCounts.finalized})
            </button>
            <button
              type="button"
              onClick={() => setResponseStatusFilter("annulled")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                responseStatusFilter === "annulled"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/80"
              }`}
            >
              <Ban className="h-3 w-3" />
              Anuladas ({statusCounts.annulled})
            </button>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              Mostrando {visibleCounts.all} de {statusCounts.all}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={responseSearch}
                onChange={(event) => setResponseSearch(event.target.value)}
                placeholder="Buscar por nombre, email o rol..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setCollapsedResponses(
                  Object.fromEntries((responses?.responses ?? []).map((response) => [response.id, false]))
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
            >
              <ChevronDown className="h-4 w-4" />
              Expandir todo
            </button>
            <button
              type="button"
              onClick={() =>
                setCollapsedResponses(
                  Object.fromEntries((responses?.responses ?? []).map((response) => [response.id, true]))
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
            >
              <ChevronUp className="h-4 w-4" />
              Minimizar todo
            </button>
          </div>
        </div>

        {/* ── Lista de respuestas ── */}
        {filteredResponses.length ? (
          filteredResponses.map((response) => {
            const evaluatedAnswers = response.answers.filter((answer) => {
              const answerId = answer.id ?? answer.question_id;
              const draftKey = `${response.id}:${answerId}`;
              const draft = validationDrafts[draftKey];
              return answer.validated_score !== null || Boolean(draft);
            }).length;
            const totalAnswers = response.answers.length || 1;
            const evaluationPercent = Math.round((evaluatedAnswers / totalAnswers) * 100);

            return (
            <div
              key={response.id}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#0f0f0f]"
            >
              {/* Cabecera de respondente */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0 text-gray-400" />
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {response.respondent_name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span>{response.respondent_email}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Rol: <span className="font-medium">{response.role}</span>
                  </p>
                  {/* Barra de progreso de evaluación */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Progreso de evaluación:
                      </p>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {evaluatedAnswers}/{response.answers.length} ({evaluationPercent}%)
                      </span>
                      <InfoHint
                        label="Progreso de evaluación"
                        text="Indica cuántas respuestas de este respondente ya tienen un puntaje validado asignado por el consultor."
                      />
                    </div>
                    <div className="h-2 w-56 overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          evaluationPercent === 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${evaluationPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={response.estado_validacion} />
                  {response.status === "active" ? (
                    <>
                      {response.estado_validacion !== "APROBADA" ? (
                        <>
                          <button
                            onClick={() => void handleSaveDraftResponse(response)}
                            disabled={busyKey === `save-draft-${response.id}`}
                            title="Guarda los puntajes y comentarios ingresados sin finalizar la evaluación. Puedes seguir editando después."
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-400/30 dark:text-indigo-300 dark:hover:bg-indigo-950/20"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {busyKey === `save-draft-${response.id}` ? "Guardando..." : "Guardar borrador"}
                          </button>
                          <button
                            onClick={() => {
                              setError(null);
                              setFinalizeModal({
                                responseId: response.id,
                                respondentName: response.respondent_name,
                                answerCount: response.answers.length,
                              });
                            }}
                            disabled={busyKey === `finalize-${response.id}`}
                            title="Finaliza la evaluación de esta respuesta específica. Bloquea la edición de sus puntajes."
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Finalizar evaluación de respuesta
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Evaluación finalizada
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setError(null);
                          setAnnulModal({ responseId: response.id, reason: "" });
                        }}
                        disabled={busyKey === `anular-${response.id}`}
                        title="Excluye esta respuesta del cálculo de resultados. Deberás indicar el motivo. Puede reactivarse después."
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-950/20"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Anular
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => void handleReactivateResponse(response.id)}
                      disabled={busyKey === `reactivar-${response.id}`}
                      title="Vuelve a incluir esta respuesta en el cálculo de resultados."
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 dark:border-green-400/30 dark:text-green-300 dark:hover:bg-green-950/20"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reactivar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedResponses((prev) => ({
                        ...prev,
                        [response.id]: !prev[response.id],
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
                  >
                    {collapsedResponses[response.id]
                      ? <><ChevronDown className="h-3.5 w-3.5" /> Expandir</>
                      : <><ChevronUp className="h-3.5 w-3.5" /> Minimizar</>}
                  </button>
                </div>
              </div>

              {/* Preguntas y respuestas */}
              {!collapsedResponses[response.id] ? (
              <div className="mt-4 space-y-4">
                {response.answers.map((answer, index) => {
                  const isFinalized = response.estado_validacion === "APROBADA";
                  const draftKey = `${response.id}:${answer.id ?? answer.question_id}`;
                  const draft = validationDrafts[draftKey] ?? {
                    validatedScore:
                      answer.validated_score?.toString() ??
                      answer.respondent_score?.toString() ??
                      answer.score.toString(),
                    comments: answer.validacion_comentarios ?? "",
                  };

                  return (
                    <div
                      key={answer.id ?? answer.question_id}
                      className="rounded-lg border border-gray-200 p-4 dark:border-white/[0.08]"
                    >
                      {/* Encabezado de la pregunta */}
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-white/[0.12] dark:text-white/70">
                              {index + 1}
                            </span>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {answer.question_text ?? `ID: ${answer.question_id}`}
                            </p>
                          </div>
                          {answer.question_text ? (
                            <p className="mt-1 pl-7 text-[11px] text-gray-400 dark:text-gray-500">
                              ID: {answer.question_id}
                            </p>
                          ) : null}
                          <div className="mt-1.5 flex items-center gap-1.5 pl-7 text-xs text-gray-500 dark:text-gray-400">
                            <span>Puntaje del respondente:</span>
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700 dark:bg-white/[0.08] dark:text-gray-300">
                              {answer.respondent_score ?? answer.score}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={answer.estado_validacion} />
                      </div>

                      {/* Evidencia */}
                      {answer.evidencia_nombre && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                          <div className="min-w-0 flex-1 text-xs text-gray-600 dark:text-white/60">
                            <p className="truncate font-medium text-gray-800 dark:text-white/80">
                              {answer.evidencia_nombre}
                            </p>
                            <p className="mt-0.5 text-gray-500">
                              {answer.evidencia_tipo ?? "archivo"}
                              {answer.evidencia_size
                                ? ` · ${formatFileSize(answer.evidencia_size)}`
                                : ""}
                            </p>
                          </div>
                          {answer.evidencia_url && (
                            <a
                              href={answer.evidencia_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir archivo de evidencia en nueva pestaña"
                              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir
                            </a>
                          )}
                        </div>
                      )}

                      {/* Comentarios del respondente */}
                      {answer.respondent_comentarios ? (
                        <div className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                          <label className="flex items-center gap-1 text-xs font-medium text-amber-900 dark:text-amber-200">
                            Comentarios del respondente
                            <InfoHint
                              label="Comentarios del respondente"
                              text="Contexto adicional enviado por quien respondió el cuestionario. Úsalo como apoyo para validar evidencia y puntaje."
                            />
                          </label>
                          <div className="rounded-lg border border-amber-200/70 bg-white px-3 py-2 dark:border-amber-900/30 dark:bg-black/10">
                            <RichTextViewer html={answer.respondent_comentarios} />
                          </div>
                        </div>
                      ) : null}

                      {/* Puntaje validado — selector de criterios de la escala */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Puntaje validado
                          </p>
                          <InfoHint
                            label="Puntaje validado"
                            text="Selecciona el nivel que el consultor asigna a esta respuesta según la escala definida para la pregunta. Si difiere del puntaje del respondente, este valor tiene prioridad en el cálculo final."
                          />
                        </div>
                        {(() => {
                          const criteria = resolveQuestionCriteria(answer.question_id, config);
                          const selectedScore = Number(draft.validatedScore);
                          return (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {criteria.map((criterion) => {
                                const isSelected = selectedScore === criterion.score;
                                return (
                                  <button
                                    key={criterion.score}
                                    type="button"
                                    disabled={isFinalized}
                                    onClick={() =>
                                      setValidationDrafts((prev) => ({
                                        ...prev,
                                        [draftKey]: { ...draft, validatedScore: String(criterion.score) },
                                      }))
                                    }
                                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                      isSelected
                                        ? "border-blue-500 bg-blue-50 dark:border-blue-400/60 dark:bg-blue-900/20"
                                        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-white/[0.08] dark:hover:border-blue-400/30 dark:hover:bg-blue-900/10"
                                    }`}
                                  >
                                    <span
                                      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        isSelected
                                          ? "bg-blue-600 text-white"
                                          : "bg-gray-200 text-gray-600 dark:bg-white/[0.12] dark:text-white/70"
                                      }`}
                                    >
                                      {criterion.score}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className={`block text-xs font-semibold ${isSelected ? "text-blue-800 dark:text-blue-300" : "text-gray-800 dark:text-white/80"}`}>
                                        {criterion.name}
                                      </span>
                                      <span className="mt-0.5 block text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                                        {criterion.description}
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Comentarios — editor de texto enriquecido */}
                        <div className="space-y-1 pt-1">
                          <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                            Comentarios adicionales (opcional)
                            <InfoHint
                              label="Comentarios de evaluación"
                              text="Observaciones o justificación adicional del puntaje. Puedes usar formato (negrita, listas, títulos). Solo el consultor ve este campo."
                            />
                          </label>
                          {isFinalized ? (
                            draft.comments ? (
                              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/[0.06] dark:bg-white/[0.02]">
                                <RichTextViewer html={draft.comments} />
                              </div>
                            ) : (
                              <p className="text-xs italic text-gray-400 dark:text-white/30">Sin comentarios.</p>
                            )
                          ) : (
                            <RichTextEditor
                              value={draft.comments}
                              onChange={(html) =>
                                setValidationDrafts((prev) => ({
                                  ...prev,
                                  [draftKey]: { ...draft, comments: html },
                                }))
                              }
                              placeholder="Escribe observaciones o justificación adicional..."
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : null}
            </div>
          )})
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 py-12 text-center dark:border-white/[0.12]">
            <Users className="h-8 w-8 text-gray-300 dark:text-white/20" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {responses?.responses?.length ? "No hay coincidencias con la búsqueda." : "Aún no hay respuestas registradas."}
            </p>
          </div>
        )}
      </div>
      ) : null}

      {annulModal ? (
        <div className="fixed inset-0 z-[100120] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#0f0f0f]">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Motivo de anulación</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Esta acción retirará la respuesta de los resultados activos del cuestionario.
            </p>
            <textarea
              rows={4}
              value={annulModal.reason}
              onChange={(event) =>
                setAnnulModal((prev) =>
                  prev
                    ? {
                        ...prev,
                        reason: event.target.value,
                      }
                    : prev
                )
              }
              placeholder="Describe el motivo de anulación..."
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAnnulModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleAnulateResponse(annulModal.responseId, annulModal.reason)}
                disabled={busyKey === `anular-${annulModal.responseId}`}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busyKey === `anular-${annulModal.responseId}` ? "Anulando..." : "Confirmar anulación"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {finalizeModal ? (
        <div className="fixed inset-0 z-[100130] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-blue-200 bg-white p-6 shadow-2xl dark:border-blue-900/30 dark:bg-[#0f0f0f]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Finalizar evaluación de respuesta
                </h4>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Estás finalizando la evaluación de la respuesta de{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {finalizeModal.respondentName}
                  </span>
                  .
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Se marcarán {finalizeModal.answerCount} respuesta{finalizeModal.answerCount !== 1 ? "s" : ""} como <strong>APROBADAS</strong>.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Los puntajes validados quedarán <strong>bloqueados</strong> para edición.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Esta acción <strong>no finaliza el cuestionario completo</strong>; solo esta respuesta individual.
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFinalizeModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleFinalizeEvaluation(finalizeModal.responseId)}
                disabled={busyKey === `finalize-${finalizeModal.responseId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {busyKey === `finalize-${finalizeModal.responseId}` ? "Finalizando..." : "Sí, finalizar respuesta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveNotice ? (
        <div className="fixed inset-0 z-[100140] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/30 dark:bg-[#0f0f0f]">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{saveNotice.title}</h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{saveNotice.message}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSaveNotice(null)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingTabChange ? (
        <div className="fixed inset-0 z-[100150] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-900/30 dark:bg-[#0f0f0f]">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Cambios sin guardar</h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Tienes cambios en la plantilla que aún no se han guardado. ¿Qué deseas hacer?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingTabChange(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingTabChange(null);
                  setActiveTab(pendingTabChange);
                }}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-950/20"
              >
                Salir sin guardar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pendingTabChange;
                  setPendingTabChange(null);
                  const saved = await handleSaveTemplate();
                  if (saved && target) {
                    setActiveTab(target);
                  }
                }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Guardar y salir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

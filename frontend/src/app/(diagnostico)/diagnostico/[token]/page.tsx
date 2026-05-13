"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  FileText,
  FileUp,
  Gauge,
  Mail,
  Send,
  Trash2,
  User,
} from "lucide-react";

import { RichTextEditor } from "@/components/maturity/RichTextEditor";
import { maturityApi } from "@/lib/api/maturity";
import type {
  CuestionarioConfigResponse,
  PublicQuestionnaireValidationResponse,
} from "@/lib/types/maturity.types";

type PublicAnswerState = Record<
  string,
  {
    score?: number;
    evidencia_url?: string;
    evidencia_nombre?: string;
    evidencia_tipo?: string;
    evidencia_size?: number;
    respondent_comentarios?: string;
  }
>;

type FieldErrors = {
  respondent_name?: string;
  respondent_email?: string;
  role?: string;
};

const MAX_EVIDENCE_SIZE_MB = 20;

export default function PaginaDiagnostico() {
  const { token } = useParams<{ token: string }>();
  const [validation, setValidation] = useState<PublicQuestionnaireValidationResponse | null>(null);
  const [config, setConfig] = useState<CuestionarioConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [formState, setFormState] = useState({
    respondent_name: "",
    respondent_email: "",
    role: "",
  });
  const [answers, setAnswers] = useState<PublicAnswerState>({});
  const [uploadingByQuestion, setUploadingByQuestion] = useState<Record<string, boolean>>({});
  const [uploadErrorByQuestion, setUploadErrorByQuestion] = useState<Record<string, string | null>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const draftKey = useMemo(() => `questionnaire-draft:${token}`, [token]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const validationData = await maturityApi.validateAccess(token);
        setValidation(validationData);
        if (!validationData.valid) {
          return;
        }
        const configData = await maturityApi.getPublicConfig(token);
        setConfig(configData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el cuestionario.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  useEffect(() => {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        formState?: typeof formState;
        answers?: PublicAnswerState;
      };
      if (parsed.formState) {
        setFormState(parsed.formState);
      }
      if (parsed.answers) {
        setAnswers(parsed.answers);
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        formState,
        answers,
      })
    );
  }, [answers, draftKey, formState]);

  const availableRoles = useMemo(() => {
    const roleNameMap = new Map<string, string>();
    for (const role of config?.roles ?? []) {
      roleNameMap.set(role.id, role.name);
    }

    const usedRoleIds = new Set<string>();
    for (const question of config?.questions ?? []) {
      for (const role of question.applicable_roles) {
        usedRoleIds.add(role);
      }
    }

    return Array.from(usedRoleIds)
      .sort((left, right) => left.localeCompare(right))
      .map((roleId) => ({
        id: roleId,
        name:
          roleNameMap.get(roleId) ??
          roleId
            .split("-")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
      }));
  }, [config?.questions, config?.roles]);

  const visibleQuestions = useMemo(() => {
    if (!config?.questions.length || !formState.role) {
      return [];
    }
    return config.questions.filter((question) =>
      question.applicable_roles.includes(formState.role)
    );
  }, [config?.questions, formState.role]);

  const scoreCriteria = useMemo(
    () =>
      [...(config?.score_criteria ?? [])]
        .sort((left, right) => left.score - right.score),
    [config?.score_criteria]
  );

  const groupedVisibleQuestions = useMemo(() => {
    if (!config?.dimensions?.length || !visibleQuestions.length) {
      return [];
    }
    return config.dimensions
      .map((dimension) => ({
        ...dimension,
        questions: visibleQuestions.filter((question) => question.dimension_id === dimension.id),
      }))
      .filter((dimension) => dimension.questions.length > 0);
  }, [config?.dimensions, visibleQuestions]);

  const answeredCount = useMemo(
    () =>
      visibleQuestions.filter(
        (question) => typeof answers[question.id]?.score === "number"
      ).length,
    [answers, visibleQuestions]
  );

  const evidenceCount = useMemo(
    () =>
      visibleQuestions.filter((question) => Boolean(answers[question.id]?.evidencia_url)).length,
    [answers, visibleQuestions]
  );

  const checklist = useMemo(
    () => [
      {
        id: "identity",
        label: "Datos del respondente completos",
        done:
          formState.respondent_name.trim().length > 0 &&
          formState.respondent_email.trim().length > 0,
      },
      {
        id: "role",
        label: "Rol seleccionado",
        done: Boolean(formState.role),
      },
      {
        id: "scores",
        label: `Puntajes asignados (${answeredCount}/${visibleQuestions.length || 0})`,
        done: visibleQuestions.length > 0 && answeredCount === visibleQuestions.length,
      },
      {
        id: "evidence",
        label: `Evidencias cargadas (${evidenceCount}/${visibleQuestions.length || 0})`,
        done: visibleQuestions.length > 0 && evidenceCount === visibleQuestions.length,
      },
    ],
    [answeredCount, evidenceCount, formState.respondent_email, formState.respondent_name, formState.role, visibleQuestions.length]
  );

  const completedChecklist = checklist.filter((item) => item.done).length;
  const pendingChecklist = checklist.filter((item) => !item.done);

  const questionsById = useMemo(
    () => new Map(visibleQuestions.map((question) => [question.id, question])),
    [visibleQuestions]
  );

  const getQuestionStatus = (questionId: string): "complete" | "score" | "evidence" | "both" => {
    const answer = answers[questionId];
    const hasScore = typeof answer?.score === "number";
    const hasEvidence = Boolean(answer?.evidencia_url);
    if (hasScore && hasEvidence) return "complete";
    if (!hasScore && !hasEvidence) return "both";
    if (!hasScore) return "score";
    return "evidence";
  };

  const pendingQuestionIds = useMemo(
    () => visibleQuestions.filter((q) => getQuestionStatus(q.id) !== "complete").map((q) => q.id),
    [answers, visibleQuestions]
  );

  const completionPercent = visibleQuestions.length
    ? Math.round((completedChecklist / checklist.length) * 100)
    : 0;

  const submissionBlockReason = useMemo(() => {
    if (!visibleQuestions.length) return "No hay preguntas disponibles para enviar.";
    if (!formState.respondent_name.trim() || !formState.respondent_email.trim() || !formState.role) {
      return "Completa tu información y selecciona rol.";
    }
    if (pendingQuestionIds.length) {
      return `Faltan ${pendingQuestionIds.length} preguntas por completar.`;
    }
    return null;
  }, [formState.respondent_email, formState.respondent_name, formState.role, pendingQuestionIds.length, visibleQuestions.length]);

  const handleUploadEvidence = async (questionId: string, file: File) => {
    if (!validation?.project_id) {
      return;
    }

    const maxSizeBytes = MAX_EVIDENCE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadErrorByQuestion((prev) => ({
        ...prev,
        [questionId]: `El archivo supera ${MAX_EVIDENCE_SIZE_MB} MB.`,
      }));
      return;
    }

    setUploadErrorByQuestion((prev) => ({ ...prev, [questionId]: null }));
    setUploadingByQuestion((prev) => ({ ...prev, [questionId]: true }));
    try {
      const uploaded = await maturityApi.uploadEvidence(validation.project_id, token, file);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          score: prev[questionId]?.score,
          evidencia_url: uploaded.evidencia_url,
          evidencia_nombre: uploaded.evidencia_nombre,
          evidencia_tipo: uploaded.evidencia_tipo,
          evidencia_size: uploaded.evidencia_size,
          respondent_comentarios: prev[questionId]?.respondent_comentarios,
        },
      }));
    } catch (uploadError) {
      setUploadErrorByQuestion((prev) => ({
        ...prev,
        [questionId]: uploadError instanceof Error ? uploadError.message : "No se pudo subir la evidencia.",
      }));
    } finally {
      setUploadingByQuestion((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const clearEvidence = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
          evidencia_url: undefined,
          evidencia_nombre: undefined,
          evidencia_tipo: undefined,
          evidencia_size: undefined,
          respondent_comentarios: prev[questionId]?.respondent_comentarios,
        },
      }));
    setUploadErrorByQuestion((prev) => ({ ...prev, [questionId]: null }));
  };

  const isEmailValid = (email: string) => /\S+@\S+\.\S+/.test(email);

  const validateBeforeSubmit = () => {
    const nextFieldErrors: FieldErrors = {};
    if (!formState.respondent_name.trim()) {
      nextFieldErrors.respondent_name = "Ingresa tu nombre.";
    }
    if (!formState.respondent_email.trim()) {
      nextFieldErrors.respondent_email = "Ingresa tu correo.";
    } else if (!isEmailValid(formState.respondent_email.trim())) {
      nextFieldErrors.respondent_email = "Ingresa un correo válido.";
    }
    if (!formState.role) {
      nextFieldErrors.role = "Selecciona un rol.";
    }
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Corrige los datos del respondente antes de enviar.");
      return false;
    }

    if (pendingQuestionIds.length) {
      setError(`Faltan ${pendingQuestionIds.length} preguntas por completar antes de enviar.`);
      const firstPending = pendingQuestionIds[0];
      const target = document.getElementById(`question-${firstPending}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }

    return true;
  };

  const submitQuestionnaire = async () => {
    if (!validation?.project_id) return;
    if (!validateBeforeSubmit()) return;

    setSubmitting(true);
    setError(null);
    try {
      await maturityApi.submitResponse(validation.project_id, token, {
        respondent_name: formState.respondent_name.trim(),
        respondent_email: formState.respondent_email.trim(),
        role: formState.role,
        answers: visibleQuestions.map((question) => ({
          question_id: question.id,
          score: answers[question.id].score!,
          evidencia_url: answers[question.id].evidencia_url,
          evidencia_nombre: answers[question.id].evidencia_nombre,
          evidencia_tipo: answers[question.id].evidencia_tipo,
          evidencia_size: answers[question.id].evidencia_size,
          respondent_comentarios: answers[question.id].respondent_comentarios?.trim() || undefined,
        })),
      });
      window.localStorage.removeItem(draftKey);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar el cuestionario.");
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">Cargando cuestionario...</div>;
  }

  if (error && !validation) {
    return <PantallaError titulo="Error" mensaje={error} />;
  }

  if (!validation?.valid) {
    return (
      <PantallaError
        titulo="Cuestionario no disponible"
        mensaje={validation?.error ?? "Este enlace de cuestionario no esta disponible."}
      />
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Cuestionario enviado</h2>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          Tus respuestas fueron recibidas correctamente. El equipo consultor validara la evidencia y el puntaje final.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="border-b border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 dark:border-white/[0.06] dark:from-blue-700 dark:to-indigo-700">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">ARQDATA · Diagnóstico</p>
          <h1 className="mt-1 text-xl font-bold text-white">
            Evaluación de Madurez en Gestión de Datos
          </h1>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.08] dark:text-white/60">
              Proyecto
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{validation.project_name}</span>
          </div>
          <SectionHelp
            title="Cómo responder este cuestionario"
            description="Sigue este orden para evitar bloqueos al final del envío."
            items={[
              "Completa tu información y selecciona el rol que mejor represente tu trabajo diario.",
              "Evalúa cada pregunta usando la escala configurada y sus criterios visibles.",
              "Adjunta al menos una evidencia por pregunta (obligatorio para enviar).",
              "Verifica el checklist final antes de hacer clic en Enviar cuestionario.",
            ]}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <ClipboardCheck className="h-5 w-5 text-gray-500 dark:text-gray-300" />
              Progreso del cuestionario
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completedChecklist}/{checklist.length} requisitos completados ({completionPercent}%)
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-white/[0.08] dark:text-white/80">
            {answeredCount}/{visibleQuestions.length || 0} con puntaje
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-400"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        {pendingQuestionIds.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            <p className="font-semibold">Pendientes por completar: {pendingQuestionIds.length}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingQuestionIds.slice(0, 8).map((questionId) => {
                const question = questionsById.get(questionId);
                if (!question) return null;
                return (
                  <button
                    key={questionId}
                    type="button"
                    onClick={() => {
                      document
                        .getElementById(`question-${questionId}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium hover:bg-amber-100 dark:border-amber-700 dark:bg-transparent dark:hover:bg-amber-900/30"
                  >
                    Ir a: {question.text.slice(0, 45)}...
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <User className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            Informacion del respondente
          </h2>
          <InfoPopover
            label="Ayuda sobre información del respondente"
            title="¿Por qué pedimos estos datos?"
            description="Estos datos identifican la fuente de la respuesta y se usan durante la validación consultor."
            items={[
              "Nombre y correo deben pertenecer a la persona que responde.",
              "El rol define qué preguntas serán visibles en esta sesión.",
              "Si cambias el rol, las respuestas cargadas en pantalla se reinician.",
            ]}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <User className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              Nombre
            </label>
            <input
              type="text"
              placeholder="Nombre completo"
              value={formState.respondent_name}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, respondent_name: event.target.value }));
                setFieldErrors((prev) => ({ ...prev, respondent_name: undefined }));
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
            />
            {fieldErrors.respondent_name ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.respondent_name}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Mail className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              Correo
            </label>
            <input
              type="email"
              placeholder="Correo electronico"
              value={formState.respondent_email}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, respondent_email: event.target.value }));
                setFieldErrors((prev) => ({ ...prev, respondent_email: undefined }));
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white"
            />
            {fieldErrors.respondent_email ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.respondent_email}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Briefcase className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              Rol
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            {!formState.role && (
              <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 dark:border-amber-700/40 dark:bg-amber-950/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] text-amber-800 dark:text-amber-300">
                  Selecciona el rol <strong>antes de empezar</strong> — define qué preguntas verás.
                </span>
              </div>
            )}
            <select
              value={formState.role}
              onChange={(event) => {
                if (formState.role && Object.keys(answers).length > 0) {
                  const accepted = window.confirm(
                    "Cambiar el rol reiniciará las respuestas y evidencias en pantalla. ¿Deseas continuar?"
                  );
                  if (!accepted) {
                    return;
                  }
                }
                setFormState((prev) => ({ ...prev, role: event.target.value }));
                setAnswers({});
                setUploadErrorByQuestion({});
                setFieldErrors((prev) => ({ ...prev, role: undefined }));
              }}
              className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-white/[0.03] dark:text-white ${
                fieldErrors.role
                  ? "border-red-400 dark:border-red-400/50"
                  : formState.role
                    ? "border-green-400 dark:border-green-400/50"
                    : "border-gray-300 dark:border-white/[0.12]"
              }`}
            >
              <option value="">Selecciona un rol</option>
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {fieldErrors.role ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-300">{fieldErrors.role}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Gauge className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            Preguntas
          </h2>
          <InfoPopover
            label="Ayuda sobre cómo puntuar y evidenciar"
            title="Cómo evaluar cada pregunta"
            description="Debes asignar puntaje y subir evidencia para cada pregunta visible."
            items={[
              "Usa 0 cuando no exista práctica o evidencia.",
              "Usa el nivel más alto cuando la práctica sea transversal y demostrable.",
              "El archivo de evidencia debe respaldar el puntaje elegido.",
            ]}
          />
        </div>
        {formState.role ? (
          visibleQuestions.length ? (
            <div className="mt-4 space-y-6">
              {groupedVisibleQuestions.map((dimension) => (
                <div key={dimension.id} className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.08]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{dimension.name}</h3>
                  <div className="mt-3 space-y-5">
                    {dimension.questions.map((question, index) => (
                      <div id={`question-${question.id}`} key={question.id} className="rounded-lg border border-gray-200 p-4 dark:border-white/[0.08]">
                        {(() => {
                          const questionCriteria = (
                            question.score_criteria && question.score_criteria.length
                              ? [...question.score_criteria]
                              : [...scoreCriteria]
                          ).sort((left, right) => left.score - right.score);
                          const questionCriteriaMap = new Map(
                            questionCriteria.map((item) => [item.score, item])
                          );
                          const status = getQuestionStatus(question.id);
                          return (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {index + 1}. {question.text}
                                  </p>
                                  <InfoHint
                                    label="Guía para responder esta pregunta"
                                    text="Elige el nivel que mejor represente la situación real de tu organización hoy. Evita sobreestimar el nivel si no tienes evidencia verificable."
                                  />
                                </div>
                                <QuestionStatusBadge status={status} />
                              </div>
                              {/* ── Criteria selector ── */}
                              <div className="mt-3">
                                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Elige el nivel que mejor describe la situación actual
                                  <InfoHint
                                    label="Ayuda sobre escala de evaluación"
                                    text="Selecciona el nivel que mejor describa la realidad de tu organización hoy. Evita sobreestimar si no tienes evidencia verificable."
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {questionCriteria.map((item) => {
                                    const isSelected = answers[question.id]?.score === item.score;
                                    return (
                                      <span key={item.score} className="group relative">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setAnswers((prev) => ({
                                              ...prev,
                                              [question.id]: {
                                                score: item.score,
                                                evidencia_url: prev[question.id]?.evidencia_url,
                                                evidencia_nombre: prev[question.id]?.evidencia_nombre,
                                                evidencia_tipo: prev[question.id]?.evidencia_tipo,
                                                evidencia_size: prev[question.id]?.evidencia_size,
                                                respondent_comentarios: prev[question.id]?.respondent_comentarios,
                                              },
                                            }))
                                          }
                                          aria-label={`Nivel ${item.score}: ${item.name}`}
                                          className={`flex min-w-[3.5rem] flex-col items-center rounded-lg border px-3 py-2 text-center transition-all ${
                                            isSelected
                                              ? "border-[#0F172A] bg-[#0F172A] text-white shadow-sm dark:border-white dark:bg-white dark:text-black"
                                              : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/70 dark:hover:bg-white/[0.08]"
                                          }`}
                                        >
                                          <span className="text-base font-bold leading-none">{item.score}</span>
                                          <span className="mt-0.5 max-w-[5rem] truncate text-[9px] leading-tight opacity-80">{item.name}</span>
                                        </button>
                                        <span
                                          role="tooltip"
                                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2.5 text-[11px] text-gray-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-white/[0.12] dark:bg-[#151515] dark:text-gray-300"
                                        >
                                          <span className="block font-semibold text-gray-900 dark:text-white">
                                            {item.score} — {item.name}
                                          </span>
                                          <span className="mt-1 block opacity-90">{item.description}</span>
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                                {typeof answers[question.id]?.score === "number" ? (
                                  <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-[11px] text-blue-800 dark:border-blue-700/30 dark:bg-blue-950/20 dark:text-blue-300">
                                    <span className="font-semibold">
                                      Criterio seleccionado ({answers[question.id].score}):
                                    </span>{" "}
                                    {questionCriteriaMap.get(answers[question.id].score!)?.name} —{" "}
                                    {questionCriteriaMap.get(answers[question.id].score!)?.description}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-[11px] text-gray-400 dark:text-white/30">
                                    Ningún nivel seleccionado aún.
                                  </p>
                                )}
                              </div>
                              {/* ── Evidence zone ── */}
                              {(() => {
                                const hasEvidence = Boolean(answers[question.id]?.evidencia_nombre);
                                const isUploading = Boolean(uploadingByQuestion[question.id]);
                                const uploadError = uploadErrorByQuestion[question.id];
                                return (
                                  <div className={`mt-4 rounded-lg border-2 p-3 transition-colors ${
                                    isUploading
                                      ? "border-blue-300 bg-blue-50/50 dark:border-blue-600/40 dark:bg-blue-950/10"
                                      : hasEvidence
                                        ? "border-green-300 bg-green-50/50 dark:border-green-600/40 dark:bg-green-950/10"
                                        : "border-dashed border-amber-300 bg-amber-50/30 dark:border-amber-600/30 dark:bg-amber-950/10"
                                  }`}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {hasEvidence
                                          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                                          : <FileUp className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                        }
                                        <p className={`text-xs font-semibold ${hasEvidence ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300"}`}>
                                          {hasEvidence ? "Evidencia cargada" : "Evidencia requerida"}
                                        </p>
                                        <InfoHint
                                          label="Ayuda sobre evidencia obligatoria"
                                          text="La evidencia respalda el puntaje asignado. Sin ella el cuestionario no puede enviarse. Sube un archivo que justifique tu respuesta."
                                        />
                                      </div>

                                      <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                                        hasEvidence
                                          ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/80 dark:hover:bg-white/[0.08]"
                                          : "border-amber-400 bg-amber-600 text-white hover:bg-amber-700 dark:border-amber-500 dark:bg-amber-600"
                                      }`}>
                                        <input
                                          type="file"
                                          accept=".pdf,.txt,.csv,.tsv,.json,.xml,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp"
                                          className="hidden"
                                          onChange={(event) => {
                                            const selectedFile = event.target.files?.[0];
                                            if (selectedFile) {
                                              void handleUploadEvidence(question.id, selectedFile);
                                            }
                                            event.currentTarget.value = "";
                                          }}
                                        />
                                        <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                                        {isUploading ? "Subiendo..." : hasEvidence ? "Reemplazar" : "Subir archivo"}
                                      </label>
                                    </div>

                                    {hasEvidence ? (
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-green-700 dark:text-green-300">
                                          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                          <span className="truncate font-medium">{answers[question.id].evidencia_nombre}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => clearEvidence(question.id)}
                                          className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-50 dark:border-red-700/40 dark:text-red-300 dark:hover:bg-red-950/20"
                                        >
                                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                                          Quitar
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400/80">
                                        PDF, DOC, XLS, PNG, JPG, etc. — máx. {MAX_EVIDENCE_SIZE_MB} MB
                                      </p>
                                    )}

                                    {uploadError ? (
                                      <p className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-300">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                        {uploadError}
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              })()}
                              <div className="mt-4 space-y-1">
                                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Comentarios del respondente (opcional)
                                  <InfoHint
                                    label="Ayuda sobre comentarios opcionales"
                                    text="Agrega contexto, aclaraciones o limitaciones de la evidencia para ayudar al consultor en la revisión."
                                  />
                                </label>
                                <RichTextEditor
                                  value={answers[question.id]?.respondent_comentarios ?? ""}
                                  onChange={(html) =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [question.id]: {
                                        score: prev[question.id]?.score,
                                        evidencia_url: prev[question.id]?.evidencia_url,
                                        evidencia_nombre: prev[question.id]?.evidencia_nombre,
                                        evidencia_tipo: prev[question.id]?.evidencia_tipo,
                                        evidencia_size: prev[question.id]?.evidencia_size,
                                        respondent_comentarios: html,
                                      },
                                    }))
                                  }
                                  placeholder="Escribe observaciones opcionales sobre esta respuesta..."
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              No hay preguntas configuradas para el rol seleccionado.
            </p>
          )
        ) : (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-5 dark:border-amber-600/30 dark:bg-amber-950/10">
            <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Selecciona tu rol primero</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400/80">
                El cuestionario está personalizado según el rol. Regresa a la sección
                <strong> Información del respondente</strong> y elige el que mejor describe tu función.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300" role="status" aria-live="polite">
          {error}
        </div>
      )}

      <div className={`rounded-xl border p-6 ${
        completedChecklist === checklist.length
          ? "border-green-200 bg-green-50/50 dark:border-green-700/30 dark:bg-green-950/10"
          : "border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#0f0f0f]"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className={`h-5 w-5 ${completedChecklist === checklist.length ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`} />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Verificación antes de enviar
            </h3>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            completedChecklist === checklist.length
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-white/70"
          }`}>
            {completedChecklist}/{checklist.length} completados
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.08]">
          <div
            className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${(completedChecklist / checklist.length) * 100}%` }}
          />
        </div>
        <div className="mt-3 space-y-2">
          {checklist.map((item) => (
            <div key={item.id} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
              item.done
                ? "bg-green-50 dark:bg-green-950/20"
                : "bg-amber-50 dark:bg-amber-950/10"
            }`}>
              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.done
                  ? "bg-green-500 text-white"
                  : "bg-amber-500 text-white"
              }`}>
                {item.done
                  ? <Check className="h-3 w-3" />
                  : <AlertTriangle className="h-3 w-3" />
                }
              </span>
              <span className={item.done ? "text-green-800 dark:text-green-300" : "text-amber-800 dark:text-amber-300"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Tus respuestas son confidenciales y se usarán exclusivamente para el análisis de madurez.
          </p>

          <div className="group relative flex-shrink-0">
            <button
              onClick={() => {
                if (validateBeforeSubmit()) {
                  setShowSubmitConfirm(true);
                }
              }}
              disabled={submitting || !visibleQuestions.length}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Enviando..." : "Enviar cuestionario"}
            </button>
            {submissionBlockReason ? (
              <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-80 rounded-lg border border-amber-200 bg-white p-3 text-left opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-amber-900/40 dark:bg-[#151515]">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  Completa lo siguiente antes de enviar:
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  {pendingChecklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showSubmitConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-white/[0.12] dark:bg-[#111]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Confirmar envío</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Revisa este resumen final antes de enviar.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Rol: {availableRoles.find((r) => r.id === formState.role)?.name ?? formState.role}</li>
              <li>Preguntas: {visibleQuestions.length}</li>
              <li>Puntajes completos: {answeredCount}</li>
              <li>Evidencias cargadas: {evidenceCount}</li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.05]"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={() => void submitQuestionnaire()}
                className="rounded-md bg-[#0F172A] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e293b] dark:bg-white dark:text-black"
              >
                Confirmar y enviar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuestionStatusBadge({ status }: { status: "complete" | "score" | "evidence" | "both" }) {
  if (status === "complete") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="h-4 w-4" />Completa</span>;
  }
  if (status === "both") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />Falta puntaje y evidencia</span>;
  }
  if (status === "score") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />Falta puntaje</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><AlertTriangle className="h-4 w-4" />Falta evidencia</span>;
}

function PantallaError({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg className="h-7 w-7 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">{mensaje}</p>
    </div>
  );
}

function SectionHelp({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-200">{title}</h2>
      </div>
      <p className="mt-1 text-xs text-blue-700 dark:text-blue-300/80">{description}</p>
      <ol className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white dark:bg-blue-500">
              {i + 1}
            </span>
            <span className="text-xs leading-relaxed text-blue-800 dark:text-blue-300/90">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function InfoPopover({
  label,
  title,
  description,
  items,
}: {
  label: string;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <details className="group relative">
      <summary
        className="inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/[0.16] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.08]"
        aria-label={label}
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="absolute left-0 z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-white/[0.12] dark:bg-[#151515]">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{description}</p>
        <ul className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function InfoHint({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/[0.16] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.08]"
        aria-label={label}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-6 top-1/2 z-10 w-64 -translate-y-1/2 rounded-md border border-gray-200 bg-white p-2 text-[11px] text-gray-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-white/[0.12] dark:bg-[#151515] dark:text-gray-300"
      >
        {text}
      </span>
    </span>
  );
}

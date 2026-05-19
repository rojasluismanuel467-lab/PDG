"use client";
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronRight,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
  Check,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from "lucide-react";
import { useArtifactChat } from "@/hooks/useArtifactChat";
import { aiChatApi } from "@/lib/api/ai-chat";
import { ArtifactDiffViewer, computeArtifactDiffSummary } from "./ArtifactDiffViewer";

// ── Inline markdown renderer ──────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Numbered list — collect consecutive numbered lines
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal list-outside pl-4 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Bullet list — collect consecutive bullet lines
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-outside pl-4 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Plain paragraph
    nodes.push(<p key={`p-${i}`}>{renderInline(line)}</p>);
    i++;
  }

  return <div className="space-y-1.5">{nodes}</div>;
}

function cloneArtifact(artifact: Record<string, unknown>): Record<string, unknown> {
  try {
    return structuredClone(artifact);
  } catch {
    return JSON.parse(JSON.stringify(artifact)) as Record<string, unknown>;
  }
}

// ── Suggestions rapidas ───────────────────────────────────────────────────────

const QUICK_PROMPTS: Record<string, string[]> = {
  ASIS_CONCEPTUAL_DIAGRAM: [
    "Genera el modelo completo desde cero",
    "Completa las entidades que faltan",
    "¿Qué relaciones crees que debería agregar?",
    "Añade atributos clave a las entidades existentes",
  ],
  TOBE_CONCEPTUAL_DIAGRAM: [
    "Genera el modelo TO-BE basándote en el AS-IS",
    "¿Qué entidades nuevas debería incorporar?",
    "Propón mejoras al modelo actual",
  ],
  ASIS_SYSTEM_INVENTORY_MATRIX: [
    "Genera el inventario completo desde cero",
    "¿Qué sistemas crees que faltan?",
    "Completa los sistemas de tipo base de datos",
  ],
  TOBE_SYSTEM_INVENTORY_MATRIX: [
    "Genera el inventario TO-BE",
    "¿Qué sistemas debería reemplazar o modernizar?",
  ],
};

// ── Bubble de mensaje ─────────────────────────────────────────────────────────

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  suggestedArtifact: Record<string, unknown> | null;
  artifactCode: string;
  currentArtifact: Record<string, unknown>;
  onApply: (artifact: Record<string, unknown>) => void;
  onDismiss: () => void;
  hasInlinePreview?: boolean;
}

function MessageBubble({
  role, content, isStreaming, suggestedArtifact,
  artifactCode, currentArtifact, onApply, onDismiss, hasInlinePreview,
}: MessageBubbleProps) {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div className={`flex gap-2.5 ${role === "user" ? "flex-row-reverse" : "flex-row"}`}>
      {role === "assistant" && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#28b8d5]/15 flex items-center justify-center mt-0.5">
          <Bot size={12} className="text-[#28b8d5]" />
        </div>
      )}

      <div className={`max-w-[85%] space-y-2 ${role === "user" ? "items-end" : "items-start"} flex flex-col`}>
        {/* Texto */}
        <div className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
          role === "user"
            ? "bg-[#28b8d5] text-white rounded-tr-sm"
            : "bg-gray-100 dark:bg-white/[0.06] text-gray-800 dark:text-white/80 rounded-tl-sm"
        }`}>
          {role === "assistant" ? (
            <MarkdownContent text={content} />
          ) : (
            content
          )}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Artefacto sugerido — solo en modo sin inline preview */}
        {suggestedArtifact && !isStreaming && !hasInlinePreview && (
          <div className="w-full rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-500/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-200/60 dark:border-emerald-500/15">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Propuesta de cambios
                </span>
              </div>
              <button
                onClick={() => setShowDiff((p) => !p)}
                className="flex items-center gap-1 text-[10px] text-emerald-600/70 dark:text-emerald-400/60 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                <Eye size={10} />
                {showDiff ? "Ocultar diff" : "Ver diff"}
              </button>
            </div>

            {showDiff && (
              <div className="px-3 py-2 border-b border-emerald-200/60 dark:border-emerald-500/15">
                <ArtifactDiffViewer
                  artifactCode={artifactCode}
                  current={currentArtifact}
                  proposed={suggestedArtifact}
                />
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2">
              <button
                onClick={() => onApply(suggestedArtifact)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-500 transition-colors"
              >
                <Check size={11} />
                Aplicar cambios
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 rounded-lg text-[11px] text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Indicador mínimo cuando hay inline preview activo */}
        {suggestedArtifact && !isStreaming && hasInlinePreview && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/[0.08] border border-emerald-200/60 dark:border-emerald-500/20">
            <Sparkles size={10} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
              Vista previa activa — ver panel superior ↑
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────

interface ArtifactChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  artifactCode: string;
  currentArtifact: Record<string, unknown>;
  onApplyArtifact: (artifact: Record<string, unknown>) => void;
  onPreviewArtifact?: (artifact: Record<string, unknown> | null) => void;
}

export function ArtifactChatPanel({
  isOpen,
  onClose,
  projectId,
  artifactCode,
  currentArtifact,
  onApplyArtifact,
  onPreviewArtifact,
}: ArtifactChatPanelProps) {
  const [input, setInput] = useState("");
  const [showPinnedDiff, setShowPinnedDiff] = useState(false);
  const [showSessionsMenu, setShowSessionsMenu] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
  const [feedbackReasons, setFeedbackReasons] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [undoState, setUndoState] = useState<
    | { kind: "apply"; previousArtifact: Record<string, unknown> }
    | { kind: "discard"; artifact: Record<string, unknown> }
    | null
  >(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [uploadFileName, setUploadFileName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<number | null>(null);
  const uploadStatusTimerRef = useRef<number | null>(null);

  const {
    sessions,
    sessionId,
    startNewChat,
    selectSession,
    deleteSession,
    renameSession,
    connectionError,
    retryConnection,
    messages,
    loading,
    isGeneratingArtifact,
    pendingArtifact,
    sendMessage,
    clearHistory,
    dismissArtifact,
    restoreArtifact,
    coherenceReport,
    isCheckingCoherence,
    checkCoherence,
    dismissCoherence,
  } = useArtifactChat({
    projectId,
    artifactCode,
    currentArtifact,
    enabled: isOpen,
  });

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  useEffect(() => {
    if (!isOpen) setShowSessionsMenu(false);
  }, [isOpen]);

  useEffect(() => {
    if (!showSessionsMenu) {
      setSessionSearch("");
      setEditingSessionId(null);
      setEditingSessionTitle("");
    }
  }, [showSessionsMenu]);

  // Bubble pending artifact up to editor for inline preview
  useEffect(() => {
    onPreviewArtifact?.(pendingArtifact);
  }, [pendingArtifact, onPreviewArtifact]);

  // Reset feedback UI when the suggested artifact changes
  useEffect(() => {
    setFeedbackRating(null);
    setFeedbackReasons([]);
    setFeedbackComment("");
    setShowFeedback(false);
  }, [pendingArtifact]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-dismiss Undo snackbar
  useEffect(() => {
    if (!undoState) return;
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndoState(null), 6500);
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    };
  }, [undoState]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !sessionId) return;

      e.target.value = "";
      setUploadFileName(file.name);
      setUploadStatus("uploading");
      if (uploadStatusTimerRef.current) {
        window.clearTimeout(uploadStatusTimerRef.current);
      }

      try {
        await aiChatApi.uploadFile(projectId, artifactCode, sessionId, file);
        setUploadStatus("done");
      } catch {
        setUploadStatus("error");
      } finally {
        uploadStatusTimerRef.current = window.setTimeout(() => {
          setUploadStatus("idle");
          setUploadFileName("");
          uploadStatusTimerRef.current = null;
        }, 4000);
      }
    },
    [sessionId, projectId, artifactCode],
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  }, [input, loading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const handleApply = useCallback(
    (artifact: Record<string, unknown>) => {
      const previousArtifact = cloneArtifact(currentArtifact);
      onApplyArtifact(artifact);
      dismissArtifact();
      setUndoState({ kind: "apply", previousArtifact });
      void checkCoherence(artifact);
    },
    [onApplyArtifact, dismissArtifact, currentArtifact, checkCoherence],
  );

  const handleDiscard = useCallback(() => {
    if (pendingArtifact) setUndoState({ kind: "discard", artifact: cloneArtifact(pendingArtifact) });
    dismissArtifact();
  }, [dismissArtifact, pendingArtifact]);

  const handleUndo = useCallback(() => {
    if (!undoState) return;
    if (undoState.kind === "apply") {
      onApplyArtifact(undoState.previousArtifact);
    } else {
      restoreArtifact(undoState.artifact);
    }
    setUndoState(null);
  }, [undoState, onApplyArtifact, restoreArtifact]);

  const feedbackOptions = useMemo(() => {
    const isConceptual = artifactCode.includes("CONCEPTUAL") || artifactCode.includes("DIAGRAM");
    if (isConceptual) {
      return [
        "Faltan relaciones",
        "Cardinalidades incorrectas",
        "Nombres poco claros",
        "Atributos faltantes",
        "Demasiadas suposiciones",
        "No coincide con el contexto",
      ];
    }
    return [
      "Faltan elementos",
      "Tipo/clasificación incorrecta",
      "Descripción imprecisa",
      "Demasiadas suposiciones",
      "No coincide con el contexto",
    ];
  }, [artifactCode]);

  const toggleReason = useCallback((reason: string) => {
    setFeedbackReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );
  }, []);

  const sendFeedback = useCallback(async (opts?: { discardAfter?: boolean; rating?: "up" | "down" }) => {
    const rating = opts?.rating ?? feedbackRating ?? "down";
    const reasons = feedbackReasons.length > 0 ? feedbackReasons.join(", ") : "(sin motivos)";
    const comment = feedbackComment.trim();
    setFeedbackRating(rating);

    await sendMessage(
      [
        "Feedback sobre la propuesta de cambios (no generes un nuevo artefacto todavía; solo confirma que entendiste):",
        `- Rating: ${rating === "up" ? "útil" : "no útil"}`,
        `- Motivos: ${reasons}`,
        comment ? `- Comentario: ${comment}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    if (opts?.discardAfter) dismissArtifact();
    setShowFeedback(false);
  }, [feedbackRating, feedbackReasons, feedbackComment, sendMessage, dismissArtifact]);

  const quickPrompts = QUICK_PROMPTS[artifactCode] ?? [];
  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => (s.title ?? "").toLowerCase().includes(q));
  }, [sessions, sessionSearch]);
  const pinnedSummary = useMemo(
    () =>
      pendingArtifact
        ? computeArtifactDiffSummary(artifactCode, currentArtifact, pendingArtifact)
        : null,
    [artifactCode, currentArtifact, pendingArtifact],
  );

  return (
    <div
      className={`
        flex-shrink-0 flex flex-col
        bg-white dark:bg-[#0f0f0f]
        border-l border-gray-200 dark:border-white/[0.07]
        shadow-[-8px_0_20px_rgba(0,0,0,0.06)] dark:shadow-[-8px_0_20px_rgba(0,0,0,0.3)]
        rounded-l-2xl overflow-hidden
        transition-all duration-300 ease-in-out
        ${isOpen ? "w-[380px]" : "w-0"}
      `}
    >
        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#28b8d5]/10 flex items-center justify-center">
              <Sparkles size={13} className="text-[#28b8d5]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-gray-900 dark:text-white">
                Asistente IA
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSessionsMenu((p) => !p)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors max-w-[210px]"
                  title={activeSession?.title ?? "Chat"}
                >
                  <span className="truncate">
                    {activeSession?.title ?? (loading ? "Cargando chat..." : "Nuevo chat")}
                  </span>
                  <ChevronDown size={11} className={`transition-transform ${showSessionsMenu ? "rotate-180" : ""}`} />
                </button>
                <span className="text-[10px] text-gray-300 dark:text-white/15">·</span>
                <span className="text-[10px] text-gray-400 dark:text-white/30">
                  {connectionError ? "Sin conexión" : (loading ? "Generando..." : "Listo")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                void startNewChat();
                setShowSessionsMenu(false);
              }}
              title="Nuevo chat"
              disabled={!!connectionError}
              className="p-1.5 rounded-lg text-gray-400 dark:text-white/25 hover:text-[#28b8d5] hover:bg-[#28b8d5]/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              <MessageSquarePlus size={13} />
            </button>
            <button
              onClick={clearHistory}
              title="Borrar mensajes del chat"
              disabled={!!connectionError}
              className="p-1.5 rounded-lg text-gray-400 dark:text-white/25 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Sessions dropdown */}
          {showSessionsMenu && (
            <div className="absolute top-[54px] left-4 right-4 z-50 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
                <p className="text-[11px] font-semibold text-gray-700 dark:text-white/70">
                  Historial
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void startNewChat();
                    setShowSessionsMenu(false);
                  }}
                  disabled={!!connectionError}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#28b8d5] hover:text-[#28b8d5]/90 transition-colors disabled:opacity-40 disabled:hover:text-[#28b8d5]"
                >
                  <MessageSquarePlus size={12} />
                  Nuevo chat
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {!connectionError && sessions.length > 0 && (
                  <div className="px-3 py-2 border-b border-gray-50 dark:border-white/[0.03]">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-2.5 py-2">
                      <Search size={12} className="text-gray-400 dark:text-white/25 flex-shrink-0" />
                      <input
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                        placeholder="Buscar por nombre…"
                        className="w-full bg-transparent outline-none text-[11px] text-gray-700 dark:text-white/70 placeholder:text-gray-400 dark:placeholder:text-white/25"
                      />
                    </div>
                  </div>
                )}
                {connectionError && (
                  <div className="px-3 py-2">
                    <p className="text-[11px] text-red-600 dark:text-red-400">
                      {connectionError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        retryConnection();
                        setShowSessionsMenu(false);
                      }}
                      className="mt-2 text-[11px] font-semibold text-[#28b8d5] hover:text-[#28b8d5]/90 transition-colors"
                    >
                      Reintentar
                    </button>
                  </div>
                )}
                {sessions.length === 0 && (
                  <p className="px-3 py-2 text-[11px] text-gray-500 dark:text-white/35">
                    Sin chats aún.
                  </p>
                )}
                {!connectionError && sessions.length > 0 && filteredSessions.length === 0 && (
                  <p className="px-3 py-2 text-[11px] text-gray-500 dark:text-white/35">
                    No hay resultados.
                  </p>
                )}
                {filteredSessions.map((s) => {
                  const active = s.id === sessionId;
                  const editing = s.id === editingSessionId;
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (editing) return;
                        selectSession(s.id);
                        setShowSessionsMenu(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (editing) return;
                          selectSession(s.id);
                          setShowSessionsMenu(false);
                        }
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer border-b border-gray-50 dark:border-white/[0.03] ${
                        active
                          ? "bg-[#28b8d5]/5"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-medium truncate ${
                          active ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-white/70"
                        }`}
                        >
                          {editing ? (
                            <input
                              value={editingSessionTitle}
                              onChange={(e) => setEditingSessionTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void renameSession(s.id, editingSessionTitle);
                                  setEditingSessionId(null);
                                  setEditingSessionTitle("");
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditingSessionId(null);
                                  setEditingSessionTitle("");
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-white/70 dark:bg-black/20 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-gray-800 dark:text-white/80 outline-none focus:ring-2 focus:ring-[#28b8d5]/25"
                              autoFocus
                            />
                          ) : (
                            s.title || "Nuevo chat"
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-white/25">
                          {s.message_count} mensaje{s.message_count !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!editing && (
                          <button
                            type="button"
                            title="Renombrar chat"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(s.id);
                              setEditingSessionTitle(s.title || "");
                            }}
                            disabled={!!connectionError}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                          >
                            <Pencil size={12} />
                          </button>
                        )}

                        {editing && (
                          <button
                            type="button"
                            title="Guardar"
                            onClick={(e) => {
                              e.stopPropagation();
                              void renameSession(s.id, editingSessionTitle);
                              setEditingSessionId(null);
                              setEditingSessionTitle("");
                            }}
                            className="p-1.5 rounded-lg text-[#28b8d5] hover:bg-[#28b8d5]/10 transition-colors"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        {editing && (
                          <button
                            type="button"
                            title="Cancelar"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(null);
                              setEditingSessionTitle("");
                            }}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                          >
                            <X size={12} />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Eliminar chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteSession(s.id);
                          }}
                          disabled={!!connectionError}
                          className="p-1.5 rounded-lg text-gray-400 dark:text-white/25 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Connection error banner */}
        {connectionError && (
          <div className="px-4 py-2 border-b border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10">
            <p className="text-[11px] text-red-700 dark:text-red-400">
              {connectionError}
            </p>
            <button
              type="button"
              onClick={retryConnection}
              className="mt-1 text-[11px] font-semibold text-[#28b8d5] hover:text-[#28b8d5]/90 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
	
	        {/* Messages */}
	        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
              <div className="w-12 h-12 rounded-2xl bg-[#28b8d5]/10 flex items-center justify-center">
                <Bot size={22} className="text-[#28b8d5]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-gray-700 dark:text-white/70">
                  ¿En qué puedo ayudarte?
                </p>
                <p className="text-[11px] text-gray-400 dark:text-white/30 mt-1">
                  Puedo generar, completar o modificar este artefacto.
                </p>
              </div>

              {/* Quick prompts */}
              <div className="w-full space-y-1.5 mt-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl border border-gray-100 dark:border-white/[0.06] hover:border-[#28b8d5]/30 hover:bg-[#28b8d5]/5 dark:hover:bg-[#28b8d5]/[0.06] transition-colors group"
                  >
                    <ChevronRight size={11} className="text-[#28b8d5] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    <span className="text-[11px] text-gray-600 dark:text-white/50">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={msg.isStreaming}
              suggestedArtifact={msg.suggestedArtifact}
              artifactCode={artifactCode}
              currentArtifact={currentArtifact}
              onApply={handleApply}
              onDismiss={dismissArtifact}
              hasInlinePreview={!!onPreviewArtifact}
            />
          ))}

          {/* Generating artifact indicator */}
          {isGeneratingArtifact && (
            <div className="flex items-center gap-2 text-[11px] text-[#28b8d5]">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              Generando artefacto...
            </div>
          )}

		          <div ref={messagesEndRef} />
		        </div>

		        {/* Pinned preview card — near composer when inline preview is active */}
		        {onPreviewArtifact && pendingArtifact && (
		          <div className="flex-shrink-0 mx-3 mb-2 rounded-xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50/80 dark:bg-emerald-500/[0.07] overflow-hidden">
		            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
		              <div className="flex items-center gap-1.5">
		                <Sparkles size={11} className="text-emerald-600 dark:text-emerald-400" />
		                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
		                  Vista previa activa
		                </span>
		              </div>
		              <button
		                onClick={() => setShowPinnedDiff((p) => !p)}
		                className="flex items-center gap-1 text-[10px] text-emerald-600/70 dark:text-emerald-400/60 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded"
		              >
		                <Eye size={10} />
		                {showPinnedDiff ? "Ocultar diff" : "Ver diff"}
		              </button>
		            </div>

		            {pinnedSummary && (
		              <div className="px-3 pb-1">
		                <div className="flex items-center gap-2 flex-wrap">
		                  {pinnedSummary.added > 0 && (
		                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
		                      +{pinnedSummary.added}
		                    </span>
		                  )}
		                  {pinnedSummary.removed > 0 && (
		                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
		                      −{pinnedSummary.removed}
		                    </span>
		                  )}
		                  {pinnedSummary.modified > 0 && (
		                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
		                      ~{pinnedSummary.modified}
		                    </span>
		                  )}
		                  {pinnedSummary.inferred > 0 && (
		                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-700/80 dark:text-emerald-400/80">
		                      {pinnedSummary.inferred} inferida{pinnedSummary.inferred !== 1 ? "s" : ""}
		                    </span>
		                  )}
		                  {!pinnedSummary.hasChanges && (
		                    <span className="text-[10px] text-gray-500 dark:text-white/35">
		                      Sin cambios detectados
		                    </span>
		                  )}
		                </div>
		              </div>
		            )}

		            {showPinnedDiff && (
		              <div className="px-3 pb-2 border-b border-emerald-200/60 dark:border-emerald-500/15">
		                <ArtifactDiffViewer
		                  artifactCode={artifactCode}
		                  current={currentArtifact}
		                  proposed={pendingArtifact}
		                />
		              </div>
		            )}

		            <div className="flex items-center justify-between gap-2 px-3 py-2">
		              <div className="flex items-center gap-2">
		                <button
		                  onClick={() => handleApply(pendingArtifact)}
		                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-500 transition-colors"
		                >
		                  <Check size={11} />
		                  Aceptar
		                </button>
		                <button
		                  onClick={handleDiscard}
		                  className="px-3 py-1.5 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
		                >
		                  Descartar
		                </button>
		              </div>

		              <div className="flex items-center gap-1.5">
		                <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60">
		                  ¿Útil?
		                </span>
		                <button
		                  onClick={() => {
		                    void sendFeedback({ rating: "up" });
		                  }}
		                  title="Útil"
		                  className={`p-1.5 rounded-lg transition-colors ${
		                    feedbackRating === "up"
		                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
		                      : "text-emerald-700/60 dark:text-emerald-400/50 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/15"
		                  }`}
		                >
		                  <ThumbsUp size={13} />
		                </button>
		                <button
		                  onClick={() => {
		                    setFeedbackRating("down");
		                    setShowFeedback(true);
		                  }}
		                  title="No útil"
		                  className={`p-1.5 rounded-lg transition-colors ${
		                    feedbackRating === "down"
		                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
		                      : "text-emerald-700/60 dark:text-emerald-400/50 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/15"
		                  }`}
		                >
		                  <ThumbsDown size={13} />
		                </button>
		              </div>
		            </div>

		            {showFeedback && (
		              <div className="px-3 pb-3 border-t border-emerald-200/60 dark:border-emerald-500/15 pt-2">
		                <div className="flex items-center justify-between gap-2 mb-2">
		                  <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/60">
		                    Tu feedback ajusta la próxima propuesta
		                  </p>
		                  <button
		                    onClick={() => {
		                      setFeedbackRating(null);
		                      setFeedbackReasons([]);
		                      setFeedbackComment("");
		                      setShowFeedback(false);
		                    }}
		                    className="flex items-center gap-1 text-[10px] text-emerald-600/70 dark:text-emerald-400/60 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded"
		                  >
		                    <RotateCcw size={10} />
		                    Limpiar
		                  </button>
		                </div>

		                <div className="flex flex-wrap gap-1.5">
		                  {feedbackOptions.map((reason) => {
		                    const active = feedbackReasons.includes(reason);
		                    return (
		                      <button
		                        key={reason}
		                        onClick={() => toggleReason(reason)}
		                        className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
		                          active
		                            ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-100/70 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
		                            : "border-emerald-200/60 dark:border-emerald-500/20 bg-white/50 dark:bg-black/10 text-emerald-700/80 dark:text-emerald-400/70 hover:bg-emerald-100/60 dark:hover:bg-emerald-500/10"
		                        }`}
		                      >
		                        {reason}
		                      </button>
		                    );
		                  })}
		                </div>

		                <textarea
		                  value={feedbackComment}
		                  onChange={(e) => setFeedbackComment(e.target.value)}
		                  placeholder="Opcional: un comentario breve"
		                  className="mt-2 w-full min-h-[60px] resize-none rounded-lg border border-emerald-200/60 dark:border-emerald-500/20 bg-white/70 dark:bg-black/20 px-2.5 py-2 text-[11px] text-gray-700 dark:text-white/70 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
		                />

		                <div className="flex items-center gap-2 mt-2">
		                  <button
		                    onClick={() => void sendFeedback({ discardAfter: true, rating: "down" })}
		                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-500 transition-colors"
		                  >
		                    Enviar y descartar
		                  </button>
		                  <button
		                    onClick={() => void sendFeedback({ rating: "down" })}
		                    className="px-3 py-1.5 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
		                  >
		                    Solo enviar
		                  </button>
		                </div>
		              </div>
		            )}
		          </div>
		        )}

		        {/* Undo snackbar */}
		        {undoState && (
		          <div className="flex-shrink-0 px-3 pb-2">
		            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-3 py-2">
	              <p className="text-[11px] text-gray-700 dark:text-white/70">
	                {undoState.kind === "apply" ? "Cambios aplicados." : "Propuesta descartada."}
	              </p>
	              <button
	                onClick={handleUndo}
	                className="text-[11px] font-semibold text-[#28b8d5] hover:text-[#28b8d5]/90 transition-colors"
	              >
	                {undoState.kind === "apply" ? "Deshacer" : "Restaurar"}
	              </button>
	            </div>
	          </div>
	        )}

	        {/* Coherence checking indicator */}
	        {isCheckingCoherence && (
	          <div className="flex-shrink-0 px-3 pb-2">
	            <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/80 dark:bg-amber-500/[0.07] px-3 py-2">
	              <svg className="animate-spin w-3 h-3 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none">
	                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
	              </svg>
	              <span className="text-[11px] text-amber-700 dark:text-amber-400">
	                Verificando coherencia con artefactos hermanos...
	              </span>
	            </div>
	          </div>
	        )}

	        {/* Coherence warnings banner */}
	        {coherenceReport && !isCheckingCoherence && (
	          <div className="flex-shrink-0 px-3 pb-2">
	            <div className="rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/80 dark:bg-amber-500/[0.07] overflow-hidden">
	              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
	                <div className="flex items-center gap-1.5">
	                  <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
	                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
	                    {coherenceReport.issues.length === 1
	                      ? "1 posible incoherencia"
	                      : `${coherenceReport.issues.length} posibles incoherencias`}
	                  </span>
	                </div>
	                <button
	                  onClick={dismissCoherence}
	                  className="text-amber-600/60 dark:text-amber-400/50 hover:text-amber-700 dark:hover:text-amber-400 transition-colors p-0.5"
	                  aria-label="Descartar advertencias"
	                >
	                  <X size={12} />
	                </button>
	              </div>
	              <p className="px-3 pb-1.5 text-[10px] text-amber-700/70 dark:text-amber-400/60">
	                {coherenceReport.summary}
	              </p>
	              <div className="px-3 pb-2.5 space-y-1.5">
	                {coherenceReport.issues.map((issue, i) => (
	                  <div
	                    key={i}
	                    className={`rounded-lg px-2.5 py-1.5 border text-[10px] ${
	                      issue.severity === "error"
	                        ? "border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/[0.06]"
	                        : issue.severity === "warning"
	                        ? "border-amber-200/80 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/[0.04]"
	                        : "border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]"
	                    }`}
	                  >
	                    <p className={`font-medium mb-0.5 ${
	                      issue.severity === "error"
	                        ? "text-red-700 dark:text-red-400"
	                        : issue.severity === "warning"
	                        ? "text-amber-700 dark:text-amber-400"
	                        : "text-gray-600 dark:text-white/50"
	                    }`}>
	                      {issue.affected_artifact} — {issue.description}
	                    </p>
	                    <p className="text-gray-500 dark:text-white/35 italic">
	                      {issue.suggestion}
	                    </p>
	                  </div>
	                ))}
	              </div>
	            </div>
	          </div>
	        )}

	        {/* Input */}
	        <div className="flex-shrink-0 border-t border-gray-100 dark:border-white/[0.06] p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex items-end gap-2 bg-gray-50 dark:bg-white/[0.04] rounded-xl border border-gray-200 dark:border-white/[0.08] px-3 py-2 focus-within:border-[#28b8d5]/40 dark:focus-within:border-[#28b8d5]/30 transition-colors">
            <button
              type="button"
              title="Adjuntar documento"
              disabled={!sessionId || !!connectionError || uploadStatus === "uploading"}
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 dark:text-white/25 hover:text-[#28b8d5] hover:bg-[#28b8d5]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              <Paperclip size={13} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || !!connectionError}
              rows={1}
              placeholder={connectionError ? "Sin conexión con el backend…" : "Escribe una instrucción... (Enter para enviar)"}
              className="flex-1 bg-transparent text-[12px] text-gray-800 dark:text-white/80 placeholder:text-gray-400 dark:placeholder:text-white/20 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto disabled:opacity-50"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !!connectionError}
              className="flex-shrink-0 p-1.5 rounded-lg bg-[#28b8d5] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#28b8d5]/90 transition-colors"
            >
              {loading ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                </svg>
              ) : (
                <Send size={13} />
              )}
            </button>
          </div>

          {/* Upload status */}
          {uploadStatus !== "idle" && (
            <div className={`mt-1.5 flex items-center gap-1.5 px-1 ${
              uploadStatus === "error"
                ? "text-red-500 dark:text-red-400"
                : uploadStatus === "done"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-400 dark:text-white/30"
            }`}>
              {uploadStatus === "uploading" && (
                <svg className="animate-spin w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                </svg>
              )}
              {uploadStatus === "done" && <Check size={11} className="flex-shrink-0" />}
              {uploadStatus === "error" && <AlertTriangle size={11} className="flex-shrink-0" />}
              <span className="text-[10px] truncate max-w-[260px]">
                {uploadStatus === "uploading" && `Subiendo ${uploadFileName}…`}
                {uploadStatus === "done" && `${uploadFileName} subido — se vectorizará en breve.`}
                {uploadStatus === "error" && `Error al subir ${uploadFileName}.`}
              </span>
            </div>
          )}

          {uploadStatus === "idle" && (
            <p className="text-[10px] text-gray-400 dark:text-white/20 mt-1.5 text-center">
              Shift+Enter para nueva línea
            </p>
          )}
        </div>
      </div>
  );
}

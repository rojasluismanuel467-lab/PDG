"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  aiChatApi,
  getApiBaseUrl,
  type ChatMessage,
  type ChatSession,
  type CoherenceReport,
} from "@/lib/api/ai-chat";

export interface ChatMessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedArtifact: Record<string, unknown> | null;
  isStreaming?: boolean;
}

function storageKey(projectId: string, artifactCode: string): string {
  return `artifactChatSession:${projectId}:${artifactCode}`;
}

function readStoredSessionId(projectId: string, artifactCode: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(storageKey(projectId, artifactCode));
}

function storeSessionId(projectId: string, artifactCode: string, sessionId: string | null) {
  if (typeof window === "undefined") return;
  const key = storageKey(projectId, artifactCode);
  if (!sessionId) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, sessionId);
}

function buildConnError(message: string): string {
  return `${message} (API: ${getApiBaseUrl()})`;
}

function toErrorString(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

interface UseArtifactChatOptions {
  projectId: string;
  artifactCode: string;
  /** Estado actual del artefacto en el editor (para contexto de la IA). */
  currentArtifact: Record<string, unknown>;
  enabled: boolean;
}

export function useArtifactChat({
  projectId,
  artifactCode,
  currentArtifact,
  enabled,
}: UseArtifactChatOptions) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingArtifact, setPendingArtifact] =
    useState<Record<string, unknown> | null>(null);
  const [isGeneratingArtifact, setIsGeneratingArtifact] = useState(false);
  const [coherenceReport, setCoherenceReport] =
    useState<CoherenceReport | null>(null);
  const [isCheckingCoherence, setIsCheckingCoherence] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Cargar sesiones ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled || sessionsLoaded) return;
    let cancelled = false;

    aiChatApi
      .listSessions(projectId, artifactCode)
      .then(async (res) => {
        if (cancelled) return;
        let list = res.sessions ?? [];

        if (list.length === 0) {
          const created = await aiChatApi.createSession(projectId, artifactCode);
          list = [created];
        }

        setConnectionError(null);
        setSessions(list);

        const stored = readStoredSessionId(projectId, artifactCode);
        const preferred = stored && list.some((s) => s.id === stored) ? stored : list[0]!.id;
        setSessionId(preferred);
        storeSessionId(projectId, artifactCode, preferred);

        setSessionsLoaded(true);
      })
      .catch((err) => {
        setConnectionError(buildConnError(
          `No se pudo conectar con el backend. ${toErrorString(err)}`,
        ));
        setSessionsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, projectId, artifactCode, sessionsLoaded]);

  // ── Cargar historial de la sesión activa ───────────────────────────────────

  useEffect(() => {
    if (!enabled || !sessionId) return;
    let cancelled = false;
    setHistoryLoaded(false);
    setPendingArtifact(null);

    aiChatApi
      .getHistory(projectId, artifactCode, sessionId)
      .then((res) => {
        if (cancelled) return;
        const uiMessages: ChatMessageUI[] = res.messages
          .filter((m): m is ChatMessage & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant",
          )
          .map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            suggestedArtifact: m.suggested_artifact as Record<string, unknown> | null,
          }));
        setMessages(uiMessages);
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));

    return () => {
      cancelled = true;
    };
  }, [enabled, projectId, artifactCode, sessionId]);

  // ── Enviar mensaje ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !sessionId) return;

      const userMsg: ChatMessageUI = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        suggestedArtifact: null,
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessageUI = {
        id: assistantId,
        role: "assistant",
        content: "",
        suggestedArtifact: null,
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);
      setPendingArtifact(null);

      abortRef.current = new AbortController();

      try {
        await aiChatApi.sendMessage(
          projectId,
          artifactCode,
          sessionId,
          text,
          currentArtifact,
          (event) => {
            if (event.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m,
                ),
              );
            } else if (event.type === "generating_artifact") {
              setIsGeneratingArtifact(true);
            } else if (event.type === "artifact") {
              setIsGeneratingArtifact(false);
              const artifact = event.data as Record<string, unknown>;
              setPendingArtifact(artifact);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, suggestedArtifact: artifact }
                    : m,
                ),
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m,
                ),
              );
            }
          },
          abortRef.current.signal,
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setConnectionError(buildConnError(
            "No se pudo conectar con el backend. Verifica `NEXT_PUBLIC_API_URL` y que el API esté activo.",
          ));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content || "Error al conectar con la IA.",
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setLoading(false);
        setIsGeneratingArtifact(false);
      }
    },
    [loading, projectId, artifactCode, sessionId, currentArtifact],
  );

  const clearHistory = useCallback(async () => {
    if (!sessionId) return;
    try {
      await aiChatApi.clearHistory(projectId, artifactCode, sessionId);
      setConnectionError(null);
      setMessages([]);
      setPendingArtifact(null);
      setHistoryLoaded(false);
    } catch (err) {
      setConnectionError(buildConnError(
        `No se pudo borrar el historial. ${toErrorString(err)}`,
      ));
    }
  }, [projectId, artifactCode, sessionId]);

  const startNewChat = useCallback(async () => {
    try {
      const created = await aiChatApi.createSession(projectId, artifactCode);
      setConnectionError(null);
      setSessions((prev) => [created, ...prev]);
      setSessionId(created.id);
      storeSessionId(projectId, artifactCode, created.id);
      setMessages([]);
      setPendingArtifact(null);
    } catch (err) {
      setConnectionError(buildConnError(
        `No se pudo crear un chat nuevo. ${toErrorString(err)}`,
      ));
    }
  }, [projectId, artifactCode]);

  const selectSession = useCallback((id: string) => {
    setSessionId(id);
    storeSessionId(projectId, artifactCode, id);
    setMessages([]);
    setPendingArtifact(null);
  }, [projectId, artifactCode]);

  const renameSession = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await aiChatApi.renameSession(projectId, artifactCode, id, trimmed);
      setConnectionError(null);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)),
      );
    } catch (err) {
      setConnectionError(buildConnError(
        `No se pudo renombrar el chat. ${toErrorString(err)}`,
      ));
    }
  }, [projectId, artifactCode]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await aiChatApi.deleteSession(projectId, artifactCode, id);
      setConnectionError(null);

      const wasActive = sessionId === id;
      const nextSessions = sessions.filter((s) => s.id !== id);

      setSessions(nextSessions);

      if (!wasActive) return;

      const nextId = nextSessions[0]?.id ?? null;
      if (nextId) {
        setSessionId(nextId);
        storeSessionId(projectId, artifactCode, nextId);
        return;
      }

      // If the last session was deleted, create a fresh one
      const created = await aiChatApi.createSession(projectId, artifactCode);
      setSessions([created]);
      setSessionId(created.id);
      storeSessionId(projectId, artifactCode, created.id);
    } catch (err) {
      setConnectionError(buildConnError(
        `No se pudo eliminar el chat. ${toErrorString(err)}`,
      ));
    }
  }, [projectId, artifactCode, sessionId, sessions]);

  const retryConnection = useCallback(() => {
    setConnectionError(null);
    setSessionsLoaded(false);
    setHistoryLoaded(false);
    setSessions([]);
    setSessionId(null);
    setMessages([]);
    setPendingArtifact(null);
  }, []);

  const dismissArtifact = useCallback(() => {
    setPendingArtifact(null);
  }, []);

  const restoreArtifact = useCallback((artifact: Record<string, unknown>) => {
    setPendingArtifact(artifact);
  }, []);

  const checkCoherence = useCallback(
    async (artifactJson: Record<string, unknown>) => {
      setIsCheckingCoherence(true);
      try {
        const report = await aiChatApi.checkCoherence(
          projectId,
          artifactCode,
          artifactJson,
        );
        setCoherenceReport(
          report.overall !== "consistent" ? report : null,
        );
      } catch {
        // non-blocking — silent on error
      } finally {
        setIsCheckingCoherence(false);
      }
    },
    [projectId, artifactCode],
  );

  const dismissCoherence = useCallback(() => setCoherenceReport(null), []);

  return {
    sessions,
    sessionId,
    startNewChat,
    selectSession,
    renameSession,
    deleteSession,
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
  };
}

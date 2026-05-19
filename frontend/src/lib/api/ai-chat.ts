const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function getApiBaseUrl() {
  return API_BASE;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  suggested_artifact: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  last_message_at: string | null;
  message_count: number;
}

export interface ChatSessionsResponse {
  sessions: ChatSession[];
}

export interface ChatHistoryResponse {
  session_id: string | null;
  messages: ChatMessage[];
}

export interface CoherenceIssue {
  severity: "error" | "warning" | "info";
  description: string;
  affected_artifact: string;
  suggestion: string;
}

export interface CoherenceReport {
  issues: CoherenceIssue[];
  overall: "consistent" | "minor_issues" | "major_issues";
  summary: string;
}

export type SSEEvent =
  | { type: "token"; content: string }
  | { type: "generating_artifact" }
  | { type: "artifact"; data: Record<string, unknown> }
  | { type: "done"; content: string }
  | { type: "error"; content: string };

function getAuthHeader(): string {
  if (typeof window === "undefined") return "";
  return `Bearer ${localStorage.getItem("token") ?? ""}`;
}

async function throwApiError(res: Response): Promise<never> {
  if (res.status === 401 && typeof window !== "undefined") {
    window.localStorage.removeItem("token");
    window.location.href = "/signin";
  }
  let detail = "";
  try {
    const text = await res.text();
    detail = text ? ` — ${text.slice(0, 200)}` : "";
  } catch {
    // ignore
  }
  throw new Error(`HTTP ${res.status}${detail}`);
}

export const aiChatApi = {
  async listSessions(
    projectId: string,
    artifactCode: string,
  ): Promise<ChatSessionsResponse> {
    const base = getApiBaseUrl();
    const res = await fetch(
      `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions`,
      { headers: { Authorization: getAuthHeader() } },
    );
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async createSession(
    projectId: string,
    artifactCode: string,
    title?: string,
  ): Promise<ChatSession> {
    const base = getApiBaseUrl();
    const res = await fetch(
      `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ title }),
      },
    );
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async renameSession(
    projectId: string,
    artifactCode: string,
    sessionId: string,
    title: string,
  ): Promise<void> {
    const base = getApiBaseUrl();
    const res = await fetch(
      `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions/${sessionId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ title }),
      },
    );
    if (!res.ok) await throwApiError(res);
  },

  async deleteSession(
    projectId: string,
    artifactCode: string,
    sessionId: string,
  ): Promise<void> {
    const base = getApiBaseUrl();
    const res = await fetch(
      `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions/${sessionId}`,
      {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      },
    );
    if (!res.ok) await throwApiError(res);
  },

  async getHistory(
    projectId: string,
    artifactCode: string,
    sessionId?: string,
  ): Promise<ChatHistoryResponse> {
    const base = getApiBaseUrl();
    const res = await fetch(
      sessionId
        ? `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions/${sessionId}/history`
        : `${base}/projects/${projectId}/ai/chat/${artifactCode}/history`,
      { headers: { Authorization: getAuthHeader() } },
    );
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  sendMessage(
    projectId: string,
    artifactCode: string,
    sessionId: string | null,
    message: string,
    currentArtifact: Record<string, unknown>,
    onEvent: (event: SSEEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const base = getApiBaseUrl();
    const url = sessionId
      ? `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions/${sessionId}/message`
      : `${base}/projects/${projectId}/ai/chat/${artifactCode}/message`;
    return new Promise((resolve, reject) => {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          message,
          current_artifact: currentArtifact,
        }),
        signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            try {
              await throwApiError(res);
            } catch (err) {
              reject(err);
            }
            return;
          }
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const event = JSON.parse(line.slice(6)) as SSEEvent;
                onEvent(event);
                if (event.type === "done" || event.type === "error") {
                  resolve();
                  return;
                }
              } catch {
                // ignore malformed lines
              }
            }
          }
          resolve();
        })
        .catch(reject);
    });
  },

  async uploadFile(
    projectId: string,
    artifactCode: string,
    sessionId: string,
    file: File,
  ): Promise<{
    id: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    status: string;
    phase: string;
  }> {
    const base = getApiBaseUrl();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions/${sessionId}/upload`,
      {
        method: "POST",
        headers: { Authorization: getAuthHeader() },
        body: form,
      },
    );
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async checkCoherence(
    projectId: string,
    artifactCode: string,
    artifactJson: Record<string, unknown>,
  ): Promise<CoherenceReport> {
    const base = getApiBaseUrl();
    const res = await fetch(
      `${base}/projects/${projectId}/ai/artifacts/${artifactCode}/coherence-check`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ artifact_json: artifactJson }),
      },
    );
    if (!res.ok) await throwApiError(res);
    return res.json();
  },

  async clearHistory(
    projectId: string,
    artifactCode: string,
    sessionId?: string,
  ): Promise<void> {
    const base = getApiBaseUrl();
    const res = await fetch(
      sessionId
        ? `${base}/projects/${projectId}/ai/chat/${artifactCode}/sessions/${sessionId}/history`
        : `${base}/projects/${projectId}/ai/chat/${artifactCode}/history`,
      {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      },
    );
    if (!res.ok) await throwApiError(res);
  },
};

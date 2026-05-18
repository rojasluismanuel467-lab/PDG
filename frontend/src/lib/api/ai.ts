import { apiClient } from "@/lib/api/client";

// ── Params ──────────────────────────────────────────────────────────────────

export interface AIGenerateParams {
  contextText: string;
  consultantNote: string;
  docLanguage: string;
}

// ── AI response types ────────────────────────────────────────────────────────

export interface AISystemSuggestion {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string;
  tecnologia: string | null;
  proveedor: string | null;
  propietario_negocio: string | null;
  criticidad: string | null;
  estado: string | null;
  datos_que_maneja: string[];
  razon_inclusion: string;
}

export interface AIInventorySuggestion {
  sistemas: AISystemSuggestion[];
  notas_generales: string;
  confianza: string;
}

export interface AIAttributeSuggestion {
  nombre: string;
  tipo_dato: string;
  descripcion: string;
  es_clave: boolean;
}

export interface AIEntitySuggestion {
  client_id: string;
  nombre: string;
  descripcion: string;
  atributos: AIAttributeSuggestion[];
  razon_inclusion: string;
}

export interface AIRelationSuggestion {
  desde: string;
  hacia: string;
  etiqueta: string;
  cardinalidad: "1:1" | "1:N" | "N:1" | "N:M";
  descripcion: string;
}

export interface AIConceptualSuggestion {
  entidades: AIEntitySuggestion[];
  relaciones: AIRelationSuggestion[];
  notas_generales: string;
  confianza: string;
}

export interface AIGenerateResponse<T> {
  artifact_code: string;
  project_id: string;
  suggestion: T;
}

// ── Document types ───────────────────────────────────────────────────────────

export interface ProjectDocument {
  id: string;
  project_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "ERROR";
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const aiApi = {
  async generateAsis(
    projectId: string,
    artifactCode: string,
    params: AIGenerateParams,
  ): Promise<AIGenerateResponse<AIInventorySuggestion | AIConceptualSuggestion>> {
    const { data } = await apiClient.post(
      `/projects/${projectId}/ai/asis/${artifactCode}/generate`,
      {
        context_text: params.contextText,
        consultant_note: params.consultantNote,
        doc_language: params.docLanguage,
      },
    );
    return data;
  },

  async generateTobe(
    projectId: string,
    artifactCode: string,
    params: AIGenerateParams,
  ): Promise<AIGenerateResponse<AIInventorySuggestion | AIConceptualSuggestion>> {
    const { data } = await apiClient.post(
      `/projects/${projectId}/ai/tobe/${artifactCode}/generate`,
      {
        context_text: params.contextText,
        consultant_note: params.consultantNote,
        doc_language: params.docLanguage,
      },
    );
    return data;
  },

  async listDocuments(projectId: string): Promise<ProjectDocument[]> {
    const { data } = await apiClient.get<ProjectDocument[]>(
      `/projects/${projectId}/ai/documents`,
    );
    return data;
  },

  async uploadDocument(projectId: string, file: File): Promise<ProjectDocument> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<ProjectDocument>(
      `/projects/${projectId}/ai/documents`,
      form,
    );
    return data;
  },

  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/ai/documents/${documentId}`);
  },
};

import { apiClient } from "@/lib/api/client";
import axios from "axios";
import type {
  AnularResponseRequest,
  CuestionarioConfigResponse,
  GetResponsesResponse,
  MaturityResultsResponse,
  PublicQuestionnaireValidationResponse,
  ResponseDTO,
  SubmitResponseRequest,
  EvidenceUploadResponse,
  FinalizeEvaluationRequest,
  UpdateEstadoResponse,
  ValidateAnswerRequest,
} from "@/lib/types/maturity.types";

export const maturityApi = {
  async getConfig(projectId: string): Promise<CuestionarioConfigResponse> {
    const { data } = await apiClient.get<CuestionarioConfigResponse>(
      `/proyectos/${projectId}/cuestionario/config`
    );
    return data;
  },

  async updateConfig(
    projectId: string,
    payload: {
      questions: Array<{
      dimension_id: number;
      subdomain_id: number;
      text: string;
      applicable_roles: string[];
      weight?: number;
      score_criteria?: Array<{
        score: number;
        name: string;
        description: string;
      }>;
      }>;
      dimension_weights?: Record<number, number>;
      roles?: Array<{
        id: string;
        name: string;
        description: string;
      }>;
      score_criteria?: Array<{
        score: number;
        name: string;
        description: string;
      }>;
    }
  ): Promise<CuestionarioConfigResponse> {
    const { data } = await apiClient.post<CuestionarioConfigResponse>(
      `/proyectos/${projectId}/cuestionario/config`,
      {
        phase: "AS_IS",
        questions: payload.questions,
        dimension_weights: payload.dimension_weights ?? {},
        roles: payload.roles ?? [],
        score_criteria: payload.score_criteria ?? [],
      }
    );
    return data;
  },

  async validateAccess(accessCode: string): Promise<PublicQuestionnaireValidationResponse> {
    const { data } = await apiClient.get<PublicQuestionnaireValidationResponse>(
      `/questionnaire/validate/${accessCode}`
    );
    return data;
  },

  async getPublicConfig(accessCode: string): Promise<CuestionarioConfigResponse> {
    const { data } = await apiClient.get<CuestionarioConfigResponse>(
      `/questionnaire/config/${accessCode}`
    );
    return data;
  },

  async getResponses(
    projectId: string,
    status?: "active" | "anulada" | "all"
  ): Promise<GetResponsesResponse> {
    const params = status && status !== "all" ? { status } : undefined;
    const { data } = await apiClient.get<GetResponsesResponse>(
      `/proyectos/${projectId}/cuestionario/respuestas`,
      { params }
    );
    return data;
  },

  async submitResponse(
    projectId: string,
    code: string,
    payload: SubmitResponseRequest
  ): Promise<{ id: string; message: string; submitted_at: string }> {
    const { data } = await apiClient.post(
      `/proyectos/${projectId}/cuestionario/respuestas`,
      payload,
      { params: { code } }
    );
    return data;
  },

  async uploadEvidence(
    projectId: string,
    code: string,
    file: File
  ): Promise<EvidenceUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await apiClient.post<EvidenceUploadResponse>(
        `/proyectos/${projectId}/cuestionario/evidencia`,
        formData,
        {
          params: { code },
        }
      );
      return data;
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        throw error;
      }
      const { data } = await apiClient.post<EvidenceUploadResponse>(
        `/projects/${projectId}/questionnaire/evidence-upload`,
        formData,
        {
          params: { code },
        }
      );
      return data;
    }
  },

  async anularResponse(responseId: string, payload: AnularResponseRequest): Promise<ResponseDTO> {
    const { data } = await apiClient.patch<ResponseDTO>(
      `/cuestionario/respuestas/${responseId}/anular`,
      payload
    );
    return data;
  },

  async reactivarResponse(responseId: string): Promise<ResponseDTO> {
    const { data } = await apiClient.patch<ResponseDTO>(
      `/cuestionario/respuestas/${responseId}/reactivar`
    );
    return data;
  },

  async validateAnswer(
    responseId: string,
    answerId: string,
    payload: ValidateAnswerRequest
  ): Promise<ResponseDTO> {
    const { data } = await apiClient.patch<ResponseDTO>(
      `/cuestionario/respuestas/${responseId}/answers/${answerId}/validate`,
      payload
    );
    return data;
  },

  async finalizeEvaluation(
    responseId: string,
    payload: FinalizeEvaluationRequest
  ): Promise<ResponseDTO> {
    const { data } = await apiClient.patch<ResponseDTO>(
      `/cuestionario/respuestas/${responseId}/finalizar-evaluacion`,
      payload
    );
    return data;
  },

  async updateEstado(projectId: string, isClosed: boolean): Promise<UpdateEstadoResponse> {
    const { data } = await apiClient.patch<UpdateEstadoResponse>(
      `/proyectos/${projectId}/cuestionario/estado`,
      { is_closed: isClosed }
    );
    return data;
  },

  async getResultados(projectId: string): Promise<MaturityResultsResponse> {
    const { data } = await apiClient.get<MaturityResultsResponse>(
      `/proyectos/${projectId}/cuestionario/resultados`
    );
    return data;
  },
};

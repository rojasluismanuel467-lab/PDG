import { apiClient } from "@/lib/api/client";
import type {
  CreateProjectRequest,
  ProjectArtifact,
  ProjectDetailResponse,
  ProjectListResponse,
  ProjectResponse,
  ReviewArtifactRequest,
  UpdateArtifactRequest,
  UpdateProjectRequest,
} from "@/lib/types/project.types";

export const projectsApi = {
  async list(): Promise<ProjectResponse[]> {
    const { data } = await apiClient.get<ProjectListResponse>("/projects");
    return data.items;
  },

  async getById(projectId: string): Promise<ProjectDetailResponse> {
    const { data } = await apiClient.get<ProjectDetailResponse>(`/projects/${projectId}`);
    return data;
  },

  async create(payload: CreateProjectRequest): Promise<ProjectDetailResponse> {
    const { data } = await apiClient.post<ProjectDetailResponse>("/projects", payload);
    return data;
  },

  async update(projectId: string, payload: UpdateProjectRequest): Promise<ProjectDetailResponse> {
    const { data } = await apiClient.patch<ProjectDetailResponse>(`/projects/${projectId}`, payload);
    return data;
  },

  async listArtifacts(projectId: string): Promise<ProjectArtifact[]> {
    const { data } = await apiClient.get<{ total: number; items: ProjectArtifact[] }>(
      `/projects/${projectId}/artifacts`
    );
    return data.items;
  },

  async updateArtifact(
    projectId: string,
    artifactId: string,
    payload: UpdateArtifactRequest
  ): Promise<ProjectArtifact> {
    const { data } = await apiClient.patch<ProjectArtifact>(
      `/projects/${projectId}/artifacts/${artifactId}`,
      payload
    );
    return data;
  },

  async reviewArtifactConsultant(
    projectId: string,
    artifactId: string,
    payload: ReviewArtifactRequest
  ): Promise<ProjectArtifact> {
    const { data } = await apiClient.post<ProjectArtifact>(
      `/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
      payload
    );
    return data;
  },

  async reviewArtifactCompany(
    projectId: string,
    artifactId: string,
    payload: ReviewArtifactRequest
  ): Promise<ProjectArtifact> {
    const { data } = await apiClient.post<ProjectArtifact>(
      `/projects/${projectId}/artifacts/${artifactId}/review/company`,
      payload
    );
    return data;
  },
};

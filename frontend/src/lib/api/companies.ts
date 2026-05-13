import { apiClient } from "@/lib/api/client";
import type {
  CompanyListResponse,
  CompanyResponse,
  CreateCompanyRequest,
} from "@/lib/types/company.types";

export const companiesApi = {
  async list(search?: string): Promise<CompanyResponse[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const { data } = await apiClient.get<CompanyListResponse>(`/companies${params}`);
    return data.items;
  },

  async create(payload: CreateCompanyRequest): Promise<CompanyResponse> {
    const { data } = await apiClient.post<CompanyResponse>("/companies", payload);
    return data;
  },
};

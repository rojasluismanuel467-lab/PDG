import { apiClient } from "@/lib/api/client";

export interface AuthUserApi {
  id: string;
  nombre: string;
  email: string;
  tipo_usuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA";
  estado: "ACTIVO" | "INACTIVO";
}

export interface TokenPairApi {
  access_token: string;
  refresh_token: string;
  token_type: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export interface AuthLoginApiResponse {
  user: AuthUserApi;
  tokens: TokenPairApi;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthLoginApiResponse> {
    const { data } = await apiClient.post<AuthLoginApiResponse>("/auth/login", {
      email,
      password,
    });
    return data;
  },

  async getMe(): Promise<AuthUserApi> {
    const { data } = await apiClient.get<AuthUserApi>("/auth/me");
    return data;
  },

  async activateInvitation(payload: {
    token: string;
    password: string;
    nombre?: string;
  }): Promise<AuthLoginApiResponse> {
    const { data } = await apiClient.post<AuthLoginApiResponse>(
      "/auth/activate-invitation",
      payload
    );
    return data;
  },

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post("/auth/logout", refreshToken ? { refresh_token: refreshToken } : {});
  },
};

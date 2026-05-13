import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const isFormDataPayload =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormDataPayload && config.headers) {
    const headers = config.headers as unknown as {
      set?: (name: string, value: string | undefined) => void;
      [key: string]: unknown;
    };
    if (typeof headers.set === "function") {
      headers.set("Content-Type", undefined);
    } else {
      delete headers["Content-Type"];
      delete headers["content-type"];
    }
  }

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      window.localStorage.removeItem("token");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

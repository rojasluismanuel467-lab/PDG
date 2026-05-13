"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { authApi, type AuthLoginApiResponse } from "@/lib/api/auth";

export type Perfil = "CONSULTOR" | "EMPRESA" | "ADMIN";

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  perfil: Perfil;
  avatar: string | null;
  estado: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  activateInvitation: (params: {
    token: string;
    password: string;
    nombre?: string;
  }) => Promise<void>;
  logout: (reason?: "inactividad" | "manual") => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "arqdata_auth_user";
const ACCESS_TOKEN_STORAGE_KEY = "token";
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

function rutaPorPerfil(perfil: Perfil): string {
  switch (perfil) {
    case "CONSULTOR":
      return "/consultor/proyectos";
    case "EMPRESA":
      return "/empresa/dashboard";
    case "ADMIN":
      return "/usuarios";
    default:
      return "/";
  }
}

function mapBackendProfile(tipoUsuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA"): Perfil {
  return tipoUsuario === "ADMINISTRADOR" ? "ADMIN" : tipoUsuario;
}

function mapAuthUser(authResponse: AuthLoginApiResponse["user"]): AuthUser {
  return {
    id: authResponse.id,
    nombre: authResponse.nombre,
    email: authResponse.email,
    perfil: mapBackendProfile(authResponse.tipo_usuario),
    avatar: null,
    estado: authResponse.estado,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  const clearSession = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (!token) {
          clearSession();
          return;
        }

        const me = await authApi.getMe();
        if (!isMounted) return;

        const hydratedUser = mapAuthUser(me);
        setUser(hydratedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hydratedUser));
      } catch {
        if (!isMounted) return;
        clearSession();
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const persistSession = useCallback(
    (authResponse: AuthLoginApiResponse) => {
      const authUser = mapAuthUser(authResponse.user);

      setUser(authUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, authResponse.tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, authResponse.tokens.refresh_token);

      router.push(rutaPorPerfil(authUser.perfil));
    },
    [router]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authApi.login(email, password);
        persistSession(response);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.error?.message;
          if (status === 403 && message === "User is not active") {
            throw new Error("CUENTA_INACTIVA");
          }
        }
        throw new Error("Credenciales incorrectas");
      }
    },
    [persistSession]
  );

  const activateInvitation = useCallback(
    async ({ token, password, nombre }: { token: string; password: string; nombre?: string }) => {
      try {
        const response = await authApi.activateInvitation({ token, password, nombre });
        persistSession(response);
      } catch {
        throw new Error("No se pudo activar la invitación");
      }
    },
    [persistSession]
  );

  const logout = useCallback(
    (reason?: "inactividad" | "manual") => {
      const refreshToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
          : null;
      authApi.logout(refreshToken || undefined).catch(() => {
        // No-op: local cleanup still happens.
      });

      clearSession();
      const url = reason === "inactividad" ? "/signin?reason=inactividad" : "/signin";
      router.push(url);
    },
    [clearSession, router]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady,
        login,
        activateInvitation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

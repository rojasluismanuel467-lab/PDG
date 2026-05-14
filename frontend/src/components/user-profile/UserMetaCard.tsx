"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

function getPerfilLabel(perfil?: string) {
  if (perfil === "ADMIN") return "Administrador";
  if (perfil === "CONSULTOR") return "Consultor";
  if (perfil === "EMPRESA") return "Empresa";
  return "Sin perfil";
}

export default function UserMetaCard() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-gray-200 p-5 dark:border-white/[0.08] lg:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando perfil...</p>
      </div>
    );
  }

  const initial = user?.nombre?.trim()?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-white/[0.08] lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center gap-4 xl:flex-row xl:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-2xl font-bold text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white/70">
            {initial}
          </div>

          <div className="text-center xl:text-left">
            <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
              {user?.nombre ?? "Usuario"}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email ?? "Sin email"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-end">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            {getPerfilLabel(user?.perfil)}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              user?.estado === "ACTIVO"
                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300"
            }`}
          >
            {user?.estado ?? "SIN ESTADO"}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export default function UserAddressCard() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-gray-200 p-5 dark:border-white/[0.08] lg:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando cuenta...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-white/[0.08] lg:p-6">
      <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Datos de cuenta
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-24">
        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">ID de usuario</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90 break-all">{user?.id ?? "-"}</p>
        </div>
        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Fuente</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">API real (`/auth/me`)</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <p className="text-xs text-gray-600 dark:text-white/60">
          Esta vista ya no usa datos mock. Muestra únicamente la información disponible en el perfil autenticado.
        </p>
      </div>
    </div>
  );
}

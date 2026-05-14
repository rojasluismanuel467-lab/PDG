"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

function splitName(fullName?: string) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "-",
    lastName: parts.slice(1).join(" ") || "-",
  };
}

function getPerfilLabel(perfil?: string) {
  if (perfil === "ADMIN") return "Administrador";
  if (perfil === "CONSULTOR") return "Consultor";
  if (perfil === "EMPRESA") return "Empresa";
  return "Sin perfil";
}

export default function UserInfoCard() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-gray-200 p-5 dark:border-white/[0.08] lg:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando información...</p>
      </div>
    );
  }

  const { firstName, lastName } = splitName(user?.nombre);

  const fields = [
    { label: "Nombre", value: firstName },
    { label: "Apellido", value: lastName },
    { label: "Nombre completo", value: user?.nombre ?? "-" },
    { label: "Correo", value: user?.email ?? "-" },
    { label: "Perfil", value: getPerfilLabel(user?.perfil) },
    { label: "Estado", value: user?.estado ?? "-" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-white/[0.08] lg:p-6">
      <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Información personal
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-24">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
              {field.label}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{field.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

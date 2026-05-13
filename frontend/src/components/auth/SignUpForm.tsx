"use client";
import Link from "next/link";
import React from "react";

export default function SignUpForm() {
  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-white/40 dark:hover:text-white/70"
        >
          ← Volver
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Solicitar acceso
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Las cuentas son creadas por un administrador de la plataforma o mediante una invitación a proyecto.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
          <p className="mb-4">
            Para ingresar a la plataforma necesitas una cuenta creada por un administrador o una invitación enviada desde un proyecto.
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Si eres parte del equipo consultor, solicita tu cuenta al administrador.</li>
            <li>Si eres usuario empresa, espera la invitación del proyecto y luego activa tu acceso.</li>
          </ul>
        </div>

        <div className="mt-5">
          <p className="text-sm text-center text-gray-700 dark:text-gray-400">
            ¿Ya tienes cuenta o invitación?{" "}
            <Link href="/signin" className="text-gray-900 hover:text-gray-700 dark:text-white/60 dark:hover:text-white transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

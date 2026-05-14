"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Alert from "@/components/ui/alert/Alert";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState, Suspense } from "react";

const MAX_INTENTOS = 5;
const IS_DEV = process.env.NODE_ENV === "development";

function SignInFormInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [intentosFallidos, setIntentosFallidos] = useState(0);

  const { login } = useAuth();
  const searchParams = useSearchParams();
  const reasonInactividad = searchParams.get("reason") === "inactividad";

  // Validaciones inline
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailError = email.length > 0 && !emailValido;
  const passwordError = password.length > 0 && password.length < 1;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Guard: cuenta bloqueada localmente
    if (isBlocked) return;

    // Validaciones previas
    if (!emailValido) {
      setErrorMsg("Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (!password) {
      setErrorMsg("La contraseña no puede estar vacía.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(email, password);
      // La redirección post-login la gestiona AuthContext según el perfil del usuario
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";

      if (message === "CUENTA_BLOQUEADA" || message === "CUENTA_INACTIVA") {
        setIsBlocked(true);
        setErrorMsg(
          "Tu cuenta está inactiva o bloqueada. Contacta al Administrador."
        );
      } else {
        const nuevosIntentos = intentosFallidos + 1;
        setIntentosFallidos(nuevosIntentos);

        if (nuevosIntentos >= MAX_INTENTOS) {
          setIsBlocked(true);
          setErrorMsg(
            "Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Contacta al Administrador."
          );
        } else {
          setErrorMsg(
            `Credenciales incorrectas. Intento ${nuevosIntentos} de ${MAX_INTENTOS}.`
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
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
            Iniciar sesión
          </h1>
          {IS_DEV && (
            <div className="mt-2 space-y-1">
              {[
                { label: "Admin", email: "admin@arqdata.local", pass: "Admin12345!" },
                { label: "Consultor", email: "carlos.mendez@arqdata.co", pass: "Consultor123!" },
                { label: "Empresa", email: "empresa@arqdata.co", pass: "Empresa123!" },
              ].map(({ label, email: devEmail, pass }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setEmail(devEmail); setPassword(pass); }}
                  className="block w-full text-left text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <span className="font-medium text-gray-500 dark:text-gray-400 w-16 inline-block">{label}:</span>{" "}
                  <span className="font-mono">{devEmail}</span>{" "}
                  /{" "}
                  <span className="font-mono">{pass}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Banner de sesión expirada por inactividad */}
        {reasonInactividad && (
          <div className="mb-4">
            <Alert
              variant="warning"
              title="Sesion expirada"
              message="Sesión expirada por inactividad. Por favor vuelve a iniciar sesión."
            />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-6">
            {/* Campo email */}
            <div>
              <Label>
                Email <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                name="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={emailError}
                hint={emailError ? "Ingresa un correo electrónico válido." : undefined}
              />
            </div>

            {/* Campo contraseña */}
            <div>
              <Label>
                Contraseña <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={passwordError}
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  role="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                  )}
                </span>
              </div>
            </div>

            {/* Mensaje de error inline */}
            {errorMsg && (
              <div>
                <Alert
                  variant="error"
                  title={isBlocked ? "Cuenta bloqueada" : "Error de autenticación"}
                  message={errorMsg}
                />
              </div>
            )}

            {/* Botón de submit con estado de carga */}
            <button
              type="submit"
              disabled={isLoading || isBlocked}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ padding: "0.75rem 1rem" }}
            >
              {isLoading && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {isLoading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </form>

        <div className="mt-5">
          <p className="text-sm text-center text-gray-700 dark:text-gray-400">
            ¿Necesitas acceso?{" "}
            <Link
              href="/signup"
              className="text-gray-900 hover:text-gray-700 dark:text-white/60 dark:hover:text-white transition-colors"
            >
              Solicitar cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrapper con Suspense requerido por useSearchParams en Next.js 14 App Router
export default function SignInForm() {
  return (
    <Suspense fallback={<div className="flex flex-col flex-1 lg:w-1/2 w-full" />}>
      <SignInFormInner />
    </Suspense>
  );
}

"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionWarningModal } from "@/components/auth/SessionWarningModal";
import EmpresaLayout from "@/layout/EmpresaLayout";

// Valores reducidos para desarrollo (2 min timeout, 1 min advertencia)
// En producción cambiar a { timeoutMinutes: 60, warningMinutes: 2 }
const SESSION_TIMEOUT_MINUTES = 2;
const SESSION_WARNING_MINUTES = 1;

export default function EmpresaGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();
  const { showWarning, secondsRemaining, resetTimer } = useSessionTimeout({
    timeoutMinutes: SESSION_TIMEOUT_MINUTES,
    warningMinutes: SESSION_WARNING_MINUTES,
  });

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      router.replace("/signin");
      return;
    }
    if (user?.perfil !== "EMPRESA") {
      router.replace("/signin");
    }
  }, [isAuthenticated, isReady, user, router]);

  // Mientras se verifica auth, no renderizar nada para evitar flash
  if (!isReady || !isAuthenticated || user?.perfil !== "EMPRESA") return null;

  return (
    <EmpresaLayout>
      {children}
      <SessionWarningModal
        showWarning={showWarning}
        secondsRemaining={secondsRemaining}
        onContinue={resetTimer}
      />
    </EmpresaLayout>
  );
}

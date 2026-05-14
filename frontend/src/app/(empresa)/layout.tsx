"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import EmpresaLayout from "@/layout/EmpresaLayout";

export default function EmpresaGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();
  useSessionTimeout();

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

  if (!isReady || !isAuthenticated || user?.perfil !== "EMPRESA") return null;

  return <EmpresaLayout>{children}</EmpresaLayout>;
}

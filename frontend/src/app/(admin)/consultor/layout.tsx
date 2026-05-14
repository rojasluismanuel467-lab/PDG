"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ConsultorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated) {
      router.replace("/signin");
      return;
    }
    if (user?.perfil === "EMPRESA") {
      router.replace("/empresa/dashboard");
    }
  }, [isAuthenticated, isReady, router, user]);

  if (!isReady || !isAuthenticated || user?.perfil === "EMPRESA") return null;

  return <>{children}</>;
}

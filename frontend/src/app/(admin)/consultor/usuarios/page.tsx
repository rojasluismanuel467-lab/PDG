"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ConsultorUsuariosPage() {
  const { user, isAuthenticated, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/signin");
      return;
    }
    if (user?.perfil === "ADMIN") {
      router.replace("/usuarios");
      return;
    }
    router.replace("/consultor/proyectos");
  }, [isAuthenticated, isReady, router, user?.perfil]);

  return null;
}

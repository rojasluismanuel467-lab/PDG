"use client";
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const TIMEOUT_MS = 5 * 60 * 1000;

export function useSessionTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => logout("inactividad"), TIMEOUT_MS);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["click", "keydown", "mousemove", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, resetTimer]);
}

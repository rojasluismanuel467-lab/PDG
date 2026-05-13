"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export function useSessionTimeout({
  timeoutMinutes = 60,
  warningMinutes = 2,
}: UseSessionTimeoutOptions = {}) {
  const { logout, isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningMinutes * 60);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    clearAllTimers();
    setShowWarning(false);
    setSecondsRemaining(warningMinutes * 60);

    const warningDelay = (timeoutMinutes - warningMinutes) * 60 * 1000;
    const totalDelay = timeoutMinutes * 60 * 1000;

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      let secs = warningMinutes * 60;
      setSecondsRemaining(secs);
      countdownRef.current = setInterval(() => {
        secs -= 1;
        setSecondsRemaining(secs);
        if (secs <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, warningDelay);

    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      logout("inactividad");
    }, totalDelay);
  }, [isAuthenticated, timeoutMinutes, warningMinutes, logout, clearAllTimers]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["click", "keydown", "mousemove", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearAllTimers();
    };
  }, [isAuthenticated, resetTimer, clearAllTimers]);

  return { showWarning, secondsRemaining, resetTimer };
}

"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Role } from "@/lib/types";

interface AppContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isDemo: boolean;
  setIsDemo: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("adm_user");
    if (stored) setUser(JSON.parse(stored));
    const demo = localStorage.getItem("adm_demo");
    if (demo === "true") setIsDemo(true);
  }, []);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("adm_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("adm_user");
  };

  const handleSetDemo = (v: boolean) => {
    setIsDemo(v);
    localStorage.setItem("adm_demo", String(v));
  };

  return (
    <AppContext.Provider value={{ user, login, logout, isDemo, setIsDemo: handleSetDemo }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

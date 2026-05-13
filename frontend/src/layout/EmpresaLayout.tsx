"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// ── Ícono SVG inline de dashboard ────────────────────────────────────────────

function IconoDashboard() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconoProyectos() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.707 6.7A1 1 0 0011.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoCerrarSesion() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconoHamburger() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconoCerrar() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

// ── Navegación ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/empresa/dashboard", icon: <IconoDashboard /> },
  { label: "Mis proyectos", href: "/empresa/proyectos", icon: <IconoProyectos /> },
];

// ── Sidebar contenido (compartido entre desktop y mobile drawer) ─────────────

interface SidebarContentProps {
  pathname: string;
  onLogout: () => void;
  userName: string;
  onClose?: () => void;
}

function SidebarContent({ pathname, onLogout, userName, onClose }: SidebarContentProps) {
  // Obtener inicial del nombre para el avatar
  const inicial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center justify-between">
        <Link href="/empresa/dashboard" onClick={onClose} aria-label="Ir al dashboard">
          <Image
            className="dark:hidden"
            src="/images/logo/logo.svg"
            alt="ARQDATA"
            width={130}
            height={28}
          />
          <Image
            className="hidden dark:block"
            src="/images/logo/logo-dark.svg"
            alt="ARQDATA"
            width={130}
            height={28}
          />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-white/40 dark:hover:text-white/70 dark:hover:bg-white/[0.06] transition-colors lg:hidden"
            aria-label="Cerrar menú"
          >
            <IconoCerrar />
          </button>
        )}
      </div>

      {/* Etiqueta portal */}
      <div className="px-5 mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/25">
          Portal Empresa
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            // Activo si la ruta coincide exactamente o empieza con href (para sub-rutas)
            const isActive =
              pathname === item.href ||
              (item.href !== "/empresa/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#28b8d5]/10 text-[#28b8d5] dark:bg-[#28b8d5]/15 dark:text-[#28b8d5]"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white/90"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 ${
                      isActive ? "text-[#28b8d5]" : "text-gray-400 dark:text-white/30"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: usuario + logout */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-white/[0.06]">
        {/* Info usuario */}
        <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-xl bg-gray-50 dark:bg-white/[0.04]">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#28b8d5]/20 flex items-center justify-center">
            <span className="text-xs font-bold text-[#28b8d5]">{inicial}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 dark:text-white/90 truncate">
              {userName}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-white/30">Empresa cliente</p>
          </div>
        </div>

        {/* Botón cerrar sesión */}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/70 transition-colors"
        >
          <IconoCerrarSesion />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── Layout principal ──────────────────────────────────────────────────────────

interface EmpresaLayoutProps {
  children: React.ReactNode;
}

export default function EmpresaLayout({ children }: EmpresaLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = user?.nombre ?? "Empresa";

  const handleLogout = () => {
    setMobileOpen(false);
    logout("manual");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#050505] lg:hidden">
        <Link href="/empresa/dashboard" aria-label="Ir al dashboard">
          <Image
            className="dark:hidden"
            src="/images/logo/logo.svg"
            alt="ARQDATA"
            width={110}
            height={24}
          />
          <Image
            className="hidden dark:block"
            src="/images/logo/logo-dark.svg"
            alt="ARQDATA"
            width={110}
            height={24}
          />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Abrir menú"
        >
          <IconoHamburger />
        </button>
      </header>

      {/* ── Mobile drawer overlay ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-[#050505] shadow-xl">
            <SidebarContent
              pathname={pathname}
              onLogout={handleLogout}
              userName={userName}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col bg-white dark:bg-[#050505] border-r border-gray-200 dark:border-white/[0.06] z-30">
        <SidebarContent
          pathname={pathname}
          onLogout={handleLogout}
          userName={userName}
        />
      </aside>

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <main className="lg:pl-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}

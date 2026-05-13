import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:p-0" style={{ ['--dark-bg' as string]: '#000000' }}>
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col bg-white dark:bg-[#000000] sm:p-0">
          {children}

          {/* Right decorative panel — landing page aesthetic */}
          <div
            className="lg:w-1/2 w-full h-full lg:grid items-center hidden relative overflow-hidden border-l border-white/[0.08]"
            style={{ backgroundColor: '#000000' }}
          >
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />

            {/* Top turquoise accent */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(40,184,213,0.5), transparent)' }}
            />

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center max-w-xs mx-auto text-center px-6">
              {/* Logo mark */}
              <Link href="/">
                <div className="w-12 h-12 bg-white/[0.06] border border-white/[0.12] rounded-xl flex items-center justify-center mb-8 hover:bg-white/[0.10] transition-colors">
                  <span className="text-white text-2xl font-bold leading-none mt-0.5">*</span>
                </div>
              </Link>

              <h3 className="text-white font-semibold text-lg mb-3 tracking-tight">
                Agente IA · TOGAF ADM
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Automatiza tu arquitectura empresarial con agentes de IA autónomos que guían cada fase del ciclo ADM.
              </p>

              {/* Status indicator */}
              <div className="flex items-center gap-2 mt-8 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#28b8d5] animate-pulse flex-shrink-0" />
                <span className="text-xs text-[#28b8d5] font-medium">Archi · Online</span>
              </div>
            </div>
          </div>

          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}

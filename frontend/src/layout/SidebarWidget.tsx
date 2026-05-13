import React from "react";

export default function SidebarWidget() {
  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-5 text-center relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute -top-px left-6 right-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="mb-3 flex items-center justify-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/60" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>

      <h3 className="mb-1 text-sm font-semibold text-white/90">
        Archi · TOGAF ADM
      </h3>
      <p className="mb-4 text-gray-400 text-theme-sm leading-relaxed">
        Agente IA activo en Fase B
      </p>

      <div className="flex items-center gap-1.5 justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
        <span className="text-xs text-white/60 font-medium">Online</span>
      </div>
    </div>
  );
}

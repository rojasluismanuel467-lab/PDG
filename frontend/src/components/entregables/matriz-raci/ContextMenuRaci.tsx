"use client";
import React, { useEffect, useRef } from "react";
import type { AsignacionRaci } from "@/lib/types/matriz-raci.types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ContextMenuTarget =
  | {
      type: "celda";
      actividadId: string;
      actividadNombre: string;
      rolId: string;
      rolNombre: string;
      currentAsig: AsignacionRaci | undefined;
    }
  | {
      type: "actividad";
      actividadId: string;
      actividadNombre: string;
      globalIdx: number;
      totalActividades: number;
    }
  | {
      type: "rol";
      rolId: string;
      rolNombre: string;
    };

export interface ContextMenuRaciState {
  x: number;
  y: number;
  target: ContextMenuTarget;
}

interface ContextMenuRaciProps extends ContextMenuRaciState {
  readOnly?: boolean;
  onClose: () => void;
  // Celda actions
  onSetAsig: (actividadId: string, rolId: string, asig: AsignacionRaci | null) => void;
  onCommentCell: (actividadId: string, rolId: string, x: number, y: number) => void;
  // Actividad actions
  onEditActividad: (actividadId: string) => void;
  onDuplicateActividad: (actividadId: string) => void;
  onMoveActividad: (actividadId: string, direction: "up" | "down") => void;
  onCommentActividad: (actividadId: string) => void;
  onDeleteActividad: (actividadId: string) => void;
  // Rol actions
  onEditRol: (rolId: string) => void;
  onDeleteRol: (rolId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// RACI badge colors (inlined to avoid import cycle)
// ─────────────────────────────────────────────────────────────────────────────

const ASIG_STYLES: Record<AsignacionRaci, { badge: string; label: string }> = {
  R: { badge: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400", label: "Responsable" },
  A: { badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400", label: "Aprobador" },
  C: { badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400", label: "Consultado" },
  I: { badge: "bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-white/50", label: "Informado" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="my-1 mx-2 border-t border-gray-100 dark:border-white/[0.06]" />;
}

function Item({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // prevent blur before click
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors rounded-md mx-1 my-0.5 text-left ${
        disabled
          ? "opacity-35 cursor-not-allowed"
          : danger
          ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          : "text-gray-700 dark:text-white/65 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
      }`}
      style={{ width: "calc(100% - 8px)" }}
    >
      <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-white/30">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25">
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons (inline SVG to avoid extra imports)
// ─────────────────────────────────────────────────────────────────────────────

const IconEdit = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const IconDuplicate = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const IconUp = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);
const IconDown = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const IconComment = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);
const IconTrash = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconClear = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ContextMenuRaci({
  x,
  y,
  target,
  readOnly = false,
  onClose,
  onSetAsig,
  onCommentCell,
  onEditActividad,
  onDuplicateActividad,
  onMoveActividad,
  onCommentActividad,
  onDeleteActividad,
  onEditRol,
  onDeleteRol,
}: ContextMenuRaciProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  // Keep menu within viewport
  const menuW = 208;
  const safeX = x + menuW > window.innerWidth ? x - menuW : x;
  const safeY = Math.min(y, window.innerHeight - 320);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: safeX, top: safeY, zIndex: 1100, width: menuW }}
      className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/[0.09] rounded-xl shadow-xl shadow-black/10 dark:shadow-black/50 py-1.5 overflow-hidden"
    >
      {/* ── CELDA menu ──────────────────────────────────────────────────── */}
      {target.type === "celda" && (
        <>
          {/* Context label */}
          <div className="px-3 pt-1.5 pb-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25 truncate">
              {target.rolNombre}
            </p>
            <p className="text-[11px] font-semibold text-gray-700 dark:text-white/70 truncate">
              {target.actividadNombre}
            </p>
          </div>
          <Divider />

          {!readOnly && (
            <>
              <SectionLabel>Asignar</SectionLabel>
              {(["R", "A", "C", "I"] as AsignacionRaci[]).map((asig) => (
                <Item
                  key={asig}
                  icon={
                    <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center ${ASIG_STYLES[asig].badge}`}>
                      {asig}
                    </span>
                  }
                  label={ASIG_STYLES[asig].label}
                  badge={
                    target.currentAsig === asig ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#28b8d5]" />
                    ) : undefined
                  }
                  onClick={() => {
                    onSetAsig(target.actividadId, target.rolId, asig);
                    onClose();
                  }}
                />
              ))}
              <Item
                icon={<IconClear />}
                label="Limpiar asignación"
                disabled={!target.currentAsig}
                onClick={() => {
                  onSetAsig(target.actividadId, target.rolId, null);
                  onClose();
                }}
              />
              <Divider />
            </>
          )}

          <Item
            icon={<IconComment />}
            label="Agregar comentario"
            onClick={() => {
              onCommentCell(target.actividadId, target.rolId, safeX, safeY + 32);
              onClose();
            }}
          />
        </>
      )}

      {/* ── ACTIVIDAD menu ──────────────────────────────────────────────── */}
      {target.type === "actividad" && (
        <>
          <div className="px-3 pt-1.5 pb-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25">
              Actividad
            </p>
            <p className="text-[11px] font-semibold text-gray-700 dark:text-white/70 truncate">
              {target.actividadNombre}
            </p>
          </div>
          <Divider />

          {!readOnly && (
            <>
              <Item icon={<IconEdit />} label="Editar actividad" onClick={() => { onEditActividad(target.actividadId); onClose(); }} />
              <Item icon={<IconDuplicate />} label="Duplicar" onClick={() => { onDuplicateActividad(target.actividadId); onClose(); }} />
              <Divider />
              <Item
                icon={<IconUp />}
                label="Mover arriba"
                disabled={target.globalIdx === 0}
                onClick={() => { onMoveActividad(target.actividadId, "up"); onClose(); }}
              />
              <Item
                icon={<IconDown />}
                label="Mover abajo"
                disabled={target.globalIdx === target.totalActividades - 1}
                onClick={() => { onMoveActividad(target.actividadId, "down"); onClose(); }}
              />
              <Divider />
            </>
          )}

          <Item
            icon={<IconComment />}
            label="Comentar actividad"
            onClick={() => { onCommentActividad(target.actividadId); onClose(); }}
          />

          {!readOnly && (
            <>
              <Divider />
              <Item
                icon={<IconTrash />}
                label="Eliminar actividad"
                danger
                onClick={() => { onDeleteActividad(target.actividadId); onClose(); }}
              />
            </>
          )}
        </>
      )}

      {/* ── ROL menu ────────────────────────────────────────────────────── */}
      {target.type === "rol" && (
        <>
          <div className="px-3 pt-1.5 pb-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25">
              Rol
            </p>
            <p className="text-[11px] font-semibold text-gray-700 dark:text-white/70 truncate">
              {target.rolNombre}
            </p>
          </div>
          <Divider />

          {!readOnly ? (
            <>
              <Item icon={<IconEdit />} label="Editar rol" onClick={() => { onEditRol(target.rolId); onClose(); }} />
              <Divider />
              <Item icon={<IconTrash />} label="Eliminar rol" danger onClick={() => { onDeleteRol(target.rolId); onClose(); }} />
            </>
          ) : (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-white/30">Solo lectura</p>
          )}
        </>
      )}
    </div>
  );
}

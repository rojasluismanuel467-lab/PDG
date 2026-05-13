"use client";
import React from "react";
import type { Toast } from "@/hooks/useToast";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const TOAST_STYLES: Record<Toast["type"], string> = {
  success:
    "bg-white border border-success-200 text-success-700 dark:bg-[#0d0d0d] dark:border-success-400/20 dark:text-success-400",
  error:
    "bg-white border border-error-200 text-error-700 dark:bg-[#0d0d0d] dark:border-error-400/20 dark:text-error-400",
  info: "bg-white border border-blue-light-200 text-blue-light-700 dark:bg-[#0d0d0d] dark:border-blue-light-400/20 dark:text-blue-light-400",
};

const TOAST_ICONS: Record<Toast["type"], React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-theme-lg pointer-events-auto transition-all duration-300 ${TOAST_STYLES[toast.type]}`}
        >
          <span className="mt-0.5 shrink-0 flex items-center justify-center">
            {TOAST_ICONS[toast.type]}
          </span>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Cerrar notificación"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

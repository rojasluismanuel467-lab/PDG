"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";

interface SessionWarningModalProps {
  showWarning: boolean;
  secondsRemaining: number;
  onContinue: () => void;
}

export function SessionWarningModal({
  showWarning,
  secondsRemaining,
  onContinue,
}: SessionWarningModalProps) {
  return (
    <Modal
      isOpen={showWarning}
      onClose={onContinue}
      showCloseButton={false}
      className="max-w-sm mx-4 p-6"
    >
      <div className="text-center">
        {/* Icono de advertencia */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/15">
          <svg
            className="h-7 w-7 text-warning-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Sesión por expirar
        </h3>

        <p className="mb-5 text-sm text-gray-600 dark:text-gray-300">
          Tu sesión expirará en{" "}
          <span className="font-bold text-error-500 tabular-nums">
            {secondsRemaining}
          </span>{" "}
          {secondsRemaining === 1 ? "segundo" : "segundos"} por inactividad.
        </p>

        <button
          onClick={onContinue}
          className="w-full btn-primary"
          style={{ padding: "0.625rem 1rem" }}
        >
          Continuar sesión
        </button>
      </div>
    </Modal>
  );
}

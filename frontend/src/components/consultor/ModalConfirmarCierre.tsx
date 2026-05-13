"use client";
import React from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface ModalConfirmarCierreProps {
  isOpen: boolean;
  nombreProyecto: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ModalConfirmarCierre({
  isOpen,
  nombreProyecto,
  onConfirm,
  onCancel,
  isLoading = false,
}: ModalConfirmarCierreProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} showCloseButton={false} className="max-w-md mx-4">
      <div className="p-6 sm:p-8">
        {/* Icono de advertencia */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-50 dark:bg-error-400/10 mx-auto mb-5">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-error-600 dark:text-error-400"
          >
            <path
              d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          Cerrar proyecto
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          ¿Estás seguro de que deseas cerrar el proyecto{" "}
          <span className="font-semibold text-gray-800 dark:text-white/90">
            {nombreProyecto}
          </span>
          ? Esta acción es irreversible.
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 bg-error-600 text-white hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] dark:bg-error-500 dark:hover:bg-error-600"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Cerrando...
              </>
            ) : (
              "Sí, cerrar proyecto"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

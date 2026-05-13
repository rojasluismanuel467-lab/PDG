"use client";

import React from "react";

interface NewQuestion {
  dimensionId: number;
  subdomainId: number;
  text: string;
  applicableRoles: string[];
  criteria: Record<number, string>;
}

interface ModalAddQuestionProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (question: NewQuestion) => void;
  customRoles?: Array<{ id: string; name: string; description: string }>;
}

export const ModalAddQuestion: React.FC<ModalAddQuestionProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0f0f0f]">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Custom question editor removed</h2>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Questions now come from the real backend template. To change the active questionnaire, use the
          consultant template editor in the project questionnaire page.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] dark:bg-white dark:text-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

"use client";

import React from "react";

interface ModalManageQuestionsProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSave?: (questions: unknown[]) => void;
}

export const ModalManageQuestions: React.FC<ModalManageQuestionsProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-[#0f0f0f]">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Questionnaire template editor</h3>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          This legacy modal no longer manages mock questions. Use the real consultant questionnaire view for
          project <code>{projectId}</code> to enable or disable template questions directly from the backend
          catalog.
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

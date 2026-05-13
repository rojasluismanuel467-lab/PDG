"use client";

import React from "react";

interface AnswerData {
  score: number;
  evidenciaUrl?: string;
  evidenciaNombre?: string;
  evidenciaTipo?: string;
  evidenciaSize?: number;
}

interface FormData {
  respondentName: string;
  respondentEmail: string;
  role: string;
  answers: Record<number, AnswerData>;
}

interface MaturityQuestionnaireFormProps {
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export const MaturityQuestionnaireForm: React.FC<MaturityQuestionnaireFormProps> = ({
  isLoading = false,
}) => {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200">
      <p className="font-semibold">This legacy questionnaire form no longer relies on mock data.</p>
      <p className="mt-2">
        Use the public questionnaire route generated from the real project questionnaire under{" "}
        <code>/diagnostico/[access_code]</code>.
      </p>
      {isLoading ? <p className="mt-2 text-xs opacity-80">Loading real questionnaire...</p> : null}
    </div>
  );
};

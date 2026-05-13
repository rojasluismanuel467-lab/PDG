/**
 * Hook para calcular resultados de madurez SÓLO con respuestas validadas
 * 
 * Diferencia con useMaturityCalculation:
 * - useMaturityCalculation: Usa TODAS las respuestas (mocks actuales)
 * - useMaturityCalculationValidated: Usa SÓLO respuestas APROBADAS por el consultor
 */

import { useMemo } from "react";
import { useMaturityCalculation } from "./useMaturityCalculation";
import type { Response } from "./useMaturityCalculation";
import type { EstadoValidacion } from "@/lib/types/maturity.types";

type ValidatedAnswer = {
  questionId: number;
  score: number;
  estadoValidacion?: EstadoValidacion;
};

// Extend Response with validation metadata while allowing either answer shape.
type ResponseWithValidation = Omit<Response, "answers"> & {
  estadoValidacion?: EstadoValidacion;
  answers?: Response["answers"] | ValidatedAnswer[];
};

interface UseMaturityCalculationValidatedReturn {
  byDimension: any[];
  overallScore: number;
  overallPercent: number;
  radarData: Array<{
    dimension: string;
    score: number;
    fullMark: 5;
  }>;
  validatedCount: number;
  totalCount: number;
  validationPercentage: number;
}

/**
 * Filtra respuestas y respuestas individuales que están APROBADAS
 */
const filterValidatedResponses = (
  responses: ResponseWithValidation[]
): Response[] => {
  // Filtrar solo respuestas con estado APROBADA
  const approvedResponses = responses.filter(
    (r) => r.estadoValidacion === "APROBADA"
  );

  // Si la respuesta tiene validación individual por pregunta, filtrar también
  return approvedResponses.map((response) => {
    if (!response.answers) {
      return {
        ...response,
        answers: {},
      };
    }

    if (!Array.isArray(response.answers)) {
      return {
        ...response,
        answers: response.answers,
      };
    }

    // Filtrar solo las respuestas individuales aprobadas
    const approvedAnswers = response.answers.filter(
      (a) => a.estadoValidacion === "APROBADA" || a.estadoValidacion === undefined
    );

    return {
      ...response,
      answers: Object.fromEntries(
        approvedAnswers.map((answer) => [answer.questionId, answer.score])
      ),
    };
  });
};

/**
 * Hook que calcula madurez SÓLO con respuestas validadas/aprobadas
 */
export const useMaturityCalculationValidated = (
  responses: ResponseWithValidation[]
): UseMaturityCalculationValidatedReturn => {
  // Filtrar respuestas validadas
  const validatedResponses = useMemo(
    () => filterValidatedResponses(responses),
    [responses]
  );

  // Calcular con el hook existente
  const calculation = useMaturityCalculation(validatedResponses);

  // Calcular estadísticas de validación
  const totalCount = responses.length;
  const validatedCount = validatedResponses.length;
  const validationPercentage = totalCount > 0 ? (validatedCount / totalCount) * 100 : 0;

  return {
    ...calculation,
    validatedCount,
    totalCount,
    validationPercentage,
  };
};

/**
 * Utilidad para verificar si una respuesta está completamente validada
 */
export const isResponseValidated = (response: ResponseWithValidation): boolean => {
  return response.estadoValidacion === "APROBADA";
};

/**
 * Utilidad para contar respuestas pendientes de validación
 */
export const countPendingValidation = (responses: ResponseWithValidation[]): number => {
  return responses.filter(
    (r) => r.estadoValidacion === "PENDIENTE" || r.estadoValidacion === undefined
  ).length;
};

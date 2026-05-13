import type { LegacyMaturityResult } from "@/lib/types/maturity-legacy";
import {
  getMaturityLevel,
  getMaturityLevelFromPercent,
  getScoreColor,
} from "@/lib/maturity/scoring";

export interface Response {
  id: string;
  respondentName: string;
  respondentEmail: string;
  role: string;
  answers: Record<number, number>;
  completedAt: Date;
}

export interface MaturityCalculationResult {
  byDimension: LegacyMaturityResult[];
  overallScore: number;
  overallPercent: number;
  radarData: Array<{
    dimension: string;
    score: number;
    fullMark: 5;
  }>;
}

export interface QuestionScore {
  questionId: number;
  score: number;
  percent: number;
}

export const calculateQuestionPercent = (score: number, maxScore: number = 5): number => {
  if (score === 0) return 0;
  return ((score - 1) / (maxScore - 1)) * 100;
};

export const calculateOverallScore = (
  dimensionResults: LegacyMaturityResult[]
): { overallScore: number; overallPercent: number } => {
  const totalWeight = dimensionResults.reduce((sum, dimension) => sum + dimension.weight, 0);
  const weightedSum = dimensionResults.reduce(
    (sum, dimension) => sum + dimension.percent * dimension.weight,
    0
  );

  const overallPercent = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const overallScore = (overallPercent / 100) * 5;

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    overallPercent: Math.round(overallPercent * 100) / 100,
  };
};

export const useMaturityCalculation = (_responses: Response[]): MaturityCalculationResult => {
  return {
    byDimension: [],
    overallScore: 0,
    overallPercent: 0,
    radarData: [],
  };
};

export { getMaturityLevel, getMaturityLevelFromPercent, getScoreColor };

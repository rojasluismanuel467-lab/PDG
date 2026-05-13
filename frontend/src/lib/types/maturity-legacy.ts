import type { EstadoValidacion } from "@/lib/types/maturity.types";

export interface LegacySubdomainResult {
  subdomainId: number;
  subdomainName: string;
  score: number;
  percent: number;
  questionCount: number;
}

export interface LegacyMaturityResult {
  dimensionId: number;
  dimensionName: string;
  score: number;
  percent: number;
  weight: number;
  subdomains: LegacySubdomainResult[];
  questionCount: number;
}

export interface LegacyValidationAnswer {
  questionId: number;
  questionText: string;
  score: number;
  evidenciaUrl?: string;
  evidenciaNombre?: string;
  evidenciaTipo?: string;
  evidenciaSize?: number;
  estadoValidacion: EstadoValidacion;
  validacionComentarios?: string;
}

export interface LegacyValidationResponse {
  respondentName: string;
  respondentEmail: string;
  role: string;
  submittedAt: Date;
  estadoValidacion: EstadoValidacion;
  validadoPor?: string;
  validacionComentarios?: string;
  answers: LegacyValidationAnswer[];
}

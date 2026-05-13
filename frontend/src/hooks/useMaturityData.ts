"use client";

import { useCallback, useEffect, useState } from "react";

import { maturityApi } from "@/lib/api/maturity";
import type {
  MaturityResultsResponse,
  ResponseDTO,
} from "@/lib/types/maturity.types";

interface UseMaturityDataReturn {
  loading: boolean;
  error: string | null;
  initialized: boolean;
  results: MaturityResultsResponse | null;
  responses: ResponseDTO[];
  responseStats: { total: number; active: number; anuladas: number };
  isClosed: boolean;
  refreshResults: () => Promise<void>;
  refreshResponses: () => Promise<void>;
  anularRespuesta: (responseId: string, reason: string) => Promise<void>;
  reactivarRespuesta: (responseId: string) => Promise<void>;
  toggleCuestionario: () => Promise<void>;
}

interface UseMaturityDataProps {
  projectId: string;
  phase?: "AS_IS" | "TO_BE";
}

export const useMaturityData = ({
  projectId,
}: UseMaturityDataProps): UseMaturityDataReturn => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [results, setResults] = useState<MaturityResultsResponse | null>(null);
  const [responses, setResponses] = useState<ResponseDTO[]>([]);
  const [responseStats, setResponseStats] = useState({
    total: 0,
    active: 0,
    anuladas: 0,
  });
  const [isClosed, setIsClosed] = useState(false);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maturityApi.getResultados(projectId);
      setResults(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load results";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadResponses = useCallback(async () => {
    try {
      const [responsesData, configData] = await Promise.all([
        maturityApi.getResponses(projectId),
        maturityApi.getConfig(projectId),
      ]);

      setResponses(responsesData.responses);
      setResponseStats({
        total: responsesData.total,
        active: responsesData.active,
        anuladas: responsesData.anuladas,
      });
      setIsClosed(configData.is_closed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load responses";
      setError(message);
    }
  }, [projectId]);

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([loadResults(), loadResponses()]);
      setInitialized(true);
    };

    void initialize();
  }, [loadResults, loadResponses]);

  const refreshResults = async () => {
    await loadResults();
  };

  const refreshResponses = async () => {
    await loadResponses();
    await loadResults();
  };

  const anularRespuesta = async (responseId: string, reason: string) => {
    await maturityApi.anularResponse(responseId, { reason });
    await refreshResponses();
  };

  const reactivarRespuesta = async (responseId: string) => {
    await maturityApi.reactivarResponse(responseId);
    await refreshResponses();
  };

  const toggleCuestionario = async () => {
    const data = await maturityApi.updateEstado(projectId, !isClosed);
    setIsClosed(data.is_closed);
  };

  return {
    loading,
    error,
    initialized,
    results,
    responses,
    responseStats,
    isClosed,
    refreshResults,
    refreshResponses,
    anularRespuesta,
    reactivarRespuesta,
    toggleCuestionario,
  };
};

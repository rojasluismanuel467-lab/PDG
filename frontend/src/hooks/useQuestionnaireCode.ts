import { useState, useCallback } from "react";

export interface QuestionnaireCode {
  code: string;
  projectId: string;
  createdAt: Date;
  expiresAt: Date;
  isClosed: boolean;
  closedAt?: Date;
  closedBy?: string;
}

/**
 * Hook para gestionar códigos de acceso a cuestionarios
 * Genera, valida, y maneja expiración y cierre de códigos
 *
 * TODO: Cuando se implemente el backend, reemplazar la lógica mock con llamadas a:
 * - POST /api/v1/maturity-assessments/{assessmentId}/generate-code
 * - GET /api/v1/maturity-assessments/validate/{code}
 * - PATCH /api/v1/maturity-assessments/{assessmentId}/close
 */
export const useQuestionnaireCode = () => {
  const [codes, setCodes] = useState<Map<string, QuestionnaireCode>>(new Map());

  /**
   * Generar un código único de acceso
   * En producción: POST /api/v1/maturity-assessments/{assessmentId}/generate-code
   */
  const generateCode = useCallback((projectId: string): string => {
    // Mock: Generar código aleatorio
    const code = `${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días

    const codeData: QuestionnaireCode = {
      code,
      projectId,
      createdAt: now,
      expiresAt,
      isClosed: false,
    };

    setCodes((prev) => new Map(prev).set(code, codeData));
    return code;
  }, []);

  /**
   * Validar que un código sea válido y esté activo
   * En producción: GET /api/v1/maturity-assessments/validate/{code}
   */
  const validateCode = useCallback(
    (code: string): { valid: boolean; reason?: string } => {
      const codeData = codes.get(code);

      if (!codeData) {
        return { valid: false, reason: "Código no encontrado" };
      }

      if (codeData.isClosed) {
        return { valid: false, reason: "Cuestionario cerrado" };
      }

      const now = new Date();
      if (now > codeData.expiresAt) {
        return { valid: false, reason: "Código expirado" };
      }

      return { valid: true };
    },
    [codes]
  );

  /**
   * Cerrar un cuestionario (no aceptar más respuestas)
   * En producción: PATCH /api/v1/maturity-assessments/{assessmentId}/close
   */
  const closeQuestionnaire = useCallback(
    (code: string, consultorId: string): boolean => {
      const codeData = codes.get(code);

      if (!codeData) {
        return false;
      }

      const updatedCode: QuestionnaireCode = {
        ...codeData,
        isClosed: true,
        closedAt: new Date(),
        closedBy: consultorId,
      };

      setCodes((prev) => new Map(prev).set(code, updatedCode));
      return true;
    },
    [codes]
  );

  /**
   * Reabrir un cuestionario (volver a aceptar respuestas)
   * En producción: PATCH /api/v1/maturity-assessments/{assessmentId}/reopen
   */
  const reopenQuestionnaire = useCallback(
    (code: string): boolean => {
      const codeData = codes.get(code);

      if (!codeData) {
        return false;
      }

      const updatedCode: QuestionnaireCode = {
        ...codeData,
        isClosed: false,
        closedAt: undefined,
        closedBy: undefined,
      };

      setCodes((prev) => new Map(prev).set(code, updatedCode));
      return true;
    },
    [codes]
  );

  /**
   * Obtener información de un código
   */
  const getCodeInfo = useCallback(
    (code: string): QuestionnaireCode | null => {
      return codes.get(code) || null;
    },
    [codes]
  );

  /**
   * Verificar si un código está expirado
   */
  const isCodeExpired = useCallback((code: string): boolean => {
    const codeData = codes.get(code);
    if (!codeData) return true;

    const now = new Date();
    return now > codeData.expiresAt;
  }, [codes]);

  /**
   * Regenerar un código (crear uno nuevo, invalidar el anterior)
   * En producción: POST /api/v1/maturity-assessments/{assessmentId}/regenerate-code
   */
  const regenerateCode = useCallback((oldCode: string): string | null => {
    const oldCodeData = codes.get(oldCode);

    if (!oldCodeData) {
      return null;
    }

    // Generar nuevo código
    const newCode = `${Math.random().toString(36).substring(2, 8).toUpperCase()}${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newCodeData: QuestionnaireCode = {
      code: newCode,
      projectId: oldCodeData.projectId,
      createdAt: now,
      expiresAt,
      isClosed: false,
    };

    setCodes((prev) => {
      const updated = new Map(prev);
      updated.delete(oldCode); // Eliminar código anterior
      updated.set(newCode, newCodeData);
      return updated;
    });

    return newCode;
  }, [codes]);

  return {
    generateCode,
    validateCode,
    closeQuestionnaire,
    reopenQuestionnaire,
    getCodeInfo,
    isCodeExpired,
    regenerateCode,
  };
};

import type { Entregable, EtapaEntregable } from "../mocks/entregables.mock";

export const etapaCompletada = (
  entregables: Entregable[],
  etapa: EtapaEntregable
): boolean => {
  const deEtapa = entregables.filter((e) => e.etapa === etapa);
  if (deEtapa.length === 0) return false;
  return deEtapa.every((e) => e.estado === "APROBADO" || e.estado === "NO_APLICA");
};

export const etapaHabilitada = (
  entregables: Entregable[],
  etapa: EtapaEntregable
): boolean => {
  switch (etapa) {
    case "AS_IS": return true;
    case "TO_BE": return etapaCompletada(entregables, "AS_IS");
    case "BRECHAS": return etapaCompletada(entregables, "TO_BE");
    case "ROADMAP": return etapaCompletada(entregables, "BRECHAS");
  }
};

export const mensajeBloqueoEtapa = (etapa: EtapaEntregable): string => {
  switch (etapa) {
    case "TO_BE": return "Debes aprobar todos los entregables de AS-IS para habilitar esta etapa.";
    case "BRECHAS": return "Debes aprobar todos los entregables de TO-BE para habilitar esta etapa.";
    case "ROADMAP": return "Debes aprobar el entregable de Brechas para habilitar esta etapa.";
    default: return "";
  }
};

export const progresoEtapa = (
  entregables: Entregable[],
  etapa: EtapaEntregable
): number => {
  const deEtapa = entregables.filter((e) => e.etapa === etapa);
  if (deEtapa.length === 0) return 0;
  const completados = deEtapa.filter(
    (e) => e.estado === "APROBADO" || e.estado === "NO_APLICA"
  ).length;
  return Math.floor((completados / deEtapa.length) * 100);
};

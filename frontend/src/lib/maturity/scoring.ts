export function getMaturityLevel(score: number): string {
  if (score === 0) return "Not evaluated";
  if (score < 1.5) return "Initial";
  if (score < 2.5) return "Repeatable";
  if (score < 3.5) return "Defined";
  if (score < 4.5) return "Managed";
  return "Optimized";
}

export function getScoreColor(score: number): string {
  if (score === 0) return "#9CA3AF";
  if (score < 1.5) return "#DC2626";
  if (score < 2.5) return "#EA580C";
  if (score < 3.5) return "#D97706";
  if (score < 4.5) return "#65A30D";
  return "#16A34A";
}

export function getMaturityLevelFromPercent(percent: number): string {
  if (percent === 0) return "Not evaluated";
  if (percent < 25) return "Initial";
  if (percent < 50) return "Repeatable";
  if (percent < 75) return "Defined";
  if (percent < 90) return "Managed";
  return "Optimized";
}

export function getMaturityLevelEs(score: number): string {
  if (score <= 0) return "No evaluado";
  if (score < 1.5) return "Inicial";
  if (score < 2.5) return "Repetible";
  if (score < 3.5) return "Definido";
  if (score < 4.5) return "Gestionado";
  return "Optimizado";
}

export function getMaturityLevelFromPercentEs(percent: number): string {
  if (percent === 0) return "No evaluado";
  if (percent < 25) return "Inicial";
  if (percent < 50) return "Repetible";
  if (percent < 75) return "Definido";
  if (percent < 90) return "Gestionado";
  return "Optimizado";
}

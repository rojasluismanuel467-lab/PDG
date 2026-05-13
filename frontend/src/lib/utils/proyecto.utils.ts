export const calcularProgreso = (aprobados: number, noAplica: number): number =>
  Math.floor(((aprobados + noAplica) / 14) * 100);

export const formatearFecha = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
};

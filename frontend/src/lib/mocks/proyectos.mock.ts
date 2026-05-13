import { MOCK_CONSULTOR_AUTH } from "./auth.mock";

export type EstadoProyecto = "ACTIVO" | "EN_PAUSA" | "CERRADO" | "BLOQUEADO";

export type Proyecto = {
  id: string;
  nombre: string;
  descripcion: string;
  empresa_cliente: {
    id: string;
    nombre: string;
    email: string;
  };
  fecha_estimada_cierre: string; // ISO 8601
  fecha_creacion: string;
  estado: EstadoProyecto;
  consultor_gerente: {
    id: string;
    nombre: string;
  };
  progreso: number; // 0-100, calculado en frontend
  entregables: {
    total: number;       // siempre 14
    aprobados: number;
    no_aplica: number;
  };
};

export const MOCK_EMPRESAS = [
  { id: "emp-001", nombre: "Bancolombia S.A.", email: "datos@bancolombia.com.co" },
  { id: "emp-002", nombre: "EPM Empresas Públicas de Medellín", email: "arquitectura@epm.com.co" },
  { id: "emp-003", nombre: "Grupo Éxito", email: "ti@grupoexito.com.co" },
];

export const MOCK_PROYECTOS: Proyecto[] = [
  {
    id: "proy-001",
    nombre: "Diagnóstico Arquitectura de Datos — Bancolombia",
    descripcion: "Levantamiento del estado actual de la arquitectura de datos corporativa para el área de analítica avanzada y planeación estratégica.",
    empresa_cliente: MOCK_EMPRESAS[0],
    fecha_estimada_cierre: "2025-08-30",
    fecha_creacion: "2025-03-01",
    estado: "ACTIVO",
    consultor_gerente: { id: MOCK_CONSULTOR_AUTH.id, nombre: MOCK_CONSULTOR_AUTH.nombre },
    progreso: 42,
    entregables: { total: 14, aprobados: 5, no_aplica: 1 },
  },
  {
    id: "proy-002",
    nombre: "Hoja de Ruta de Datos — EPM",
    descripcion: "Definición del estado objetivo TO-BE y roadmap de transición para la gestión del patrimonio de datos operacionales y de distribución.",
    empresa_cliente: MOCK_EMPRESAS[1],
    fecha_estimada_cierre: "2025-06-15",
    fecha_creacion: "2025-01-10",
    estado: "EN_PAUSA",
    consultor_gerente: { id: MOCK_CONSULTOR_AUTH.id, nombre: MOCK_CONSULTOR_AUTH.nombre },
    progreso: 78,
    entregables: { total: 14, aprobados: 10, no_aplica: 1 },
  },
  {
    id: "proy-003",
    nombre: "Gobierno del Dato — Grupo Éxito",
    descripcion: "Implantación del marco de gobernanza de datos bajo DAMA-DMBOK para las áreas de retail, logística y finanzas corporativas.",
    empresa_cliente: MOCK_EMPRESAS[2],
    fecha_estimada_cierre: "2024-12-01",
    fecha_creacion: "2024-08-15",
    estado: "CERRADO",
    consultor_gerente: { id: MOCK_CONSULTOR_AUTH.id, nombre: MOCK_CONSULTOR_AUTH.nombre },
    progreso: 100,
    entregables: { total: 14, aprobados: 14, no_aplica: 0 },
  },
  {
    id: "proy-004",
    nombre: "Madurez de Datos — Startup Fintech",
    descripcion: "Evaluación de madurez del patrimonio de datos y plan de mejora para una startup del sector financiero en etapa de escalamiento.",
    empresa_cliente: { id: "emp-004", nombre: "Nequi Fintech S.A.S.", email: "cto@nequi.com.co" },
    fecha_estimada_cierre: "2025-09-01",
    fecha_creacion: "2025-03-10",
    estado: "BLOQUEADO",
    consultor_gerente: { id: "usr-999", nombre: "Laura Gómez (desactivada)" },
    progreso: 21,
    entregables: { total: 14, aprobados: 2, no_aplica: 1 },
  },
];

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

export const mockGetProyectos = async (): Promise<Proyecto[]> => {
  await delay();
  return MOCK_PROYECTOS;
};

export const mockGetProyecto = async (id: string): Promise<Proyecto> => {
  await delay();
  const p = MOCK_PROYECTOS.find((p) => p.id === id);
  if (!p) throw new Error("PROYECTO_NO_ENCONTRADO");
  return p;
};

export const mockCrearProyecto = async (
  data: Pick<Proyecto, "nombre" | "descripcion" | "fecha_estimada_cierre"> & {
    id_empresa_cliente: string;
  }
): Promise<Proyecto> => {
  await delay(1000);
  const empresa = MOCK_EMPRESAS.find((e) => e.id === data.id_empresa_cliente);
  if (!empresa) throw new Error("EMPRESA_NO_ENCONTRADA");
  const nuevo: Proyecto = {
    id: `proy-${Date.now()}`,
    nombre: data.nombre,
    descripcion: data.descripcion,
    empresa_cliente: empresa,
    fecha_estimada_cierre: data.fecha_estimada_cierre,
    fecha_creacion: new Date().toISOString(),
    estado: "ACTIVO",
    consultor_gerente: { id: MOCK_CONSULTOR_AUTH.id, nombre: MOCK_CONSULTOR_AUTH.nombre },
    progreso: 0,
    entregables: { total: 14, aprobados: 0, no_aplica: 0 },
  };
  MOCK_PROYECTOS.unshift(nuevo);
  return nuevo;
};

export const mockCambiarEstadoProyecto = async (
  id: string,
  nuevoEstado: "ACTIVO" | "EN_PAUSA" | "CERRADO"
): Promise<Proyecto> => {
  await delay();
  const p = MOCK_PROYECTOS.find((p) => p.id === id);
  if (!p) throw new Error("PROYECTO_NO_ENCONTRADO");
  if (p.estado === "CERRADO") throw new Error("PROYECTO_YA_CERRADO");
  if (p.estado === "BLOQUEADO") throw new Error("PROYECTO_BLOQUEADO");
  p.estado = nuevoEstado;
  return p;
};

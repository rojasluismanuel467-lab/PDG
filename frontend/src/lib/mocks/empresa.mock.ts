import type { Proyecto } from "./proyectos.mock";
import { mockGetEntregables, type Entregable } from "./entregables.mock";
import {
  mockGetContenidoEntregable,
  type ContenidoEntregableEmpresa,
} from "./entregable-contenido.mock";
export type { Proyecto };
export type { Entregable };

export const MOCK_PROYECTOS_EMPRESA: Proyecto[] = [
  {
    id: "proy-001",
    nombre: "Diagnóstico Arquitectura de Datos — Bancolombia",
    descripcion:
      "Levantamiento del estado actual de la arquitectura de datos corporativa para el área de analítica avanzada y planeación estratégica.",
    empresa_cliente: {
      id: "emp-usr-001",
      nombre: "Constructora Bolívar S.A.",
      email: "datos@constructorabolivar.com.co",
    },
    fecha_estimada_cierre: "2025-08-30",
    fecha_creacion: "2025-03-01",
    estado: "ACTIVO",
    consultor_gerente: { id: "usr-001", nombre: "Carlos Méndez" },
    progreso: 42,
    entregables: { total: 14, aprobados: 5, no_aplica: 1 },
  },
  {
    id: "proy-002",
    nombre: "Hoja de Ruta de Datos — EPM",
    descripcion:
      "Definición del estado objetivo TO-BE y roadmap de transición para la gestión del patrimonio de datos operacionales.",
    empresa_cliente: {
      id: "emp-usr-001",
      nombre: "Constructora Bolívar S.A.",
      email: "datos@constructorabolivar.com.co",
    },
    fecha_estimada_cierre: "2025-06-15",
    fecha_creacion: "2025-01-10",
    estado: "EN_PAUSA",
    consultor_gerente: { id: "usr-001", nombre: "Carlos Méndez" },
    progreso: 78,
    entregables: { total: 14, aprobados: 10, no_aplica: 1 },
  },
];

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

export const mockGetProyectosEmpresa = async (): Promise<Proyecto[]> => {
  await delay();
  return MOCK_PROYECTOS_EMPRESA;
};

export const mockGetProyectoEmpresa = async (id: string): Promise<Proyecto> => {
  await delay();
  const p = MOCK_PROYECTOS_EMPRESA.find((p) => p.id === id);
  if (!p) throw new Error("PROYECTO_NO_ENCONTRADO");
  return p;
};

/**
 * RF-AUT-04: perfil Empresa solo puede ver entregables en estado APROBADO
 * de proyectos donde ya tiene asociacion valida.
 */
export const mockGetEntregablesAprobadosEmpresa = async (
  idProyecto: string
): Promise<Entregable[]> => {
  // Valida asociacion proyecto-empresa
  await mockGetProyectoEmpresa(idProyecto);
  const entregables = await mockGetEntregables(idProyecto);
  return entregables
    .filter((e) => e.estado === "APROBADO")
    .sort((a, b) => a.orden - b.orden);
};

/**
 * Devuelve todos los entregables del proyecto para la empresa, en cualquier estado.
 * En producción: GET /api/v1/proyectos/{idProyecto}/entregables
 * (la autorización de que la empresa pertenece al proyecto la valida el backend)
 */
export const mockGetTodosEntregablesEmpresa = async (
  idProyecto: string
): Promise<Entregable[]> => {
  await mockGetProyectoEmpresa(idProyecto);
  const entregables = await mockGetEntregables(idProyecto);
  return entregables.sort((a, b) => a.orden - b.orden);
};

/**
 * Obtiene un entregable concreto para la empresa (cualquier estado).
 * En producción: GET /api/v1/proyectos/{idProyecto}/entregables/{idEntregable}
 */
export const mockGetEntregableEmpresa = async (
  idProyecto: string,
  idEntregable: string
): Promise<Entregable> => {
  const entregables = await mockGetTodosEntregablesEmpresa(idProyecto);
  const entregable = entregables.find((e) => e.id === idEntregable);
  if (!entregable) throw new Error("ENTREGABLE_NO_ENCONTRADO");
  return entregable;
};

export const mockGetEntregableAprobadoEmpresa = async (
  idProyecto: string,
  idEntregable: string
): Promise<Entregable> => {
  const aprobados = await mockGetEntregablesAprobadosEmpresa(idProyecto);
  const entregable = aprobados.find((e) => e.id === idEntregable);
  if (!entregable) throw new Error("ENTREGABLE_NO_DISPONIBLE_EMPRESA");
  return entregable;
};

export type DetalleEntregableAprobadoEmpresa = {
  entregable: Entregable;
  contenido: ContenidoEntregableEmpresa;
};

export const mockGetDetalleEntregableAprobadoEmpresa = async (
  idProyecto: string,
  idEntregable: string
): Promise<DetalleEntregableAprobadoEmpresa> => {
  const entregable = await mockGetEntregableAprobadoEmpresa(idProyecto, idEntregable);
  const contenido = await mockGetContenidoEntregable(entregable);
  return { entregable, contenido };
};

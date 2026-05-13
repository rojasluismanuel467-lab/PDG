import type { Entregable } from "./entregables.mock";

type BloqueContenido = {
  titulo: string;
  detalle: string;
};

type VisualizacionMetricas = {
  tipo: "metricas";
  titulo: string;
  items: Array<{ label: string; valor: string }>;
};

type VisualizacionTabla = {
  tipo: "tabla";
  titulo: string;
  columnas: string[];
  filas: string[][];
};

type VisualizacionLista = {
  tipo: "lista";
  titulo: string;
  items: string[];
};

export type VisualizacionEntregable =
  | VisualizacionMetricas
  | VisualizacionTabla
  | VisualizacionLista;

export type ContenidoEntregableEmpresa = {
  resumen_ejecutivo: string;
  secciones: BloqueContenido[];
  visualizaciones: VisualizacionEntregable[];
  ultima_actualizacion: string;
};

const delay = (ms = 250) => new Promise((res) => setTimeout(res, ms));

const ETAPA_LABEL: Record<Entregable["etapa"], string> = {
  AS_IS: "AS-IS",
  TO_BE: "TO-BE",
  BRECHAS: "Brechas",
  ROADMAP: "Roadmap",
};

const crearVisualizaciones = (
  entregable: Entregable
): VisualizacionEntregable[] => {
  const base = entregable.orden + entregable.orden_etapa;

  if (entregable.etapa === "AS_IS") {
    return [
      {
        tipo: "metricas",
        titulo: "Indicadores del estado actual",
        items: [
          { label: "Sistemas relevados", valor: String(8 + base) },
          { label: "Fuentes de datos", valor: String(14 + base) },
          { label: "Indice de calidad", valor: `${70 + base}%` },
        ],
      },
      {
        tipo: "tabla",
        titulo: "Cobertura por dominio",
        columnas: ["Dominio", "Cobertura", "Observacion"],
        filas: [
          ["Comercial", `${65 + base}%`, "Documentacion parcial"],
          ["Operaciones", `${58 + base}%`, "Integraciones manuales"],
          ["Finanzas", `${72 + base}%`, "Mayor trazabilidad"],
        ],
      },
    ];
  }

  if (entregable.etapa === "TO_BE") {
    return [
      {
        tipo: "tabla",
        titulo: "Capacidades objetivo",
        columnas: ["Capacidad", "Meta", "Horizonte"],
        filas: [
          ["Catalogo de datos", "100% de dominios criticos", "Q2"],
          ["Gobierno de calidad", "Reglas en linea", "Q3"],
          ["Integracion analitica", "Tiempo real", "Q4"],
        ],
      },
      {
        tipo: "metricas",
        titulo: "Impacto esperado",
        items: [
          { label: "Reduccion de reprocesos", valor: `${18 + base}%` },
          { label: "Disponibilidad de datos", valor: `${95 + base / 2}%` },
          { label: "Tiempo a insight", valor: `-${10 + base} dias` },
        ],
      },
    ];
  }

  if (entregable.etapa === "BRECHAS") {
    return [
      {
        tipo: "tabla",
        titulo: "Matriz de brechas priorizadas",
        columnas: ["Brecha", "Severidad", "Esfuerzo"],
        filas: [
          ["Falta de linaje", "Alta", "Medio"],
          ["Duplicidad de fuentes", "Media", "Alto"],
          ["Controles de calidad incompletos", "Alta", "Medio"],
        ],
      },
      {
        tipo: "lista",
        titulo: "Riesgos asociados",
        items: [
          "Desalineacion entre definiciones de datos maestras.",
          "Retrasos por dependencias tecnicas externas.",
          "Incremento de costo operativo por retrabajo de informes.",
        ],
      },
    ];
  }

  return [
    {
      tipo: "lista",
      titulo: "Hitos de implementacion",
      items: [
        "Inicio de frente de gobierno y calidad de datos.",
        "Ejecucion de pilotos en dominios de alto valor.",
        "Escalamiento por olas y cierre con evaluacion de beneficios.",
      ],
    },
    {
      tipo: "metricas",
      titulo: "Control del roadmap",
      items: [
        { label: "Hitos definidos", valor: String(5 + entregable.orden_etapa) },
        { label: "Dependencias criticas", valor: String(2 + entregable.orden_etapa) },
        { label: "Riesgos mitigados", valor: `${60 + base}%` },
      ],
    },
  ];
};

export const mockGetContenidoEntregable = async (
  entregable: Entregable
): Promise<ContenidoEntregableEmpresa> => {
  await delay();

  return {
    resumen_ejecutivo: `El entregable "${entregable.nombre}" consolida resultados de la etapa ${ETAPA_LABEL[entregable.etapa]} con foco en decisiones de arquitectura de datos y lineamientos de ejecucion.`,
    secciones: [
      {
        titulo: "Alcance",
        detalle:
          "Se analizan procesos, activos de datos y capacidades tecnicas impactadas por el proyecto, delimitando responsables y criterios de aceptacion.",
      },
      {
        titulo: "Analisis",
        detalle:
          "Se sintetizan hallazgos tecnicos y de negocio, incluyendo supuestos de trabajo, dependencias y puntos de control para seguimiento.",
      },
      {
        titulo: "Recomendaciones",
        detalle:
          "Se priorizan acciones aplicables al corto y mediano plazo para reducir riesgos de implementacion y aumentar valor sobre los datos.",
      },
    ],
    visualizaciones: crearVisualizaciones(entregable),
    ultima_actualizacion: entregable.fecha_aprobacion ?? "2025-03-15T10:00:00Z",
  };
};

// Mock del módulo de Evaluación de Madurez en Gestión de Datos (RF-MAD / RF-PORTAL)
// Cuestionario público DAMA-DMBOK2 — sin autenticación, accedido por token

// ─────────────────────────────────────────────
// TIPOS DE DOMINIO
// ─────────────────────────────────────────────

export type FactorEvaluacion =
  | "ACTIVIDADES"
  | "TECNICAS"
  | "ROLES_RESPONSABILIDADES"
  | "ORGANIZACION_CULTURA"
  | "HERRAMIENTAS"
  | "ENTREGABLES";

export type PuntuacionFactor = 0 | 1 | 2 | 3 | 4;

export type AreaConocimiento = {
  id: string;            // "KA-01" … "KA-11"
  nombre: string;
  descripcion: string;   // párrafo introductorio que aparece arriba de la pantalla
  factores: FactorDetalle[];
};

export type FactorDetalle = {
  tipo: FactorEvaluacion;
  label: string;
  guia: string;          // texto de ayuda que explica qué evaluar en este factor para esta KA
};

// Niveles de madurez (referencia visual en el cuestionario)
export type NivelMadurez = {
  valor: PuntuacionFactor;
  etiqueta: string;
  descripcion: string;
};

// ─────────────────────────────────────────────
// ESTADO DE SESIÓN (guardado en sessionStorage)
// ─────────────────────────────────────────────

export type DatosRespondente = {
  nombre: string;
  cargo: string;
  area: string;
};

export type RespuestaKA = {
  ka_id: string;
  factores: Partial<Record<FactorEvaluacion, PuntuacionFactor>>;
  obs_proceso: string;
  obs_personas: string;
  obs_tecnologia: string;
};

export type EstadoSesion =
  | "DATOS_RESPONDENTE"   // paso 0
  | "SELECCION_KAS"       // paso 1
  | "EN_CUESTIONARIO"     // pasos 2..N+1
  | "CONFIRMACION"        // paso N+2
  | "ENVIADO";            // estado final

export type SesionCuestionario = {
  token: string;
  estado: EstadoSesion;
  datos_respondente: DatosRespondente | null;
  kas_seleccionadas: string[];            // IDs de KAs que aplican a la empresa
  ka_actual_index: number;               // índice dentro de kas_seleccionadas
  respuestas: Record<string, RespuestaKA>; // keyed by ka_id
};

// ─────────────────────────────────────────────
// ESCALA DE MADUREZ (referencia visual)
// ─────────────────────────────────────────────

export const NIVELES_MADUREZ: NivelMadurez[] = [
  {
    valor: 0,
    etiqueta: "Sin evidencia",
    descripcion: "No existe ninguna práctica formal. El área es completamente reactiva o ausente.",
  },
  {
    valor: 1,
    etiqueta: "Inicial",
    descripcion: "Prácticas ad hoc, dependientes de personas. Sin procesos documentados ni repetibles.",
  },
  {
    valor: 2,
    etiqueta: "Gestionado",
    descripcion: "Procesos básicos definidos y ejecutados de forma repetible dentro de proyectos.",
  },
  {
    valor: 3,
    etiqueta: "Definido",
    descripcion: "Procesos estandarizados a nivel organizacional, documentados y con mejora continua.",
  },
  {
    valor: 4,
    etiqueta: "Optimizado",
    descripcion: "Gestión cuantitativa, innovación continua y alineación estratégica completa.",
  },
];

// ─────────────────────────────────────────────
// ÁREAS DE CONOCIMIENTO DAMA-DMBOK2
// ─────────────────────────────────────────────

export const AREAS_CONOCIMIENTO: AreaConocimiento[] = [
  {
    id: "KA-01",
    nombre: "Gobierno de Datos",
    descripcion:
      "Evalúa cómo la organización ejerce autoridad, control y toma de decisiones sobre los activos de datos, incluyendo políticas, procesos y estructuras de responsabilidad.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen actividades formales de gobierno (comités, revisiones, aprobaciones de políticas) ejecutadas de forma periódica?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se usan marcos o metodologías reconocidas de gobierno (DAMA, COBIT, DCAM) para estructurar las prácticas?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Están definidos y asignados roles como Data Owner, Data Steward o Chief Data Officer con responsabilidades claras?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿La alta dirección respalda activamente el gobierno de datos? ¿Existe cultura de responsabilidad sobre los datos?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan herramientas de catálogo de datos, gestión de políticas o flujos de aprobación para soportar el gobierno?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen políticas, charters, marcos de gobierno o reportes de cumplimiento documentados y actualizados?",
      },
    ],
  },
  {
    id: "KA-02",
    nombre: "Arquitectura de Datos",
    descripcion:
      "Evalúa la capacidad de la organización para diseñar, mantener y evolucionar los modelos y estructuras que definen cómo se organiza, integra y usa la información.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Se realizan actividades de diseño arquitectónico de datos de forma planificada (modelado, revisión de arquitectura, roadmap de datos)?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican estándares de modelado (UML, ERD, TOGAF ADM) y marcos de arquitectura empresarial?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Existe un Arquitecto de Datos o rol equivalente con responsabilidad formal sobre la arquitectura?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿Los proyectos de TI y negocio consultan y respetan la arquitectura de datos antes de tomar decisiones técnicas?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan herramientas de modelado de datos (ERwin, PowerDesigner, draw.io) o repositorios de arquitectura?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen modelos conceptuales, lógicos y físicos documentados, versionados y accesibles para los equipos?",
      },
    ],
  },
  {
    id: "KA-03",
    nombre: "Diseño y Modelado de Datos",
    descripcion:
      "Evalúa los procesos para analizar, diseñar, construir y mantener modelos de datos que representen con precisión los conceptos de negocio y sus relaciones.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existe un proceso formal para diseñar modelos de datos en proyectos nuevos y para mantener los existentes?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican técnicas de normalización, modelado dimensional, modelado conceptual y patrones de diseño de datos?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Hay Modeladores de Datos o Arquitectos de Datos responsables de revisar y aprobar los modelos?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿Los equipos de desarrollo consultan los modelos existentes antes de crear nuevas estructuras de datos?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan herramientas CASE o de modelado (ERwin, Lucidchart, dbdiagram) para crear y mantener los modelos?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen modelos de datos aprobados, versionados y almacenados en un repositorio accesible?",
      },
    ],
  },
  {
    id: "KA-04",
    nombre: "Almacenamiento y Operaciones de Datos",
    descripcion:
      "Evalúa las prácticas para diseñar, implementar y gestionar los almacenes de datos físicos, incluyendo disponibilidad, rendimiento y recuperación.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos formales para gestión de bases de datos, backups, recuperación y monitoreo de rendimiento?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican técnicas de optimización de consultas, particionamiento, indexación y alta disponibilidad?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Existe un DBA (Administrador de Base de Datos) con responsabilidades claramente definidas?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿La organización tiene SLAs definidos para disponibilidad y tiempo de recuperación de datos?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan herramientas de monitoreo, backup automático y gestión de bases de datos (pgAdmin, Datadog, etc.)?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen planes de recuperación ante desastres (DRP), runbooks de operación y reportes de disponibilidad?",
      },
    ],
  },
  {
    id: "KA-05",
    nombre: "Seguridad de Datos",
    descripcion:
      "Evalúa las prácticas para proteger los activos de datos contra acceso no autorizado, garantizando privacidad, confidencialidad e integridad conforme a la regulación vigente.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos de clasificación de datos, control de acceso, auditoría y respuesta a incidentes de seguridad?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican técnicas de enmascaramiento, cifrado, tokenización y gestión de identidades y accesos (IAM)?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Existe un responsable de seguridad de datos (CISO, DPO u oficial de protección) con funciones definidas?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿Hay concienciación y capacitación en seguridad de datos para todos los empleados que manejan información?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan herramientas de DLP, SIEM, gestión de accesos privilegiados o auditoría de bases de datos?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen políticas de seguridad, clasificación de datos, registros de tratamiento (Ley 1581/2012) y reportes de auditoría?",
      },
    ],
  },
  {
    id: "KA-06",
    nombre: "Integración e Interoperabilidad de Datos",
    descripcion:
      "Evalúa la capacidad para mover, consolidar, virtualizar y federar datos entre sistemas, garantizando consistencia y oportunidad en el intercambio de información.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos formales de ETL/ELT, integración de sistemas y gestión de flujos de datos entre aplicaciones?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican patrones de integración (CDC, virtualización, API-first, mensajería) y estándares de interoperabilidad?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Hay Ingenieros de Datos o Arquitectos de Integración responsables del diseño y mantenimiento de los flujos?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿Los equipos coordinan activamente el intercambio de datos entre áreas en lugar de crear silos independientes?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan plataformas de integración (Talend, Airbyte, MuleSoft, Apache Kafka, APIs REST) de forma sistemática?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen mapas de flujo de datos, inventarios de integraciones, SLAs de entrega y documentación de APIs?",
      },
    ],
  },
  {
    id: "KA-07",
    nombre: "Documentos y Contenidos",
    descripcion:
      "Evalúa la gestión del ciclo de vida de datos no estructurados: documentos, imágenes, audio, video y otros contenidos digitales generados por la organización.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos para captura, almacenamiento, clasificación, retención y eliminación de documentos y contenidos?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican técnicas de gestión documental (taxonomías, metadatos, control de versiones, búsqueda full-text)?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Hay responsables de gestión documental o archivística con funciones definidas sobre el ciclo de vida del contenido?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿La organización tiene políticas de retención de documentos cumplidas y cultura de clasificación de contenidos?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan sistemas de gestión documental (SharePoint, Confluence, OpenText) o ECM para el contenido corporativo?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen políticas de retención, taxonomías documentadas, inventarios de contenido y registros de disposición?",
      },
    ],
  },
  {
    id: "KA-08",
    nombre: "Datos de Referencia y Maestros",
    descripcion:
      "Evalúa las prácticas para gestionar datos compartidos y críticos para el negocio (clientes, productos, proveedores, territorios) garantizando una única versión de la verdad.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos para identificar, limpiar, deduplicar y gobernar los datos maestros y de referencia del negocio?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican técnicas de MDM (Master Data Management), golden record, correspondencia de entidades y jerarquías?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Hay Data Stewards o propietarios de datos maestros responsables de su mantenimiento y calidad?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿Las áreas de negocio confían y usan la fuente oficial de datos maestros en lugar de mantener listas propias?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usa una plataforma MDM (Informatica, SAP MDG, Reltio) o repositorio central de datos de referencia?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen registros maestros definitivos, tablas de referencia aprobadas y documentación de jerarquías de negocio?",
      },
    ],
  },
  {
    id: "KA-09",
    nombre: "Almacenamiento de Datos e Inteligencia de Negocio",
    descripcion:
      "Evalúa la capacidad para planificar, construir y mantener infraestructuras de análisis de datos (DW, Data Lake, cubos OLAP) y generar inteligencia de negocio accionable.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos para diseño, carga, mantenimiento y explotación del Data Warehouse o plataforma analítica?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican técnicas de modelado dimensional (estrella, copo de nieve), diseño de cubos OLAP y pipelines analíticos?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Hay Analistas de BI, Ingenieros de Datos o Arquitectos de Datos responsables de la plataforma analítica?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿La toma de decisiones de negocio se basa en datos del DW/BI en lugar de intuición o reportes ad hoc?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan herramientas de BI (Power BI, Tableau, Looker) y plataformas de DW (Snowflake, BigQuery, Redshift)?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen dashboards, reportes operativos, cubos OLAP y documentación del modelo analítico disponibles para el negocio?",
      },
    ],
  },
  {
    id: "KA-10",
    nombre: "Metadatos",
    descripcion:
      "Evalúa las prácticas para planificar, implementar y gestionar los metadatos que describen los activos de datos, facilitando su descubrimiento, comprensión y uso correcto.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos para capturar, mantener y publicar metadatos técnicos, de negocio y operacionales de forma sistemática?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican estándares de metadatos (Dublin Core, ISO 11179, OpenLineage) y se gestiona el linaje de datos?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Hay Data Stewards o responsables de catálogo encargados de mantener y validar la calidad de los metadatos?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿Los equipos de desarrollo y negocio documentan metadatos de forma habitual como parte de su flujo de trabajo?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usa un catálogo de datos activo (Alation, Collibra, DataHub, Apache Atlas) para gestionar y publicar metadatos?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existe un catálogo de datos publicado, glosarios de negocio aprobados y documentación de linaje de datos disponible?",
      },
    ],
  },
  {
    id: "KA-11",
    nombre: "Calidad de Datos",
    descripcion:
      "Evalúa la capacidad para definir, medir, monitorear y mejorar la calidad de los datos según dimensiones como completitud, exactitud, consistencia, oportunidad y unicidad.",
    factores: [
      {
        tipo: "ACTIVIDADES",
        label: "Actividades",
        guia: "¿Existen procesos de perfilado, validación, limpieza y monitoreo continuo de calidad de datos en producción?",
      },
      {
        tipo: "TECNICAS",
        label: "Técnicas",
        guia: "¿Se aplican técnicas de data profiling, reglas de calidad, scorecards de calidad y gestión de anomalías?",
      },
      {
        tipo: "ROLES_RESPONSABILIDADES",
        label: "Roles y Responsabilidades",
        guia: "¿Hay un responsable de calidad de datos (Data Quality Manager o Steward) con metas de mejora definidas?",
      },
      {
        tipo: "ORGANIZACION_CULTURA",
        label: "Organización y Cultura",
        guia: "¿Los problemas de calidad de datos se escalan y resuelven formalmente? ¿Hay cultura de responsabilidad sobre la calidad?",
      },
      {
        tipo: "HERRAMIENTAS",
        label: "Herramientas",
        guia: "¿Se usan herramientas de calidad de datos (Talend DQ, Informatica DQ, Great Expectations, dbt tests) de forma sistemática?",
      },
      {
        tipo: "ENTREGABLES",
        label: "Entregables",
        guia: "¿Existen reportes de calidad de datos, SLAs de calidad firmados y planes de mejora documentados y ejecutados?",
      },
    ],
  },
];

// ─────────────────────────────────────────────
// FUNCIONES MOCK DEL PORTAL
// ─────────────────────────────────────────────

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

// Simula validar el token de diagnóstico enviado por email al cliente
export type EstadoToken = "VALIDO" | "EXPIRADO" | "YA_RESPONDIDO" | "INVALIDO" | "CERRADO";

export type InfoDiagnostico = {
  token: string;
  nombre_empresa: string;
  nombre_proyecto: string;
  kas_habilitadas: string[]; // IDs de KAs que el consultor habilitó para este diagnóstico
  fecha_expiracion: string;
};

export const MOCK_DIAGNOSTICO_TOKENS: Record<string, InfoDiagnostico & { estado: EstadoToken }> = {
  "tok-demo-001": {
    token: "tok-demo-001",
    estado: "VALIDO",
    nombre_empresa: "Constructora Bolívar S.A.",
    nombre_proyecto: "Diagnóstico de Arquitectura de Datos — Constructora Bolívar",
    kas_habilitadas: ["KA-01", "KA-02", "KA-05", "KA-09", "KA-10", "KA-11"],
    fecha_expiracion: "2026-04-30T23:59:59Z",
  },
  "tok-demo-expirado": {
    token: "tok-demo-expirado",
    estado: "EXPIRADO",
    nombre_empresa: "Tech Soluciones SAS",
    nombre_proyecto: "Evaluación de Madurez — Tech Soluciones",
    kas_habilitadas: ["KA-01", "KA-11"],
    fecha_expiracion: "2025-12-31T23:59:59Z",
  },
  "tok-demo-respondido": {
    token: "tok-demo-respondido",
    estado: "YA_RESPONDIDO",
    nombre_empresa: "Banco Agrario",
    nombre_proyecto: "Evaluación de Madurez — Banco Agrario",
    kas_habilitadas: ["KA-01", "KA-04", "KA-05", "KA-10", "KA-11"],
    fecha_expiracion: "2026-05-15T23:59:59Z",
  },
  "tok-demo-cerrado": {
    token: "tok-demo-cerrado",
    estado: "CERRADO",
    nombre_empresa: "Grupo Éxito S.A.",
    nombre_proyecto: "Evaluación de Madurez — Grupo Éxito",
    kas_habilitadas: ["KA-01", "KA-02", "KA-03"],
    fecha_expiracion: "2026-06-30T23:59:59Z",
  },
};

export const mockValidarToken = async (
  token: string
): Promise<{ estado: EstadoToken; info: InfoDiagnostico | null }> => {
  await delay(800);
  const entry = MOCK_DIAGNOSTICO_TOKENS[token];
  if (!entry) return { estado: "INVALIDO", info: null };
  const { estado, ...info } = entry;
  // Devolvemos info en VALIDO y CERRADO para que el respondente sepa de qué proyecto se trata
  return {
    estado,
    info: estado === "VALIDO" || estado === "CERRADO" ? info : null,
  };
};

/**
 * Cierra o reabre el cuestionario de un proyecto.
 * En producción: PATCH /api/v1/proyectos/{projectId}/cuestionario/estado
 * Body: { cerrado: boolean }
 */
export const mockToggleCuestionarioCerrado = async (
  projectId: string,
  cerrar: boolean
): Promise<{ cerrado: boolean }> => {
  await delay(400);
  // En producción el backend persistiría este estado en DB
  // y todos los tokens asociados al proyecto pasarían a estado "CERRADO" / "VALIDO"
  return { cerrado: cerrar };
};

export const mockEnviarRespuestas = async (
  token: string,
  sesion: Omit<SesionCuestionario, "token" | "estado">
): Promise<{ ok: boolean }> => {
  await delay(1200);
  // En producción aquí se haría POST /api/v1/diagnostico/{token}/respuestas
  if (!MOCK_DIAGNOSTICO_TOKENS[token] || MOCK_DIAGNOSTICO_TOKENS[token].estado !== "VALIDO") {
    throw new Error("TOKEN_INVALIDO_O_EXPIRADO");
  }
  // Simula marcarlo como respondido
  MOCK_DIAGNOSTICO_TOKENS[token].estado = "YA_RESPONDIDO";
  return { ok: true };
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export const getKAsHabilitadas = (ids: string[]): AreaConocimiento[] =>
  AREAS_CONOCIMIENTO.filter((ka) => ids.includes(ka.id));

export const sesionVacia = (token: string, kasHabilitadas: string[]): SesionCuestionario => ({
  token,
  estado: "DATOS_RESPONDENTE",
  datos_respondente: null,
  kas_seleccionadas: [],
  ka_actual_index: 0,
  respuestas: Object.fromEntries(
    kasHabilitadas.map((id) => [
      id,
      {
        ka_id: id,
        factores: {},
        obs_proceso: "",
        obs_personas: "",
        obs_tecnologia: "",
      },
    ])
  ),
});

export const SESION_KEY = (token: string) => `arqdata_mad_sesion_${token}`;

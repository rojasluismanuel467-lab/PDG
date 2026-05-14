export type EstadoEntregable =
  | "PENDIENTE"
  | "EN_PROGRESO"
  | "PENDIENTE_APROBACION_EMPRESA"   // consultor aprobó, esperando empresa
  | "APROBADO"                        // ambos aprobaron
  | "NO_APLICA";

export type EtapaEntregable = "CUESTIONARIO" | "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP";

export type Entregable = {
  id: string;
  id_proyecto: string;
  nombre: string;
  descripcion: string;
  etapa: EtapaEntregable;
  orden: number;
  orden_etapa: number;
  estado: EstadoEntregable;
  // Aprobación dual — consultor gerente + empresa
  aprobacion_consultor: boolean;
  aprobacion_empresa: boolean;
  fecha_aprobacion_consultor: string | null;
  fecha_aprobacion_empresa: string | null;
  // Mantener para compatibilidad con vistas existentes
  fecha_aprobacion: string | null;
  aprobado_por: string | null;
  // Trazabilidad de revisiones — DMBOK audit trail
  // En producción: calculado/almacenado en tabla entregable_revisiones
  ciclos_revision: number;           // veces que la empresa rechazó
  ultimo_motivo_rechazo: string | null; // motivo del último rechazo de empresa
};

// ============================================================================
// Los 19 artefactos definidos en la Lógica de Negocio ARQDATA v1.0
// Nombres EXACTOS — NO modificar sin actualizar la lógica de negocio
// ============================================================================

export const NOMBRES_ENTREGABLES: Record<EtapaEntregable, string[]> = {
  CUESTIONARIO: ["Cuestionario de Madurez"],
  AS_IS: [
    "Diagrama Conceptual AS-IS",
    "Matriz de Inventario de Sistemas",
    "DFD AS-IS",
    "Matriz RACI / Roles",
    "Modelo Lógico de Datos AS-IS",
    "Glosario de Negocio AS-IS",
  ],
  TO_BE: [
    "Diagrama Conceptual TO-BE",
    "Modelo Lógico de Datos TO-BE",
    "Glosario de Negocio",
    "DFD TO-BE",
    "Inventario de Sistemas TO-BE",
    "Matriz RACI / Roles TO-BE",
  ],
  BRECHAS: [
    "Matriz CRUD Comparativa",
    "Reporte de Análisis de Brechas",
    "Reglas de Integración y Calidad",
  ],
  ROADMAP: [
    "Roadmap de Implementación",
    "Estándares de Arquitectura",
    "Dashboard de Métricas y KPIs",
  ],
};

// ============================================================================
// Descripciones de cada artefacto (alineadas con Lógica de Negocio v1.0)
// ============================================================================

const DESCRIPCIONES_ENTREGABLES: Record<EtapaEntregable, string[]> = {
  CUESTIONARIO: [
    "Evaluación del nivel de madurez en gestión de datos de la organización. Formato: Cuestionario interactivo con radar chart.",
  ],
  AS_IS: [
    "Modelo visual de alto nivel de las entidades de negocio actuales y sus relaciones. Formato: Diagrama ER interactivo.",
    "Catálogo de aplicaciones, bases de datos y plataformas con sus características. Formato: Tabla editable (DataGrid).",
    "Mapa de cómo se mueve la información entre sistemas, procesos y actores en el estado actual. Formato: Diagrama de flujo.",
    "Definición de responsabilidades (Responsible, Accountable, Consulted, Informed) sobre los datos. Formato: Matriz editable.",
    "Estructura detallada del estado actual: entidades, atributos, tipos de datos y relaciones. Formato: Editor mixto (tabla + texto).",
    "Definiciones actuales de términos, entidades y atributos clave del negocio. Formato: Tabla editable con búsqueda.",
  ],
  TO_BE: [
    "Modelo visual de las entidades de negocio futuras y sus relaciones objetivo. Formato: Diagrama ER interactivo.",
    "Estructura detallada de entidades, atributos, tipos de datos y relaciones del estado objetivo. Formato: Editor mixto (tabla + texto).",
    "Definiciones estandarizadas de términos, entidades y atributos clave del negocio. Formato: Tabla editable con búsqueda.",
    "Arquitectura de integración futura: flujos de datos optimizados entre sistemas objetivo. Formato: Diagrama de flujo.",
    "Catálogo objetivo de aplicaciones, bases de datos y plataformas con sus características planeadas. Formato: Tabla editable (DataGrid).",
    "Definición objetivo de responsabilidades sobre los datos usando estructura RACI. Formato: Matriz editable.",
  ],
  BRECHAS: [
    "Cruce entre AS-IS y TO-BE indicando qué se Crea, Lee, Actualiza o Elimina por entidad/sistema. Formato: Tabla con código de colores.",
    "Documento narrativo detallando deficiencias, riesgos, impacto y priorización. Formato: Editor Markdown con preview.",
    "Especificaciones técnicas para cerrar las brechas: reglas de transformación, validación y calidad. Formato: Editor Markdown con preview.",
  ],
  ROADMAP: [
    "Cronograma de iniciativas para cerrar brechas, con fases y dependencias. Formato: Diagrama Gantt interactivo.",
    "Políticas, lineamientos y convenciones a seguir durante la implementación. Formato: Editor Markdown con preview.",
    "Indicadores de éxito del proyecto de arquitectura de datos. Formato: Gráficos interactivos (Chart.js/Recharts).",
  ],
};

// ============================================================================
// Generador de entregables por proyecto
// ============================================================================

const generarEntregables = (
  idProyecto: string,
  estados: EstadoEntregable[]
): Entregable[] => {
  const resultado: Entregable[] = [];
  let orden = 1;
  const etapas: EtapaEntregable[] = ["CUESTIONARIO", "AS_IS", "TO_BE", "BRECHAS", "ROADMAP"];
  etapas.forEach((etapa) => {
    NOMBRES_ENTREGABLES[etapa].forEach((nombre, i) => {
      const estado = estados[orden - 1];
      const aprobadoAmbos = estado === "APROBADO";
      const esperandoEmpresa = estado === "PENDIENTE_APROBACION_EMPRESA";
      resultado.push({
        id: `ent-${idProyecto}-${orden}`,
        id_proyecto: idProyecto,
        nombre,
        descripcion: DESCRIPCIONES_ENTREGABLES[etapa][i],
        etapa,
        orden,
        orden_etapa: i + 1,
        estado,
        aprobacion_consultor: aprobadoAmbos || esperandoEmpresa,
        aprobacion_empresa: aprobadoAmbos,
        fecha_aprobacion_consultor:
          aprobadoAmbos || esperandoEmpresa ? "2025-03-10T10:00:00Z" : null,
        fecha_aprobacion_empresa:
          aprobadoAmbos ? "2025-03-15T10:00:00Z" : null,
        fecha_aprobacion:
          aprobadoAmbos ? "2025-03-15T10:00:00Z" : null,
        aprobado_por:
          aprobadoAmbos ? "Carlos Méndez" : null,
        ciclos_revision: 0,
        ultimo_motivo_rechazo: null,
      });
      orden++;
    });
  });
  return resultado;
};

// ============================================================================
// Estados por proyecto (19 entregables cada uno)
// Orden: CUESTIONARIO(1) + AS_IS(6) + TO_BE(6) + BRECHAS(3) + ROADMAP(3) = 19
// ============================================================================

// Bancolombia: AS-IS en progreso
const ESTADOS_PROY_001: EstadoEntregable[] = [
  "EN_PROGRESO",  // 1. Cuestionario de Madurez
  "PENDIENTE",    // 2. Diagrama Conceptual AS-IS
  "PENDIENTE",    // 3. Matriz de Inventario de Sistemas
  "PENDIENTE",    // 4. DFD AS-IS
  "PENDIENTE",    // 5. Matriz RACI / Roles
  "PENDIENTE",    // 6. Modelo Lógico de Datos AS-IS
  "PENDIENTE",    // 7. Glosario de Negocio AS-IS
  "PENDIENTE",    // 8. Diagrama Conceptual TO-BE
  "PENDIENTE",    // 9. Modelo Lógico de Datos TO-BE
  "PENDIENTE",    // 10. Glosario de Negocio
  "PENDIENTE",    // 11. DFD TO-BE
  "PENDIENTE",    // 12. Inventario de Sistemas TO-BE
  "PENDIENTE",    // 13. Matriz RACI / Roles TO-BE
  "PENDIENTE",    // 14. Matriz CRUD Comparativa
  "PENDIENTE",    // 15. Reporte de Análisis de Brechas
  "PENDIENTE",    // 16. Reglas de Integración y Calidad
  "PENDIENTE",    // 17. Roadmap de Implementación
  "PENDIENTE",    // 18. Estándares de Arquitectura
  "PENDIENTE",    // 19. Dashboard de Métricas y KPIs
];

// EPM: AS-IS completo, TO-BE en progreso
const ESTADOS_PROY_002: EstadoEntregable[] = [
  "APROBADO", "APROBADO", "APROBADO", "APROBADO", "APROBADO", "APROBADO", "APROBADO",  // CUESTIONARIO + AS_IS completo
  "APROBADO", "EN_PROGRESO", "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE",         // TO-BE en progreso
  "PENDIENTE", "PENDIENTE", "PENDIENTE",                                                 // Brechas pendiente
  "PENDIENTE", "PENDIENTE", "PENDIENTE",                                                 // Roadmap pendiente
];

// Grupo Éxito: Proyecto completado
const ESTADOS_PROY_003: EstadoEntregable[] = Array(19).fill("APROBADO") as EstadoEntregable[];

// Nequi: Inicio del AS-IS
const ESTADOS_PROY_004: EstadoEntregable[] = [
  "EN_PROGRESO",                                                                          // CUESTIONARIO iniciando
  "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE",           // AS-IS pendiente
  "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE", "PENDIENTE",           // TO-BE pendiente
  "PENDIENTE", "PENDIENTE", "PENDIENTE",                                                  // Brechas pendiente
  "PENDIENTE", "PENDIENTE", "PENDIENTE",                                                  // Roadmap pendiente
];

export const MOCK_ENTREGABLES: Record<string, Entregable[]> = {
  "proy-001": generarEntregables("proy-001", ESTADOS_PROY_001),
  "proy-002": generarEntregables("proy-002", ESTADOS_PROY_002),
  "proy-003": generarEntregables("proy-003", ESTADOS_PROY_003),
  "proy-004": generarEntregables("proy-004", ESTADOS_PROY_004),
};

// ============================================================================
// Funciones mock (simulan llamadas a FastAPI)
// ============================================================================

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

export const mockGetEntregables = async (idProyecto: string): Promise<Entregable[]> => {
  await delay();
  return MOCK_ENTREGABLES[idProyecto] ?? [];
};

/**
 * Inicia el trabajo en un entregable (PENDIENTE → EN_PROGRESO).
 * Solo el consultor puede llamar este endpoint.
 * En producción: PATCH /api/v1/proyectos/{projectId}/entregables/{entregableId}/iniciar
 * Body: {}  — sin cuerpo, la transición es implícita
 */
export const mockIniciarEntregable = async (
  idProyecto: string,
  idEntregable: string
): Promise<Entregable> => {
  await delay(400);
  const lista = MOCK_ENTREGABLES[idProyecto];
  const ent = lista?.find((e) => e.id === idEntregable);
  if (!ent) throw new Error("ENTREGABLE_NO_ENCONTRADO");
  if (ent.estado !== "PENDIENTE") throw new Error("ENTREGABLE_NO_EN_ESTADO_PENDIENTE");
  ent.estado = "EN_PROGRESO";
  return ent;
};

/**
 * Aprobación del Consultor Gerente sobre un entregable.
 * En producción: PATCH /api/v1/proyectos/{projectId}/entregables/{entregableId}/aprobacion-consultor
 * Body: { aprobado: boolean }
 */
export const mockAprobarEntregableConsultor = async (
  idProyecto: string,
  idEntregable: string,
  aprobado: boolean
): Promise<Entregable> => {
  await delay(400);
  const lista = MOCK_ENTREGABLES[idProyecto];
  const ent = lista?.find((e) => e.id === idEntregable);
  if (!ent) throw new Error("ENTREGABLE_NO_ENCONTRADO");

  ent.aprobacion_consultor = aprobado;
  ent.fecha_aprobacion_consultor = aprobado ? new Date().toISOString() : null;

  if (!aprobado) {
    // Revocar aprobación del consultor reinicia el flujo
    ent.aprobacion_empresa = false;
    ent.fecha_aprobacion_empresa = null;
    ent.estado = "EN_PROGRESO";
    ent.fecha_aprobacion = null;
    ent.aprobado_por = null;
  } else if (ent.aprobacion_empresa) {
    // Ambos aprobaron
    ent.estado = "APROBADO";
    ent.fecha_aprobacion = new Date().toISOString();
    ent.aprobado_por = "Carlos Méndez";
  } else {
    // Consultor aprobó, esperando empresa
    ent.estado = "PENDIENTE_APROBACION_EMPRESA";
  }

  return ent;
};

/**
 * Decisión de la Empresa sobre un entregable.
 * En producción: PATCH /api/v1/proyectos/{projectId}/entregables/{entregableId}/aprobacion-empresa
 * Body: { aprobado: boolean, motivo?: string }
 */
export const mockAprobarEntregableEmpresa = async (
  idProyecto: string,
  idEntregable: string,
  aprobado: boolean,
  _motivo?: string
): Promise<Entregable> => {
  await delay(400);
  const lista = MOCK_ENTREGABLES[idProyecto];
  const ent = lista?.find((e) => e.id === idEntregable);
  if (!ent) throw new Error("ENTREGABLE_NO_ENCONTRADO");
  if (!ent.aprobacion_consultor) throw new Error("CONSULTOR_NO_HA_APROBADO");

  ent.aprobacion_empresa = aprobado;
  ent.fecha_aprobacion_empresa = aprobado ? new Date().toISOString() : null;

  if (!aprobado) {
    // Empresa rechaza: reinicia el flujo (consultor debe revisar y volver a aprobar)
    ent.aprobacion_consultor = false;
    ent.fecha_aprobacion_consultor = null;
    ent.estado = "EN_PROGRESO";
    ent.fecha_aprobacion = null;
    ent.aprobado_por = null;
    ent.ciclos_revision += 1;
    ent.ultimo_motivo_rechazo = _motivo ?? null;
  } else {
    // Ambos aprobaron — limpiar motivo de rechazo anterior
    ent.estado = "APROBADO";
    ent.fecha_aprobacion = new Date().toISOString();
    ent.aprobado_por = "Carlos Méndez";
    ent.ultimo_motivo_rechazo = null;
  }

  return ent;
};

/**
 * Marca un entregable como No Aplica (solo consultor).
 * En producción: PATCH /api/v1/proyectos/{projectId}/entregables/{entregableId}/no-aplica
 */
export const mockMarcarNoAplica = async (
  idProyecto: string,
  idEntregable: string,
  noAplica: boolean
): Promise<Entregable> => {
  await delay(400);
  const lista = MOCK_ENTREGABLES[idProyecto];
  const ent = lista?.find((e) => e.id === idEntregable);
  if (!ent) throw new Error("ENTREGABLE_NO_ENCONTRADO");
  ent.estado = noAplica ? "NO_APLICA" : "PENDIENTE";
  ent.aprobacion_consultor = false;
  ent.aprobacion_empresa = false;
  ent.fecha_aprobacion_consultor = null;
  ent.fecha_aprobacion_empresa = null;
  ent.fecha_aprobacion = null;
  ent.aprobado_por = null;
  return ent;
};

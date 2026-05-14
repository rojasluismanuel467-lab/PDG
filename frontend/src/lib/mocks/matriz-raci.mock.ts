// ============================================================================
// Mock: Matriz RACI / Roles — AS-IS
// Caso de estudio: Bancolombia — Responsabilidades actuales de datos
// Artefacto #4 de la etapa AS-IS
// ============================================================================

import type {
  MatrizRaci,
  ComentarioMatrizRaci,
} from "@/lib/types/matriz-raci.types";

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

const MOCK_MATRIZ_RACI: Record<string, MatrizRaci> = {
  "proy-001": {
    id: "mat-raci-001",
    entregable_id: "ent-proy-001-4",
    proyecto_id: "proy-001",
    nombre: "Matriz RACI de Gestión de Datos — Bancolombia AS-IS",
    descripcion:
      "Mapa de responsabilidades actuales sobre los procesos de datos de Bancolombia. Identifica quién es Responsable, quién Rinde cuentas, quién es Consultado y quién es Informado para cada actividad clave.",
    roles: [
      {
        id: "rol-001",
        nombre: "VP de Operaciones",
        area: "Vicepresidencia de Operaciones",
        descripcion: "Máxima autoridad sobre los procesos operativos y el Core Bancario.",
      },
      {
        id: "rol-002",
        nombre: "Gerencia de Datos",
        area: "Gerencia de Datos",
        descripcion: "Responsable de la estrategia y calidad de datos corporativos.",
      },
      {
        id: "rol-003",
        nombre: "Equipo de Integración",
        area: "Gerencia de Datos",
        descripcion: "Administra pipelines ETL y flujos de integración entre sistemas.",
      },
      {
        id: "rol-004",
        nombre: "VP Comercial",
        area: "Vicepresidencia Comercial",
        descripcion: "Propietaria de datos de clientes y oportunidades comerciales.",
      },
      {
        id: "rol-005",
        nombre: "Equipo Analytics",
        area: "Vicepresidencia de Estrategia",
        descripcion: "Genera reportes ejecutivos y análisis estratégicos sobre el DWH.",
      },
      {
        id: "rol-006",
        nombre: "Gerencia de Infraestructura TI",
        area: "Vicepresidencia de Tecnología",
        descripcion: "Administra la infraestructura tecnológica, servidores y redes.",
      },
      {
        id: "rol-007",
        nombre: "Auditoría Interna",
        area: "Auditoría",
        descripcion: "Revisa controles internos y cumplimiento de políticas de datos.",
      },
    ],
    actividades: [
      {
        id: "act-001",
        nombre: "Definición de políticas de datos",
        descripcion: "Establecer las normas, estándares y lineamientos para el uso y gestión de datos en la organización.",
        categoria: "gobernanza",
        asignaciones: {
          "rol-002": "A",
          "rol-001": "C",
          "rol-004": "C",
          "rol-007": "I",
        },
        notas: "Actualmente no existe un comité formal de gobernanza. Las políticas las define la Gerencia de Datos de forma unilateral.",
      },
      {
        id: "act-002",
        nombre: "Gestión de calidad de datos (DQ)",
        descripcion: "Monitoreo, validación y corrección de la calidad de datos en sistemas fuente y repositorios.",
        categoria: "calidad",
        asignaciones: {
          "rol-002": "A",
          "rol-003": "R",
          "rol-004": "C",
          "rol-005": "I",
        },
        notas: "Sin herramienta dedicada de DQ. Las validaciones se hacen manualmente en los procesos ETL.",
      },
      {
        id: "act-003",
        nombre: "Acceso y seguridad de datos",
        descripcion: "Gestión de permisos, control de acceso a bases de datos y auditoría de accesos.",
        categoria: "seguridad",
        asignaciones: {
          "rol-006": "A",
          "rol-002": "C",
          "rol-007": "I",
          "rol-001": "I",
        },
        notas: "La misma área opera como Responsible y Accountable; la matriz conserva la asignación Accountable para evitar duplicidad técnica y la brecha queda registrada aquí.",
      },
      {
        id: "act-004",
        nombre: "Integración entre sistemas (ETL)",
        descripcion: "Diseño, construcción y mantenimiento de los pipelines de integración entre Core Bancario, BD Clientes y DWH.",
        categoria: "integracion",
        asignaciones: {
          "rol-003": "R",
          "rol-002": "A",
          "rol-006": "C",
          "rol-001": "I",
        },
        notas: "Procesos batch nocturnos. Latencia de 24h. Documentación desactualizada.",
      },
      {
        id: "act-005",
        nombre: "Reportes regulatorios (SFC)",
        descripcion: "Generación y envío de reportes obligatorios a la Superintendencia Financiera de Colombia.",
        categoria: "reportes",
        asignaciones: {
          "rol-005": "R",
          "rol-001": "A",
          "rol-002": "C",
          "rol-007": "C",
          "rol-004": "I",
        },
        notas: "Proceso crítico con fechas límite regulatorias. Dependiente del DWH con latencia de 24h.",
      },
      {
        id: "act-006",
        nombre: "Mantenimiento y operación del Core Bancario",
        descripcion: "Administración, mantenimiento y disponibilidad del sistema AS400.",
        categoria: "operaciones",
        asignaciones: {
          "rol-006": "R",
          "rol-001": "A",
          "rol-003": "C",
          "rol-002": "I",
        },
        notas: "Sistema con más de 25 años. Conocimiento concentrado en 3 personas clave — riesgo de dependencia de personas.",
      },
      {
        id: "act-007",
        nombre: "Gestión de Master Data (clientes)",
        descripcion: "Mantenimiento del registro maestro de clientes: creación, actualización, deduplicación.",
        categoria: "gobernanza",
        asignaciones: {
          "rol-004": "A",
          "rol-002": "R",
          "rol-003": "C",
          "rol-001": "I",
          "rol-007": "I",
        },
        notas: "~30% duplicidad en BD Clientes Legacy. Sin proceso formal de deduplicación.",
      },
      {
        id: "act-008",
        nombre: "Arquitectura de datos",
        descripcion: "Diseño y evolución de la arquitectura de datos: modelos, esquemas, estándares de nombrado.",
        categoria: "arquitectura",
        asignaciones: {
          "rol-002": "R",
          "rol-006": "C",
          "rol-005": "C",
          "rol-001": "I",
        },
        notas: "La misma gerencia actúa como Responsible y Accountable; la matriz conserva la asignación Responsible para evitar duplicidad técnica y mantener visible la brecha.",
      },
      {
        id: "act-009",
        nombre: "Catálogo de datos / lineage",
        descripcion: "Documentación del inventario de datos, origen, transformaciones y linaje de datos.",
        categoria: "gobernanza",
        asignaciones: {
          "rol-003": "R",
          "rol-002": "A",
          "rol-005": "I",
          "rol-007": "I",
        },
        notas: "No existe un catálogo formal. El lineage se mantiene en documentos Word no versionados.",
      },
      {
        id: "act-010",
        nombre: "Respaldo y recuperación de datos",
        descripcion: "Ejecución y validación de backups. Pruebas de recuperación ante desastres.",
        categoria: "operaciones",
        asignaciones: {
          "rol-006": "A",
          "rol-001": "C",
          "rol-007": "I",
        },
        notas: "Backups nocturnos sin verificación automatizada. La misma área ejecuta y responde por el proceso; se conserva Accountable en la matriz. Último DR test: 2023.",
      },
    ],
    comentarios: [
      {
        id: "com-raci-001",
        referencia_id: "act-003",
        rol_id: null,
        referencia_tipo: "actividad",
        autor_id: "usr-001",
        autor_nombre: "Carlos Méndez",
        autor_perfil: "CONSULTOR",
        contenido:
          "La concentración de roles R y A en Infraestructura TI para seguridad de datos es una brecha crítica de gobernanza. Recomiendo separar estas responsabilidades en el TO-BE.",
        estado: "abierto",
        created_at: "2026-03-10T15:00:00Z",
      },
    ],
    version_actual: "1.0",
    historial_versiones: [
      {
        version: "1.0",
        fecha: "2026-03-10T10:00:00Z",
        autor: "Agente AS-IS",
        descripcion_cambio:
          "Versión inicial generada con IA a partir de entrevistas con líderes de área y revisión documental.",
        total_actividades: 10,
        total_roles: 7,
      },
    ],
    created_at: "2026-03-10T10:00:00Z",
    updated_at: "2026-03-10T10:00:00Z",
  },
};

// ── Funciones mock (simulan llamadas a FastAPI) ───────────────────────────────

export const mockGetMatrizRaci = async (
  idProyecto: string
): Promise<MatrizRaci> => {
  await delay();
  const data = MOCK_MATRIZ_RACI[idProyecto];
  if (!data) throw new Error("MATRIZ_RACI_NO_ENCONTRADA");
  return data;
};

export const mockGuardarMatrizRaci = async (
  matriz: MatrizRaci
): Promise<MatrizRaci> => {
  await delay(400);
  const existente = MOCK_MATRIZ_RACI[matriz.proyecto_id];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");

  const [major, minor] = existente.version_actual.split(".").map(Number);
  const nuevaVersion = `${major}.${(minor ?? 0) + 1}`;

  const actualizado: MatrizRaci = {
    ...matriz,
    version_actual: nuevaVersion,
    updated_at: new Date().toISOString(),
    historial_versiones: [
      ...existente.historial_versiones,
      {
        version: nuevaVersion,
        fecha: new Date().toISOString(),
        autor: "Carlos Méndez",
        descripcion_cambio: "Edición manual de la matriz RACI.",
        total_actividades: matriz.actividades.length,
        total_roles: matriz.roles.length,
      },
    ],
  };

  MOCK_MATRIZ_RACI[matriz.proyecto_id] = actualizado;
  return actualizado;
};

export const mockGenerarMatrizRaciConIA = async (
  idProyecto: string
): Promise<MatrizRaci> => {
  await delay(1800);
  const existente = MOCK_MATRIZ_RACI[idProyecto];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");

  const [major] = existente.version_actual.split(".").map(Number);
  const nuevaVersion = `${(major ?? 1) + 1}.0`;

  const generado: MatrizRaci = {
    ...existente,
    version_actual: nuevaVersion,
    updated_at: new Date().toISOString(),
    historial_versiones: [
      ...existente.historial_versiones,
      {
        version: nuevaVersion,
        fecha: new Date().toISOString(),
        autor: "Agente AS-IS",
        descripcion_cambio:
          "Regeneración completa vía IA a partir de la Matriz de Inventario AS-IS aprobada.",
        total_actividades: existente.actividades.length,
        total_roles: existente.roles.length,
      },
    ],
  };

  MOCK_MATRIZ_RACI[idProyecto] = generado;
  return generado;
};

export const mockAgregarComentarioMatrizRaci = async (
  idProyecto: string,
  comentario: Omit<ComentarioMatrizRaci, "id" | "created_at">
): Promise<void> => {
  await delay(300);
  const existente = MOCK_MATRIZ_RACI[idProyecto];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");
  existente.comentarios.push({
    ...comentario,
    id: `com-raci-${Date.now()}`,
    created_at: new Date().toISOString(),
  });
};

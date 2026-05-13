import { mockGetCRUDMatrix } from "@/lib/mocks/crud-matrix.mock";
import { mockDFDAsIs } from "@/lib/mocks/dfd-asis.mock";
import { mockDFDToBe } from "@/lib/mocks/dfd-tobe.mock";
import { mockGetGapAnalysisReport } from "@/lib/mocks/gap-report.mock";
import { MOCK_PROYECTOS } from "@/lib/mocks/proyectos.mock";
import type { CRUDComparison } from "@/lib/types/crud-matrix.types";
import type { Gap } from "@/lib/types/gap-report.types";
import type {
  IntegrationQualityRules,
  IntegrationRule,
  IntegrationRulePriority,
  IntegrationRuleType,
  IntegrationRulesExportFile,
  IntegrationRulesExportFormat,
} from "@/lib/types/integration-quality-rules.types";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const PRIORIDAD_ORDEN: Record<IntegrationRulePriority, number> = {
  Alta: 0,
  Media: 1,
  Baja: 2,
};

const TIPO_ORDEN: Record<IntegrationRuleType, number> = {
  Matching: 0,
  Validacion: 1,
  Consolidacion: 2,
};

const PROJECT_SOURCE_PRIORITY: Record<string, string[]> = {
  "proy-001": ["CoreBancario", "CRM", "CanalesDigitales"],
  "proy-002": ["SAPISU", "SCADA", "CRMUtilities"],
  "proy-003": ["ERPComercial", "POS", "Ecommerce"],
  "proy-004": ["CoreWallet", "Antifraude", "CanalesMoviles"],
};

type IntegrationContext = {
  proyectoId: string;
  proyectoNombre: string;
  entidadesPrioritarias: string[];
  brechasCriticas: Gap[];
  deltaFlujos: number;
  sourcePriority: string[];
};

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const contarCambiosCRUD = (row: CRUDComparison): number =>
  Number(row.asis_create !== row.tobe_create) +
  Number(row.asis_read !== row.tobe_read) +
  Number(row.asis_update !== row.tobe_update) +
  Number(row.asis_delete !== row.tobe_delete);

const getImpactoScore = (row: CRUDComparison): number => {
  if (row.impacto === "Alto") return 3;
  if (row.impacto === "Medio") return 2;
  return 1;
};

const getEntidadesPriorizadas = (rows: CRUDComparison[]): string[] => {
  const ordenadas = [...rows]
    .sort((a, b) => {
      const scoreA = contarCambiosCRUD(a) * 2 + getImpactoScore(a);
      const scoreB = contarCambiosCRUD(b) * 2 + getImpactoScore(b);
      return scoreB - scoreA;
    })
    .map((row) => row.entidad.trim())
    .filter((value) => value.length > 0);

  const unicas: string[] = [];
  ordenadas.forEach((entidad) => {
    if (!unicas.includes(entidad)) unicas.push(entidad);
  });

  return unicas.slice(0, 4);
};

const getContext = async (proyectoId: string): Promise<IntegrationContext> => {
  const [crud, gapReport] = await Promise.all([
    mockGetCRUDMatrix(proyectoId),
    mockGetGapAnalysisReport(proyectoId),
  ]);

  const proyectoNombre =
    MOCK_PROYECTOS.find((proyecto) => proyecto.id === proyectoId)?.nombre ??
    "Proyecto";

  const brechasCriticas = gapReport.brechas.filter(
    (gap) => gap.prioridad === "Critica" || gap.prioridad === "Alta"
  );

  const dfdAsIsFlujos = proyectoId === "proy-001" ? mockDFDAsIs.flujos.length : 0;
  const dfdToBeFlujos = proyectoId === "proy-001" ? mockDFDToBe.flujos.length : 0;

  return {
    proyectoId,
    proyectoNombre,
    entidadesPrioritarias: getEntidadesPriorizadas(crud.comparaciones),
    brechasCriticas,
    deltaFlujos: dfdToBeFlujos - dfdAsIsFlujos,
    sourcePriority:
      PROJECT_SOURCE_PRIORITY[proyectoId] ?? ["SistemaMaestro", "SistemaSecundario", "Canal"],
  };
};

const buildRuleId = (
  proyectoId: string,
  tipo: IntegrationRuleType,
  index: number
): string => `rule-${proyectoId}-${normalizeText(tipo)}-${index + 1}`;

const buildRules = (context: IntegrationContext): IntegrationRule[] => {
  const entidadA = context.entidadesPrioritarias[0] ?? "Cliente";
  const entidadB = context.entidadesPrioritarias[1] ?? "Cuenta";
  const entidadC = context.entidadesPrioritarias[2] ?? "Transaccion";
  const entidadD = context.entidadesPrioritarias[3] ?? "Canal";

  const [fuentePrimaria, fuenteSecundaria, fuenteTerciaria] = context.sourcePriority;
  const criticidadBrechas = context.brechasCriticas.length;
  const umbralRechazo = criticidadBrechas >= 4 ? "0.5%" : "1.0%";
  const umbralDuplicados = criticidadBrechas >= 4 ? "0.8%" : "1.5%";
  const slaHoras = context.deltaFlujos > 3 ? 6 : 12;

  const reglas: IntegrationRule[] = [
    {
      id: buildRuleId(context.proyectoId, "Matching", 0),
      nombre: `Matching exacto de clave de negocio para ${entidadA}`,
      descripcion:
        "Evita duplicidad en consolidacion de registros maestros usando identificador de negocio y hash tecnico.",
      tipo: "Matching",
      prioridad: "Alta",
      condicion: `Si existe mas de un registro con la misma clave_negocio de ${entidadA} en una ventana de 24 horas.`,
      accion: `Conservar registro de ${fuentePrimaria} como canonico, marcar duplicados y enviar trazabilidad a auditoria con umbral maximo de duplicados ${umbralDuplicados}.`,
    },
    {
      id: buildRuleId(context.proyectoId, "Matching", 1),
      nombre: `Matching probabilistico para ${entidadB}`,
      descripcion:
        "Resuelve colisiones por variaciones de nombre, correo y telefono en entidades operativas.",
      tipo: "Matching",
      prioridad: "Media",
      condicion: `Si score de similitud (nombre_normalizado + email + telefono) es >= 0.92 para ${entidadB}.`,
      accion: `Fusionar registros manteniendo llaves tecnicas y asignar estado POTENCIAL_DUPLICADO cuando score este entre 0.85 y 0.91 para revision de data steward.`,
    },
    {
      id: buildRuleId(context.proyectoId, "Validacion", 2),
      nombre: `Validacion de completitud minima para ${entidadA} y ${entidadC}`,
      descripcion:
        "Controla que atributos obligatorios esten completos antes de exponer datos a consumo analitico.",
      tipo: "Validacion",
      prioridad: "Alta",
      condicion: `Antes de publicar lote, porcentaje de nulos en campos obligatorios de ${entidadA} y ${entidadC} debe ser <= ${umbralRechazo}.`,
      accion: "Rechazar lote, registrar incidente DQ-COMPLETITUD y reenviar a cola de remediacion con detalle de columnas afectadas.",
    },
    {
      id: buildRuleId(context.proyectoId, "Validacion", 3),
      nombre: `Validacion de integridad referencial ${entidadC} -> ${entidadB}`,
      descripcion:
        "Garantiza coherencia entre entidades relacionadas y evita hechos huerfanos en capas de integracion.",
      tipo: "Validacion",
      prioridad: "Alta",
      condicion: `Cada fk_${normalizeText(entidadB)} en ${entidadC} debe existir en la tabla maestra de ${entidadB}; violaciones <= 0.3% por corrida.`,
      accion: "Mover filas huerfanas a zona de cuarentena, generar reporte de excepciones y bloquear propagacion a consumidores descendentes.",
    },
    {
      id: buildRuleId(context.proyectoId, "Validacion", 4),
      nombre: "Validacion de frescura para flujos criticos",
      descripcion:
        "Controla SLA operativo de ingestion para evitar decisiones con datos desactualizados.",
      tipo: "Validacion",
      prioridad: context.deltaFlujos > 2 ? "Alta" : "Media",
      condicion: `Lag entre timestamp_origen y timestamp_ingestion debe ser <= ${slaHoras} horas para dominios criticos.`,
      accion: "Disparar alerta a canal de operaciones, degradar score de calidad y activar reproceso incremental del flujo afectado.",
    },
    {
      id: buildRuleId(context.proyectoId, "Consolidacion", 5),
      nombre: "Consolidacion por prioridad de fuente (source of truth)",
      descripcion:
        "Define precedencia explicita para resolver conflictos de valores entre sistemas.",
      tipo: "Consolidacion",
      prioridad: "Alta",
      condicion: `Cuando un mismo atributo provenga de varias fuentes para ${entidadA}.`,
      accion: `Aplicar prioridad ${fuentePrimaria} > ${fuenteSecundaria} > ${fuenteTerciaria}. Si las dos primeras discrepan por mas de 5%, enviar a conciliacion manual.`,
    },
    {
      id: buildRuleId(context.proyectoId, "Consolidacion", 6),
      nombre: "Consolidacion temporal por vigencia de datos",
      descripcion:
        "Previene sobreescrituras incorrectas aplicando semantica temporal y versionado.",
      tipo: "Consolidacion",
      prioridad: "Media",
      condicion: `Si existen dos versiones activas del mismo registro y diferencia de actualizacion <= 7 dias.`,
      accion:
        "Conservar version mas reciente solo si origen esta en fuentes priorizadas; de lo contrario, mantener version vigente y escalar inconsistencia.",
    },
    {
      id: buildRuleId(context.proyectoId, "Consolidacion", 7),
      nombre: "Regla de aceptacion de calidad para publicacion",
      descripcion:
        "Control de salida que valida umbrales minimos antes de habilitar consumo transversal.",
      tipo: "Consolidacion",
      prioridad: "Alta",
      condicion:
        "Score global de calidad del lote debe ser >= 98 y ninguna regla critica en estado fallido.",
      accion:
        "Si no cumple, bloquear publicacion en capa curated, registrar evidencia y notificar responsables de dominio y consultor gerente.",
    },
    {
      id: buildRuleId(context.proyectoId, "Validacion", 8),
      nombre: `Validacion de estandares de formato en ${entidadD}`,
      descripcion:
        "Alinea campos clave a estandares comunes para evitar divergencias entre sistemas integrados.",
      tipo: "Validacion",
      prioridad: "Baja",
      condicion:
        "Campos de identificacion, fecha y codigos de canal deben cumplir regex corporativa y catalogos vigentes.",
      accion:
        "Normalizar formato en etapa de transformacion y registrar conteo de correcciones automaticas para seguimiento semanal.",
    },
  ];

  return reglas;
};

const ordenarReglas = (reglas: IntegrationRule[]): IntegrationRule[] =>
  [...reglas].sort((a, b) => {
    const prioridad = PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad];
    if (prioridad !== 0) return prioridad;
    return TIPO_ORDEN[a.tipo] - TIPO_ORDEN[b.tipo];
  });

const withDerivedFields = (
  payload: IntegrationQualityRules
): IntegrationQualityRules => ({
  ...payload,
  reglas: ordenarReglas(payload.reglas).map((regla, index) => ({
    ...regla,
    id: regla.id || buildRuleId(payload.proyecto_id, regla.tipo, index),
    nombre: regla.nombre.trim() || `Regla ${index + 1}`,
    descripcion: regla.descripcion.trim() || "Descripcion pendiente.",
    condicion: regla.condicion.trim() || "Condicion pendiente.",
    accion: regla.accion.trim() || "Accion pendiente.",
  })),
});

const buildSummary = (context: IntegrationContext, totalReglas: number): string =>
  `Este documento define ${totalReglas} reglas tecnicas para ${context.proyectoNombre}, orientadas a matching, validacion y consolidacion de datos. La priorizacion se deriva de brechas criticas detectadas en el analisis del proyecto y de diferencias AS-IS/TO-BE en flujos y operaciones CRUD.`;

const buildAcceptanceCriteria = (context: IntegrationContext): string[] => [
  "Porcentaje de duplicados posterior a matching <= 1.0% en entidades maestras.",
  "Completitud en campos obligatorios >= 99.0% por corrida de integracion.",
  "Integridad referencial >= 99.7% para relaciones criticas del dominio.",
  `Cumplimiento de frescura: latencia maxima <= ${context.deltaFlujos > 3 ? 6 : 12} horas en flujos priorizados.`,
  "Bloqueo automatico de publicacion cuando falle cualquier regla de prioridad Alta.",
];

const buildNextVersion = (current: string): string => {
  const [rawMajor, rawMinor] = current.split(".");
  const major = Number.parseInt(rawMajor ?? "1", 10);
  const minor = Number.parseInt(rawMinor ?? "0", 10) + 1;
  return `${Number.isNaN(major) ? 1 : major}.${Number.isNaN(minor) ? 1 : minor}`;
};

const buildIntegrationRulesContextual = async (
  proyectoId: string
): Promise<IntegrationQualityRules> => {
  const context = await getContext(proyectoId);
  const now = new Date().toISOString();
  const reglas = buildRules(context);

  return withDerivedFields({
    id: `integration-rules-${proyectoId}`,
    entregable_id: `ent-${proyectoId}-12`,
    proyecto_id: proyectoId,
    nombre: "Reglas de Integracion y Calidad de Datos",
    descripcion:
      "Especificacion de reglas para consolidar datos, validar calidad y mantener integridad.",
    resumen_tecnico: buildSummary(context, reglas.length),
    reglas,
    criterios_aceptacion: buildAcceptanceCriteria(context),
    formato_objetivo: ["MARKDOWN", "WORD", "PDF"],
    version_actual: "1.0",
    historial_versiones: [
      {
        version: "1.0",
        fecha: now,
        autor: "IA ARQDATA",
        descripcion_cambio:
          "Version inicial contextualizada con CRUD comparativo, DFD y reporte de brechas.",
      },
    ],
    created_at: now,
    updated_at: now,
  });
};

const MOCK_INTEGRATION_RULES: Record<string, IntegrationQualityRules> = {};

export const mockGetIntegrationQualityRules = async (
  proyectoId: string
): Promise<IntegrationQualityRules> => {
  await delay();

  if (!MOCK_INTEGRATION_RULES[proyectoId]) {
    MOCK_INTEGRATION_RULES[proyectoId] = await buildIntegrationRulesContextual(proyectoId);
  }

  return clone(MOCK_INTEGRATION_RULES[proyectoId]);
};

export const mockGuardarIntegrationQualityRules = async (
  documento: IntegrationQualityRules
): Promise<IntegrationQualityRules> => {
  await delay(850);
  const now = new Date().toISOString();
  const version = buildNextVersion(documento.version_actual);

  const actualizado = withDerivedFields({
    ...documento,
    version_actual: version,
    updated_at: now,
    historial_versiones: [
      ...documento.historial_versiones,
      {
        version,
        fecha: now,
        autor: "Carlos Mendez",
        descripcion_cambio:
          "Ajustes manuales en reglas de integracion y criterios de calidad.",
      },
    ],
  });

  MOCK_INTEGRATION_RULES[documento.proyecto_id] = clone(actualizado);
  return clone(actualizado);
};

export const mockGenerarIntegrationQualityRulesConIA = async (
  proyectoId: string
): Promise<IntegrationQualityRules> => {
  await delay(1900);
  const regenerado = await buildIntegrationRulesContextual(proyectoId);
  const actual = MOCK_INTEGRATION_RULES[proyectoId];

  if (!actual) {
    MOCK_INTEGRATION_RULES[proyectoId] = clone(regenerado);
    return clone(regenerado);
  }

  const now = new Date().toISOString();
  const version = buildNextVersion(actual.version_actual);
  const actualizado = withDerivedFields({
    ...actual,
    descripcion: regenerado.descripcion,
    resumen_tecnico: regenerado.resumen_tecnico,
    reglas: regenerado.reglas,
    criterios_aceptacion: regenerado.criterios_aceptacion,
    version_actual: version,
    updated_at: now,
    historial_versiones: [
      ...actual.historial_versiones,
      {
        version,
        fecha: now,
        autor: "IA ARQDATA",
        descripcion_cambio:
          "Regeneracion contextualizada de reglas con artefactos actualizados del proyecto.",
      },
    ],
  });

  MOCK_INTEGRATION_RULES[proyectoId] = clone(actualizado);
  return clone(actualizado);
};

const toMarkdown = (documento: IntegrationQualityRules): string => {
  const header = `# ${documento.nombre}\n\n`;
  const meta =
    `- Proyecto: ${documento.proyecto_id}\n` +
    `- Version: ${documento.version_actual}\n` +
    `- Actualizado: ${new Date(documento.updated_at).toLocaleString("es-CO")}\n\n`;
  const resumen = `## Resumen Tecnico\n\n${documento.resumen_tecnico}\n\n`;
  const tablaHeader =
    "## Reglas Definidas\n\n| Nombre | Tipo | Prioridad | Descripcion | Condicion | Accion |\n| --- | --- | --- | --- | --- | --- |\n";
  const tablaRows = documento.reglas
    .map(
      (regla) =>
        `| ${regla.nombre.replace(/\|/g, "\\|")} | ${regla.tipo} | ${regla.prioridad} | ${regla.descripcion.replace(/\|/g, "\\|")} | ${regla.condicion.replace(/\|/g, "\\|")} | ${regla.accion.replace(/\|/g, "\\|")} |`
    )
    .join("\n");
  const criterios = `\n\n## Criterios de Aceptacion\n\n${documento.criterios_aceptacion
    .map((item) => `- ${item}`)
    .join("\n")}\n`;

  return `${header}${meta}${resumen}${tablaHeader}${tablaRows}${criterios}`;
};

const toAsciiPlain = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ");

const escapePdfText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;
const PDF_MARGIN_X = 40;
const PDF_MARGIN_TOP = 42;
const PDF_MARGIN_BOTTOM = 40;
const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN_X * 2;

type PdfRgb = [number, number, number];
type PdfPage = { commands: string[]; cursorY: number };

const pdfColor = (r: number, g: number, b: number): PdfRgb => [r / 255, g / 255, b / 255];

const fmtPdfNumber = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

const toPdfY = (topY: number): number => PDF_PAGE_HEIGHT - topY;

const drawPdfRect = (
  commands: string[],
  x: number,
  topY: number,
  width: number,
  height: number,
  fill?: PdfRgb,
  stroke?: PdfRgb,
  strokeWidth = 1
): void => {
  if (fill) commands.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
  if (stroke) {
    commands.push(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`);
    commands.push(`${fmtPdfNumber(strokeWidth)} w`);
  }
  const yBottom = PDF_PAGE_HEIGHT - topY - height;
  const operation = fill && stroke ? "B" : fill ? "f" : "S";
  commands.push(
    `${fmtPdfNumber(x)} ${fmtPdfNumber(yBottom)} ${fmtPdfNumber(width)} ${fmtPdfNumber(height)} re ${operation}`
  );
};

const drawPdfLine = (
  commands: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: PdfRgb,
  strokeWidth = 1
): void => {
  commands.push(
    `${color[0]} ${color[1]} ${color[2]} RG`,
    `${fmtPdfNumber(strokeWidth)} w`,
    `${fmtPdfNumber(x1)} ${fmtPdfNumber(toPdfY(y1))} m`,
    `${fmtPdfNumber(x2)} ${fmtPdfNumber(toPdfY(y2))} l S`
  );
};

const drawPdfText = (
  commands: string[],
  text: string,
  x: number,
  topY: number,
  fontName: "F1" | "F2",
  fontSize: number,
  color: PdfRgb
): void => {
  const safe = escapePdfText(toAsciiPlain(text));
  commands.push(
    "BT",
    `/${fontName} ${fontSize} Tf`,
    `${color[0]} ${color[1]} ${color[2]} rg`,
    `1 0 0 1 ${fmtPdfNumber(x)} ${fmtPdfNumber(toPdfY(topY))} Tm`,
    `(${safe}) Tj`,
    "ET"
  );
};

const estimateCharsPerLine = (maxWidth: number, fontSize: number, bold = false): number => {
  const factor = bold ? 0.56 : 0.52;
  return Math.max(8, Math.floor(maxWidth / (fontSize * factor)));
};

const wrapTextToWidth = (
  text: string,
  maxWidth: number,
  fontSize: number,
  bold = false
): string[] => {
  const source = toAsciiPlain(text).replace(/\s+/g, " ").trim();
  if (!source) return [""];

  const maxChars = estimateCharsPerLine(maxWidth, fontSize, bold);
  const tokens = source.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  const pushChunkedWord = (word: string): void => {
    if (word.length <= maxChars) {
      lines.push(word);
      return;
    }
    let start = 0;
    while (start < word.length) {
      const end = Math.min(start + maxChars - 1, word.length);
      const chunk = word.slice(start, end);
      const hasMore = end < word.length;
      lines.push(hasMore ? `${chunk}-` : chunk);
      start = end;
    }
  };

  tokens.forEach((token) => {
    const candidate = currentLine ? `${currentLine} ${token}` : token;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
      return;
    }
    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }
    if (token.length > maxChars) {
      pushChunkedWord(token);
    } else {
      currentLine = token;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [source];
};

const trimWrappedLines = (lines: string[], maxLines: number): string[] => {
  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  const last = trimmed[maxLines - 1];
  trimmed[maxLines - 1] = last.length > 3 ? `${last.slice(0, last.length - 3)}...` : `${last}...`;
  return trimmed;
};

const createPdfDocument = (pageStreams: string[]): Uint8Array => {
  const encoder = new TextEncoder();
  const pageCount = Math.max(pageStreams.length, 1);
  const firstPageObjId = 5;
  const maxObjectId = firstPageObjId + pageCount * 2 - 1;
  const objects: string[] = new Array(maxObjectId + 1).fill("");

  objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  objects[3] = "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  objects[4] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";

  const pageObjectIds: number[] = [];
  pageStreams.forEach((stream, index) => {
    const pageObjectId = firstPageObjId + index * 2;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);

    const streamLength = encoder.encode(stream).length;
    objects[contentObjectId] =
      `${contentObjectId} 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`;
    objects[pageObjectId] =
      `${pageObjectId} 0 obj\n` +
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>\n` +
      "endobj\n";
  });

  objects[2] =
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${pageCount} >>\nendobj\n`;

  let pdf = "%PDF-1.4\n";
  const offsets = new Array(maxObjectId + 1).fill(0);
  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    offsets[objectId] = encoder.encode(pdf).length;
    pdf += objects[objectId];
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${maxObjectId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    pdf += `${offsets[objectId].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
};

const buildStyledIntegrationRulesPdf = (documento: IntegrationQualityRules): Uint8Array => {
  const titleBg = pdfColor(15, 44, 92);
  const titleText = pdfColor(255, 255, 255);
  const primaryText = pdfColor(31, 41, 55);
  const mutedText = pdfColor(75, 85, 99);
  const sectionText = pdfColor(17, 24, 39);
  const metricBg = pdfColor(241, 245, 249);
  const tableHeaderBg = pdfColor(226, 232, 240);
  const tableBorder = pdfColor(148, 163, 184);
  const rowAlt = pdfColor(248, 250, 252);

  const pages: PdfPage[] = [{ commands: [], cursorY: PDF_MARGIN_TOP }];
  let page = pages[0];
  let pageNumber = 1;

  const drawFrame = (target: PdfPage, currentPage: number): void => {
    drawPdfText(
      target.commands,
      `Pagina ${currentPage}`,
      PDF_PAGE_WIDTH - PDF_MARGIN_X - 50,
      PDF_PAGE_HEIGHT - 18,
      "F1",
      9,
      mutedText
    );
  };
  drawFrame(page, pageNumber);

  const startNewPage = (): void => {
    pageNumber += 1;
    const next: PdfPage = { commands: [], cursorY: PDF_MARGIN_TOP };
    pages.push(next);
    page = next;
    drawFrame(page, pageNumber);
  };

  const remainingHeight = (): number => PDF_PAGE_HEIGHT - PDF_MARGIN_BOTTOM - page.cursorY;
  const ensureSpace = (needed: number): void => {
    if (remainingHeight() < needed) startNewPage();
  };

  const drawSectionTitle = (title: string): void => {
    ensureSpace(24);
    drawPdfText(page.commands, title, PDF_MARGIN_X, page.cursorY + 14, "F2", 12, sectionText);
    drawPdfLine(
      page.commands,
      PDF_MARGIN_X,
      page.cursorY + 18,
      PDF_MARGIN_X + PDF_CONTENT_WIDTH,
      page.cursorY + 18,
      tableBorder,
      0.8
    );
    page.cursorY += 24;
  };

  const drawParagraph = (text: string, width = PDF_CONTENT_WIDTH, fontSize = 10): void => {
    const lineHeight = 13;
    const lines = wrapTextToWidth(text, width, fontSize, false);
    lines.forEach((line, index) => {
      drawPdfText(
        page.commands,
        line,
        PDF_MARGIN_X,
        page.cursorY + 11 + index * lineHeight,
        "F1",
        fontSize,
        primaryText
      );
    });
    page.cursorY += lines.length * lineHeight + 2;
  };

  const headerHeight = 84;
  drawPdfRect(
    page.commands,
    PDF_MARGIN_X,
    page.cursorY,
    PDF_CONTENT_WIDTH,
    headerHeight,
    titleBg,
    undefined
  );
  drawPdfText(page.commands, documento.nombre, PDF_MARGIN_X + 14, page.cursorY + 26, "F2", 16, titleText);
  drawPdfText(page.commands, `Proyecto: ${documento.proyecto_id}`, PDF_MARGIN_X + 14, page.cursorY + 45, "F1", 10, titleText);
  drawPdfText(
    page.commands,
    `Version: ${documento.version_actual}  |  Actualizado: ${new Date(documento.updated_at).toLocaleString("es-CO")}`,
    PDF_MARGIN_X + 14,
    page.cursorY + 61,
    "F1",
    10,
    titleText
  );
  page.cursorY += headerHeight + 14;

  drawSectionTitle("Resumen Tecnico");
  drawParagraph(documento.resumen_tecnico);
  page.cursorY += 10;

  const matching = documento.reglas.filter((rule) => rule.tipo === "Matching").length;
  const validacion = documento.reglas.filter((rule) => rule.tipo === "Validacion").length;
  const prioridadAlta = documento.reglas.filter((rule) => rule.prioridad === "Alta").length;

  ensureSpace(58);
  const metricHeight = 46;
  const metricGap = 8;
  const metricWidth = (PDF_CONTENT_WIDTH - metricGap * 2) / 3;
  const metricTop = page.cursorY;
  [
    { label: "Total reglas", value: String(documento.reglas.length) },
    { label: "Matching/Validacion", value: `${matching}/${validacion}` },
    { label: "Prioridad alta", value: String(prioridadAlta) },
  ].forEach((metric, index) => {
    const x = PDF_MARGIN_X + index * (metricWidth + metricGap);
    drawPdfRect(page.commands, x, metricTop, metricWidth, metricHeight, metricBg, tableBorder, 0.7);
    drawPdfText(page.commands, metric.label, x + 8, metricTop + 15, "F1", 9, mutedText);
    drawPdfText(page.commands, metric.value, x + 8, metricTop + 34, "F2", 14, sectionText);
  });
  page.cursorY += metricHeight + 16;

  const columns = [
    { label: "Nombre", width: 90, extractor: (rule: IntegrationRule) => rule.nombre },
    { label: "Tipo", width: 52, extractor: (rule: IntegrationRule) => rule.tipo },
    { label: "Prioridad", width: 52, extractor: (rule: IntegrationRule) => rule.prioridad },
    { label: "Descripcion", width: 110, extractor: (rule: IntegrationRule) => rule.descripcion },
    { label: "Condicion", width: 110, extractor: (rule: IntegrationRule) => rule.condicion },
    { label: "Accion", width: 118, extractor: (rule: IntegrationRule) => rule.accion },
  ];

  const drawTableHeader = (title?: string): void => {
    if (title) drawSectionTitle(title);
    ensureSpace(28);
    const headerHeight = 24;
    const headerY = page.cursorY;

    drawPdfRect(
      page.commands,
      PDF_MARGIN_X,
      headerY,
      PDF_CONTENT_WIDTH,
      headerHeight,
      tableHeaderBg,
      tableBorder,
      0.7
    );

    let x = PDF_MARGIN_X;
    columns.forEach((column, index) => {
      drawPdfText(page.commands, column.label, x + 3, headerY + 15, "F2", 8.5, sectionText);
      x += column.width;
      if (index < columns.length - 1) {
        drawPdfLine(page.commands, x, headerY, x, headerY + headerHeight, tableBorder, 0.7);
      }
    });

    page.cursorY += headerHeight;
  };

  drawTableHeader("Reglas Definidas");
  documento.reglas.forEach((regla, rowIndex) => {
    const lineHeight = 10.5;
    const paddingX = 3;
    const paddingTop = 6;
    const cells = columns.map((column) =>
      trimWrappedLines(
        wrapTextToWidth(column.extractor(regla), column.width - paddingX * 2, 8.5, false),
        8
      )
    );

    const maxLines = Math.max(...cells.map((cell) => cell.length), 1);
    const rowHeight = maxLines * lineHeight + paddingTop * 2;

    if (remainingHeight() < rowHeight + 20) {
      startNewPage();
      drawTableHeader("Reglas Definidas (Continuacion)");
    }

    drawPdfRect(
      page.commands,
      PDF_MARGIN_X,
      page.cursorY,
      PDF_CONTENT_WIDTH,
      rowHeight,
      rowIndex % 2 === 0 ? rowAlt : undefined,
      tableBorder,
      0.6
    );

    let x = PDF_MARGIN_X;
    columns.forEach((column, colIndex) => {
      if (colIndex < columns.length - 1) {
        const separatorX = x + column.width;
        drawPdfLine(page.commands, separatorX, page.cursorY, separatorX, page.cursorY + rowHeight, tableBorder, 0.6);
      }

      cells[colIndex].forEach((line, lineIndex) => {
        drawPdfText(
          page.commands,
          line,
          x + paddingX,
          page.cursorY + paddingTop + 8 + lineIndex * lineHeight,
          "F1",
          8.5,
          primaryText
        );
      });

      x += column.width;
    });

    page.cursorY += rowHeight;
  });

  page.cursorY += 12;
  drawSectionTitle("Criterios de Aceptacion");
  documento.criterios_aceptacion.forEach((criterio) => {
    const lines = wrapTextToWidth(criterio, PDF_CONTENT_WIDTH - 14, 10, false);
    const blockHeight = lines.length * 13 + 3;
    if (remainingHeight() < blockHeight + 6) {
      startNewPage();
      drawSectionTitle("Criterios de Aceptacion (Continuacion)");
    }

    drawPdfText(page.commands, "-", PDF_MARGIN_X, page.cursorY + 11, "F2", 11, sectionText);
    lines.forEach((line, index) => {
      drawPdfText(page.commands, line, PDF_MARGIN_X + 12, page.cursorY + 11 + index * 13, "F1", 10, primaryText);
    });
    page.cursorY += blockHeight;
  });

  return createPdfDocument(pages.map((entry) => entry.commands.join("\n")));
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toWordHtml = (documento: IntegrationQualityRules): string => {
  const rows = documento.reglas
    .map(
      (regla) => `
        <tr>
          <td>${escapeHtml(regla.nombre)}</td>
          <td>${escapeHtml(regla.tipo)}</td>
          <td>${escapeHtml(regla.prioridad)}</td>
          <td>${escapeHtml(regla.descripcion)}</td>
          <td>${escapeHtml(regla.condicion)}</td>
          <td>${escapeHtml(regla.accion)}</td>
        </tr>`
    )
    .join("");

  const criterios = documento.criterios_aceptacion
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(documento.nombre)}</title>
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
      h1, h2 { margin: 0 0 10px 0; }
      p { margin: 0 0 10px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #bfbfbf; padding: 6px; text-align: left; vertical-align: top; }
      th { background: #f2f2f2; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(documento.nombre)}</h1>
    <p><strong>Proyecto:</strong> ${escapeHtml(documento.proyecto_id)}</p>
    <p><strong>Version:</strong> ${escapeHtml(documento.version_actual)}</p>
    <p><strong>Actualizado:</strong> ${escapeHtml(new Date(documento.updated_at).toLocaleString("es-CO"))}</p>
    <h2>Resumen Tecnico</h2>
    <p>${escapeHtml(documento.resumen_tecnico)}</p>
    <h2>Reglas Definidas</h2>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Prioridad</th>
          <th>Descripcion</th>
          <th>Condicion</th>
          <th>Accion</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>Criterios de Aceptacion</h2>
    <ul>${criterios}</ul>
  </body>
</html>`;
};

export const mockExportIntegrationQualityRules = async (
  documento: IntegrationQualityRules,
  formato: IntegrationRulesExportFormat
): Promise<IntegrationRulesExportFile> => {
  await delay(300);

  const versionSafe = documento.version_actual.replace(/\./g, "-");
  const baseName = `reglas-integracion-calidad-${documento.proyecto_id}-v${versionSafe}`;

  if (formato === "markdown") {
    return {
      file_name: `${baseName}.md`,
      mime_type: "text/markdown;charset=utf-8",
      content: toMarkdown(documento),
    };
  }

  if (formato === "pdf") {
    return {
      file_name: `${baseName}.pdf`,
      mime_type: "application/pdf;charset=binary",
      content: buildStyledIntegrationRulesPdf(documento),
    };
  }

  return {
    file_name: `${baseName}.doc`,
    mime_type: "application/msword;charset=utf-8",
    content: toWordHtml(documento),
  };
};

import { mockGetCRUDMatrix } from "@/lib/mocks/crud-matrix.mock";
import { mockDFDAsIs } from "@/lib/mocks/dfd-asis.mock";
import { mockDFDToBe } from "@/lib/mocks/dfd-tobe.mock";
import { MOCK_MODELO_ER } from "@/lib/mocks/modelo-er.mock";
import { MOCK_MODELO_ER_TOBE } from "@/lib/mocks/modelo-er-tobe.mock";
import { mockModeloLogicoToBe } from "@/lib/mocks/modelo-logico.mock";
import { MOCK_PROYECTOS } from "@/lib/mocks/proyectos.mock";
import type {
  Gap,
  GapAnalysisReport,
  GapImpacto,
  GapPrioridad,
  GapReportExportFile,
  GapReportExportFormat,
} from "@/lib/types/gap-report.types";
import type { CRUDComparison } from "@/lib/types/crud-matrix.types";

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const PRIORIDAD_ORDEN: Record<GapPrioridad, number> = {
  Critica: 0,
  Alta: 1,
  Media: 2,
  Baja: 3,
};

const IMPACTO_ORDEN: Record<GapImpacto, number> = {
  Alto: 0,
  Medio: 1,
  Bajo: 2,
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

const detectarArea = (entidad: string): string => {
  const key = normalizeText(entidad);

  if (/(canal|evento|api|flujo|integr|stream|scada)/.test(key)) {
    return "Integracion y Flujos de Datos";
  }
  if (/(segment|catalog|glosario|maestro|master|gobern)/.test(key)) {
    return "Gobierno y Catalogo de Datos";
  }
  if (/(cliente|cuenta|transaccion|producto|inventario|medidor|orden|servicio|wallet)/.test(key)) {
    return "Modelo de Datos y Dominio";
  }

  return "Calidad y Operacion de Datos";
};

const detectarPrioridad = (
  row: CRUDComparison,
  cambios: number
): GapPrioridad => {
  const sinAsis =
    !row.asis_create &&
    !row.asis_read &&
    !row.asis_update &&
    !row.asis_delete;
  const altaMutacion = cambios >= 3;

  if (row.impacto === "Alto" && (sinAsis || altaMutacion)) return "Critica";
  if (row.impacto === "Alto") return "Alta";
  if (row.impacto === "Medio") return "Media";
  return "Baja";
};

const construirRecomendacion = (
  area: string,
  prioridad: GapPrioridad,
  entidad: string
): string => {
  if (area === "Integracion y Flujos de Datos") {
    return `Definir contratos de integracion para ${entidad}, con versionado de eventos y validaciones de esquema en tiempo de ejecucion.`;
  }
  if (area === "Gobierno y Catalogo de Datos") {
    return `Formalizar reglas de gobierno para ${entidad}, incluyendo glosario, politicas de calidad y responsables de dato.`;
  }
  if (area === "Modelo de Datos y Dominio") {
    return `Ajustar el modelo objetivo de ${entidad} y ejecutar plan de migracion incremental con pruebas de consistencia de datos.`;
  }

  if (prioridad === "Critica" || prioridad === "Alta") {
    return `Implementar controles automatizados de calidad para ${entidad} y definir seguimiento semanal hasta cierre de brecha.`;
  }

  return `Documentar la brecha de ${entidad}, incorporar control preventivo y monitorear su evolucion por sprint.`;
};

type GapBuildContext = {
  proyectoId: string;
  proyectoNombre: string;
  asisEntidades: number;
  tobeEntidades: number;
  tablasLogicas: number;
  dfdAsIsFlujos: number;
  dfdToBeFlujos: number;
};

const getContextoProyecto = (
  proyectoId: string,
  crudRows: CRUDComparison[]
): GapBuildContext => {
  const proyectoNombre =
    MOCK_PROYECTOS.find((proyecto) => proyecto.id === proyectoId)?.nombre ??
    "Proyecto";

  const asisEntidades =
    MOCK_MODELO_ER[proyectoId]?.entidades.length ??
    Math.max(crudRows.filter((row) => row.asis_read || row.asis_create).length, 0);

  const tobeEntidades =
    MOCK_MODELO_ER_TOBE[proyectoId]?.entidades.length ??
    Math.max(crudRows.filter((row) => row.tobe_read || row.tobe_create).length, 0);

  const tablasLogicas =
    mockModeloLogicoToBe.proyecto_id === proyectoId
      ? mockModeloLogicoToBe.tablas.length
      : 0;

  const dfdAsIsFlujos = proyectoId === "proy-001" ? mockDFDAsIs.flujos.length : 0;
  const dfdToBeFlujos = proyectoId === "proy-001" ? mockDFDToBe.flujos.length : 0;

  return {
    proyectoId,
    proyectoNombre,
    asisEntidades,
    tobeEntidades,
    tablasLogicas,
    dfdAsIsFlujos,
    dfdToBeFlujos,
  };
};

const ordenarBrechas = (brechas: Gap[]): Gap[] =>
  [...brechas].sort((a, b) => {
    const prioridad = PRIORIDAD_ORDEN[a.prioridad] - PRIORIDAD_ORDEN[b.prioridad];
    if (prioridad !== 0) return prioridad;
    return IMPACTO_ORDEN[a.impacto] - IMPACTO_ORDEN[b.impacto];
  });

const calcularRecomendacionesPrioritarias = (brechas: Gap[]): string[] => {
  const recomendaciones: string[] = [];

  ordenarBrechas(brechas).forEach((gap) => {
    const recomendacion = gap.recomendacion.trim();
    if (!recomendacion) return;
    if (!recomendaciones.includes(recomendacion)) {
      recomendaciones.push(recomendacion);
    }
  });

  return recomendaciones.slice(0, 5);
};

const withCamposDerivados = (reporte: GapAnalysisReport): GapAnalysisReport => {
  const brechasOrdenadas = ordenarBrechas(reporte.brechas);
  return {
    ...reporte,
    brechas: brechasOrdenadas,
    total_brechas: brechasOrdenadas.length,
    brechas_criticas: brechasOrdenadas.filter((gap) => gap.prioridad === "Critica").length,
    recomendaciones_prioritarias: calcularRecomendacionesPrioritarias(brechasOrdenadas),
  };
};

const buildResumenEjecutivo = (
  context: GapBuildContext,
  totalBrechas: number,
  brechasCriticas: number
): string => {
  const nuevasEntidades = Math.max(context.tobeEntidades - context.asisEntidades, 0);
  const deltaFlujos = context.dfdToBeFlujos - context.dfdAsIsFlujos;

  return `El reporte consolida ${totalBrechas} brechas para ${context.proyectoNombre}. Se identifican ${brechasCriticas} brechas criticas priorizadas para cierre inmediato. En el estado objetivo se incorporan ${nuevasEntidades} entidades nuevas respecto al AS-IS y un cambio de ${deltaFlujos} flujos en el DFD, lo que exige ajustes de integracion, gobierno y calidad antes del cierre de etapa.`;
};

const buildBrechasContextuales = (context: GapBuildContext, crudRows: CRUDComparison[]): Gap[] => {
  const brechasDesdeCRUD: Gap[] = crudRows.map((row, index) => {
    const cambios = contarCambiosCRUD(row);
    const area = detectarArea(row.entidad);
    const prioridad = detectarPrioridad(row, cambios);
    const brechaBase = row.brecha.trim() || `Cambio CRUD detectado en ${row.entidad}.`;

    return {
      id: `gap-${context.proyectoId}-${index + 1}`,
      area,
      brecha: `${brechaBase} (Cambios CRUD: ${cambios}).`,
      impacto: row.impacto,
      prioridad,
      recomendacion: construirRecomendacion(area, prioridad, row.entidad),
    };
  });

  const brechasExtra: Gap[] = [];

  if (context.dfdToBeFlujos > context.dfdAsIsFlujos + 2) {
    brechasExtra.push({
      id: `gap-${context.proyectoId}-dfd`,
      area: "Integracion y Flujos de Datos",
      brecha:
        "El DFD TO-BE aumenta significativamente la cantidad de flujos frente al AS-IS, elevando la complejidad de orquestacion e interoperabilidad.",
      impacto: "Alto",
      prioridad: "Critica",
      recomendacion:
        "Definir plan de integracion por fases con contratos de datos, pruebas de compatibilidad entre servicios y observabilidad de punta a punta.",
    });
  }

  if (context.tobeEntidades > context.asisEntidades) {
    brechasExtra.push({
      id: `gap-${context.proyectoId}-modelo`,
      area: "Gobierno y Catalogo de Datos",
      brecha:
        "El modelo TO-BE incorpora nuevas entidades sin politicas completas de gobierno, calidad y ownership de datos.",
      impacto: "Medio",
      prioridad: "Alta",
      recomendacion:
        "Completar glosario, ownership y reglas de calidad para las nuevas entidades antes de su liberacion productiva.",
    });
  }

  if (context.tablasLogicas > 0 && context.tablasLogicas > context.tobeEntidades) {
    brechasExtra.push({
      id: `gap-${context.proyectoId}-logico`,
      area: "Calidad y Operacion de Datos",
      brecha:
        "La capa logica presenta mayor granularidad que la conceptual TO-BE, con riesgo de inconsistencias en transformaciones y validaciones.",
      impacto: "Medio",
      prioridad: "Media",
      recomendacion:
        "Alinear diccionario de transformaciones entre capas conceptual y logica, y ejecutar pruebas de reconciliacion de extremo a extremo.",
    });
  }

  return [...brechasDesdeCRUD, ...brechasExtra];
};

const buildVersionSiguiente = (versionActual: string): string => {
  const [rawMajor, rawMinor] = versionActual.split(".");
  const major = Number.parseInt(rawMajor ?? "1", 10);
  const minor = Number.parseInt(rawMinor ?? "0", 10) + 1;
  return `${Number.isNaN(major) ? 1 : major}.${Number.isNaN(minor) ? 1 : minor}`;
};

const buildReporteContextual = async (proyectoId: string): Promise<GapAnalysisReport> => {
  const crud = await mockGetCRUDMatrix(proyectoId);
  const contexto = getContextoProyecto(proyectoId, crud.comparaciones);
  const brechas = buildBrechasContextuales(contexto, crud.comparaciones);
  const now = new Date().toISOString();

  return withCamposDerivados({
    id: `gap-report-${proyectoId}`,
    entregable_id: `ent-${proyectoId}-11`,
    proyecto_id: proyectoId,
    nombre: "Reporte de Analisis de Brechas",
    descripcion:
      "Documento ejecutivo que detalla brechas identificadas, impacto, prioridad y recomendaciones.",
    resumen_ejecutivo: buildResumenEjecutivo(
      contexto,
      brechas.length,
      brechas.filter((gap) => gap.prioridad === "Critica").length
    ),
    brechas,
    total_brechas: 0,
    brechas_criticas: 0,
    recomendaciones_prioritarias: [],
    formato_objetivo: ["PDF", "WORD", "MARKDOWN"],
    version_actual: "1.0",
    historial_versiones: [
      {
        version: "1.0",
        fecha: now,
        autor: "IA ARQDATA",
        descripcion_cambio:
          "Version inicial contextualizada a partir de artefactos AS-IS, TO-BE y Matriz CRUD.",
      },
    ],
    created_at: now,
    updated_at: now,
  });
};

const MOCK_GAP_REPORT: Record<string, GapAnalysisReport> = {};

export const mockGetGapAnalysisReport = async (
  proyectoId: string
): Promise<GapAnalysisReport> => {
  await delay();

  if (!MOCK_GAP_REPORT[proyectoId]) {
    MOCK_GAP_REPORT[proyectoId] = await buildReporteContextual(proyectoId);
  }

  return clone(MOCK_GAP_REPORT[proyectoId]);
};

export const mockGuardarGapAnalysisReport = async (
  reporte: GapAnalysisReport
): Promise<GapAnalysisReport> => {
  await delay(850);

  const version = buildVersionSiguiente(reporte.version_actual);
  const now = new Date().toISOString();

  const brechasNormalizadas = reporte.brechas.map((gap, index) => ({
    ...gap,
    id: gap.id || `gap-${reporte.proyecto_id}-${index + 1}`,
    area: gap.area.trim() || "Sin area",
    brecha: gap.brecha.trim() || "Brecha sin descripcion",
    recomendacion: gap.recomendacion.trim() || "Recomendacion pendiente de definicion.",
  }));

  const actualizado = withCamposDerivados({
    ...reporte,
    brechas: brechasNormalizadas,
    version_actual: version,
    updated_at: now,
    historial_versiones: [
      ...reporte.historial_versiones,
      {
        version,
        fecha: now,
        autor: "Carlos Mendez",
        descripcion_cambio: "Ajustes manuales al reporte de analisis de brechas.",
      },
    ],
  });

  MOCK_GAP_REPORT[reporte.proyecto_id] = clone(actualizado);
  return clone(actualizado);
};

export const mockGenerarGapAnalysisReportConIA = async (
  proyectoId: string
): Promise<GapAnalysisReport> => {
  await delay(1900);

  const regenerado = await buildReporteContextual(proyectoId);
  const actual = MOCK_GAP_REPORT[proyectoId];

  if (!actual) {
    MOCK_GAP_REPORT[proyectoId] = clone(regenerado);
    return clone(regenerado);
  }

  const now = new Date().toISOString();
  const version = buildVersionSiguiente(actual.version_actual);

  const actualizado = withCamposDerivados({
    ...actual,
    descripcion: regenerado.descripcion,
    resumen_ejecutivo: regenerado.resumen_ejecutivo,
    brechas: regenerado.brechas,
    version_actual: version,
    updated_at: now,
    historial_versiones: [
      ...actual.historial_versiones,
      {
        version,
        fecha: now,
        autor: "IA ARQDATA",
        descripcion_cambio:
          "Regeneracion contextualizada del reporte con artefactos actualizados del proyecto.",
      },
    ],
  });

  MOCK_GAP_REPORT[proyectoId] = clone(actualizado);
  return clone(actualizado);
};

const toMarkdown = (reporte: GapAnalysisReport): string => {
  const header = `# ${reporte.nombre}\n\n`;
  const meta = `- Proyecto: ${reporte.proyecto_id}\n- Version: ${reporte.version_actual}\n- Actualizado: ${new Date(reporte.updated_at).toLocaleString("es-CO")}\n\n`;
  const resumen = `## Resumen Ejecutivo\n\n${reporte.resumen_ejecutivo}\n\n`;
  const metricas = `## Metricas\n\n- Total de brechas: ${reporte.total_brechas}\n- Brechas criticas: ${reporte.brechas_criticas}\n\n`;
  const tablaHeader =
    "## Brechas Identificadas\n\n| Area | Brecha | Impacto | Prioridad | Recomendacion |\n| --- | --- | --- | --- | --- |\n";

  const tablaRows = reporte.brechas
    .map(
      (gap) =>
        `| ${gap.area} | ${gap.brecha.replace(/\|/g, "\\|")} | ${gap.impacto} | ${gap.prioridad} | ${gap.recomendacion.replace(/\|/g, "\\|")} |`
    )
    .join("\n");

  const recomendaciones = `\n\n## Recomendaciones Prioritarias\n\n${reporte.recomendaciones_prioritarias
    .map((rec) => `- ${rec}`)
    .join("\n")}`;

  return `${header}${meta}${resumen}${metricas}${tablaHeader}${tablaRows}${recomendaciones}\n`;
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
type PdfPage = {
  commands: string[];
  cursorY: number;
};

const pdfColor = (r: number, g: number, b: number): PdfRgb => [
  r / 255,
  g / 255,
  b / 255,
];

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
  if (fill) {
    commands.push(
      `${fill[0]} ${fill[1]} ${fill[2]} rg`
    );
  }
  if (stroke) {
    commands.push(
      `${stroke[0]} ${stroke[1]} ${stroke[2]} RG`,
      `${fmtPdfNumber(strokeWidth)} w`
    );
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

  if (currentLine) {
    lines.push(currentLine);
  }

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
  const fontRegularId = 3;
  const fontBoldId = 4;
  const firstPageObjId = 5;
  const maxObjectId = firstPageObjId + pageCount * 2 - 1;
  const objects: string[] = new Array(maxObjectId + 1).fill("");

  objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  objects[fontRegularId] =
    `${fontRegularId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
  objects[fontBoldId] =
    `${fontBoldId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`;

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

const buildStyledGapReportPdf = (reporte: GapAnalysisReport): Uint8Array => {
  const pageBackground = pdfColor(255, 255, 255);
  const titleBg = pdfColor(20, 48, 94);
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
  let currentPageNumber = 1;

  const renderPageFrame = (targetPage: PdfPage, pageNumber: number): void => {
    drawPdfRect(
      targetPage.commands,
      0,
      0,
      PDF_PAGE_WIDTH,
      PDF_PAGE_HEIGHT,
      pageBackground,
      undefined
    );
    drawPdfText(
      targetPage.commands,
      `Pagina ${pageNumber}`,
      PDF_PAGE_WIDTH - PDF_MARGIN_X - 50,
      PDF_PAGE_HEIGHT - 18,
      "F1",
      9,
      mutedText
    );
  };

  renderPageFrame(page, currentPageNumber);

  const startNewPage = (): void => {
    currentPageNumber += 1;
    const nextPage: PdfPage = { commands: [], cursorY: PDF_MARGIN_TOP };
    pages.push(nextPage);
    page = nextPage;
    renderPageFrame(page, currentPageNumber);
  };

  const remainingHeight = (): number =>
    PDF_PAGE_HEIGHT - PDF_MARGIN_BOTTOM - page.cursorY;

  const ensureSpace = (requiredHeight: number): void => {
    if (remainingHeight() < requiredHeight) {
      startNewPage();
    }
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

  const drawParagraph = (
    text: string,
    options?: {
      width?: number;
      x?: number;
      fontSize?: number;
      lineHeight?: number;
      color?: PdfRgb;
      bold?: boolean;
    }
  ): number => {
    const width = options?.width ?? PDF_CONTENT_WIDTH;
    const x = options?.x ?? PDF_MARGIN_X;
    const fontSize = options?.fontSize ?? 10;
    const lineHeight = options?.lineHeight ?? 13;
    const color = options?.color ?? primaryText;
    const bold = options?.bold ?? false;
    const fontName: "F1" | "F2" = bold ? "F2" : "F1";
    const lines = wrapTextToWidth(text, width, fontSize, bold);

    lines.forEach((line, index) => {
      drawPdfText(
        page.commands,
        line,
        x,
        page.cursorY + 11 + index * lineHeight,
        fontName,
        fontSize,
        color
      );
    });

    const blockHeight = lines.length * lineHeight + 2;
    page.cursorY += blockHeight;
    return blockHeight;
  };

  const drawTableHeader = (
    columns: Array<{ key: keyof Gap; label: string; width: number }>,
    heading?: string
  ): void => {
    if (heading) {
      drawSectionTitle(heading);
    }

    const headerHeight = 24;
    ensureSpace(headerHeight + 8);
    drawPdfRect(
      page.commands,
      PDF_MARGIN_X,
      page.cursorY,
      PDF_CONTENT_WIDTH,
      headerHeight,
      tableHeaderBg,
      tableBorder,
      0.8
    );

    let currentX = PDF_MARGIN_X;
    columns.forEach((column, index) => {
      drawPdfText(
        page.commands,
        column.label,
        currentX + 4,
        page.cursorY + 15,
        "F2",
        9,
        sectionText
      );

      currentX += column.width;
      if (index < columns.length - 1) {
        drawPdfLine(page.commands, currentX, page.cursorY, currentX, page.cursorY + headerHeight, tableBorder, 0.8);
      }
    });

    page.cursorY += headerHeight;
  };

  const headerHeight = 86;
  drawPdfRect(
    page.commands,
    PDF_MARGIN_X,
    page.cursorY,
    PDF_CONTENT_WIDTH,
    headerHeight,
    titleBg,
    undefined
  );
  drawPdfText(
    page.commands,
    reporte.nombre,
    PDF_MARGIN_X + 14,
    page.cursorY + 26,
    "F2",
    17,
    titleText
  );
  drawPdfText(
    page.commands,
    `Proyecto: ${reporte.proyecto_id}`,
    PDF_MARGIN_X + 14,
    page.cursorY + 46,
    "F1",
    10,
    titleText
  );
  drawPdfText(
    page.commands,
    `Version: ${reporte.version_actual}  |  Actualizado: ${new Date(reporte.updated_at).toLocaleString("es-CO")}`,
    PDF_MARGIN_X + 14,
    page.cursorY + 62,
    "F1",
    10,
    titleText
  );
  page.cursorY += headerHeight + 16;

  drawSectionTitle("Resumen Ejecutivo");
  drawParagraph(reporte.resumen_ejecutivo, {
    fontSize: 10,
    lineHeight: 13,
    color: primaryText,
  });
  page.cursorY += 8;

  ensureSpace(64);
  const metricCardHeight = 50;
  const metricGap = 12;
  const metricCardWidth = (PDF_CONTENT_WIDTH - metricGap) / 2;
  const metricTop = page.cursorY;

  drawPdfRect(
    page.commands,
    PDF_MARGIN_X,
    metricTop,
    metricCardWidth,
    metricCardHeight,
    metricBg,
    tableBorder,
    0.7
  );
  drawPdfRect(
    page.commands,
    PDF_MARGIN_X + metricCardWidth + metricGap,
    metricTop,
    metricCardWidth,
    metricCardHeight,
    metricBg,
    tableBorder,
    0.7
  );
  drawPdfText(page.commands, "Total de brechas", PDF_MARGIN_X + 10, metricTop + 17, "F1", 10, mutedText);
  drawPdfText(
    page.commands,
    String(reporte.total_brechas),
    PDF_MARGIN_X + 10,
    metricTop + 38,
    "F2",
    18,
    sectionText
  );
  drawPdfText(
    page.commands,
    "Brechas criticas",
    PDF_MARGIN_X + metricCardWidth + metricGap + 10,
    metricTop + 17,
    "F1",
    10,
    mutedText
  );
  drawPdfText(
    page.commands,
    String(reporte.brechas_criticas),
    PDF_MARGIN_X + metricCardWidth + metricGap + 10,
    metricTop + 38,
    "F2",
    18,
    sectionText
  );
  page.cursorY += metricCardHeight + 16;

  const columns: Array<{ key: keyof Gap; label: string; width: number }> = [
    { key: "area", label: "Area", width: 92 },
    { key: "brecha", label: "Brecha", width: 175 },
    { key: "impacto", label: "Impacto", width: 58 },
    { key: "prioridad", label: "Prioridad", width: 65 },
    { key: "recomendacion", label: "Recomendacion", width: 142 },
  ];

  drawTableHeader(columns, "Brechas Identificadas");

  reporte.brechas.forEach((gap, rowIndex) => {
    const cellPaddingX = 4;
    const cellPaddingTop = 6;
    const lineHeight = 11;
    const maxLinesPerCell = 8;
    const rowCells = columns.map((column) => {
      const rawValue = String(gap[column.key] ?? "");
      const wrapped = wrapTextToWidth(rawValue, column.width - cellPaddingX * 2, 9, false);
      return trimWrappedLines(wrapped, maxLinesPerCell);
    });

    const maxLines = Math.max(...rowCells.map((cell) => cell.length), 1);
    const rowHeight = maxLines * lineHeight + cellPaddingTop * 2;

    if (remainingHeight() < rowHeight + 20) {
      startNewPage();
      drawTableHeader(columns, "Brechas Identificadas (Continuacion)");
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

    let currentX = PDF_MARGIN_X;
    columns.forEach((column, colIndex) => {
      if (colIndex < columns.length - 1) {
        const separatorX = currentX + column.width;
        drawPdfLine(
          page.commands,
          separatorX,
          page.cursorY,
          separatorX,
          page.cursorY + rowHeight,
          tableBorder,
          0.6
        );
      }

      rowCells[colIndex].forEach((line, lineIndex) => {
        drawPdfText(
          page.commands,
          line,
          currentX + cellPaddingX,
          page.cursorY + cellPaddingTop + 9 + lineIndex * lineHeight,
          "F1",
          9,
          primaryText
        );
      });
      currentX += column.width;
    });

    page.cursorY += rowHeight;
  });

  page.cursorY += 12;
  drawSectionTitle("Recomendaciones Prioritarias");

  if (reporte.recomendaciones_prioritarias.length === 0) {
    drawParagraph("No hay recomendaciones registradas.", {
      fontSize: 10,
      lineHeight: 13,
      color: mutedText,
    });
  } else {
    reporte.recomendaciones_prioritarias.forEach((recomendacion) => {
      const maxBulletWidth = PDF_CONTENT_WIDTH - 14;
      const lines = wrapTextToWidth(recomendacion, maxBulletWidth, 10, false);
      const blockHeight = lines.length * 13 + 3;

      if (remainingHeight() < blockHeight + 6) {
        startNewPage();
        drawSectionTitle("Recomendaciones Prioritarias (Continuacion)");
      }

      drawPdfText(page.commands, "-", PDF_MARGIN_X, page.cursorY + 11, "F2", 11, sectionText);
      lines.forEach((line, index) => {
        drawPdfText(
          page.commands,
          line,
          PDF_MARGIN_X + 12,
          page.cursorY + 11 + index * 13,
          "F1",
          10,
          primaryText
        );
      });

      page.cursorY += blockHeight;
    });
  }

  const streams = pages.map((entry) => entry.commands.join("\n"));
  return createPdfDocument(streams);
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toWordHtml = (reporte: GapAnalysisReport): string => {
  const rows = reporte.brechas
    .map(
      (gap) => `
        <tr>
          <td>${escapeHtml(gap.area)}</td>
          <td>${escapeHtml(gap.brecha)}</td>
          <td>${escapeHtml(gap.impacto)}</td>
          <td>${escapeHtml(gap.prioridad)}</td>
          <td>${escapeHtml(gap.recomendacion)}</td>
        </tr>`
    )
    .join("");

  const recomendaciones = reporte.recomendaciones_prioritarias
    .map((rec) => `<li>${escapeHtml(rec)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(reporte.nombre)}</title>
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
    <h1>${escapeHtml(reporte.nombre)}</h1>
    <p><strong>Proyecto:</strong> ${escapeHtml(reporte.proyecto_id)}</p>
    <p><strong>Version:</strong> ${escapeHtml(reporte.version_actual)}</p>
    <p><strong>Actualizado:</strong> ${escapeHtml(new Date(reporte.updated_at).toLocaleString("es-CO"))}</p>
    <h2>Resumen Ejecutivo</h2>
    <p>${escapeHtml(reporte.resumen_ejecutivo)}</p>
    <h2>Metricas</h2>
    <p>Total de brechas: ${reporte.total_brechas}</p>
    <p>Brechas criticas: ${reporte.brechas_criticas}</p>
    <h2>Brechas Identificadas</h2>
    <table>
      <thead>
        <tr>
          <th>Area</th>
          <th>Brecha</th>
          <th>Impacto</th>
          <th>Prioridad</th>
          <th>Recomendacion</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>Recomendaciones Prioritarias</h2>
    <ul>${recomendaciones}</ul>
  </body>
</html>`;
};

export const mockExportGapAnalysisReport = async (
  reporte: GapAnalysisReport,
  formato: GapReportExportFormat
): Promise<GapReportExportFile> => {
  await delay(300);

  const markdown = toMarkdown(reporte);
  const versionSafe = reporte.version_actual.replace(/\./g, "-");
  const baseName = `reporte-analisis-brechas-${reporte.proyecto_id}-v${versionSafe}`;

  if (formato === "markdown") {
    return {
      file_name: `${baseName}.md`,
      mime_type: "text/markdown;charset=utf-8",
      content: markdown,
    };
  }

  if (formato === "pdf") {
    const pdfBytes = buildStyledGapReportPdf(reporte);
    return {
      file_name: `${baseName}.pdf`,
      mime_type: "application/pdf;charset=binary",
      content: pdfBytes,
    };
  }

  const wordHtml = toWordHtml(reporte);
  return {
    file_name: `${baseName}.doc`,
    mime_type: "application/msword;charset=utf-8",
    content: wordHtml,
  };
};

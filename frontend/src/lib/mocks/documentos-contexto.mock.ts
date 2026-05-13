import { mockGetProyectoEmpresa } from "./empresa.mock";

export type EstadoDocumentoContexto = "PROCESANDO" | "LISTO" | "ERROR";

export type DocumentoContexto = {
  id: string;
  id_proyecto: string;
  nombre: string;
  extension: "pdf" | "docx" | "xlsx" | "csv" | "txt";
  tamano_bytes: number;
  estado: EstadoDocumentoContexto;
  progreso: number; // 0-100
  fecha_carga: string; // ISO
  fecha_actualizacion: string; // ISO
  cargado_por: "EMPRESA";
};

const EXTENSIONES_PERMITIDAS = ["pdf", "docx", "xlsx", "csv", "txt"] as const;
const MAX_FILE_SIZE_MB = 10; // RF-DOC-05 configurable
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const delay = (ms = 450) => new Promise((res) => setTimeout(res, ms));

type DocumentoInterno = DocumentoContexto & {
  procesa_desde_ms?: number;
  procesa_hasta_ms?: number;
};

const MOCK_DOCUMENTOS_POR_PROYECTO: Record<string, DocumentoInterno[]> = {
  "proy-001": [
    {
      id: "docctx-proy-001-1",
      id_proyecto: "proy-001",
      nombre: "politica_gobierno_datos.pdf",
      extension: "pdf",
      tamano_bytes: 356000,
      estado: "LISTO",
      progreso: 100,
      fecha_carga: "2025-03-10T14:00:00Z",
      fecha_actualizacion: "2025-03-10T14:02:00Z",
      cargado_por: "EMPRESA",
    },
  ],
  "proy-002": [],
};

const obtenerExtension = (nombreArchivo: string): string => {
  const partes = nombreArchivo.toLowerCase().split(".");
  return partes.length > 1 ? partes[partes.length - 1] : "";
};

const actualizarEstadoProcesamiento = (doc: DocumentoInterno): DocumentoInterno => {
  if (doc.estado !== "PROCESANDO" || !doc.procesa_desde_ms || !doc.procesa_hasta_ms) {
    return doc;
  }

  const ahora = Date.now();
  const duracion = Math.max(1, doc.procesa_hasta_ms - doc.procesa_desde_ms);
  const transcurrido = Math.max(0, ahora - doc.procesa_desde_ms);
  const progreso = Math.min(100, Math.floor((transcurrido / duracion) * 100));

  if (progreso >= 100) {
    return {
      ...doc,
      estado: "LISTO",
      progreso: 100,
      fecha_actualizacion: new Date().toISOString(),
    };
  }

  return {
    ...doc,
    progreso: Math.max(5, progreso),
    fecha_actualizacion: new Date().toISOString(),
  };
};

const sincronizarProyecto = (idProyecto: string) => {
  const lista = MOCK_DOCUMENTOS_POR_PROYECTO[idProyecto] ?? [];
  MOCK_DOCUMENTOS_POR_PROYECTO[idProyecto] = lista.map(actualizarEstadoProcesamiento);
};

export const mockListarDocumentosContextoEmpresa = async (
  idProyecto: string
): Promise<DocumentoContexto[]> => {
  await delay();
  try { await mockGetProyectoEmpresa(idProyecto); } catch (e) {} // Ignorar para permitir ids reales

  sincronizarProyecto(idProyecto);
  const lista = MOCK_DOCUMENTOS_POR_PROYECTO[idProyecto] ?? [];
  return [...lista].sort((a, b) => b.fecha_carga.localeCompare(a.fecha_carga));
};

export const mockCargarDocumentoContextoEmpresa = async (
  idProyecto: string,
  archivo: File
): Promise<DocumentoContexto> => {
  await delay(650);
  try {
    const proyecto = await mockGetProyectoEmpresa(idProyecto);
    if (proyecto.estado !== "ACTIVO") throw new Error("PROYECTO_NO_ACTIVO");
  } catch (e) {
    if (e instanceof Error && e.message === "PROYECTO_NO_ACTIVO") throw e;
  }

  const extension = obtenerExtension(archivo.name);
  if (
    !EXTENSIONES_PERMITIDAS.includes(
      extension as (typeof EXTENSIONES_PERMITIDAS)[number]
    )
  ) {
    throw new Error("FORMATO_NO_PERMITIDO");
  }

  if (archivo.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("ARCHIVO_SUPERA_TAMANO_MAXIMO");
  }

  const ahoraIso = new Date().toISOString();
  const ahoraMs = Date.now();
  const id = `docctx-${idProyecto}-${ahoraMs}`;

  const nuevo: DocumentoInterno = {
    id,
    id_proyecto: idProyecto,
    nombre: archivo.name,
    extension: extension as DocumentoContexto["extension"],
    tamano_bytes: archivo.size,
    estado: "PROCESANDO",
    progreso: 5,
    fecha_carga: ahoraIso,
    fecha_actualizacion: ahoraIso,
    cargado_por: "EMPRESA",
    procesa_desde_ms: ahoraMs,
    procesa_hasta_ms: ahoraMs + 14000,
  };

  const lista = MOCK_DOCUMENTOS_POR_PROYECTO[idProyecto] ?? [];
  MOCK_DOCUMENTOS_POR_PROYECTO[idProyecto] = [nuevo, ...lista];
  return nuevo;
};

export const mockConsultarEstadoDocumentoContextoEmpresa = async (
  idProyecto: string,
  idDocumento: string
): Promise<Pick<DocumentoContexto, "id" | "estado" | "progreso" | "fecha_actualizacion">> => {
  await delay(220);
  try { await mockGetProyectoEmpresa(idProyecto); } catch (e) {}
  sincronizarProyecto(idProyecto);

  const doc = (MOCK_DOCUMENTOS_POR_PROYECTO[idProyecto] ?? []).find(
    (d) => d.id === idDocumento
  );
  if (!doc) throw new Error("DOCUMENTO_NO_ENCONTRADO");

  return {
    id: doc.id,
    estado: doc.estado,
    progreso: doc.progreso,
    fecha_actualizacion: doc.fecha_actualizacion,
  };
};

export const mockListarDocumentosContextoParaIA = async (
  idProyecto: string
): Promise<DocumentoContexto[]> => {
  await delay(180);
  try { await mockGetProyectoEmpresa(idProyecto); } catch (e) {}
  sincronizarProyecto(idProyecto);
  return (MOCK_DOCUMENTOS_POR_PROYECTO[idProyecto] ?? []).filter(
    (doc) => doc.estado === "LISTO"
  );
};

export const mockConfigDocumentosContexto = {
  max_size_mb: MAX_FILE_SIZE_MB,
  extensiones_permitidas: EXTENSIONES_PERMITIDAS,
} as const;

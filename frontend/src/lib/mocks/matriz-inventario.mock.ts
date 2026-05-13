// ============================================================================
// Mock: Matriz de Inventario de Sistemas — AS-IS
// Caso de estudio: Bancolombia — Paisaje tecnológico actual
// Artefacto #3 de la etapa AS-IS
// ============================================================================

import type {
  MatrizInventarioSistemas,
  ComentarioMatrizInventario,
} from "@/lib/types/matriz-inventario.types";

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

const MOCK_MATRIZ_INVENTARIO: Record<string, MatrizInventarioSistemas> = {
  "proy-001": {
    id: "mat-inv-001",
    entregable_id: "ent-proy-001-3",
    proyecto_id: "proy-001",
    nombre: "Matriz de Inventario de Sistemas — Bancolombia",
    descripcion:
      "Catálogo completo de aplicaciones, bases de datos y plataformas tecnológicas que conforman el estado actual (AS-IS) del ecosistema de datos de Bancolombia.",
    sistemas: [
      {
        id: "sis-001",
        nombre: "Core Bancario (AS400)",
        tipo: "aplicacion",
        tecnologia: "IBM AS400 / iSeries",
        version: "V7R4",
        proveedor: "IBM",
        propietario_negocio: "Vicepresidencia de Operaciones",
        propietario_tecnico: "Gerencia de Infraestructura TI",
        descripcion:
          "Sistema principal de procesamiento bancario. Gestiona cuentas, transacciones, créditos y depósitos. Es el sistema de registro (SOR) para todos los productos financieros.",
        criticidad: "critico",
        estado: "produccion",
        ambientes: ["Producción", "Contingencia"],
        datos_que_maneja: [
          "Cuentas bancarias",
          "Transacciones financieras",
          "Productos crediticios",
          "Depósitos",
        ],
        notas:
          "Sistema heredado con más de 25 años de operación. Alta deuda técnica. Candidato a reemplazo en TO-BE.",
      },
      {
        id: "sis-002",
        nombre: "BD Clientes Legacy",
        tipo: "base_de_datos",
        tecnologia: "Oracle Database 11g",
        version: "11.2.0.4",
        proveedor: "Oracle",
        propietario_negocio: "Vicepresidencia Comercial",
        propietario_tecnico: "Gerencia de Datos",
        descripcion:
          "Base de datos centralizada de clientes. Contiene información personal, historial de productos y segmentación. Esquema no normalizado con datos duplicados entre sucursales.",
        criticidad: "critico",
        estado: "produccion",
        ambientes: ["Producción", "Desarrollo"],
        datos_que_maneja: [
          "Datos personales",
          "Historial de productos",
          "Segmentación de clientes",
          "Datos de contacto",
        ],
        notas:
          "Más de 12 millones de registros. ~30% duplicidad entre sucursales. EOL previsto 2025 sin soporte de proveedor.",
      },
      {
        id: "sis-003",
        nombre: "DataWarehouse Corporativo",
        tipo: "base_de_datos",
        tecnologia: "SQL Server 2016",
        version: "13.0",
        proveedor: "Microsoft",
        propietario_negocio: "Vicepresidencia de Estrategia",
        propietario_tecnico: "Equipo de Analytics",
        descripcion:
          "Bodega de datos para reportes ejecutivos y regulatorios. Consolida información desde el Core Bancario y BD Clientes mediante procesos batch nocturnos.",
        criticidad: "alto",
        estado: "produccion",
        ambientes: ["Producción"],
        datos_que_maneja: [
          "Reportes regulatorios",
          "Indicadores financieros",
          "Datos históricos transaccionales",
          "Métricas de negocio",
        ],
        notas: "Latencia de datos de 24 horas. No soporta análisis en tiempo real.",
      },
      {
        id: "sis-004",
        nombre: "CRM Salesforce",
        tipo: "aplicacion",
        tecnologia: "Salesforce Sales Cloud",
        version: "Spring '26",
        proveedor: "Salesforce",
        propietario_negocio: "Vicepresidencia Comercial",
        propietario_tecnico: "Equipo CRM",
        descripcion:
          "Sistema de gestión de relaciones con clientes. Maneja oportunidades comerciales, seguimiento de leads y cartera para asesores.",
        criticidad: "alto",
        estado: "produccion",
        ambientes: ["Producción", "Sandbox"],
        datos_que_maneja: [
          "Oportunidades comerciales",
          "Interacciones con clientes",
          "Pipeline de ventas",
        ],
        notas:
          "Integración con BD Clientes Legacy via archivos planos. Alta fricción operativa y datos desincronizados.",
      },
      {
        id: "sis-005",
        nombre: "Portal Web y App Móvil",
        tipo: "aplicacion",
        tecnologia: "React / React Native",
        version: "2.4.1",
        proveedor: "Desarrollo interno",
        propietario_negocio: "Vicepresidencia Digital",
        propietario_tecnico: "Equipo de Canales Digitales",
        descripcion:
          "Canal digital para clientes: consulta de saldos, transferencias, pagos y servicios. Interfaz principal de autogestión.",
        criticidad: "alto",
        estado: "produccion",
        ambientes: ["Producción", "Staging", "Desarrollo"],
        datos_que_maneja: [
          "Sesiones de usuario",
          "Transacciones digitales",
          "Preferencias de usuario",
        ],
        notas:
          "Conecta al Core Bancario vía API Gateway. Latencia promedio de 2.3 segundos en operaciones.",
      },
      {
        id: "sis-006",
        nombre: "ETL Informatica PowerCenter",
        tipo: "plataforma",
        tecnologia: "Informatica PowerCenter",
        version: "10.4",
        proveedor: "Informatica",
        propietario_negocio: "Gerencia de Datos",
        propietario_tecnico: "Equipo de Integración de Datos",
        descripcion:
          "Plataforma ETL para movimiento y transformación de datos entre sistemas. Orquesta los procesos batch nocturnos de sincronización.",
        criticidad: "alto",
        estado: "produccion",
        ambientes: ["Producción"],
        datos_que_maneja: [
          "Pipelines de datos",
          "Transformaciones batch",
          "Cargas masivas",
        ],
        notas:
          "Licencia con alto costo anual. Flujos complejos sin documentación actualizada.",
      },
      {
        id: "sis-007",
        nombre: "Servidor de Archivos Planos",
        tipo: "infraestructura",
        tecnologia: "SFTP / Windows Server 2012",
        version: "R2",
        proveedor: "Microsoft",
        propietario_negocio: "Gerencia de Operaciones",
        propietario_tecnico: "Gerencia de Infraestructura TI",
        descripcion:
          "Servidor compartido para intercambio de archivos planos (.csv, .txt) entre sistemas y con entidades externas (SFC, ACH Colombia).",
        criticidad: "medio",
        estado: "legado",
        ambientes: ["Producción"],
        datos_que_maneja: [
          "Archivos de transacciones",
          "Reportes regulatorios",
          "Conciliaciones bancarias",
        ],
        notas:
          "Sin monitoreo ni encriptación en tránsito. Riesgo de seguridad identificado en auditoría 2024.",
      },
      {
        id: "sis-008",
        nombre: "Sistema de Gestión Documental",
        tipo: "aplicacion",
        tecnologia: "OpenText Documentum",
        version: "16.4",
        proveedor: "OpenText",
        propietario_negocio: "Vicepresidencia Jurídica",
        propietario_tecnico: "Equipo de Infraestructura TI",
        descripcion:
          "Repositorio centralizado de documentos contractuales, pagarés, poderes y documentación de cumplimiento.",
        criticidad: "medio",
        estado: "produccion",
        ambientes: ["Producción"],
        datos_que_maneja: [
          "Documentos contractuales",
          "Expedientes de clientes",
          "Documentos regulatorios",
        ],
        notas: "Sin integración con CRM ni con Core Bancario.",
      },
    ],
    comentarios: [
      {
        id: "com-mat-001",
        referencia_id: "sis-007",
        referencia_tipo: "sistema",
        campo: null,
        autor_id: "usr-001",
        autor_nombre: "Carlos Méndez",
        autor_perfil: "CONSULTOR",
        contenido:
          "El servidor de archivos planos representa un riesgo crítico de seguridad. Debe priorizarse su reemplazo en la arquitectura TO-BE.",
        estado: "abierto",
        created_at: "2026-03-10T14:30:00Z",
      },
    ],
    version_actual: "1.0",
    historial_versiones: [
      {
        version: "1.0",
        fecha: "2026-03-10T10:00:00Z",
        autor: "Agente AS-IS",
        descripcion_cambio:
          "Versión inicial generada con IA a partir del diagnóstico de infraestructura y entrevistas con el equipo de TI.",
        total_sistemas: 8,
      },
    ],
    created_at: "2026-03-10T10:00:00Z",
    updated_at: "2026-03-10T10:00:00Z",
  },
};

// ── Funciones mock (simulan llamadas a FastAPI) ───────────────────────────────

export const mockGetMatrizInventario = async (
  idProyecto: string
): Promise<MatrizInventarioSistemas> => {
  await delay();
  const data = MOCK_MATRIZ_INVENTARIO[idProyecto];
  if (!data) throw new Error("MATRIZ_INVENTARIO_NO_ENCONTRADA");
  return data;
};

export const mockGuardarMatrizInventario = async (
  matriz: MatrizInventarioSistemas
): Promise<MatrizInventarioSistemas> => {
  await delay(400);
  const existente = MOCK_MATRIZ_INVENTARIO[matriz.proyecto_id];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");

  const [major, minor] = existente.version_actual.split(".").map(Number);
  const nuevaVersion = `${major}.${(minor ?? 0) + 1}`;

  const actualizado: MatrizInventarioSistemas = {
    ...matriz,
    version_actual: nuevaVersion,
    updated_at: new Date().toISOString(),
    historial_versiones: [
      ...existente.historial_versiones,
      {
        version: nuevaVersion,
        fecha: new Date().toISOString(),
        autor: "Carlos Méndez",
        descripcion_cambio: "Edición manual del inventario de sistemas.",
        total_sistemas: matriz.sistemas.length,
      },
    ],
  };

  MOCK_MATRIZ_INVENTARIO[matriz.proyecto_id] = actualizado;
  return actualizado;
};

export const mockGenerarMatrizInventarioConIA = async (
  idProyecto: string
): Promise<MatrizInventarioSistemas> => {
  await delay(1800);
  const existente = MOCK_MATRIZ_INVENTARIO[idProyecto];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");

  const [major] = existente.version_actual.split(".").map(Number);
  const nuevaVersion = `${(major ?? 1) + 1}.0`;

  const generado: MatrizInventarioSistemas = {
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
          "Regeneración completa vía IA a partir del Diagrama Conceptual AS-IS aprobado.",
        total_sistemas: existente.sistemas.length,
      },
    ],
  };

  MOCK_MATRIZ_INVENTARIO[idProyecto] = generado;
  return generado;
};

export const mockAgregarComentarioMatrizInventario = async (
  idProyecto: string,
  comentario: Omit<ComentarioMatrizInventario, "id" | "created_at">
): Promise<void> => {
  await delay(300);
  const existente = MOCK_MATRIZ_INVENTARIO[idProyecto];
  if (!existente) throw new Error("PROYECTO_NO_ENCONTRADO");
  existente.comentarios.push({
    ...comentario,
    id: `com-mat-${Date.now()}`,
    created_at: new Date().toISOString(),
  });
};

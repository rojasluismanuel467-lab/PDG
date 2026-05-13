// ============================================================================
// Tipos de la Matriz CRUD Comparativa - Artefacto 9 (Brechas)
// Diseñados para ser serializables a JSON (compatibles con FastAPI/Pydantic)
// ============================================================================

export type ImpactoCRUD = "Alto" | "Medio" | "Bajo";

export interface CRUDComparison {
  id: string;
  entidad: string;
  asis_create: boolean;
  asis_read: boolean;
  asis_update: boolean;
  asis_delete: boolean;
  tobe_create: boolean;
  tobe_read: boolean;
  tobe_update: boolean;
  tobe_delete: boolean;
  brecha: string;
  impacto: ImpactoCRUD;
}

export interface CRUDMatrixVersion {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string;
}

export interface CRUDMatrix {
  id: string;
  entregable_id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  comparaciones: CRUDComparison[];
  version_actual: string;
  historial_versiones: CRUDMatrixVersion[];
  created_at: string;
  updated_at: string;
}

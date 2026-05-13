import { apiClient } from "@/lib/api/client";
import type {
  ComentarioMatrizInventario,
  MatrizInventarioSistemas,
  SistemaInventario,
  VersionMatrizInventario,
} from "@/lib/types/matriz-inventario.types";

type VersionApi = {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string | null;
  total_sistemas: number;
};

type InventoryMatrixApi = {
  id: string;
  proyecto_id: string;
  entregable_id: string;
  nombre: string;
  descripcion: string;
  sistemas: SistemaInventario[];
  comentarios: ComentarioMatrizInventario[];
  version_actual: string;
  historial_versiones: VersionApi[];
  created_at: string;
  updated_at: string;
};

function mapVersions(versions: VersionApi[]): VersionMatrizInventario[] {
  return versions.map((v) => ({
    version: v.version,
    fecha: v.fecha,
    autor: v.autor,
    descripcion_cambio: v.descripcion_cambio ?? "",
    total_sistemas: v.total_sistemas,
  }));
}

function mapApiToUi(model: InventoryMatrixApi): MatrizInventarioSistemas {
  return {
    id: model.id,
    entregable_id: model.entregable_id,
    proyecto_id: model.proyecto_id,
    nombre: model.nombre,
    descripcion: model.descripcion,
    sistemas: model.sistemas,
    comentarios: model.comentarios,
    version_actual: model.version_actual,
    historial_versiones: mapVersions(model.historial_versiones),
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

export const inventoryMatrixApi = {
  async getMatrix(
    projectId: string,
    artifactId: string,
  ): Promise<MatrizInventarioSistemas> {
    const { data } = await apiClient.get<InventoryMatrixApi>(
      `/projects/${projectId}/artifacts/${artifactId}/inventory-matrix`,
    );
    return mapApiToUi(data);
  },

  async saveMatrix(
    projectId: string,
    artifactId: string,
    matriz: MatrizInventarioSistemas,
    changeSummary?: string,
  ): Promise<MatrizInventarioSistemas> {
    const { data } = await apiClient.put<InventoryMatrixApi>(
      `/projects/${projectId}/artifacts/${artifactId}/inventory-matrix`,
      {
        nombre: matriz.nombre,
        descripcion: matriz.descripcion,
        sistemas: matriz.sistemas,
        change_summary: changeSummary ?? null,
      },
    );
    return mapApiToUi(data);
  },

  async generateMatrix(
    projectId: string,
    artifactId: string,
  ): Promise<MatrizInventarioSistemas> {
    const { data } = await apiClient.post<InventoryMatrixApi>(
      `/projects/${projectId}/artifacts/${artifactId}/inventory-matrix/generate`,
    );
    return mapApiToUi(data);
  },

  async addComment(
    projectId: string,
    artifactId: string,
    comment: {
      referencia_id: string | null;
      referencia_tipo: "sistema" | "general";
      contenido: string;
    },
  ): Promise<MatrizInventarioSistemas> {
    const { data } = await apiClient.post<InventoryMatrixApi>(
      `/projects/${projectId}/artifacts/${artifactId}/inventory-matrix/comments`,
      comment,
    );
    return mapApiToUi(data);
  },
};

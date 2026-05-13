import { apiClient } from "@/lib/api/client";
import type { ModeloLogico } from "@/lib/types/modelo-logico.types";

type LogicalCommentApi = {
  id: string;
  target_type: "tabla" | "columna";
  target_client_id: string;
  content: string;
  status: string;
  created_by_user_email: string;
  created_by_user_name: string | null;
  created_by_user_type: string;
  created_at: string;
};

type LogicalVersionApi = {
  version_number: number;
  created_at: string;
  created_by_user_email: string;
  change_summary: string | null;
};

type LogicalDataModelApi = {
  id: string;
  proyecto_id: string;
  entregable_id: string;
  fase: string;
  nombre: string;
  descripcion: string;
  tablas: unknown[];
  sql_ddl: string;
  notas_markdown: string;
  comentarios: LogicalCommentApi[];
  version_actual: string;
  versiones: Array<{
    version: string;
    fecha: string;
    autor: string;
    descripcion_cambio: string;
  }>;
  created_at: string;
  updated_at: string;
};

type LogicalVersionsResponseApi = {
  versions: LogicalVersionApi[];
};

type LogicalPreviewResponseApi = {
  snapshot: {
    nombre: string;
    descripcion: string;
    tablas: unknown[];
    sql_ddl: string;
    notas_markdown: string;
  };
};

function mapCommentApiToUi(comment: LogicalCommentApi) {
  return {
    id: comment.id,
    referencia_id: comment.target_client_id,
    referencia_tipo: comment.target_type,
    autor: comment.created_by_user_name ?? comment.created_by_user_email,
    rol: (comment.created_by_user_type === "CONSULTOR" ? "CONSULTOR" : "EMPRESA") as
      | "CONSULTOR"
      | "EMPRESA",
    texto: comment.content,
    estado: (comment.status === "resolved" ? "resuelto" : "abierto") as "abierto" | "resuelto",
    fecha: comment.created_at,
    tabla_ref: comment.target_client_id,
  };
}

function mapApiToUi(data: LogicalDataModelApi): ModeloLogico {
  return {
    id: data.id,
    proyecto_id: data.proyecto_id,
    entregable_id: data.entregable_id,
    nombre: data.nombre,
    descripcion: data.descripcion,
    tablas: data.tablas as ModeloLogico["tablas"],
    sql_ddl: data.sql_ddl,
    notas_markdown: data.notas_markdown,
    comentarios: data.comentarios.map(mapCommentApiToUi),
    version_actual: data.version_actual,
    versiones: data.versiones,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapUiToRequest(model: ModeloLogico) {
  return {
    nombre: model.nombre,
    descripcion: model.descripcion,
    tablas: model.tablas,
    sql_ddl: model.sql_ddl,
    notas_markdown: model.notas_markdown,
  };
}

export const logicalModelApi = {
  async getModel(projectId: string, artifactId: string): Promise<ModeloLogico> {
    const { data } = await apiClient.get<LogicalDataModelApi>(
      `/projects/${projectId}/artifacts/${artifactId}/logical-data-model`
    );
    return mapApiToUi(data);
  },

  async saveModel(
    projectId: string,
    artifactId: string,
    model: ModeloLogico,
    changeSummary?: string
  ): Promise<ModeloLogico> {
    const { data } = await apiClient.put<LogicalDataModelApi>(
      `/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
      {
        ...mapUiToRequest(model),
        change_summary: changeSummary ?? null,
      }
    );
    return mapApiToUi(data);
  },

  async createComment(
    projectId: string,
    artifactId: string,
    payload: { targetType: "tabla" | "columna"; targetId: string; content: string }
  ) {
    const { data } = await apiClient.post<LogicalCommentApi>(
      `/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
      {
        target_type: payload.targetType,
        target_client_id: payload.targetId,
        content: payload.content,
      }
    );
    return mapCommentApiToUi(data);
  },

  async getVersions(
    projectId: string,
    artifactId: string
  ): Promise<LogicalVersionApi[]> {
    const { data } = await apiClient.get<LogicalVersionsResponseApi>(
      `/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions`
    );
    return data.versions;
  },

  async previewVersion(
    projectId: string,
    artifactId: string,
    versionNumber: number
  ): Promise<ModeloLogico> {
    const { data } = await apiClient.get<LogicalPreviewResponseApi>(
      `/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/${versionNumber}/preview`
    );
    const current = await this.getModel(projectId, artifactId);
    return {
      ...current,
      nombre: data.snapshot.nombre,
      descripcion: data.snapshot.descripcion,
      tablas: data.snapshot.tablas as ModeloLogico["tablas"],
      sql_ddl: data.snapshot.sql_ddl,
      notas_markdown: data.snapshot.notas_markdown,
    };
  },

  async restoreVersion(
    projectId: string,
    artifactId: string,
    versionNumber: number
  ): Promise<ModeloLogico> {
    const { data } = await apiClient.post<LogicalDataModelApi>(
      `/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/restore`,
      {
        source_version_number: versionNumber,
      }
    );
    return mapApiToUi(data);
  },
};

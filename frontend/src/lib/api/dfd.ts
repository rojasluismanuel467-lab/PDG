import { apiClient } from "@/lib/api/client";
import axios from "axios";
import type { ComentarioDFD, DiagramaFlujoDatos, FlujoDatos, NodoDFD, VersionDFD } from "@/lib/types/dfd.types";

type DFDCommentApi = {
  id: string;
  model_id: string;
  target_type: "nodo" | "flujo";
  target_client_id: string | null;
  content: string;
  status: "open" | "resolved";
  created_by_user_id: string | null;
  created_by_user_email: string;
  created_by_user_name: string | null;
  created_by_user_type: "CONSULTOR" | "EMPRESA" | "ADMINISTRADOR";
  created_in_version_number: number;
  created_at: string;
  updated_at: string;
};

type DFDVersionApi = {
  id: string;
  version_number: number;
  created_at: string;
  created_by_user_id: string | null;
  created_by_user_email: string;
  change_summary: string | null;
};

type DFDNodeApi = Omit<NodoDFD, "tipo"> & {
  tipo: "proceso" | "almacen" | "entidad_externa";
};

type DFDFlowApi = FlujoDatos;

type DFDModelApi = {
  id: string;
  project_id: string;
  artifact_id: string;
  phase: string;
  name: string;
  description: string;
  level: 0 | 1 | 2;
  nodos: DFDNodeApi[];
  flujos: DFDFlowApi[];
  comentarios: DFDCommentApi[];
  version_actual: string;
  current_version_number: number;
  historial_versiones: DFDVersionApi[];
  created_at: string;
  updated_at: string;
  last_saved_at: string;
};

type DFDVersionsApi = {
  model_id: string;
  versions: DFDVersionApi[];
};

type DFDPreviewApi = {
  model_id: string;
  source_version_number: number;
  snapshot: {
    name: string;
    description: string;
    level: 0 | 1 | 2;
    nodos: DFDNodeApi[];
    flujos: DFDFlowApi[];
    change_summary?: string | null;
  };
};

function mapCommentApiToUi(comment: DFDCommentApi): ComentarioDFD {
  return {
    id: comment.id,
    referencia_id: comment.target_client_id,
    referencia_tipo: comment.target_type,
    autor_id: comment.created_by_user_id ?? "unknown",
    autor_nombre: comment.created_by_user_name ?? comment.created_by_user_email.split("@")[0],
    autor_perfil: comment.created_by_user_type === "EMPRESA" ? "EMPRESA" : "CONSULTOR",
    contenido: comment.content,
    estado: comment.status === "resolved" ? "resuelto" : "abierto",
    created_at: comment.created_at,
  };
}

function mapVersionApiToUi(version: DFDVersionApi): VersionDFD {
  return {
    version: String(version.version_number),
    fecha: version.created_at,
    autor: version.created_by_user_email,
    descripcion_cambio: version.change_summary ?? "DFD update.",
  };
}

function mapModelApiToUi(model: DFDModelApi): DiagramaFlujoDatos {
  return {
    id: model.id,
    proyecto_id: model.project_id,
    entregable_id: model.artifact_id,
    nombre: model.name,
    descripcion: model.description,
    nivel: model.level,
    nodos: model.nodos,
    flujos: model.flujos,
    comentarios: model.comentarios.map(mapCommentApiToUi),
    version_actual: model.version_actual || String(model.current_version_number),
    historial_versiones: model.historial_versiones.map(mapVersionApiToUi),
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

function mapNodeUiToApi(node: NodoDFD): DFDNodeApi {
  return {
    id: node.id,
    tipo: node.tipo,
    nombre: node.nombre,
    descripcion: node.descripcion,
    numero_proceso: node.numero_proceso,
    ubicacion_proceso: node.ubicacion_proceso,
    prefijo_almacen: node.prefijo_almacen,
    tipo_dato_almacen: node.tipo_dato_almacen,
    posicion_x: node.posicion_x,
    posicion_y: node.posicion_y,
    width: node.width,
    height: node.height,
    color: node.color,
    fase: node.fase,
    categoria: node.categoria,
    etiquetas: node.etiquetas ?? [],
  };
}

function mapFlowUiToApi(flow: FlujoDatos, includeRelation = true): DFDFlowApi {
  const mapped: DFDFlowApi = {
    id: flow.id,
    origen_id: flow.origen_id,
    destino_id: flow.destino_id,
    etiqueta: flow.etiqueta,
    datos_descripcion: flow.datos_descripcion,
    datos_campos: flow.datos_campos ?? [],
    fase: flow.fase,
    tipo_flujo: flow.tipo_flujo,
    estilo_linea: flow.estilo_linea,
    ...(flow.source_handle != null && { source_handle: flow.source_handle }),
    ...(flow.target_handle != null && { target_handle: flow.target_handle }),
  };

  if (includeRelation) {
    mapped.tipo_relacion = flow.tipo_relacion;
  }

  return mapped;
}

export const dfdApi = {
  async getModel(projectId: string, artifactId: string): Promise<DiagramaFlujoDatos> {
    const { data } = await apiClient.get<DFDModelApi>(`/projects/${projectId}/artifacts/${artifactId}/dfd`);
    return mapModelApiToUi(data);
  },

  async saveModel(
    projectId: string,
    artifactId: string,
    model: DiagramaFlujoDatos,
    changeSummary?: string
  ): Promise<DiagramaFlujoDatos> {
    const buildPayload = (includeRelation: boolean) => ({
      name: model.nombre || "DFD AS-IS",
      description: model.descripcion || "",
      level: model.nivel,
      nodos: model.nodos.map(mapNodeUiToApi),
      flujos: model.flujos.map((flow) => mapFlowUiToApi(flow, includeRelation)),
      change_summary: changeSummary ?? null,
    });

    const endpoint = `/projects/${projectId}/artifacts/${artifactId}/dfd`;

    try {
      const { data } = await apiClient.put<DFDModelApi>(endpoint, buildPayload(true));
      return mapModelApiToUi(data);
    } catch (error) {
      // Backward compatibility: some backend deployments still reject `tipo_relacion`.
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const { data } = await apiClient.put<DFDModelApi>(
          endpoint,
          buildPayload(false)
        );
        return mapModelApiToUi(data);
      }
      throw error;
    }
  },

  async getVersions(projectId: string, artifactId: string): Promise<VersionDFD[]> {
    const { data } = await apiClient.get<DFDVersionsApi>(
      `/projects/${projectId}/artifacts/${artifactId}/dfd/versions`
    );
    return data.versions.map(mapVersionApiToUi);
  },

  async createComment(
    projectId: string,
    artifactId: string,
    payload: { referencia_id: string | null; referencia_tipo: "nodo" | "flujo"; contenido: string }
  ): Promise<ComentarioDFD> {
    const { data } = await apiClient.post<DFDCommentApi>(`/projects/${projectId}/artifacts/${artifactId}/dfd/comments`, {
      target_type: payload.referencia_tipo,
      target_client_id: payload.referencia_id,
      content: payload.contenido,
    });
    return mapCommentApiToUi(data);
  },

  async previewVersion(
    projectId: string,
    artifactId: string,
    versionNumber: number,
    current: DiagramaFlujoDatos
  ): Promise<DiagramaFlujoDatos> {
    const { data } = await apiClient.get<DFDPreviewApi>(
      `/projects/${projectId}/artifacts/${artifactId}/dfd/versions/${versionNumber}/preview`
    );
    return {
      ...current,
      nombre: data.snapshot.name,
      descripcion: data.snapshot.description,
      nivel: data.snapshot.level,
      nodos: data.snapshot.nodos,
      flujos: data.snapshot.flujos,
      version_actual: String(versionNumber),
    };
  },

  async restoreVersion(
    projectId: string,
    artifactId: string,
    sourceVersionNumber: number,
    changeSummary?: string
  ): Promise<DiagramaFlujoDatos> {
    const { data } = await apiClient.post<DFDModelApi>(
      `/projects/${projectId}/artifacts/${artifactId}/dfd/restore-version`,
      {
        source_version_number: sourceVersionNumber,
        change_summary: changeSummary ?? null,
      }
    );
    return mapModelApiToUi(data);
  },
};

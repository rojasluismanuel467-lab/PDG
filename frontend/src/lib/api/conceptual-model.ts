import { apiClient } from "@/lib/api/client";
import type {
  AtributoER,
  ComentarioER,
  EntidadER,
  ModeloER,
  RelacionER,
  VersionModeloER,
} from "@/lib/types/modelo-er.types";

type ConceptualAttributeApi = {
  id: string;
  name: string;
  data_type: string;
  is_pk: boolean;
  is_fk: boolean;
  is_nullable: boolean;
  description?: string | null;
  fk_entity_ref?: string | null;
  fk_attribute_ref?: string | null;
};

type ConceptualEntityApi = {
  id: string;
  name: string;
  description: string;
  position_x: number;
  position_y: number;
  color?: string | null;
  attributes: ConceptualAttributeApi[];
};

type ConceptualRelationApi = {
  id: string;
  name: string;
  source_entity_id: string;
  target_entity_id: string;
  cardinality: "1:1" | "1:N" | "N:1" | "N:M";
  description?: string | null;
  fk_attribute_id?: string | null;
};

type ConceptualModelApiResponse = {
  id: string;
  project_id: string;
  artifact_id: string;
  phase: string;
  name: string;
  description: string;
  entities: ConceptualEntityApi[];
  relations: ConceptualRelationApi[];
  comments?: ConceptualCommentApi[];
  current_version_number: number;
  created_at: string;
  updated_at: string;
  last_saved_at?: string | null;
};

type ConceptualModelVersionApi = {
  id: string;
  version_number: number;
  created_at: string;
  created_by_user_id: string;
  created_by_user_email: string;
  change_summary?: string | null;
};

type ConceptualModelVersionsApiResponse = {
  model_id: string;
  versions: ConceptualModelVersionApi[];
};

type ConceptualVersionPreviewApiResponse = {
  model_id: string;
  source_version_number: number;
  snapshot: {
    name: string;
    description: string;
    entities: ConceptualEntityApi[];
    relations: ConceptualRelationApi[];
    change_summary?: string | null;
  };
};

type ConceptualCommentApi = {
  id: string;
  model_id: string;
  target_type: "entity" | "relation" | "general";
  target_client_id?: string | null;
  content: string;
  status: "open" | "resolved";
  created_in_version_number?: number | null;
  outdated_at?: string | null;
  is_outdated?: boolean;
  created_by_user_id: string;
  created_by_user_email: string;
  created_by_user_name: string;
  created_by_user_type: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA";
  created_at: string;
  updated_at: string;
};

type ConceptualCommentsApiResponse = {
  model_id: string;
  comments: ConceptualCommentApi[];
};

function mapAttributeApiToUi(attribute: ConceptualAttributeApi): AtributoER {
  return {
    id: attribute.id,
    nombre: attribute.name,
    tipo_dato: attribute.data_type as AtributoER["tipo_dato"],
    es_pk: attribute.is_pk,
    es_fk: attribute.is_fk,
    es_nullable: attribute.is_nullable,
    descripcion: attribute.description ?? undefined,
    fk_entidad_ref: attribute.fk_entity_ref ?? undefined,
    fk_atributo_ref: attribute.fk_attribute_ref ?? undefined,
  };
}

function mapEntityApiToUi(entity: ConceptualEntityApi): EntidadER {
  return {
    id: entity.id,
    nombre: entity.name,
    descripcion: entity.description,
    posicion_x: entity.position_x,
    posicion_y: entity.position_y,
    color: entity.color ?? undefined,
    atributos: entity.attributes.map(mapAttributeApiToUi),
  };
}

function mapRelationApiToUi(relation: ConceptualRelationApi): RelacionER {
  return {
    id: relation.id,
    nombre: relation.name,
    entidad_origen_id: relation.source_entity_id,
    entidad_destino_id: relation.target_entity_id,
    cardinalidad: relation.cardinality,
    descripcion: relation.description ?? undefined,
    atributo_fk_id: relation.fk_attribute_id ?? undefined,
  };
}

function mapVersionApiToUi(version: ConceptualModelVersionApi): VersionModeloER {
  return {
    version: String(version.version_number),
    fecha: version.created_at,
    autor: version.created_by_user_email,
    descripcion_cambio: version.change_summary ?? "Actualización del modelo conceptual.",
  };
}

function mapModelApiToUi(
  model: ConceptualModelApiResponse,
  versions: ConceptualModelVersionApi[]
): ModeloER {
  const comments = (model.comments ?? []).map(mapCommentApiToUi);
  return {
    id: model.id,
    entregable_id: model.artifact_id,
    proyecto_id: model.project_id,
    nombre: model.name,
    descripcion: model.description,
    entidades: model.entities.map(mapEntityApiToUi),
    relaciones: model.relations.map(mapRelationApiToUi),
    comentarios: comments,
    version_actual: String(model.current_version_number),
    historial_versiones: versions.map(mapVersionApiToUi),
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

function mapCommentApiToUi(comment: ConceptualCommentApi): ComentarioER {
  return {
    id: comment.id,
    referencia_id: comment.target_client_id ?? null,
    referencia_tipo:
      comment.target_type === "entity"
        ? "entidad"
        : comment.target_type === "relation"
          ? "relacion"
          : "general",
    autor_id: comment.created_by_user_id,
    autor_nombre: comment.created_by_user_name,
    autor_perfil: comment.created_by_user_type === "EMPRESA" ? "EMPRESA" : "CONSULTOR",
    contenido: comment.content,
    estado: comment.status === "resolved" ? "resuelto" : "abierto",
    created_in_version_number: comment.created_in_version_number ?? undefined,
    outdated_at: comment.outdated_at ?? null,
    es_desactualizado: comment.is_outdated ?? false,
    created_at: comment.created_at,
  };
}

function mapAttributeUiToApi(attribute: AtributoER): ConceptualAttributeApi {
  return {
    id: attribute.id,
    name: attribute.nombre,
    data_type: attribute.tipo_dato,
    is_pk: attribute.es_pk,
    is_fk: attribute.es_fk,
    is_nullable: attribute.es_nullable,
    description: attribute.descripcion ?? null,
    fk_entity_ref: attribute.fk_entidad_ref ?? null,
    fk_attribute_ref: attribute.fk_atributo_ref ?? null,
  };
}

function mapEntityUiToApi(entity: EntidadER): ConceptualEntityApi {
  return {
    id: entity.id,
    name: entity.nombre,
    description: entity.descripcion,
    position_x: entity.posicion_x,
    position_y: entity.posicion_y,
    color: entity.color ?? null,
    attributes: entity.atributos.map(mapAttributeUiToApi),
  };
}

function mapRelationUiToApi(relation: RelacionER): ConceptualRelationApi {
  return {
    id: relation.id,
    name: relation.nombre,
    source_entity_id: relation.entidad_origen_id,
    target_entity_id: relation.entidad_destino_id,
    cardinality: relation.cardinalidad,
    description: relation.descripcion ?? null,
    fk_attribute_id: relation.atributo_fk_id ?? null,
  };
}

async function getVersions(
  projectId: string,
  artifactId: string
): Promise<ConceptualModelVersionApi[]> {
  const { data } = await apiClient.get<ConceptualModelVersionsApiResponse>(
    `/projects/${projectId}/artifacts/${artifactId}/conceptual-model/versions`
  );
  return data.versions;
}

export const conceptualModelApi = {
  async getModel(projectId: string, artifactId: string): Promise<ModeloER> {
    const [modelResponse, versions] = await Promise.all([
      apiClient.get<ConceptualModelApiResponse>(
        `/projects/${projectId}/artifacts/${artifactId}/conceptual-model`
      ),
      getVersions(projectId, artifactId),
    ]);

    return mapModelApiToUi(modelResponse.data, versions);
  },

  async saveModel(
    projectId: string,
    artifactId: string,
    model: ModeloER,
    changeSummary?: string
  ): Promise<ModeloER> {
    const payload = {
      name: model.nombre || "Diagrama conceptual",
      description: model.descripcion ?? "",
      entities: model.entidades.map(mapEntityUiToApi),
      relations: model.relaciones.map(mapRelationUiToApi),
      change_summary: changeSummary ?? null,
    };

    const { data } = await apiClient.put<ConceptualModelApiResponse>(
      `/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
      payload
    );
    const versions = await getVersions(projectId, artifactId);
    return mapModelApiToUi(data, versions);
  },

  async listComments(
    projectId: string,
    artifactId: string,
    filters?: {
      status?: "open" | "resolved";
      includeOutdated?: boolean;
      onlyActive?: boolean;
    }
  ): Promise<ComentarioER[]> {
    const { data } = await apiClient.get<ConceptualCommentsApiResponse>(
      `/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
      {
        params: {
          status: filters?.status,
          include_outdated: filters?.includeOutdated,
          only_active: filters?.onlyActive,
        },
      }
    );
    return data.comments.map(mapCommentApiToUi);
  },

  async createComment(
    projectId: string,
    artifactId: string,
    payload: {
      targetType: "entity" | "relation" | "general";
      targetClientId?: string | null;
      content: string;
    }
  ): Promise<ComentarioER> {
    const { data } = await apiClient.post<ConceptualCommentApi>(
      `/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
      {
        target_type: payload.targetType,
        target_client_id: payload.targetClientId ?? null,
        content: payload.content,
      }
    );
    return mapCommentApiToUi(data);
  },

  async updateComment(
    projectId: string,
    artifactId: string,
    commentId: string,
    payload: {
      content?: string;
      status?: "open" | "resolved";
    }
  ): Promise<ComentarioER> {
    const { data } = await apiClient.patch<ConceptualCommentApi>(
      `/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments/${commentId}`,
      {
        content: payload.content,
        status: payload.status,
      }
    );
    return mapCommentApiToUi(data);
  },

  async deleteComment(projectId: string, artifactId: string, commentId: string): Promise<void> {
    await apiClient.delete(
      `/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments/${commentId}`
    );
  },

  async previewVersion(
    projectId: string,
    artifactId: string,
    versionNumber: number
  ): Promise<ModeloER> {
    const { data } = await apiClient.get<ConceptualVersionPreviewApiResponse>(
      `/projects/${projectId}/artifacts/${artifactId}/conceptual-model/versions/${versionNumber}/preview`
    );
    const currentModel = await this.getModel(projectId, artifactId);
    return {
      ...currentModel,
      nombre: data.snapshot.name,
      descripcion: data.snapshot.description,
      entidades: data.snapshot.entities.map(mapEntityApiToUi),
      relaciones: data.snapshot.relations.map(mapRelationApiToUi),
      version_actual: String(data.source_version_number),
    };
  },

  async restoreVersion(
    projectId: string,
    artifactId: string,
    versionNumber: number,
    changeSummary?: string
  ): Promise<ModeloER> {
    const { data } = await apiClient.post<ConceptualModelApiResponse>(
      `/projects/${projectId}/artifacts/${artifactId}/conceptual-model/restore-version`,
      {
        source_version_number: versionNumber,
        change_summary: changeSummary ?? null,
      }
    );
    const versions = await getVersions(projectId, artifactId);
    return mapModelApiToUi(data, versions);
  },
};

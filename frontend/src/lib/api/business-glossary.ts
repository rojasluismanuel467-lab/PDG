import { apiClient } from "@/lib/api/client";
import type {
  ComentarioGlosario,
  GlosarioNegocio,
  TerminoGlosario,
  VersionGlosario,
} from "@/lib/types/glosario-negocio.types";

type VersionApi = {
  version: string;
  fecha: string;
  autor: string;
  descripcion_cambio: string | null;
  total_terminos: number;
};

type BusinessGlossaryApi = {
  id: string;
  proyecto_id: string;
  entregable_id: string;
  nombre: string;
  descripcion: string;
  terminos: TerminoGlosario[];
  comentarios: ComentarioGlosario[];
  version_actual: string;
  historial_versiones: VersionApi[];
  created_at: string;
  updated_at: string;
};

function mapVersions(versions: VersionApi[]): VersionGlosario[] {
  return versions.map((v) => ({
    version: v.version,
    fecha: v.fecha,
    autor: v.autor,
    descripcion_cambio: v.descripcion_cambio ?? "",
    total_terminos: v.total_terminos,
  }));
}

function mapApiToUi(model: BusinessGlossaryApi): GlosarioNegocio {
  return {
    id: model.id,
    entregable_id: model.entregable_id,
    proyecto_id: model.proyecto_id,
    nombre: model.nombre,
    descripcion: model.descripcion,
    terminos: model.terminos,
    comentarios: model.comentarios,
    version_actual: model.version_actual,
    historial_versiones: mapVersions(model.historial_versiones),
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

export const businessGlossaryApi = {
  async getGlossary(
    projectId: string,
    artifactId: string,
  ): Promise<GlosarioNegocio> {
    const { data } = await apiClient.get<BusinessGlossaryApi>(
      `/projects/${projectId}/artifacts/${artifactId}/business-glossary`,
    );
    return mapApiToUi(data);
  },

  async saveGlossary(
    projectId: string,
    artifactId: string,
    glosario: GlosarioNegocio,
    changeSummary?: string,
  ): Promise<GlosarioNegocio> {
    const { data } = await apiClient.put<BusinessGlossaryApi>(
      `/projects/${projectId}/artifacts/${artifactId}/business-glossary`,
      {
        nombre: glosario.nombre,
        descripcion: glosario.descripcion,
        terminos: glosario.terminos,
        change_summary: changeSummary ?? null,
      },
    );
    return mapApiToUi(data);
  },

  async generateGlossary(
    projectId: string,
    artifactId: string,
  ): Promise<GlosarioNegocio> {
    const { data } = await apiClient.post<BusinessGlossaryApi>(
      `/projects/${projectId}/artifacts/${artifactId}/business-glossary/generate`,
    );
    return mapApiToUi(data);
  },

  async addComment(
    projectId: string,
    artifactId: string,
    comment: {
      referencia_id: string | null;
      referencia_tipo: "termino" | "general";
      contenido: string;
    },
  ): Promise<GlosarioNegocio> {
    const { data } = await apiClient.post<BusinessGlossaryApi>(
      `/projects/${projectId}/artifacts/${artifactId}/business-glossary/comments`,
      comment,
    );
    return mapApiToUi(data);
  },
};

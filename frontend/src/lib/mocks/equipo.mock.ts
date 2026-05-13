import { apiClient } from "@/lib/api/client";

export type NivelPermiso = 0 | 1 | 2 | 3 | 4 | 5;

export type MiembroProyecto = {
  id: string;
  id_usuario: string;
  nombre: string;
  email: string;
  avatar: string | null;
  es_gerente: boolean;
  nivel_asis: NivelPermiso;
  nivel_tobe: NivelPermiso;
  nivel_brechas: NivelPermiso;
  ver_auditoria: boolean;
  estado_invitacion: "ACEPTADA" | "PENDIENTE" | "RECHAZADA";
  fecha_ingreso: string | null;
};

type BackendMember = {
  membership_id: string;
  project_id: string;
  user_id: string;
  nombre: string;
  email: string;
  tipo_usuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA";
  estado_usuario: "ACTIVO" | "INACTIVO";
  is_manager: boolean;
  permisos: {
    project_permission_level: number | null;
    nivel_asis: number | null;
    nivel_tobe: number | null;
    nivel_brechas: number | null;
    nivel_roadmap: number | null;
  };
  created_at: string;
  updated_at: string;
};

const normalizeLevel = (level: number | null | undefined): NivelPermiso => {
  if (typeof level !== "number") return 0;
  if (level < 0) return 0;
  if (level > 5) return 5;
  return level as NivelPermiso;
};

const mapMember = (item: BackendMember): MiembroProyecto => ({
  id: item.membership_id,
  id_usuario: item.user_id,
  nombre: item.nombre,
  email: item.email,
  avatar: null,
  es_gerente: item.is_manager,
  nivel_asis: normalizeLevel(item.permisos.nivel_asis),
  nivel_tobe: normalizeLevel(item.permisos.nivel_tobe),
  nivel_brechas: normalizeLevel(item.permisos.nivel_brechas),
  ver_auditoria: false,
  estado_invitacion: item.estado_usuario === "INACTIVO" ? "RECHAZADA" : "ACEPTADA",
  fecha_ingreso: item.created_at ?? null,
});

export const MOCK_CONSULTORES_DISPONIBLES: Array<{
  id: string;
  nombre: string;
  email: string;
}> = [];

export const mockGetEquipo = async (idProyecto: string): Promise<MiembroProyecto[]> => {
  const { data } = await apiClient.get<{ total: number; items: BackendMember[] }>(
    `/projects/${idProyecto}/members`
  );
  return data.items.map(mapMember);
};

export const mockInvitarConsultor = async (
  idProyecto: string,
  data: {
    email: string;
    tipo_usuario: "CONSULTOR" | "EMPRESA";
    nivel_asis: NivelPermiso;
    nivel_tobe: NivelPermiso;
    nivel_brechas: NivelPermiso;
  }
): Promise<MiembroProyecto> => {
  const response = await apiClient.post<{
    message: string;
    member: BackendMember;
    invitation_token: string | null;
    invitation_expires_at: string | null;
  }>(`/projects/${idProyecto}/members/invite`, {
    email: data.email,
    tipo_usuario: data.tipo_usuario,
    nivel_asis: data.nivel_asis,
    nivel_tobe: data.nivel_tobe,
    nivel_brechas: data.nivel_brechas,
    nivel_roadmap: 3,
  });

  return mapMember(response.data.member);
};

export const mockActualizarPermisos = async (
  idProyecto: string,
  idRol: string,
  permisos: {
    nivel_asis?: NivelPermiso;
    nivel_tobe?: NivelPermiso;
    nivel_brechas?: NivelPermiso;
    ver_auditoria?: boolean;
  }
): Promise<MiembroProyecto> => {
  const members = await mockGetEquipo(idProyecto);
  const membership = members.find((item) => item.id === idRol);
  if (!membership) {
    throw new Error("MIEMBRO_NO_ENCONTRADO");
  }
  if (membership.es_gerente) {
    throw new Error("NO_SE_PUEDE_MODIFICAR_GERENTE");
  }

  const { data } = await apiClient.patch<BackendMember>(
    `/projects/${idProyecto}/members/${membership.id_usuario}/permissions`,
    {
      ...(typeof permisos.nivel_asis === "number" ? { nivel_asis: permisos.nivel_asis } : {}),
      ...(typeof permisos.nivel_tobe === "number" ? { nivel_tobe: permisos.nivel_tobe } : {}),
      ...(typeof permisos.nivel_brechas === "number"
        ? { nivel_brechas: permisos.nivel_brechas }
        : {}),
    }
  );

  return mapMember(data);
};

export const mockRemoverMiembro = async (idProyecto: string, idRol: string): Promise<void> => {
  const members = await mockGetEquipo(idProyecto);
  const membership = members.find((item) => item.id === idRol);
  if (!membership) {
    throw new Error("MIEMBRO_NO_ENCONTRADO");
  }
  if (membership.es_gerente) {
    throw new Error("NO_SE_PUEDE_REMOVER_GERENTE");
  }

  await apiClient.delete(`/projects/${idProyecto}/members/${membership.id_usuario}`);
};

export const mockActualizarPermisoArtefacto = async (
  idProyecto: string,
  artifactId: string,
  userId: string,
  permissionLevel: NivelPermiso
): Promise<void> => {
  await apiClient.patch(
    `/projects/${idProyecto}/artifacts/${artifactId}/permissions/${userId}`,
    { permission_level: permissionLevel }
  );
};

/** Devuelve un mapa artifactId → NivelPermiso de los overrides guardados para un miembro */
export const mockGetArtifactPermissions = async (
  idProyecto: string,
  userId: string
): Promise<Record<string, NivelPermiso>> => {
  const { data } = await apiClient.get<{
    items: Array<{ artifact_id: string; permission_level: number }>;
  }>(`/projects/${idProyecto}/members/${userId}/artifact-permissions`);
  return Object.fromEntries(
    data.items.map((p) => [p.artifact_id, normalizeLevel(p.permission_level)])
  );
};

/** Elimina el override de artefacto (el miembro hereda el nivel de su bloque) */
export const mockDeletePermisoArtefacto = async (
  idProyecto: string,
  artifactId: string,
  userId: string
): Promise<void> => {
  await apiClient.delete(
    `/projects/${idProyecto}/artifacts/${artifactId}/permissions/${userId}`
  );
};

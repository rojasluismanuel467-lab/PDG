import { expect, test } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";

const CONSULTOR_EMAIL = process.env.E2E_CONSULTOR_EMAIL ?? "consultor@example.com";
const CONSULTOR_PASSWORD = process.env.E2E_CONSULTOR_PASSWORD ?? "Consultor123!";

const EMPRESA_EMAIL = process.env.E2E_EMPRESA_EMAIL ?? "empresa@example.com";
const EMPRESA_PASSWORD = process.env.E2E_EMPRESA_PASSWORD ?? "Empresa123!";

type LoginSession = {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    tipo_usuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA";
    estado: string;
  };
};

async function apiLogin(
  request: Parameters<typeof test>[0]["request"],
  params: { email: string; password: string }
): Promise<LoginSession> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: params.email, password: params.password },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return {
    token: payload.tokens.access_token as string,
    user: payload.user as LoginSession["user"],
  };
}

async function createProject(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  suffix: string
): Promise<{ projectId: string }> {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      name: `E2E Permisos ${suffix}`,
      description: "E2E permissions matrix",
      client_company_name: "E2E Corp",
      client_company_email: `qa-permisos+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return { projectId: payload.id as string };
}

async function getArtifactIdByCode(
  request: Parameters<typeof test>[0]["request"],
  token: string,
  projectId: string,
  code: string
): Promise<string> {
  const res = await request.get(`${API_BASE}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  const item = (payload.artifact_items as Array<{ id: string; code: string }>).find(
    (artifact) => artifact.code === code
  );
  expect(item).toBeTruthy();
  return item!.id;
}

async function inviteMember(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  projectId: string,
  params: {
    email: string;
    tipo_usuario: "CONSULTOR" | "EMPRESA" | "ADMINISTRADOR";
    project_permission_level?: number;
    nivel_asis?: number;
    nivel_tobe?: number;
    nivel_brechas?: number;
    nivel_roadmap?: number;
  }
) {
  const res = await request.post(`${API_BASE}/projects/${projectId}/members/invite`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: params,
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as {
    member: { user_id: string; email: string };
    invitation_token: string | null;
  };
}

test("permission levels enforce read vs edit for AS-IS conceptual model (+ artifact override)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);

  // Invite consultor with read-only in AS-IS.
  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_asis: 1,
    nivel_tobe: 0,
    nivel_brechas: 0,
    nivel_roadmap: 0,
  });

  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  // Read should work.
  const readRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(readRes.ok()).toBeTruthy();
  const model = await readRes.json();

  // Edit should be forbidden at level 1.
  const writeRes = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: model.name,
        description: model.description ?? "",
        entities: model.entities ?? [],
        relations: model.relations ?? [],
        change_summary: "E2E should fail at read-only",
      },
    }
  );
  expect(writeRes.status()).toBe(403);

  // Override artifact permission to EDITAR (3) and re-try.
  const overrideRes = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${consultor.user.id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { permission_level: 3 },
    }
  );
  expect(overrideRes.ok()).toBeTruthy();

  const writeRes2 = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: model.name,
        description: model.description ?? "",
        entities: model.entities ?? [],
        relations: model.relations ?? [],
        change_summary: "E2E should pass with artifact override",
      },
    }
  );
  expect(writeRes2.ok()).toBeTruthy();
});

test("role restrictions: EMPRESA cannot edit conceptual model even with high permission", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);

  await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 5,
    nivel_asis: 5,
    nivel_tobe: 5,
    nivel_brechas: 5,
    nivel_roadmap: 5,
  });

  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );

  const empresa = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });
  const readRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    { headers: { Authorization: `Bearer ${empresa.token}` } }
  );
  expect(readRes.ok()).toBeTruthy();
  const model = await readRes.json();

  const writeRes = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: {
        name: model.name,
        description: model.description ?? "",
        entities: model.entities ?? [],
        relations: model.relations ?? [],
        change_summary: "EMPRESA should never edit conceptual diagram",
      },
    }
  );
  expect(writeRes.status()).toBe(403);
});

test("TO-BE logical model edit requires EDITAR permission", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);

  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_asis: 0,
    nivel_tobe: 1,
    nivel_brechas: 0,
    nivel_roadmap: 0,
  });

  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  const readRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(readRes.ok()).toBeTruthy();
  const model = await readRes.json();

  const writeRes = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        nombre: model.nombre ?? model.name ?? "Logical",
        descripcion: model.descripcion ?? model.description ?? "",
        tablas: model.tablas ?? model.tables ?? [],
        sql_ddl: model.sql_ddl ?? "",
        notas_markdown: model.notas_markdown ?? "",
      },
    }
  );
  expect(writeRes.status()).toBe(403);
});

test("delegation rule: delegated users (level 5, not manager) can assign up to 4 but not 5", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);

  // Give consultor delegated permissions but not manager.
  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 5,
    nivel_asis: 5,
    nivel_tobe: 5,
    nivel_brechas: 5,
    nivel_roadmap: 5,
  });
  const empresaInvite = await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 1,
    nivel_asis: 1,
    nivel_tobe: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const empresaUserId = empresaInvite.member.user_id;

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  const assign5 = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${empresaUserId}/permissions`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { project_permission_level: 5 },
    }
  );
  expect(assign5.status()).toBe(403);

  const assign4 = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${empresaUserId}/permissions`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { project_permission_level: 4 },
    }
  );
  expect(assign4.ok()).toBeTruthy();
});

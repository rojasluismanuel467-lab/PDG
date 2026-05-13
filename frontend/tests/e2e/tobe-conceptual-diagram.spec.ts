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

type CreatedUser = {
  id: string;
  email: string;
  password: string;
};

async function apiLogin(
  request: Parameters<typeof test>[0]["request"],
  params: { email: string; password: string }
): Promise<LoginSession> {
  const res = await request.post(`${API_BASE}/auth/login`, { data: params });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return { token: payload.tokens.access_token as string, user: payload.user as LoginSession["user"] };
}

async function authenticateByStorage(page: Parameters<typeof test>[0]["page"], session: LoginSession) {
  const authUser = {
    id: session.user.id,
    nombre: session.user.nombre,
    email: session.user.email,
    perfil: session.user.tipo_usuario === "ADMINISTRADOR" ? "ADMIN" : session.user.tipo_usuario,
    avatar: null,
    estado: session.user.estado,
  };
  await page.goto("/signin");
  await page.evaluate(([token, user]) => {
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("arqdata_auth_user", user);
  }, [session.token, JSON.stringify(authUser)]);
}

async function createProject(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  suffix: string
): Promise<string> {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      name: `E2E TOBE Conceptual ${suffix}`,
      description: "TO-BE conceptual diagram tests",
      client_company_name: "E2E Corp",
      client_company_email: `qa-tobe-conceptual+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return payload.id as string;
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
  const artifact = (payload.artifact_items as Array<{ id: string; code: string }>).find(
    (item) => item.code === code
  );
  expect(artifact).toBeTruthy();
  return artifact!.id;
}

async function inviteMember(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  projectId: string,
  params: {
    email: string;
    tipo_usuario: "CONSULTOR" | "EMPRESA";
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
}

async function setMemberPermissions(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  projectId: string,
  userId: string,
  level: number
) {
  const res = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${userId}/permissions`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        project_permission_level: level,
        nivel_asis: 1,
        nivel_tobe: level,
        nivel_brechas: 1,
        nivel_roadmap: 1,
      },
    }
  );
  expect(res.ok()).toBeTruthy();
}

async function createConsultorUser(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  suffix: string
): Promise<CreatedUser> {
  const email = `consultor.tobe.e2e+${suffix}@example.com`;
  const password = "Consultor123!";
  const res = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      nombre: `Consultor TOBE ${suffix}`,
      email,
      tipo_usuario: "CONSULTOR",
      password,
      estado: "ACTIVO",
    },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return { id: payload.id as string, email, password };
}

async function createEmpresaUser(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  suffix: string
): Promise<CreatedUser> {
  const email = `empresa.tobe.e2e+${suffix}@example.com`;
  const password = "Empresa123!";
  const res = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      nombre: `Empresa TOBE ${suffix}`,
      email,
      tipo_usuario: "EMPRESA",
      password,
      estado: "ACTIVO",
    },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return { id: payload.id as string, email, password };
}

test("[artifact:tobe-conceptual-diagram] consultor with TO-BE edit permission can open and edit TO-BE conceptual diagram", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-edit`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  await expect(page.getByText(/Entregable no encontrado/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Entidad$/i })).toBeVisible();
});

test("[artifact:tobe-conceptual-diagram] consultor with TO-BE read-only permission sees TO-BE conceptual diagram without edit controls", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-readonly`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 3,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  await expect(page.getByText(/Solo lectura/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^v\d+$/i })).toBeVisible();
  await expect(page.getByText(/Entregable no encontrado/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Entidad$/i })).toHaveCount(0);
});

test("[artifact:tobe-conceptual-diagram] empresa cannot edit TO-BE conceptual diagram even with high TO-BE level", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 5,
    nivel_tobe: 5,
    nivel_asis: 5,
    nivel_brechas: 5,
    nivel_roadmap: 5,
  });

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
        change_summary: "empresa must not edit TO-BE conceptual diagram",
      },
    }
  );
  expect(writeRes.status()).toBe(403);
});

test("[artifact:tobe-conceptual-diagram] project-artifact boundary: artifact from another project cannot be edited", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-boundary`);
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const projectA = await createProject(request, admin.token, `${suffix}-A`);
  const projectB = await createProject(request, admin.token, `${suffix}-B`);

  await inviteMember(request, admin.token, projectA, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
  });
  await inviteMember(request, admin.token, projectB, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
  });

  const artifactFromA = await getArtifactIdByCode(
    request,
    admin.token,
    projectA,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  const readMismatch = await request.get(
    `${API_BASE}/projects/${projectB}/artifacts/${artifactFromA}/conceptual-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(readMismatch.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-conceptual-diagram] non-member cannot access TO-BE conceptual artifact endpoints for a project", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-nonmember`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const readRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(readRes.status()).toBe(403);

  const versionsRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/versions`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(versionsRes.status()).toBe(403);
});

test("[artifact:tobe-conceptual-diagram] TO-BE conceptual comments require COMENTAR level (2): level 1 denied, level 2 allowed", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-comments`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const deniedComment = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        target_type: "general",
        target_client_id: null,
        content: `level1 should fail ${suffix}`,
      },
    }
  );
  expect(deniedComment.status()).toBe(403);

  const adminPromote = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${consultorUser.id}/permissions`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        project_permission_level: 2,
        nivel_asis: 1,
        nivel_tobe: 2,
        nivel_brechas: 1,
        nivel_roadmap: 1,
      },
    }
  );
  expect(adminPromote.ok()).toBeTruthy();

  const allowedComment = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        target_type: "general",
        target_client_id: null,
        content: `level2 should pass ${suffix}`,
      },
    }
  );
  expect(allowedComment.ok()).toBeTruthy();
});

test("[artifact:tobe-conceptual-diagram] consultant and company approvals are persisted on TO-BE conceptual artifact", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-approve`);
  const empresaUser = await createEmpresaUser(request, admin.token, `${suffix}-approve`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  await inviteMember(request, admin.token, projectId, {
    email: empresaUser.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });
  const empresa = await apiLogin(request, {
    email: empresaUser.email,
    password: empresaUser.password,
  });

  const approveConsultor = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: true },
    }
  );
  expect(approveConsultor.ok()).toBeTruthy();

  const approveEmpresa = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: { approved: true },
    }
  );
  expect(approveEmpresa.ok()).toBeTruthy();

  const projectDetail = await request.get(
    `${API_BASE}/projects/${projectId}`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(projectDetail.ok()).toBeTruthy();
  const payload = await projectDetail.json();
  const artifact = (payload.artifact_items as Array<{
    id: string;
    consultant_approved: boolean;
    company_approved: boolean;
  }>).find((item) => item.id === artifactId);
  expect(artifact).toBeTruthy();
  expect(artifact!.consultant_approved).toBeTruthy();
  expect(artifact!.company_approved).toBeTruthy();

  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByText(/Solo lectura/i)).toBeVisible();
  await expect(page.getByText(/APROBADO/i)).toBeVisible();
});

test("[artifact:tobe-conceptual-diagram] version endpoints for TO-BE conceptual diagram respect membership and read access", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-versions`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const versionsRead = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/versions`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(versionsRead.ok()).toBeTruthy();
});

test("[artifact:tobe-conceptual-diagram] TO-BE conceptual read is denied when effective level is 0", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-read0`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 0,
    nivel_tobe: 0,
    nivel_asis: 0,
    nivel_brechas: 0,
    nivel_roadmap: 0,
  });

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });
  const readRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(readRes.status()).toBe(403);
});

test("[artifact:tobe-conceptual-diagram] consultor approval requires APROBAR level (4) on TO-BE conceptual artifact", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-approve-level`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const deniedApprove = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: true },
    }
  );
  expect(deniedApprove.status()).toBe(403);

  const promoteRes = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${consultorUser.id}/permissions`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        project_permission_level: 4,
        nivel_asis: 1,
        nivel_tobe: 4,
        nivel_brechas: 1,
        nivel_roadmap: 1,
      },
    }
  );
  expect(promoteRes.ok()).toBeTruthy();

  const allowedApprove = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: true },
    }
  );
  expect(allowedApprove.ok()).toBeTruthy();
});

test("[artifact:tobe-conceptual-diagram] TO-BE conceptual artifact supports company approval before consultant and persists both approvals", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-sequence`);
  const empresaUser = await createEmpresaUser(request, admin.token, `${suffix}-sequence`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  await inviteMember(request, admin.token, projectId, {
    email: empresaUser.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });
  const empresa = await apiLogin(request, {
    email: empresaUser.email,
    password: empresaUser.password,
  });

  const earlyCompanyApprove = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: { approved: true },
    }
  );
  expect(earlyCompanyApprove.ok()).toBeTruthy();

  const consultorApprove = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: true },
    }
  );
  expect(consultorApprove.ok()).toBeTruthy();

  const finalCompanyApprove = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: { approved: true },
    }
  );
  expect(finalCompanyApprove.ok()).toBeTruthy();

  const projectDetail = await request.get(`${API_BASE}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(projectDetail.ok()).toBeTruthy();
  const payload = await projectDetail.json();
  const artifact = (payload.artifact_items as Array<{
    id: string;
    consultant_approved: boolean;
    company_approved: boolean;
  }>).find((item) => item.id === artifactId);
  expect(artifact).toBeTruthy();
  expect(artifact!.consultant_approved).toBeTruthy();
  expect(artifact!.company_approved).toBeTruthy();
});

test("[artifact:tobe-conceptual-diagram] EMPRESA cannot use consultant approval endpoint on TO-BE conceptual artifact", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const empresaUser = await createEmpresaUser(request, admin.token, `${suffix}-rolecheck`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: empresaUser.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 5,
    nivel_tobe: 5,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const empresa = await apiLogin(request, {
    email: empresaUser.email,
    password: empresaUser.password,
  });

  const res = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: { approved: true },
    }
  );
  expect(res.status()).toBe(403);
});

test("[artifact:tobe-conceptual-diagram] TO-BE conceptual restore-version returns controlled client error for invalid restore attempt", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-restore`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const denied = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/restore-version`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { version_number: 1, change_summary: "should fail at level 2" },
    }
  );
  expect(denied.status()).toBeGreaterThanOrEqual(400);

  const promote = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${consultorUser.id}/permissions`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        project_permission_level: 3,
        nivel_asis: 1,
        nivel_tobe: 3,
        nivel_brechas: 1,
        nivel_roadmap: 1,
      },
    }
  );
  expect(promote.ok()).toBeTruthy();

  const afterPromote = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/restore-version`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { version_number: 1, change_summary: "restore allowed at level 3" },
    }
  );
  expect(afterPromote.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-conceptual-diagram] general comment created on TO-BE conceptual is visible through comments list", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-comment-list`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const content = `comment-${suffix}`;
  const create = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        target_type: "general",
        target_client_id: null,
        content,
      },
    }
  );
  expect(create.ok()).toBeTruthy();

  const list = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(list.ok()).toBeTruthy();
  const payload = await list.json();
  const comments = payload.comments as Array<{ content: string }>;
  expect(comments.some((c) => c.content === content)).toBeTruthy();
});

test("[artifact:tobe-conceptual-diagram] EMPRESA with level 3 cannot approve company review on TO-BE conceptual artifact", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const empresaUser = await createEmpresaUser(request, admin.token, `${suffix}-low-approve`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: empresaUser.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const empresa = await apiLogin(request, {
    email: empresaUser.email,
    password: empresaUser.password,
  });

  const approveRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: { approved: true },
    }
  );
  expect(approveRes.status()).toBe(403);
});

test("[artifact:tobe-conceptual-diagram] non-member cannot mutate TO-BE conceptual artifact (comment, restore, approvals)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const outsider = await createConsultorUser(request, admin.token, `${suffix}-outsider`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  const outsiderSession = await apiLogin(request, {
    email: outsider.email,
    password: outsider.password,
  });

  const commentRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    {
      headers: { Authorization: `Bearer ${outsiderSession.token}` },
      data: { target_type: "general", target_client_id: null, content: `outsider ${suffix}` },
    }
  );
  expect(commentRes.status()).toBe(403);

  const restoreRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/restore-version`,
    {
      headers: { Authorization: `Bearer ${outsiderSession.token}` },
      data: { version_number: 1, change_summary: "outsider restore" },
    }
  );
  expect(restoreRes.status()).toBeGreaterThanOrEqual(400);

  const consultantReviewRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${outsiderSession.token}` },
      data: { approved: true },
    }
  );
  expect(consultantReviewRes.status()).toBe(403);

  const companyReviewRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${outsiderSession.token}` },
      data: { approved: true },
    }
  );
  expect(companyReviewRes.status()).toBe(403);
});

test("[artifact:tobe-conceptual-diagram] invalid conceptual comment payload is rejected with 4xx", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-invalid-comment`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const invalidRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        target_type: "general",
        target_client_id: null,
        content: "",
      },
    }
  );
  expect(invalidRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-conceptual-diagram] artifact override can down-grade TO-BE conceptual from edit to read-only", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-override-down`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const overrideRes = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${consultorUser.id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { permission_level: 1 },
    }
  );
  expect(overrideRes.ok()).toBeTruthy();

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByText(/Solo lectura/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});

test("[artifact:tobe-conceptual-diagram] artifact override can up-grade TO-BE conceptual from read-only to edit", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-override-up`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const overrideRes = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${consultorUser.id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { permission_level: 3 },
    }
  );
  expect(overrideRes.ok()).toBeTruthy();

  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Entidad$/i })).toBeVisible();
});

test("[artifact:tobe-conceptual-diagram] permission change in hot path: edit -> read-only after lowering TO-BE level", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-hotperm`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();

  await setMemberPermissions(request, admin.token, projectId, consultorUser.id, 1);
  await page.reload();
  await expect(page.getByText(/Solo lectura/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});

test("[artifact:tobe-conceptual-diagram] consultant rejection keeps consultant_approved as false on TO-BE conceptual artifact", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-reject-cons`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const rejectRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: false, reason: "reject e2e" },
    }
  );
  expect(rejectRes.ok()).toBeTruthy();

  const projectDetail = await request.get(`${API_BASE}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(projectDetail.ok()).toBeTruthy();
  const payload = await projectDetail.json();
  const artifact = (payload.artifact_items as Array<{
    id: string;
    consultant_approved: boolean;
  }>).find((item) => item.id === artifactId);
  expect(artifact).toBeTruthy();
  expect(artifact!.consultant_approved).toBeFalsy();
});

test("[artifact:tobe-conceptual-diagram] invalid artifact id on TO-BE conceptual model endpoint returns 404/4xx", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-bad-art`);
  const projectId = await createProject(request, admin.token, suffix);

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const invalidRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/00000000-0000-0000-0000-000000000000/conceptual-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(invalidRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-conceptual-diagram] double save submissions on TO-BE conceptual model do not crash and return controlled responses", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-double-save`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const readRes = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(readRes.ok()).toBeTruthy();
  const model = await readRes.json();
  const payload = {
    name: model.name,
    description: model.description ?? "",
    entities: model.entities ?? [],
    relations: model.relations ?? [],
    change_summary: `double-save ${suffix}`,
  };

  const [saveA, saveB] = await Promise.all([
    request.put(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`, {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: payload,
    }),
    request.put(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`, {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: payload,
    }),
  ]);

  expect(saveA.status()).toBeLessThan(500);
  expect(saveB.status()).toBeLessThan(500);
});

test("[artifact:tobe-conceptual-diagram] saving TO-BE conceptual model with invalid entity payload is rejected (4xx)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-invalid-entity`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const invalidSave = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: "Invalid Model",
        description: "",
        entities: [
          {
            id: `ent-invalid-${suffix}`,
            name: "",
            description: "missing name",
            position_x: 10,
            position_y: 10,
            color: "#3B82F6",
            attributes: [],
          },
        ],
        relations: [],
        change_summary: "invalid entity payload",
      },
    }
  );
  expect(invalidSave.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-conceptual-diagram] whitespace-only conceptual comment is rejected", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-blank-comment`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const res = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { target_type: "general", target_client_id: null, content: "    " },
    }
  );
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-conceptual-diagram] expired/invalid session token cannot save TO-BE conceptual model (401/403)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  const saveRes = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: "Bearer invalid.token.value" },
      data: {
        name: "Invalid Token",
        description: "",
        entities: [],
        relations: [],
        change_summary: "invalid token",
      },
    }
  );
  expect(saveRes.status()).toBeGreaterThanOrEqual(401);
});

test("[artifact:tobe-conceptual-diagram] lowering permission after draft edit blocks subsequent save attempt", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-drop-save`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const before = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(before.ok()).toBeTruthy();
  const model = await before.json();

  await setMemberPermissions(request, admin.token, projectId, consultorUser.id, 1);
  const blockedSave = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: model.name,
        description: model.description ?? "",
        entities: model.entities ?? [],
        relations: model.relations ?? [],
        change_summary: "save after permission drop",
      },
    }
  );
  expect(blockedSave.status()).toBe(403);
});

test("[artifact:tobe-conceptual-diagram] double consultant approval submissions remain controlled (no 5xx)", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-double-approve`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const [a, b] = await Promise.all([
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`, {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: true },
    }),
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`, {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: true },
    }),
  ]);
  expect(a.status()).toBeLessThan(500);
  expect(b.status()).toBeLessThan(500);
});

test("[artifact:tobe-conceptual-diagram] restore-version success creates a new version and restores previous snapshot", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-restore-ok`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const saveV2 = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: `TOBE Before Restore ${suffix}`,
        description: `desc-v2-${suffix}`,
        entities: [],
        relations: [],
        change_summary: "v2 baseline",
      },
    }
  );
  expect(saveV2.ok()).toBeTruthy();

  const saveV3 = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: `TOBE Changed ${suffix}`,
        description: `desc-v3-${suffix}`,
        entities: [],
        relations: [],
        change_summary: "v3 changed",
      },
    }
  );
  expect(saveV3.ok()).toBeTruthy();

  const versionsBefore = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/versions`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(versionsBefore.ok()).toBeTruthy();
  const beforePayload = await versionsBefore.json();
  const beforeCount = (beforePayload.versions as Array<{ version_number: number }>).length;

  const restore = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/restore-version`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { source_version_number: 2, change_summary: "restore to v2 snapshot" },
    }
  );
  expect(restore.ok()).toBeTruthy();
  const restoredModel = await restore.json();
  expect(restoredModel.description).toBe(`desc-v2-${suffix}`);

  const versionsAfter = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/versions`,
    { headers: { Authorization: `Bearer ${consultor.token}` } }
  );
  expect(versionsAfter.ok()).toBeTruthy();
  const afterPayload = await versionsAfter.json();
  const afterVersions = afterPayload.versions as Array<{ version_number: number }>;
  expect(afterVersions.length).toBe(beforeCount + 1);
});

test("[artifact:tobe-conceptual-diagram] comment patch/delete permissions: author can manage, non-author is denied", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorAuthor = await createConsultorUser(request, admin.token, `${suffix}-c-author`);
  const consultorOther = await createConsultorUser(request, admin.token, `${suffix}-c-other`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  for (const email of [consultorAuthor.email, consultorOther.email]) {
    await inviteMember(request, admin.token, projectId, {
      email,
      tipo_usuario: "CONSULTOR",
      project_permission_level: 2,
      nivel_tobe: 2,
      nivel_asis: 1,
      nivel_brechas: 1,
      nivel_roadmap: 1,
    });
  }

  const author = await apiLogin(request, {
    email: consultorAuthor.email,
    password: consultorAuthor.password,
  });
  const other = await apiLogin(request, {
    email: consultorOther.email,
    password: consultorOther.password,
  });

  const created = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
    {
      headers: { Authorization: `Bearer ${author.token}` },
      data: {
        target_type: "general",
        target_client_id: null,
        content: `author comment ${suffix}`,
      },
    }
  );
  expect(created.ok()).toBeTruthy();
  const createdPayload = await created.json();
  const commentId = createdPayload.id as string;
  expect(commentId).toBeTruthy();

  const forbiddenPatch = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments/${commentId}`,
    {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { content: "hijack edit attempt" },
    }
  );
  expect(forbiddenPatch.status()).toBe(403);

  const forbiddenDelete = await request.delete(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments/${commentId}`,
    { headers: { Authorization: `Bearer ${other.token}` } }
  );
  expect(forbiddenDelete.status()).toBe(403);

  const ownerPatch = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments/${commentId}`,
    {
      headers: { Authorization: `Bearer ${author.token}` },
      data: { content: `owner edited ${suffix}`, status: "resolved" },
    }
  );
  expect(ownerPatch.ok()).toBeTruthy();
  const patchedPayload = await ownerPatch.json();
  expect(patchedPayload.content).toContain(`owner edited ${suffix}`);
  expect(patchedPayload.status).toBe("resolved");

  const ownerDelete = await request.delete(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments/${commentId}`,
    { headers: { Authorization: `Bearer ${author.token}` } }
  );
  expect(ownerDelete.status()).toBe(204);
});

test("UI end-to-end: consultor adds entity and save persists after reload on TO-BE conceptual", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-ui-persist`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  await page.getByRole("button", { name: /^Entidad$/i }).click();
  await page.getByRole("button", { name: /^Guardar$/i }).first().click();

  await page.reload();
  await expect(page.getByText(/1 entidad(?:es)?/i)).toBeVisible();
});

test("conceptual save rejects oversized fields for entity/relation descriptions", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-oversized`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const longText = "x".repeat(20000);
  const res = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: `TOBE Oversized ${suffix}`,
        description: "",
        entities: [
          {
            id: `ent-${suffix}`,
            name: "EntidadLarga",
            description: longText,
            position_x: 100,
            position_y: 100,
            color: "#2563EB",
            attributes: [],
          },
        ],
        relations: [
          {
            id: `rel-${suffix}`,
            name: "RelacionLarga",
            source_entity_id: `ent-${suffix}`,
            target_entity_id: `ent-${suffix}`,
            cardinality: "1:1",
            description: longText,
            fk_attribute_id: null,
          },
        ],
        change_summary: "oversized field validation",
      },
    }
  );
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test("double submissions for conceptual comments and restore stay controlled (no 5xx)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorUser = await createConsultorUser(request, admin.token, `${suffix}-double-ops`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultorUser.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, {
    email: consultorUser.email,
    password: consultorUser.password,
  });

  const seedSave = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        name: `TOBE Seed ${suffix}`,
        description: "seed",
        entities: [
          {
            id: `ent-${suffix}`,
            name: "EntidadSeed",
            description: "",
            position_x: 100,
            position_y: 100,
            color: "#0EA5E9",
            attributes: [],
          },
        ],
        relations: [],
        change_summary: "seed",
      },
    }
  );
  expect(seedSave.ok()).toBeTruthy();

  const [c1, c2] = await Promise.all([
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`, {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        target_type: "entity",
        target_client_id: `ent-${suffix}`,
        content: "double comment A",
      },
    }),
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`, {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: {
        target_type: "entity",
        target_client_id: `ent-${suffix}`,
        content: "double comment B",
      },
    }),
  ]);
  expect(c1.status()).toBeLessThan(500);
  expect(c2.status()).toBeLessThan(500);

  const [r1, r2] = await Promise.all([
    request.post(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/restore-version`,
      {
        headers: { Authorization: `Bearer ${consultor.token}` },
        data: { source_version_number: 1, change_summary: "restore-a" },
      }
    ),
    request.post(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/restore-version`,
      {
        headers: { Authorization: `Bearer ${consultor.token}` },
        data: { source_version_number: 1, change_summary: "restore-b" },
      }
    ),
  ]);
  expect(r1.status()).toBeLessThan(500);
  expect(r2.status()).toBeLessThan(500);
});

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

async function createProject(request: Parameters<typeof test>[0]["request"], token: string, suffix: string) {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `E2E Project User Artifacts ${suffix}`,
      description: "Membership + permissions + artifacts",
      client_company_name: "E2E Corp",
      client_company_email: `qa-project-user+${suffix}@example.com`,
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
) {
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
  const payload = await res.json();
  return payload.member as { user_id: string; email: string };
}

test("membership: non-member cannot access project detail (API 403 + UI shows not found)", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  // API: not a member -> 403
  const apiRes = await request.get(`${API_BASE}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
  });
  expect(apiRes.status()).toBe(403);

  // UI: consultor tries to open project -> shows error state
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}`);
  await expect(page.getByText(/Proyecto no encontrado/i)).toBeVisible();
});

test("permission fallback: project_permission_level grants edit when block level is null", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );

  // Set only project_permission_level=3 (EDITAR). Do not include nivel_asis so it stays NULL in DB.
  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
  });

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  // Should allow editing (Guardar visible) because effective_permission_level should be 3 via fallback.
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();
});

test("block vs project: AS-IS override allows edit even if project level is read-only; TO-BE remains locked", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);

  const asisArtifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );
  const tobeArtifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_CONCEPTUAL_DIAGRAM"
  );

  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_asis: 3,
    nivel_tobe: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  await authenticateByStorage(page, consultor);

  await page.goto(`/consultor/proyectos/${projectId}/entregable/${asisArtifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();

  await page.goto(`/consultor/proyectos/${projectId}/entregable/${tobeArtifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});

test("artifact override can down-grade permissions: block edit but artifact override read-only hides Guardar", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );

  const consultorMember = await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_asis: 3,
  });

  // Down-grade just this artifact to read-only.
  const overrideRes = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${consultorMember.user_id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { permission_level: 1 },
    }
  );
  expect(overrideRes.ok()).toBeTruthy();

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});

test("approval lock: after consultant+company approval, editing logical model is forbidden and UI is read-only", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
  });
  await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 4,
    nivel_tobe: 4,
  });

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  const empresa = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });

  // Approve by consultant (requires APROBAR=4).
  const consultantReview = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { approved: true },
    }
  );
  expect(consultantReview.ok()).toBeTruthy();

  // Approve by company (requires APROBAR=4 and EMPRESA role).
  const companyReview = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: { approved: true },
    }
  );
  expect(companyReview.ok()).toBeTruthy();

  // Now edits must be blocked (logical model service locks when consultant_approved is true).
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

  // UI must be read-only: "Guardar" hidden in logical editor.
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});


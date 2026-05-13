import { expect, test } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";
const CONSULTOR_EMAIL = process.env.E2E_CONSULTOR_EMAIL ?? "consultor@example.com";
const CONSULTOR_PASSWORD = process.env.E2E_CONSULTOR_PASSWORD ?? "Consultor123!";

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

async function authenticateByStorage(
  page: Parameters<typeof test>[0]["page"],
  session: LoginSession
) {
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
): Promise<{ projectId: string }> {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      name: `E2E Permisos UI ${suffix}`,
      description: "E2E permissions UI scenarios",
      client_company_name: "E2E Corp",
      client_company_email: `qa-permisos-ui+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return { projectId: payload.id as string };
}

async function inviteConsultorWithLevels(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  projectId: string,
  levels: { project_permission_level: number; nivel_asis: number }
) {
  const res = await request.post(`${API_BASE}/projects/${projectId}/members/invite`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      email: CONSULTOR_EMAIL,
      tipo_usuario: "CONSULTOR",
      project_permission_level: levels.project_permission_level,
      nivel_asis: levels.nivel_asis,
      nivel_tobe: 0,
      nivel_brechas: 0,
      nivel_roadmap: 0,
    },
  });
  expect(res.ok()).toBeTruthy();
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

test("frontend shows read-only UI when backend effective permission < EDITAR, and enables editing after artifact override", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);

  await inviteConsultorWithLevels(request, admin.token, projectId, {
    project_permission_level: 1,
    nivel_asis: 1,
  });

  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  await authenticateByStorage(page, consultor);

  // Read-only: should render editor but hide "Guardar".
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page).toHaveURL(new RegExp(`/consultor/proyectos/${projectId}/entregable/${artifactId}`));
  // The editor page may render either the full editor header or a fallback title depending on artifact data loading.
  // We just need to ensure we are not bounced to the signin page.
  await expect(page.getByRole("heading", { name: /Iniciar sesión/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);

  // Override permission to EDITAR on this artifact.
  const overrideRes = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${consultor.user.id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { permission_level: 3 },
    }
  );
  expect(overrideRes.ok()).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();
});

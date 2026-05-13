import { expect, test } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";

const CONSULTOR_EMAIL = process.env.E2E_CONSULTOR_EMAIL ?? "consultor@example.com";
const CONSULTOR_PASSWORD = process.env.E2E_CONSULTOR_PASSWORD ?? "Consultor123!";

type LoginSession = {
  token: string;
  user: { id: string; nombre: string; email: string; tipo_usuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA"; estado: string };
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
      name: `E2E Live Perm ${suffix}`,
      description: "Permission changes while editing",
      client_company_name: "E2E Corp",
      client_company_email: `qa-live-perm+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).id as string;
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

async function inviteConsultor(
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
  const payload = await res.json();
  return payload.member as { user_id: string };
}

test("revoking edit permission while user is editing blocks save (403) and UI reloads to read-only", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");

  const consultorMember = await inviteConsultor(request, admin.token, projectId, {
    project_permission_level: 3,
    nivel_asis: 3,
  });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();

  // Make a change so the save is enabled: add an entity.
  await page.getByRole("button", { name: /^Entidad$/i }).click();
  await expect(page.getByText(/Cambios sin guardar/i)).toBeVisible();

  // Admin revokes permissions (down-grade artifact override to read-only).
  const override = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${consultorMember.user_id}`,
    { headers: { Authorization: `Bearer ${admin.token}` }, data: { permission_level: 1 } }
  );
  expect(override.ok()).toBeTruthy();

  // Saving now should trigger an alert and reload into read-only mode.
  const dialogPromise = page.waitForEvent("dialog");
  await page.getByRole("button", { name: /^Guardar$/i }).click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("alert");
  expect(dialog.message()).toMatch(/No tienes permisos/i);
  await dialog.accept();

  // After reload, Guardar disappears.
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});

test("granting edit permission after opening read-only view enables Guardar after reload", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");

  const consultorMember = await inviteConsultor(request, admin.token, projectId, {
    project_permission_level: 1,
    nivel_asis: 1,
  });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);

  // Admin upgrades just this artifact to EDITAR.
  const override = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${consultorMember.user_id}`,
    { headers: { Authorization: `Bearer ${admin.token}` }, data: { permission_level: 3 } }
  );
  expect(override.ok()).toBeTruthy();

  await page.reload();
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();
});

test("removing project membership mid-session denies access after reload (API 403 + UI not found)", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");

  const consultorMember = await inviteConsultor(request, admin.token, projectId, {
    project_permission_level: 3,
    nivel_asis: 3,
  });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();

  const removeRes = await request.delete(`${API_BASE}/projects/${projectId}/members/${consultorMember.user_id}`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(removeRes.ok()).toBeTruthy();

  // After reload the UI should show the same "not found" state used for 403 project access.
  await page.goto(`/consultor/proyectos/${projectId}`);
  await expect(page.getByText(/Proyecto no encontrado/i)).toBeVisible();
});

test("deactivating a user mid-session triggers 401 and redirects to /signin on next protected navigation", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  await authenticateByStorage(page, consultor);

  // Confirm session is valid on a protected page.
  await page.goto(`/consultor/proyectos/${projectId}`);
  await expect(page.getByText(/Proyecto no encontrado/i)).toHaveCount(0);
  await expect.poll(() => page.url()).toContain(`/consultor/proyectos/${projectId}`);

  // Admin deactivates the consultor.
  const deactivateRes = await request.patch(
    `${API_BASE}/users/${consultor.user.id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { estado: "INACTIVO" },
    }
  );
  expect(deactivateRes.ok()).toBeTruthy();

  // Next navigation should hit a 401 and the frontend interceptor must redirect to /signin.
  await page.goto("/consultor/proyectos");
  await expect.poll(() => page.url()).toContain("/signin");

  // Cleanup: reactivate (keeps the shared seeded user usable for other tests).
  const reactivateRes = await request.patch(
    `${API_BASE}/users/${consultor.user.id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { estado: "ACTIVO" },
    }
  );
  expect(reactivateRes.ok()).toBeTruthy();
});

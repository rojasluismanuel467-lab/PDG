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

async function clearSession(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/signin");
  await page.evaluate(() => window.localStorage.clear());
}

async function createProject(request: Parameters<typeof test>[0]["request"], token: string, suffix: string) {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `E2E Approval ${suffix}`,
      description: "Artifact approval + applicability flows",
      client_company_name: "E2E Corp",
      client_company_email: `qa-approval+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return payload.id as string;
}

async function getArtifact(
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
  const artifact = (payload.artifact_items as Array<{ id: string; code: string; name: string; status: string; is_applicable: boolean; last_rejection_reason?: string | null; review_cycles?: number; consultant_approved?: boolean; company_approved?: boolean }>).find(
    (item) => item.code === code
  );
  expect(artifact).toBeTruthy();
  return artifact!;
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

function cardByArtifactName(page: Parameters<typeof test>[0]["page"], artifactName: string) {
  const escaped = artifactName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = page.getByRole("heading", { name: new RegExp(escaped, "i") });
  return page.locator("div.rounded-xl").filter({ has: heading }).first();
}

async function waitForConsultorProjectPage(page: Parameters<typeof test>[0]["page"]) {
  await expect(page.getByRole("heading", { name: /Progreso por etapa/i })).toBeVisible();
}

async function waitForEmpresaProjectPage(page: Parameters<typeof test>[0]["page"]) {
  await expect(page.getByRole("heading", { name: /Diagrama Conceptual AS-IS/i })).toBeVisible();
}

test("approval: consultor approves -> company approves -> artifact becomes approved and editing locks", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  const empresa = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });

  const projectId = await createProject(request, admin.token, suffix);
  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_asis: 4,
  });
  await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 4,
    nivel_asis: 4,
  });

  const artifact = await getArtifact(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");

  // Consultor: move to IN_PROGRESS then approve (UI).
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}`);
  await waitForConsultorProjectPage(page);

  const card = cardByArtifactName(page, "Diagrama Conceptual AS-IS");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /^Iniciar$/i }).click();
  await expect(card.getByRole("button", { name: /^Aprobar$/i })).toBeVisible();

  await card.getByRole("button", { name: /^Aprobar$/i }).click();
  await expect(page.getByRole("heading", { name: /Confirmar aprobación/i })).toBeVisible();
  await page.getByRole("button", { name: /Confirmar aprobación/i }).click();

  await expect(card.getByText(/Aprobado por consultor/i)).toBeVisible();

  // Empresa: must see "Requiere tu aprobación" and can approve (UI).
  await clearSession(page);
  await authenticateByStorage(page, empresa);
  await page.goto(`/empresa/proyectos/${projectId}`);
  await waitForEmpresaProjectPage(page);

  const empresaCard = cardByArtifactName(page, "Diagrama Conceptual AS-IS");
  await expect(empresaCard).toBeVisible();
  await expect(empresaCard.getByText(/Requiere tu aprobación/i)).toBeVisible();

  await empresaCard.getByRole("link", { name: /Revisar y aprobar/i }).click();
  await expect(page.getByRole("heading", { name: /Valoración de la Empresa/i })).toBeVisible();
  await page.getByRole("button", { name: /Aprobar Entregable/i }).click();
  await expect(page.getByText(/Has aprobado este entregable/i)).toBeVisible();

  // Backend: artifact becomes APPROVED.
  const after = await getArtifact(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");
  expect(after.status).toBe("APPROVED");
  expect(after.is_applicable).toBeTruthy();

  // Backend: approved artifacts cannot be modified (e.g., cannot be marked NOT_APPLICABLE).
  const forbiddenUpdate = await request.patch(`${API_BASE}/projects/${projectId}/artifacts/${artifact.id}`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
    data: { is_applicable: false },
  });
  expect(forbiddenUpdate.status()).toBe(403);

  // Consultor editor must be locked (Guardar hidden) after approval.
  await clearSession(page);
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifact.id}`);
  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});

test("rejection: company rejects after consultant approval -> cycles increment + reason shown to consultor", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  const empresa = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });

  const projectId = await createProject(request, admin.token, suffix);
  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_asis: 4,
  });
  await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 4,
    nivel_asis: 4,
  });

  // Consultant approves via API to reduce UI steps here.
  const artifact = await getArtifact(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");
  const startRes = await request.patch(`${API_BASE}/projects/${projectId}/artifacts/${artifact.id}`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
    data: { status: "IN_PROGRESS" },
  });
  expect(startRes.ok()).toBeTruthy();

  const approveRes = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifact.id}/review/consultant`,
    { headers: { Authorization: `Bearer ${consultor.token}` }, data: { approved: true } }
  );
  expect(approveRes.ok()).toBeTruthy();

  // Company rejects via UI (requires PENDING_COMPANY_APPROVAL).
  await authenticateByStorage(page, empresa);
  await page.goto(`/empresa/proyectos/${projectId}/entregable/${artifact.id}`);
  await page.getByRole("button", { name: /^Rechazar$/i }).click();
  await page.getByPlaceholder(/Indica el motivo del rechazo/i).fill("Falta evidencia en el modelo");
  await page.getByRole("button", { name: /Confirmar Rechazo/i }).click();
  await expect(page.getByText(/Has rechazado este entregable/i)).toBeVisible();

  // Backend: approvals cleared, status IN_PROGRESS, reason stored and cycles incremented.
  const after = await getArtifact(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");
  expect(after.status).toBe("IN_PROGRESS");
  expect(after.last_rejection_reason).toBe("Falta evidencia en el modelo");
  expect(after.review_cycles).toBe(1);
  expect(after.consultant_approved).toBeFalsy();
  expect(after.company_approved).toBeFalsy();

  // Consultor sees the rejection reason + cycle banner on the project page.
  await clearSession(page);
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}`);
  await waitForConsultorProjectPage(page);

  const consultorCard = cardByArtifactName(page, "Diagrama Conceptual AS-IS");
  await expect(consultorCard.getByText(/Rechazado por la empresa/i)).toBeVisible();
  await expect(consultorCard.getByText(/ciclo 1/i)).toBeVisible();
  await expect(consultorCard.getByText(/Falta evidencia en el modelo/i)).toBeVisible();
});

test("applicability: marking NOT_APPLICABLE blocks review, and reactivating restores pending", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  const projectId = await createProject(request, admin.token, suffix);
  await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_asis: 4,
  });

  const artifact = await getArtifact(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");

  // Consultor marks as "No aplica" from PENDIENTE (UI).
  await authenticateByStorage(page, consultor);
  await page.goto(`/consultor/proyectos/${projectId}`);
  await waitForConsultorProjectPage(page);

  const card = cardByArtifactName(page, "Diagrama Conceptual AS-IS");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /^No aplica$/i }).click();
  await expect(card.getByRole("button", { name: /^Reactivar$/i })).toBeVisible();

  const afterNoAplica = await getArtifact(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");
  expect(afterNoAplica.status).toBe("NOT_APPLICABLE");
  expect(afterNoAplica.is_applicable).toBeFalsy();

  // Backend must block review endpoints when NOT_APPLICABLE.
  const review = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifact.id}/review/consultant`,
    { headers: { Authorization: `Bearer ${consultor.token}` }, data: { approved: true } }
  );
  expect(review.status()).toBe(403);

  // Reactivate from UI should restore PENDING and allow "Iniciar" again.
  await card.getByRole("button", { name: /^Reactivar$/i }).click();
  await expect(card.getByRole("button", { name: /^Iniciar$/i })).toBeVisible();

  const afterReactivated = await getArtifact(request, admin.token, projectId, "ASIS_CONCEPTUAL_DIAGRAM");
  expect(afterReactivated.status).toBe("PENDING");
  expect(afterReactivated.is_applicable).toBeTruthy();
});

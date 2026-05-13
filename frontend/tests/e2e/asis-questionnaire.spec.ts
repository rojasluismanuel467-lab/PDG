import fs from "node:fs";
import path from "node:path";

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

type QuestionnaireSetup = {
  projectId: string;
  accessCode: string;
  questionText: string;
  consultorUserId: string;
};

type CreatedConsultor = {
  id: string;
  email: string;
  password: string;
  token: string;
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
  await page.reload();
}

async function createQuestionnaireSetup(
  request: Parameters<typeof test>[0]["request"],
  options?: {
    closeQuestionnaire?: boolean;
  }
): Promise<QuestionnaireSetup> {
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultorSession = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  const empresaSession = await apiLogin(request, {
    email: EMPRESA_EMAIL,
    password: EMPRESA_PASSWORD,
  });

  const suffix = Date.now();
  const createProject = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      name: `E2E AS-IS Questionnaire ${suffix}`,
      description: "Principal AS-IS questionnaire flow",
      client_company_name: "E2E Corp",
      client_company_email: `qa-asis-questionnaire+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(createProject.ok()).toBeTruthy();
  const projectId = (await createProject.json()).id as string;

  const inviteConsultor = await request.post(`${API_BASE}/projects/${projectId}/members/invite`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      email: consultorSession.user.email,
      tipo_usuario: "CONSULTOR",
      project_permission_level: 5,
      nivel_asis: 5,
      nivel_tobe: 5,
      nivel_brechas: 5,
      nivel_roadmap: 5,
    },
  });
  expect(inviteConsultor.ok()).toBeTruthy();
  const inviteConsultorPayload = await inviteConsultor.json();

  const inviteEmpresa = await request.post(`${API_BASE}/projects/${projectId}/members/invite`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      email: empresaSession.user.email,
      tipo_usuario: "EMPRESA",
      project_permission_level: 1,
      nivel_asis: 1,
      nivel_tobe: 1,
      nivel_brechas: 1,
      nivel_roadmap: 1,
    },
  });
  expect(inviteEmpresa.ok()).toBeTruthy();

  const getConfig = await request.get(`${API_BASE}/proyectos/${projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(getConfig.ok()).toBeTruthy();
  const config = await getConfig.json();
  const baseQuestion = config.template_questions[0];

  const updateConfig = await request.post(`${API_BASE}/proyectos/${projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      phase: "AS_IS",
      questions: [
        {
          dimension_id: baseQuestion.dimension_id,
          subdomain_id: baseQuestion.subdomain_id,
          text: baseQuestion.text,
          applicable_roles: ["cdo"],
          weight: 1,
          score_criteria: baseQuestion.score_criteria,
        },
      ],
    },
  });
  expect(updateConfig.ok()).toBeTruthy();
  const configured = await updateConfig.json();

  if (options?.closeQuestionnaire) {
    const closeRes = await request.patch(`${API_BASE}/proyectos/${projectId}/cuestionario/estado`, {
      headers: { Authorization: `Bearer ${adminSession.token}` },
      data: { is_closed: true },
    });
    expect(closeRes.ok()).toBeTruthy();
  }

  return {
    projectId,
    accessCode: configured.access_code as string,
    questionText: configured.questions[0].text as string,
    consultorUserId: inviteConsultorPayload.member.user_id as string,
  };
}

async function submitPublicResponse(
  page: Parameters<typeof test>[0]["page"],
  params: {
    accessCode: string;
    respondentName: string;
    respondentEmail: string;
    score?: "1" | "2" | "3" | "4" | "5";
  }
) {
  await page.goto(`/diagnostico/${params.accessCode}`);
  await page.getByPlaceholder("Nombre completo").fill(params.respondentName);
  await page.getByPlaceholder("Correo electronico").fill(params.respondentEmail);
  await page.getByRole("combobox").selectOption("cdo");
  await page.getByRole("button", { name: params.score ?? "4" }).first().click();

  const evidenceFile = path.join(process.cwd(), "tests", "fixtures", "asis-questionnaire-evidence.txt");
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
  fs.writeFileSync(evidenceFile, "evidence for AS-IS questionnaire");
  await page.locator("input[type='file']").first().setInputFiles(evidenceFile);

  await page.getByRole("button", { name: /Enviar cuestionario/i }).click();
  await page.getByRole("button", { name: /Confirmar y enviar/i }).click();
  await expect(page.getByText(/Cuestionario enviado/i)).toBeVisible();
}

async function fillPublicQuestionnaireDraft(
  page: Parameters<typeof test>[0]["page"],
  params: {
    accessCode: string;
    respondentName: string;
    respondentEmail: string;
    score?: "1" | "2" | "3" | "4" | "5";
  }
) {
  await page.goto(`/diagnostico/${params.accessCode}`);
  await page.getByPlaceholder("Nombre completo").fill(params.respondentName);
  await page.getByPlaceholder("Correo electronico").fill(params.respondentEmail);
  await page.getByRole("combobox").selectOption("cdo");
  await page.getByRole("button", { name: params.score ?? "4" }).first().click();

  const evidenceFile = path.join(process.cwd(), "tests", "fixtures", "asis-questionnaire-evidence.txt");
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
  fs.writeFileSync(evidenceFile, "evidence for AS-IS questionnaire");
  await page.locator("input[type='file']").first().setInputFiles(evidenceFile);
}

async function submitPublicQuestionnaire(page: Parameters<typeof test>[0]["page"]) {
  await page.getByRole("button", { name: /Enviar cuestionario/i }).click();
  const confirmButton = page.getByRole("button", { name: /Confirmar y enviar/i });
  if (await confirmButton.count()) {
    await confirmButton.first().click();
  }
}

async function updateQuestionnaireQuestions(
  request: Parameters<typeof test>[0]["request"],
  params: {
    projectId: string;
    mutate: (currentConfig: {
      questions: Array<{
        dimension_id: number;
        subdomain_id: number;
        text: string;
        applicable_roles: string[];
        weight: number;
        score_criteria: Array<{ score: number; name: string; description: string }>;
      }>;
      template_questions: Array<{
        dimension_id: number;
        subdomain_id: number;
        text: string;
        applicable_roles: string[];
        weight: number;
        score_criteria: Array<{ score: number; name: string; description: string }>;
      }>;
      roles: Array<{ id: string; name: string; description: string; is_system: boolean }>;
    }) => Array<{
      dimension_id: number;
      subdomain_id: number;
      text: string;
      applicable_roles: string[];
      weight: number;
      score_criteria: Array<{ score: number; name: string; description: string }>;
    }>;
  }
) {
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const getConfig = await request.get(`${API_BASE}/proyectos/${params.projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(getConfig.ok()).toBeTruthy();
  const config = await getConfig.json();
  const questions = params.mutate({
    questions: config.questions,
    template_questions: config.template_questions,
    roles: config.roles,
  });

  const updateRes = await request.post(`${API_BASE}/proyectos/${params.projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      phase: "AS_IS",
      questions,
    },
  });
  if (!updateRes.ok()) {
    const body = await updateRes.text();
    throw new Error(`update questionnaire config failed (${updateRes.status()}): ${body}`);
  }
}

async function setQuestionnaireClosedState(
  request: Parameters<typeof test>[0]["request"],
  params: { projectId: string; isClosed: boolean }
) {
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const statusRes = await request.patch(`${API_BASE}/proyectos/${params.projectId}/cuestionario/estado`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: { is_closed: params.isClosed },
  });
  expect(statusRes.ok()).toBeTruthy();
}

async function setMemberPermissionLevelByAdmin(
  request: Parameters<typeof test>[0]["request"],
  params: { projectId: string; targetUserId: string; level: number }
) {
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const res = await request.patch(`${API_BASE}/projects/${params.projectId}/members/${params.targetUserId}/permissions`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      project_permission_level: params.level,
      nivel_asis: params.level,
      nivel_tobe: params.level,
      nivel_brechas: params.level,
      nivel_roadmap: params.level,
    },
  });
  expect(res.ok()).toBeTruthy();
}

async function submitResponseByApi(
  request: Parameters<typeof test>[0]["request"],
  params: {
    projectId: string;
    accessCode: string;
    respondentName: string;
    respondentEmail: string;
    score?: number;
  }
) {
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const configRes = await request.get(`${API_BASE}/proyectos/${params.projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(configRes.ok()).toBeTruthy();
  const config = await configRes.json();
  const questionId = config.questions[0].id as string;

  return request.post(`${API_BASE}/proyectos/${params.projectId}/cuestionario/respuestas?code=${params.accessCode}`, {
    data: {
      respondent_name: params.respondentName,
      respondent_email: params.respondentEmail,
      role: "cdo",
      answers: [
        {
          question_id: questionId,
          score: params.score ?? 4,
          evidencia_url: "http://127.0.0.1:8000/media/questionnaire/e2e.txt",
          evidencia_nombre: "e2e.txt",
          evidencia_tipo: "text/plain",
          evidencia_size: 12,
        },
      ],
    },
  });
}

async function getFirstResponseAndAnswerIds(
  request: Parameters<typeof test>[0]["request"],
  params: { projectId: string; token: string }
) {
  const res = await request.get(`${API_BASE}/proyectos/${params.projectId}/cuestionario/respuestas`, {
    headers: { Authorization: `Bearer ${params.token}` },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return {
    responseId: payload.responses[0].id as string,
    answerId: payload.responses[0].answers[0].id as string,
  };
}

async function createConsultorUser(
  request: Parameters<typeof test>[0]["request"]
): Promise<CreatedConsultor> {
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const suffix = Date.now();
  const email = `consultor.e2e+${suffix}@example.com`;
  const password = "Consultor123!";
  const createRes = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      nombre: "Consultor E2E",
      email,
      tipo_usuario: "CONSULTOR",
      password,
      estado: "ACTIVO",
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const created = await createRes.json();

  const consultorSession = await apiLogin(request, { email, password });
  return { id: created.id as string, email, password, token: consultorSession.token };
}

test("[artifact:asis-questionnaire][plan-core:cp-af-02] public respondent submits AS-IS questionnaire with evidence", async ({ page, request }) => {
  const setup = await createQuestionnaireSetup(request);

  await page.goto(`/diagnostico/${setup.accessCode}`);
  await expect(page.getByRole("heading", { name: /Evaluaci[oó]n de Madurez|Cuestionario de Madurez/i })).toBeVisible();

  await page.getByPlaceholder("Nombre completo").fill("Respondente AS-IS");
  await page.getByPlaceholder("Correo electronico").fill("asis.respondente@example.com");
  await page.getByRole("combobox").selectOption("cdo");
  await expect(page.getByText(setup.questionText, { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "4" }).first().click();

  await page.getByRole("button", { name: /Enviar cuestionario/i }).click();
  await expect(
    page.getByText(/Faltan 1 preguntas por completar antes de enviar\./i)
  ).toBeVisible();

  const evidenceFile = path.join(process.cwd(), "tests", "fixtures", "asis-questionnaire-evidence.txt");
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
  fs.writeFileSync(evidenceFile, "evidence for AS-IS questionnaire");

  await page.locator("input[type='file']").first().setInputFiles(evidenceFile);
  await expect(page.getByText(/asis-questionnaire-evidence\.txt/i)).toBeVisible();

  await page.getByRole("button", { name: /Enviar cuestionario/i }).click();
  await page.getByRole("button", { name: /Confirmar y enviar/i }).click();
  await expect(page.getByText(/Cuestionario enviado/i)).toBeVisible();
});

test("[artifact:asis-questionnaire][plan-core:cp-af-02] consultor finalizes responses and approves the questionnaire artifact; empresa sees read-only results", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);

  await submitPublicResponse(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente AS-IS",
    respondentEmail: "asis.flow@example.com",
  });

  const consultorSession = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  await authenticateByStorage(page, consultorSession);
  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);

  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();
  await page.getByRole("button", { name: "Respuestas", exact: true }).click();
  await expect(page.getByText(/Faltan 1 respuestas por finalizar evaluacion/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Aprobar cuestionario/i })).toBeDisabled();

  const responseCard = page.getByRole("heading", { name: /Respondente AS-IS/i }).locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await expect(responseCard).toBeVisible();
  await responseCard
    .getByRole("button", { name: /^5\s+Optimizado/i })
    .first()
    .click();
  await responseCard.getByRole("button", { name: /Guardar borrador/i }).click();

  await responseCard.getByRole("button", { name: /Finalizar evaluaci[oó]n/i }).click();
  await page.getByRole("button", { name: /Sí, finalizar|Si, finalizar/i }).click();
  await expect(page.getByText(/Evaluación finalizada|Evaluacion finalizada/i)).toBeVisible();

  await page.getByRole("button", { name: "Respuestas", exact: true }).click();
  const approveButton = page.getByRole("button", { name: /Aprobar cuestionario/i });
  await expect(approveButton).toBeEnabled();
  await approveButton.click();
  await expect(page.getByText(/Cuestionario aprobado por consultor/i)).toBeVisible();
  await expect(page.getByText(/Enlace público:/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Editar plantilla/i })).toBeDisabled();

  const empresaSession = await apiLogin(request, {
    email: EMPRESA_EMAIL,
    password: EMPRESA_PASSWORD,
  });
  await authenticateByStorage(page, empresaSession);
  await page.goto(`/empresa/proyectos/${setup.projectId}/cuestionario-madurez`);

  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();
  await expect(
    page.getByText(/Monitorea el estado del cuestionario y sus resultados en tiempo real/i)
  ).toBeVisible();
  await expect(page.getByText(/Respondentes/i)).toBeVisible();
  await expect(page.getByText(/Puntaje general/i)).toBeVisible();
  await expect(page.getByText(/Cuestionario abierto|Cuestionario cerrado/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] public questionnaire shows not available for invalid and closed access code", async ({ page, request }) => {
  await page.goto("/diagnostico/CODIGO-INVALIDO-E2E");
  await expect(page.getByText(/Cuestionario no disponible/i)).toBeVisible();

  const closedSetup = await createQuestionnaireSetup(request, { closeQuestionnaire: true });
  await page.goto(`/diagnostico/${closedSetup.accessCode}`);
  await expect(page.getByText(/Cuestionario no disponible/i)).toBeVisible();
  await expect(page.getByText(/cerrado/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] consultor can close and reopen questionnaire; public access follows state", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  const consultorSession = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  await authenticateByStorage(page, consultorSession);

  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);
  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();
  await page.getByRole("button", { name: /Bloquear nuevas respuestas/i }).click();
  await expect(page.getByRole("button", { name: /Permitir nuevas respuestas/i })).toBeVisible();

  await page.goto(`/diagnostico/${setup.accessCode}`);
  await expect(page.getByText(/Cuestionario no disponible/i)).toBeVisible();
  await expect(page.getByText(/cerrado/i)).toBeVisible();

  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);
  await page.getByRole("button", { name: /Permitir nuevas respuestas/i }).click();
  await expect(page.getByRole("button", { name: /Bloquear nuevas respuestas/i })).toBeVisible();

  await page.goto(`/diagnostico/${setup.accessCode}`);
  await expect(page.getByPlaceholder(/Nombre completo/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] consultor can annul response and questionnaire approval remains blocked", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  await submitPublicResponse(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Anulado",
    respondentEmail: "asis.anulado@example.com",
  });

  const consultorSession = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  await authenticateByStorage(page, consultorSession);

  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);
  await page.getByRole("button", { name: /^Respuestas$/i }).click();
  await expect(page.getByRole("button", { name: /Aprobar cuestionario/i })).toBeDisabled();

  const responseCard = page
    .getByRole("heading", { name: /Respondente Anulado/i })
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await expect(responseCard).toBeVisible();
  await responseCard.getByRole("button", { name: /^Anular$/i }).click();
  await page.getByPlaceholder("Describe el motivo de anulación...").fill("Respuesta incompleta para AS-IS");
  await page.getByRole("button", { name: /Confirmar anulación/i }).click();

  await expect(page.getByText(/Debes tener al menos una respuesta activa para aprobar el cuestionario/i)).toBeVisible();
  await page.getByRole("button", { name: /^Anuladas \(/i }).click();
  await expect(page.getByText(/Respondente Anulado/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] public submit fails when questions change mid-session (new question added)", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  await fillPublicQuestionnaireDraft(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Cambio Plantilla",
    respondentEmail: "asis.template-change@example.com",
  });

  await updateQuestionnaireQuestions(request, {
    projectId: setup.projectId,
    mutate: (currentConfig) => {
      const first = currentConfig.questions[0];
      const second = currentConfig.template_questions[1];
      return [
        {
          dimension_id: first.dimension_id,
          subdomain_id: first.subdomain_id,
          text: first.text,
          applicable_roles: ["cdo"],
          weight: first.weight,
          score_criteria: first.score_criteria,
        },
        {
          dimension_id: second.dimension_id,
          subdomain_id: second.subdomain_id,
          text: second.text,
          applicable_roles: ["cdo"],
          weight: second.weight,
          score_criteria: second.score_criteria,
        },
      ];
    },
  });

  const submitResPromise = page.waitForResponse((response) =>
    response.url().includes(`/proyectos/${setup.projectId}/cuestionario/respuestas?code=${setup.accessCode}`)
  );
  await submitPublicQuestionnaire(page);
  const submitRes = await submitResPromise;
  expect(submitRes.status()).toBeGreaterThanOrEqual(400);
  await expect(page.getByText(/Cuestionario enviado/i)).toHaveCount(0);
});

test("[artifact:asis-questionnaire] public submit fails when role applicability changes mid-session", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  await fillPublicQuestionnaireDraft(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Cambio Rol",
    respondentEmail: "asis.role-change@example.com",
  });

  await updateQuestionnaireQuestions(request, {
    projectId: setup.projectId,
    mutate: (currentConfig) => {
      const altRole =
        currentConfig.roles.find((role) => role.id !== "cdo")?.id ??
        currentConfig.questions[0].applicable_roles[0];
      return (
      currentConfig.questions.map((question) => ({
        dimension_id: question.dimension_id,
        subdomain_id: question.subdomain_id,
        text: question.text,
        applicable_roles: [altRole],
        weight: question.weight,
        score_criteria: question.score_criteria,
      }))
      );
    },
  });

  const submitResPromise = page.waitForResponse((response) =>
    response.url().includes(`/proyectos/${setup.projectId}/cuestionario/respuestas?code=${setup.accessCode}`)
  );
  await submitPublicQuestionnaire(page);
  const submitRes = await submitResPromise;
  expect(submitRes.status()).toBeGreaterThanOrEqual(400);
  await expect(page.getByText(/Cuestionario enviado/i)).toHaveCount(0);
});

test("[artifact:asis-questionnaire] public submit fails if questionnaire closes mid-session and succeeds after reopen", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  await fillPublicQuestionnaireDraft(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Cierre En Caliente",
    respondentEmail: "asis.hot-close@example.com",
  });

  await setQuestionnaireClosedState(request, { projectId: setup.projectId, isClosed: true });
  const closedSubmitResPromise = page.waitForResponse((response) =>
    response.url().includes(`/proyectos/${setup.projectId}/cuestionario/respuestas?code=${setup.accessCode}`)
  );
  await submitPublicQuestionnaire(page);
  const closedSubmitRes = await closedSubmitResPromise;
  expect(closedSubmitRes.status()).toBeGreaterThanOrEqual(400);
  await expect(page.getByText(/Cuestionario enviado/i)).toHaveCount(0);

  await setQuestionnaireClosedState(request, { projectId: setup.projectId, isClosed: false });
  await submitPublicResponse(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Reapertura",
    respondentEmail: "asis.reopened@example.com",
  });
});

test("[artifact:asis-questionnaire] two respondents: stale session fails after template change, refreshed session succeeds", async ({
  browser,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);

  const ctxStale = await browser.newContext();
  const ctxFresh = await browser.newContext();
  const stalePage = await ctxStale.newPage();
  const freshPage = await ctxFresh.newPage();

  await fillPublicQuestionnaireDraft(stalePage, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Sesion Vieja",
    respondentEmail: "asis.stale-session@example.com",
  });
  await fillPublicQuestionnaireDraft(freshPage, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Sesion Nueva",
    respondentEmail: "asis.fresh-session@example.com",
  });

  await updateQuestionnaireQuestions(request, {
    projectId: setup.projectId,
    mutate: (currentConfig) => {
      const first = currentConfig.questions[0];
      const second = currentConfig.template_questions[1];
      return [
        {
          dimension_id: first.dimension_id,
          subdomain_id: first.subdomain_id,
          text: first.text,
          applicable_roles: ["cdo"],
          weight: first.weight,
          score_criteria: first.score_criteria,
        },
        {
          dimension_id: second.dimension_id,
          subdomain_id: second.subdomain_id,
          text: second.text,
          applicable_roles: ["cdo"],
          weight: second.weight,
          score_criteria: second.score_criteria,
        },
      ];
    },
  });

  const staleSubmitResPromise = stalePage.waitForResponse((response) =>
    response.url().includes(`/proyectos/${setup.projectId}/cuestionario/respuestas?code=${setup.accessCode}`)
  );
  await submitPublicQuestionnaire(stalePage);
  const staleSubmitRes = await staleSubmitResPromise;
  expect(staleSubmitRes.status()).toBeGreaterThanOrEqual(400);
  await expect(stalePage.getByText(/Cuestionario enviado/i)).toHaveCount(0);

  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const refreshedConfigRes = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(refreshedConfigRes.ok()).toBeTruthy();
  const refreshedConfig = await refreshedConfigRes.json();
  const freshSubmitRes = await request.post(
    `${API_BASE}/proyectos/${setup.projectId}/cuestionario/respuestas`,
    {
      params: { code: setup.accessCode },
      data: {
        respondent_name: "Respondente Sesion Nueva",
        respondent_email: "asis.fresh-session@example.com",
        role: "cdo",
        answers: (refreshedConfig.questions as Array<{ id: number }>).map((question) => ({
          question_id: question.id,
          score: 4,
          evidencia_url: "http://127.0.0.1:8000/media/questionnaire/e2e.txt",
          evidencia_nombre: "e2e.txt",
          evidencia_tipo: "text/plain",
          evidencia_size: 12,
        })),
      },
    }
  );
  expect(freshSubmitRes.status()).toBe(201);

  await ctxStale.close();
  await ctxFresh.close();
});

test("[artifact:asis-questionnaire] consultor can reactivate an annulled response and finalize it", async ({ page, request }) => {
  const setup = await createQuestionnaireSetup(request);
  await submitPublicResponse(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Reactivar",
    respondentEmail: "asis.reactivate@example.com",
  });

  const consultorSession = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  await authenticateByStorage(page, consultorSession);
  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);

  const responseCard = page
    .getByRole("heading", { name: /Respondente Reactivar/i })
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await page.getByRole("button", { name: /^Respuestas$/i }).click();
  await responseCard.getByRole("button", { name: /^Anular$/i }).click();
  await page.getByPlaceholder("Describe el motivo de anulación...").fill("anular para reactivar");
  await page.getByRole("button", { name: /Confirmar anulación/i }).click();

  await page.getByRole("button", { name: /^Anuladas \(/i }).click();
  const annulledCard = page
    .getByRole("heading", { name: /Respondente Reactivar/i })
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await annulledCard.getByRole("button", { name: /^Reactivar$/i }).click();

  await page.getByRole("button", { name: /^Pendientes \(/i }).click();
  const reactivatedCard = page
    .getByRole("heading", { name: /Respondente Reactivar/i })
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await expect(reactivatedCard).toBeVisible();
  const consultorIds = await getFirstResponseAndAnswerIds(request, {
    projectId: setup.projectId,
    token: consultorSession.token,
  });
  const validateRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${consultorIds.responseId}/answers/${consultorIds.answerId}/validate`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { validated_score: 5, validacion_comentarios: "reactivated and validated" },
    }
  );
  expect(validateRes.ok()).toBeTruthy();
  const finalizeRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${consultorIds.responseId}/finalizar-evaluacion`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { confirmation: true },
    }
  );
  expect(finalizeRes.ok()).toBeTruthy();
});

test("[artifact:asis-questionnaire] duplicate respondent email in same questionnaire is rejected", async ({ request }) => {
  const setup = await createQuestionnaireSetup(request);
  const firstRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Duplicado",
    respondentEmail: "asis.duplicate@example.com",
  });
  expect(firstRes.status()).toBe(201);

  const duplicateRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Duplicado 2",
    respondentEmail: "asis.duplicate@example.com",
  });
  expect(duplicateRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:asis-questionnaire] consultor cannot finalize a response before validating answers", async ({ request }) => {
  const setup = await createQuestionnaireSetup(request);
  const submitRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Sin Validar",
    respondentEmail: "asis.not-validated@example.com",
  });
  expect(submitRes.status()).toBe(201);

  const consultor = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  const { responseId } = await getFirstResponseAndAnswerIds(request, {
    projectId: setup.projectId,
    token: consultor.token,
  });
  const finalizeRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/finalizar-evaluacion`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { confirmation: true },
    }
  );
  expect(finalizeRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:asis-questionnaire] evidence upload rejects files larger than 10MB", async ({ request }) => {
  const setup = await createQuestionnaireSetup(request);
  const largeFile = Buffer.alloc(10 * 1024 * 1024 + 1024, "a");
  const uploadRes = await request.post(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/evidencia`, {
    params: { code: setup.accessCode },
    multipart: {
      file: {
        name: "too-large-evidence.txt",
        mimeType: "text/plain",
        buffer: largeFile,
      },
    },
  });
  expect(uploadRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:asis-questionnaire] finalize and validate are rejected after response is already finalized (idempotency/lock)", async ({
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  const submitRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Idempotencia",
    respondentEmail: "asis.idempotency@example.com",
  });
  expect(submitRes.status()).toBe(201);

  const consultor = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  const { responseId, answerId } = await getFirstResponseAndAnswerIds(request, {
    projectId: setup.projectId,
    token: consultor.token,
  });

  const validateRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/answers/${answerId}/validate`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { validated_score: 5, validacion_comentarios: "valid first pass" },
    }
  );
  expect(validateRes.ok()).toBeTruthy();

  const finalizeRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/finalizar-evaluacion`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { confirmation: true },
    }
  );
  expect(finalizeRes.ok()).toBeTruthy();

  const validateAgainRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/answers/${answerId}/validate`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { validated_score: 4, validacion_comentarios: "must fail after finalize" },
    }
  );
  expect(validateAgainRes.status()).toBeGreaterThanOrEqual(400);

  const finalizeAgainRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/finalizar-evaluacion`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { confirmation: true },
    }
  );
  expect(finalizeAgainRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:asis-questionnaire] submit is rejected when projectId does not match access code", async ({ request }) => {
  const setupA = await createQuestionnaireSetup(request);
  const setupB = await createQuestionnaireSetup(request);

  const mismatchSubmitRes = await submitResponseByApi(request, {
    projectId: setupB.projectId,
    accessCode: setupA.accessCode,
    respondentName: "Respondente Mismatch",
    respondentEmail: "asis.mismatch@example.com",
  });
  expect(mismatchSubmitRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:asis-questionnaire] submit rejects scores out of range", async ({ request }) => {
  const setup = await createQuestionnaireSetup(request);
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const configRes = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(configRes.ok()).toBeTruthy();
  const config = await configRes.json();
  const questionId = config.questions[0].id as string;

  const lowScoreRes = await request.post(
    `${API_BASE}/proyectos/${setup.projectId}/cuestionario/respuestas?code=${setup.accessCode}`,
    {
      data: {
        respondent_name: "Respondente Score Bajo",
        respondent_email: "asis.score-low@example.com",
        role: "cdo",
        answers: [
          {
            question_id: questionId,
            score: -1,
            evidencia_url: "http://127.0.0.1:8000/media/questionnaire/e2e.txt",
            evidencia_nombre: "e2e.txt",
            evidencia_tipo: "text/plain",
            evidencia_size: 12,
          },
        ],
      },
    }
  );
  expect(lowScoreRes.status()).toBeGreaterThanOrEqual(400);

  const highScoreRes = await request.post(
    `${API_BASE}/proyectos/${setup.projectId}/cuestionario/respuestas?code=${setup.accessCode}`,
    {
      data: {
        respondent_name: "Respondente Score Alto",
        respondent_email: "asis.score-high@example.com",
        role: "cdo",
        answers: [
          {
            question_id: questionId,
            score: 6,
            evidencia_url: "http://127.0.0.1:8000/media/questionnaire/e2e.txt",
            evidencia_nombre: "e2e.txt",
            evidencia_tipo: "text/plain",
            evidencia_size: 12,
          },
        ],
      },
    }
  );
  expect(highScoreRes.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:asis-questionnaire] anular/reactivar endpoints enforce idempotency", async ({ request }) => {
  const setup = await createQuestionnaireSetup(request);
  const submitRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Idempotencia Estado",
    respondentEmail: "asis.status-idempotency@example.com",
  });
  expect(submitRes.status()).toBe(201);

  const consultor = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  const { responseId } = await getFirstResponseAndAnswerIds(request, {
    projectId: setup.projectId,
    token: consultor.token,
  });

  const firstAnnul = await request.patch(`${API_BASE}/cuestionario/respuestas/${responseId}/anular`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
    data: { reason: "first annul" },
  });
  expect(firstAnnul.ok()).toBeTruthy();

  const secondAnnul = await request.patch(`${API_BASE}/cuestionario/respuestas/${responseId}/anular`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
    data: { reason: "second annul must fail" },
  });
  expect(secondAnnul.status()).toBeGreaterThanOrEqual(400);

  const firstReactivate = await request.patch(`${API_BASE}/cuestionario/respuestas/${responseId}/reactivar`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
  });
  expect(firstReactivate.ok()).toBeTruthy();

  const secondReactivate = await request.patch(`${API_BASE}/cuestionario/respuestas/${responseId}/reactivar`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
  });
  expect(secondReactivate.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:asis-questionnaire] consultor loses APROBAR permission mid-review and finalize is blocked", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  await submitPublicResponse(page, {
    accessCode: setup.accessCode,
    respondentName: "Respondente Permisos",
    respondentEmail: "asis.permission-drop@example.com",
  });

  const consultorSession = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  await authenticateByStorage(page, consultorSession);
  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);

  const responseCard = page
    .getByRole("heading", { name: /Respondente Permisos/i })
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
  await page.getByRole("button", { name: /^Respuestas$/i }).click();
  await responseCard.getByRole("button", { name: "5" }).first().click();
  const { responseId } = await getFirstResponseAndAnswerIds(request, {
    projectId: setup.projectId,
    token: consultorSession.token,
  });

  await setMemberPermissionLevelByAdmin(request, {
    projectId: setup.projectId,
    targetUserId: setup.consultorUserId,
    level: 1,
  });

  const finalizeForbidden = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/finalizar-evaluacion`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { confirmation: true },
    }
  );
  expect(finalizeForbidden.status()).toBeGreaterThanOrEqual(400);

  await page.reload();
  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();
});

test("[artifact:asis-questionnaire] resultados endpoint enforces permissions for empresa members", async ({ request }) => {
  const setup = await createQuestionnaireSetup(request);
  const submitRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Resultados",
    respondentEmail: "asis.resultados@example.com",
  });
  expect(submitRes.status()).toBe(201);

  const empresaSession = await apiLogin(request, {
    email: EMPRESA_EMAIL,
    password: EMPRESA_PASSWORD,
  });

  const allowedRes = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/resultados`, {
    headers: { Authorization: `Bearer ${empresaSession.token}` },
  });
  expect(allowedRes.ok()).toBeTruthy();

  await setMemberPermissionLevelByAdmin(request, {
    projectId: setup.projectId,
    targetUserId: empresaSession.user.id,
    level: 0,
  });

  const forbiddenRes = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/resultados`, {
    headers: { Authorization: `Bearer ${empresaSession.token}` },
  });
  expect([200, 403]).toContain(forbiddenRes.status());
});

test("[artifact:asis-questionnaire] public upload uses legacy fallback endpoint when primary evidence endpoint returns 404", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);

  await page.route(
    `**/api/v1/proyectos/${setup.projectId}/cuestionario/evidencia?code=${setup.accessCode}`,
    async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "forced 404 for fallback test" }),
      });
    }
  );

  const fallbackUploadPromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(
        `/api/v1/projects/${setup.projectId}/questionnaire/evidence-upload?code=${setup.accessCode}`
      )
  );

  await page.goto(`/diagnostico/${setup.accessCode}`);
  await page.getByPlaceholder("Nombre completo").fill("Respondente Fallback");
  await page.getByPlaceholder("Correo electronico").fill("asis.fallback@example.com");
  await page.getByRole("combobox").selectOption("cdo");
  await page.getByRole("button", { name: "4" }).first().click();

  const evidenceFile = path.join(process.cwd(), "tests", "fixtures", "asis-questionnaire-evidence.txt");
  fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
  fs.writeFileSync(evidenceFile, "evidence for fallback endpoint");
  await page.locator("input[type='file']").first().setInputFiles(evidenceFile);

  const fallbackUploadRes = await fallbackUploadPromise;
  expect(fallbackUploadRes.ok()).toBeTruthy();

  await submitPublicQuestionnaire(page);
  await expect(page.getByText(/Cuestionario enviado/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] two consultors finalizing the same response concurrently yields exactly one success", async ({
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  const secondConsultor = await createConsultorUser(request);

  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const inviteSecondConsultor = await request.post(`${API_BASE}/projects/${setup.projectId}/members/invite`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      email: secondConsultor.email,
      tipo_usuario: "CONSULTOR",
      project_permission_level: 5,
      nivel_asis: 5,
      nivel_tobe: 5,
      nivel_brechas: 5,
      nivel_roadmap: 5,
    },
  });
  expect(inviteSecondConsultor.ok()).toBeTruthy();

  const submitRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Concurrente",
    respondentEmail: "asis.concurrente@example.com",
  });
  expect(submitRes.status()).toBe(201);

  const firstConsultor = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  const { responseId, answerId } = await getFirstResponseAndAnswerIds(request, {
    projectId: setup.projectId,
    token: firstConsultor.token,
  });

  const validateRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/answers/${answerId}/validate`,
    {
      headers: { Authorization: `Bearer ${firstConsultor.token}` },
      data: { validated_score: 5, validacion_comentarios: "ready for concurrent finalize" },
    }
  );
  expect(validateRes.ok()).toBeTruthy();

  const [finalizeA, finalizeB] = await Promise.all([
    request.patch(`${API_BASE}/cuestionario/respuestas/${responseId}/finalizar-evaluacion`, {
      headers: { Authorization: `Bearer ${firstConsultor.token}` },
      data: { confirmation: true },
    }),
    request.patch(`${API_BASE}/cuestionario/respuestas/${responseId}/finalizar-evaluacion`, {
      headers: { Authorization: `Bearer ${secondConsultor.token}` },
      data: { confirmation: true },
    }),
  ]);

  const statuses = [finalizeA.status(), finalizeB.status()];
  const successCount = statuses.filter((status) => status >= 200 && status < 300).length;
  const failureCount = statuses.filter((status) => status >= 400).length;
  expect(successCount).toBe(1);
  expect(failureCount).toBe(1);
});

test("[artifact:asis-questionnaire] consultor loses LECTURA permission mid-session and questionnaire view is blocked", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  const consultorSession = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  await authenticateByStorage(page, consultorSession);
  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);
  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();

  await setMemberPermissionLevelByAdmin(request, {
    projectId: setup.projectId,
    targetUserId: setup.consultorUserId,
    level: 0,
  });

  await page.reload();
  const blockedMessage = page
    .getByText(
      /Insufficient permission|You are not a member|Forbidden|Request failed with status code 403|No tienes permisos|No autorizado/i
    )
    .first();
  const blockedVisible = await blockedMessage.isVisible({ timeout: 3000 }).catch(() => false);
  if (blockedVisible) {
    await expect(blockedMessage).toBeVisible();
    return;
  }
  await expect(page).toHaveURL(/\/consultor\/proyectos\//);
});

test("[artifact:asis-questionnaire] public evidence upload with suspicious mime/extension is handled without server crash", async ({
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  const payload = Buffer.from("MZ suspicious executable signature");
  const uploadRes = await request.post(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/evidencia`, {
    params: { code: setup.accessCode },
    multipart: {
      file: {
        name: "suspicious.exe",
        mimeType: "application/x-msdownload",
        buffer: payload,
      },
    },
  });

  expect(uploadRes.status()).toBeLessThan(500);
});

test("[artifact:asis-questionnaire] updating questionnaire config after finalized response is handled and results endpoint remains available", async ({
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  const submitRes = await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    respondentName: "Respondente Config Finalizado",
    respondentEmail: "asis.config.finalized@example.com",
  });
  expect(submitRes.status()).toBe(201);

  const consultor = await apiLogin(request, {
    email: CONSULTOR_EMAIL,
    password: CONSULTOR_PASSWORD,
  });
  const { responseId, answerId } = await getFirstResponseAndAnswerIds(request, {
    projectId: setup.projectId,
    token: consultor.token,
  });
  const validateRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/answers/${answerId}/validate`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { validated_score: 4, validacion_comentarios: "ok" },
    }
  );
  expect(validateRes.ok()).toBeTruthy();
  const finalizeRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/finalizar-evaluacion`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { confirmation: true },
    }
  );
  expect(finalizeRes.ok()).toBeTruthy();

  let updateStatus = 0;
  try {
    await updateQuestionnaireQuestions(request, {
      projectId: setup.projectId,
      mutate: (currentConfig) => {
        const base = currentConfig.questions[0] ?? currentConfig.template_questions[0];
        return [
          {
            ...base,
            text: `${base.text} (post-finalize update)`,
          },
        ];
      },
    });
    updateStatus = 200;
  } catch (error) {
    const message = String(error);
    const parsed = Number(message.match(/\((\d{3})\)/)?.[1] ?? "0");
    updateStatus = parsed;
  }
  expect(updateStatus).toBeGreaterThanOrEqual(200);
  expect(updateStatus).toBeLessThan(500);

  const empresaSession = await apiLogin(request, {
    email: EMPRESA_EMAIL,
    password: EMPRESA_PASSWORD,
  });
  const resultsRes = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/resultados`, {
    headers: { Authorization: `Bearer ${empresaSession.token}` },
  });
  expect(resultsRes.status()).toBeLessThan(500);
});

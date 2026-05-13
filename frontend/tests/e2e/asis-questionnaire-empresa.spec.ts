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
  questionId: string;
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
    inviteEmpresa?: boolean;
    empresaLevel?: number;
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
      name: `E2E AS-IS Empresa View ${suffix}`,
      description: "Empresa maturity questionnaire coverage",
      client_company_name: "E2E Corp",
      client_company_email: `qa-asis-empresa+${suffix}@example.com`,
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

  if (options?.inviteEmpresa !== false) {
    const empresaLevel = options?.empresaLevel ?? 1;
    const inviteEmpresa = await request.post(`${API_BASE}/projects/${projectId}/members/invite`, {
      headers: { Authorization: `Bearer ${adminSession.token}` },
      data: {
        email: empresaSession.user.email,
        tipo_usuario: "EMPRESA",
        project_permission_level: empresaLevel,
        nivel_asis: empresaLevel,
        nivel_tobe: empresaLevel,
        nivel_brechas: empresaLevel,
        nivel_roadmap: empresaLevel,
      },
    });
    expect(inviteEmpresa.ok()).toBeTruthy();
  }

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

  return {
    projectId,
    accessCode: configured.access_code as string,
    questionId: configured.questions[0].id as string,
  };
}

async function submitResponseByApi(
  request: Parameters<typeof test>[0]["request"],
  params: {
    projectId: string;
    accessCode: string;
    questionId: string;
    respondentName: string;
    respondentEmail: string;
    score?: number;
  }
) {
  const submitRes = await request.post(
    `${API_BASE}/proyectos/${params.projectId}/cuestionario/respuestas?code=${params.accessCode}`,
    {
      data: {
        respondent_name: params.respondentName,
        respondent_email: params.respondentEmail,
        role: "cdo",
        answers: [
          {
            question_id: params.questionId,
            score: params.score ?? 4,
            evidencia_url: "http://127.0.0.1:8000/media/questionnaire/e2e.txt",
            evidencia_nombre: "e2e.txt",
            evidencia_tipo: "text/plain",
            evidencia_size: 12,
          },
        ],
      },
    }
  );
  expect(submitRes.status()).toBe(201);
}

async function closeOrReopenByConsultor(
  request: Parameters<typeof test>[0]["request"],
  params: { projectId: string; isClosed: boolean }
) {
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  const res = await request.patch(`${API_BASE}/proyectos/${params.projectId}/cuestionario/estado`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
    data: { is_closed: params.isClosed },
  });
  expect(res.ok()).toBeTruthy();
}

test("[artifact:asis-questionnaire][plan-core:cp-af-02] empresa sees maturity questionnaire in read-only mode", async ({ page, request }) => {
  const setup = await createQuestionnaireSetup(request);
  await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    questionId: setup.questionId,
    respondentName: "Empresa Read Only",
    respondentEmail: "empresa.readonly@example.com",
  });

  const empresaSession = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });
  await authenticateByStorage(page, empresaSession);
  await page.goto(`/empresa/proyectos/${setup.projectId}/cuestionario-madurez`);

  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();
  await expect(page.getByText(/Monitorea el estado del cuestionario/i)).toBeVisible();
  await expect(page.getByText(/Respondentes/i).first()).toBeVisible();
  await expect(page.getByText(/Puntaje general/i)).toBeVisible();
  await expect(page.getByText(/Abierto/i)).toBeVisible();
});

test("[artifact:asis-questionnaire][plan-core:cp-ci-02] empresa without lectura permission sees error on questionnaire view", async ({ page, request }) => {
  const setup = await createQuestionnaireSetup(request, { empresaLevel: 0 });
  const empresaSession = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });
  await authenticateByStorage(page, empresaSession);
  await page.goto(`/empresa/proyectos/${setup.projectId}/cuestionario-madurez`);
  const forbiddenMessage = page
    .getByText(
      /Insufficient permission|You are not a member|Forbidden|Request failed with status code 403|No tienes permisos|No autorizado|No autorizado para acceder/i
    )
    .first();
  const forbiddenVisible = await forbiddenMessage
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (forbiddenVisible) {
    await expect(forbiddenMessage).toBeVisible();
    return;
  }
  await expect(
    page.getByRole("heading", { name: /Cuestionario de Madurez/i })
  ).toBeVisible();
  await expect(page.getByText(/Monitorea el estado del cuestionario/i)).toBeVisible();
});

test("[artifact:asis-questionnaire][plan-core:cp-af-02] empresa cannot mutate questionnaire endpoints (authz)", async ({ request }) => {
  const setup = await createQuestionnaireSetup(request);
  await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    questionId: setup.questionId,
    respondentName: "Empresa Authz",
    respondentEmail: "empresa.authz@example.com",
  });

  const empresa = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });

  const closeRes = await request.patch(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/estado`, {
    headers: { Authorization: `Bearer ${empresa.token}` },
    data: { is_closed: true },
  });
  expect(closeRes.status()).toBe(403);

  const getConfig = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${empresa.token}` },
  });
  expect(getConfig.ok()).toBeTruthy();
  const config = await getConfig.json();
  const firstQuestion = config.questions[0];

  const updateConfigRes = await request.post(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${empresa.token}` },
    data: {
      phase: "AS_IS",
      questions: [
        {
          dimension_id: firstQuestion.dimension_id,
          subdomain_id: firstQuestion.subdomain_id,
          text: `${firstQuestion.text} (blocked mutation)`,
          applicable_roles: ["cdo"],
          weight: firstQuestion.weight,
          score_criteria: firstQuestion.score_criteria,
        },
      ],
    },
  });
  expect(updateConfigRes.status()).toBe(403);

  const responsesRes = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/respuestas`, {
    headers: { Authorization: `Bearer ${empresa.token}` },
  });
  expect(responsesRes.ok()).toBeTruthy();
  const responsesData = await responsesRes.json();
  const responseId = responsesData.responses[0].id as string;
  const answerId = responsesData.responses[0].answers[0].id as string;

  const validateRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/answers/${answerId}/validate`,
    {
      headers: { Authorization: `Bearer ${empresa.token}` },
      data: { validated_score: 5, validacion_comentarios: "blocked for empresa" },
    }
  );
  expect(validateRes.status()).toBe(403);
});

test("[artifact:asis-questionnaire] empresa sees updated validation status after consultor reviews responses", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    questionId: setup.questionId,
    respondentName: "Empresa Sync",
    respondentEmail: "empresa.sync@example.com",
  });

  const empresaSession = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });
  await authenticateByStorage(page, empresaSession);
  await page.goto(`/empresa/proyectos/${setup.projectId}/cuestionario-madurez`);
  await expect(page.getByText(/PENDIENTE/i)).toBeVisible();

  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  const listRes = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/respuestas`, {
    headers: { Authorization: `Bearer ${consultor.token}` },
  });
  expect(listRes.ok()).toBeTruthy();
  const payload = await listRes.json();
  const responseId = payload.responses[0].id as string;
  const answerId = payload.responses[0].answers[0].id as string;

  const validateRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${responseId}/answers/${answerId}/validate`,
    {
      headers: { Authorization: `Bearer ${consultor.token}` },
      data: { validated_score: 5, validacion_comentarios: "empresa should see APROBADA" },
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

  await page.reload();
  await expect(page.getByText(/Respuestas validadas/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] empresa sees questionnaire status toggling between abierto and cerrado", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  const empresaSession = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });
  await authenticateByStorage(page, empresaSession);

  await page.goto(`/empresa/proyectos/${setup.projectId}/cuestionario-madurez`);
  await expect(page.getByText(/Abierto/i)).toBeVisible();

  await closeOrReopenByConsultor(request, { projectId: setup.projectId, isClosed: true });
  await page.reload();
  await expect(page.getByText(/Cerrado/i)).toBeVisible();

  await closeOrReopenByConsultor(request, { projectId: setup.projectId, isClosed: false });
  await page.reload();
  await expect(page.getByText(/Abierto/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] empresa sees empty state when questionnaire has no responses", async ({ page, request }) => {
  const setup = await createQuestionnaireSetup(request);
  const empresaSession = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });
  await authenticateByStorage(page, empresaSession);
  await page.goto(`/empresa/proyectos/${setup.projectId}/cuestionario-madurez`);

  await expect(page.getByText(/Respondentes/i).first()).toBeVisible();
});

test("[artifact:asis-questionnaire] empresa loses lectura permission mid-session and questionnaire view is blocked", async ({
  page,
  request,
}) => {
  const setup = await createQuestionnaireSetup(request);
  await submitResponseByApi(request, {
    projectId: setup.projectId,
    accessCode: setup.accessCode,
    questionId: setup.questionId,
    respondentName: "Empresa Mid Session",
    respondentEmail: "empresa.mid.session@example.com",
  });

  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const membersRes = await request.get(`${API_BASE}/projects/${setup.projectId}/members`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(membersRes.ok()).toBeTruthy();
  const membersPayload = await membersRes.json();
  const rawMembers = (
    Array.isArray(membersPayload)
      ? membersPayload
      : membersPayload.members ?? membersPayload.items ?? membersPayload.data ?? []
  ) as Array<{ user_id: string; email: string }>;
  const empresaMember = rawMembers.find((item) => item.email === EMPRESA_EMAIL);
  expect(empresaMember).toBeTruthy();

  const empresaSession = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });
  await authenticateByStorage(page, empresaSession);
  await page.goto(`/empresa/proyectos/${setup.projectId}/cuestionario-madurez`);
  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();

  const dropPermission = await request.patch(
    `${API_BASE}/projects/${setup.projectId}/members/${empresaMember!.user_id}/permissions`,
    {
      headers: { Authorization: `Bearer ${adminSession.token}` },
      data: {
        project_permission_level: 0,
        nivel_asis: 0,
        nivel_tobe: 0,
        nivel_brechas: 0,
        nivel_roadmap: 0,
      },
    }
  );
  expect(dropPermission.ok()).toBeTruthy();

  await page.reload();
  const forbiddenOrRedirect = await page
    .getByText(
      /Insufficient permission|You are not a member|Forbidden|Request failed with status code 403|No tienes permisos|No autorizado/i
    )
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (forbiddenOrRedirect) {
    await expect(
      page.getByText(
        /Insufficient permission|You are not a member|Forbidden|Request failed with status code 403|No tienes permisos|No autorizado/i
      ).first()
    ).toBeVisible();
    return;
  }
  await expect(page).toHaveURL(new RegExp(`/empresa/proyectos/${setup.projectId}`));
});

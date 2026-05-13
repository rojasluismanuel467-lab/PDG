import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";
const E2E_CONSULTOR_EMAIL = process.env.E2E_CONSULTOR_EMAIL ?? "consultor@example.com";
const E2E_CONSULTOR_PASSWORD = process.env.E2E_CONSULTOR_PASSWORD ?? "Consultor123!";

type SetupData = {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    tipo_usuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA";
    estado: string;
  };
  projectId: string;
  accessCode: string;
  questionId: string;
};

async function loginForE2E(
  request: Parameters<typeof test>[0]["request"],
  params: { email: string; password: string }
) {
  const login = await request.post(`${API_BASE}/auth/login`, {
    data: { email: params.email, password: params.password },
  });
  expect(login.ok()).toBeTruthy();
  const loginData = await login.json();
  return {
    token: loginData.tokens.access_token as string,
    user: loginData.user as SetupData["user"],
  };
}

async function buildQuestionnaire(
  request: Parameters<typeof test>[0]["request"],
  options?: {
    responses?: Array<{ name: string; email: string; score: number }>;
    closeQuestionnaire?: boolean;
  }
): Promise<SetupData> {
  const adminSession = await loginForE2E(request, {
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
  });
  const suffix = Date.now();
  const createProject = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      name: `E2E Questionnaire ${suffix}`,
      description: "E2E frontend questionnaire test",
      client_company_name: "E2E Corp",
      client_company_email: `qa+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(createProject.ok()).toBeTruthy();
  const projectData = await createProject.json();
  const projectId = projectData.id as string;

  const inviteConsultor = await request.post(`${API_BASE}/projects/${projectId}/members/invite`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      email: E2E_CONSULTOR_EMAIL,
      tipo_usuario: "CONSULTOR",
      project_permission_level: 5,
      nivel_asis: 5,
      nivel_tobe: 5,
      nivel_brechas: 5,
      nivel_roadmap: 5,
    },
  });
  expect(inviteConsultor.ok()).toBeTruthy();

  const getConfig = await request.get(`${API_BASE}/proyectos/${projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(getConfig.ok()).toBeTruthy();
  const config = await getConfig.json();
  const firstQuestion = config.template_questions[0];

  const updateConfig = await request.post(`${API_BASE}/proyectos/${projectId}/cuestionario/config`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      phase: "AS_IS",
      questions: [
        {
          dimension_id: firstQuestion.dimension_id,
          subdomain_id: firstQuestion.subdomain_id,
          text: firstQuestion.text,
          applicable_roles: ["cdo"],
          weight: 1,
          score_criteria: firstQuestion.score_criteria,
        },
      ],
    },
  });
  expect(updateConfig.ok()).toBeTruthy();
  const configured = await updateConfig.json();
  const accessCode = configured.access_code as string;
  const questionId = configured.questions[0].id as string;

  for (const item of options?.responses ?? []) {
    const submitResponse = await request.post(
      `${API_BASE}/proyectos/${projectId}/cuestionario/respuestas?code=${accessCode}`,
      {
        data: {
          respondent_name: item.name,
          respondent_email: item.email,
          role: "cdo",
          answers: [
            {
              question_id: questionId,
              score: item.score,
              evidencia_url: "http://127.0.0.1:8000/media/questionnaire/e2e.txt",
              evidencia_nombre: "e2e.txt",
              evidencia_tipo: "text/plain",
              evidencia_size: 12,
            },
          ],
        },
      }
    );
    expect(submitResponse.status()).toBe(201);
  }

  if (options?.closeQuestionnaire) {
    const closeRes = await request.patch(`${API_BASE}/proyectos/${projectId}/cuestionario/estado`, {
      headers: { Authorization: `Bearer ${adminSession.token}` },
      data: { is_closed: true },
    });
    expect(closeRes.ok()).toBeTruthy();
  }

  const consultorSession = await loginForE2E(request, {
    email: E2E_CONSULTOR_EMAIL,
    password: E2E_CONSULTOR_PASSWORD,
  });

  return {
    token: consultorSession.token,
    user: consultorSession.user,
    projectId,
    accessCode,
    questionId,
  };
}

async function authenticateConsultor(page: Parameters<typeof test>[0]["page"], setup: SetupData) {
  const authUser = {
    id: setup.user.id,
    nombre: setup.user.nombre,
    email: setup.user.email,
    perfil: setup.user.tipo_usuario === "ADMINISTRADOR" ? "ADMIN" : setup.user.tipo_usuario,
    avatar: null,
    estado: setup.user.estado,
  };

  await page.goto("/signin");
  await page.evaluate(([token, user]) => {
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("arqdata_auth_user", user);
  }, [setup.token, JSON.stringify(authUser)]);
  await page.reload();
}

async function submitPublicQuestionnaire(page: Parameters<typeof test>[0]["page"]) {
  await page.getByRole("button", { name: /Enviar cuestionario/i }).click();
  const confirmButton = page.getByRole("button", { name: /Confirmar y enviar/i });
  if (await confirmButton.count()) {
    await confirmButton.first().click();
  }
}

test("[artifact:asis-questionnaire] consultor sees domains-only radar and can draft/finalize evaluation with confirm modal", async ({ page, request }) => {
  const setup = await buildQuestionnaire(request, {
    responses: [{ name: "Respondente E2E", email: `respondente+${Date.now()}@example.com`, score: 4 }],
  });
  await authenticateConsultor(page, setup);

  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);
  await expect(page.getByRole("heading", { name: /Cuestionario de Madurez/i })).toBeVisible();
  await page.getByRole("button", { name: /^Respuestas$/i }).click();
  await expect(page.getByText("Subdominios (promedio)")).toHaveCount(0);

  await page.getByRole("button", { name: "4" }).first().click();
  await page.getByRole("button", { name: /Guardar borrador/i }).first().click();

  const finalizeButton = page.getByRole("button", { name: /Finalizar evaluacion|Finalizar evaluación/i }).first();
  await finalizeButton.click();
  await page.getByRole("button", { name: /Cancelar/i }).click();
  await expect(finalizeButton).toBeVisible();

  await finalizeButton.click();
  await page.getByRole("button", { name: /Si, finalizar|Sí, finalizar/i }).click();
  await expect(page.getByText(/Evaluacion finalizada|Evaluación finalizada/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] respondent flow enforces evidence upload and submits questionnaire", async ({ page, request }) => {
  const setup = await buildQuestionnaire(request);
  await page.goto(`/diagnostico/${setup.accessCode}`);

  await page.getByPlaceholder("Nombre completo").fill("Tester E2E");
  await page.getByPlaceholder("Correo electronico").fill("tester.e2e@example.com");
  await page.getByRole("combobox").selectOption("cdo");
  await page.getByRole("button", { name: "4" }).first().click();
  await submitPublicQuestionnaire(page);
  await expect(page.getByText(/Evidencia requerida|Falta evidencia/i).first()).toBeVisible();

  const filePath = path.join(process.cwd(), "tests", "fixtures", "e2e-evidence.txt");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "e2e evidence");
  await page.locator("input[type='file']").first().setInputFiles(filePath);
  await expect(page.getByText(/e2e-evidence\.txt/i)).toBeVisible();

  await submitPublicQuestionnaire(page);
  await expect(page.getByText(/Cuestionario enviado/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] consultor filters responses by status and search criteria", async ({ page, request }) => {
  const suffix = Date.now();
  const setup = await buildQuestionnaire(request, {
    responses: [
      { name: "Filtro Anulado", email: `filtro-anulado-${suffix}@example.com`, score: 2 },
      { name: "Filtro Finalizado", email: `filtro-finalizado-${suffix}@example.com`, score: 5 },
    ],
  });

  const listResponse = await request.get(`${API_BASE}/proyectos/${setup.projectId}/cuestionario/respuestas`, {
    headers: { Authorization: `Bearer ${setup.token}` },
  });
  expect(listResponse.ok()).toBeTruthy();
  const listData = await listResponse.json();
  const anulled = listData.responses.find((item: { respondent_email: string }) =>
    item.respondent_email.includes("filtro-anulado-")
  );
  const finalized = listData.responses.find((item: { respondent_email: string }) =>
    item.respondent_email.includes("filtro-finalizado-")
  );
  expect(anulled).toBeTruthy();
  expect(finalized).toBeTruthy();

  const validateRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${finalized.id}/answers/${finalized.answers[0].id}/validate`,
    {
      headers: { Authorization: `Bearer ${setup.token}` },
      data: { validated_score: 5, validacion_comentarios: "ok" },
    }
  );
  expect(validateRes.ok()).toBeTruthy();

  const finalizeRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${finalized.id}/finalizar-evaluacion`,
    {
      headers: { Authorization: `Bearer ${setup.token}` },
      data: { confirmation: true },
    }
  );
  expect(finalizeRes.ok()).toBeTruthy();

  const anularRes = await request.patch(
    `${API_BASE}/cuestionario/respuestas/${anulled.id}/anular`,
    {
      headers: { Authorization: `Bearer ${setup.token}` },
      data: { reason: "Test e2e anulado" },
    }
  );
  expect(anularRes.ok()).toBeTruthy();

  await authenticateConsultor(page, setup);
  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);
  await page.getByRole("button", { name: /^Respuestas$/i }).click();

  await page.getByRole("button", { name: /^Finalizadas \(/i }).click();
  await expect(page.getByText("Filtro Finalizado")).toBeVisible();
  await expect(page.getByText("Filtro Anulado")).toHaveCount(0);

  await page.getByRole("button", { name: /^Anuladas \(/i }).click();
  await expect(page.getByText("Filtro Anulado")).toBeVisible();
  await expect(page.getByText("Filtro Finalizado")).toHaveCount(0);

  await page.getByRole("button", { name: /Todos \(/i }).click();
  await page.getByPlaceholder("Buscar por nombre, email o rol...").fill("filtro-finalizado");
  await expect(page.getByText("Filtro Finalizado")).toBeVisible();
  await expect(page.getByText("Filtro Anulado")).toHaveCount(0);
});

test("[artifact:asis-questionnaire] consultor sees empty state when questionnaire has no responses", async ({ page, request }) => {
  const setup = await buildQuestionnaire(request);
  await authenticateConsultor(page, setup);

  await page.goto(`/consultor/proyectos/${setup.projectId}/cuestionario-madurez`);
  await page.getByRole("button", { name: /^Respuestas$/i }).click();
  await expect(page.getByText(/Aun no hay respuestas|Aún no hay respuestas|No hay respuestas/i)).toBeVisible();
});

test("[artifact:asis-questionnaire] public questionnaire shows not available for invalid and closed access code", async ({ page, request }) => {
  await page.goto("/diagnostico/CODIGO-INVALIDO-E2E");
  await expect(page.getByText(/Cuestionario no disponible/i)).toBeVisible();

  const closedSetup = await buildQuestionnaire(request, { closeQuestionnaire: true });
  await page.goto(`/diagnostico/${closedSetup.accessCode}`);
  await expect(page.getByText(/Cuestionario no disponible/i)).toBeVisible();
  await expect(page.getByText(/cerrado/i)).toBeVisible();
});

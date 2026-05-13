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
  artifactId: string;
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

async function buildConceptualArtifact(
  request: Parameters<typeof test>[0]["request"]
): Promise<SetupData> {
  const adminSession = await loginForE2E(request, {
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
  });
  const suffix = Date.now();

  const createProject = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
    data: {
      name: `E2E Conceptual ${suffix}`,
      description: "E2E conceptual diagram flow",
      client_company_name: "E2E Corp",
      client_company_email: `qa-conceptual+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(createProject.ok()).toBeTruthy();
  const project = await createProject.json();
  const projectId = project.id as string;

  // Ensure the consultor can access the project artifacts in UI.
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

  const detail = await request.get(`${API_BASE}/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${adminSession.token}` },
  });
  expect(detail.ok()).toBeTruthy();
  const detailPayload = await detail.json();
  const conceptualArtifact = detailPayload.artifact_items.find(
    (item: { code: string }) => item.code === "ASIS_CONCEPTUAL_DIAGRAM"
  );
  expect(conceptualArtifact).toBeTruthy();
  const artifactId = conceptualArtifact.id as string;

  const getModel = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${adminSession.token}` },
    }
  );
  expect(getModel.ok()).toBeTruthy();
  const currentModel = await getModel.json();

  const upsert = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
    {
      headers: { Authorization: `Bearer ${adminSession.token}` },
      data: {
        name: currentModel.name,
        description: currentModel.description ?? "",
        entities: [
          ...currentModel.entities,
          {
            id: `ent-e2e-${suffix}`,
            name: "E2E_Entity",
            description: "Added by e2e",
            position_x: 320,
            position_y: 160,
            color: "#3B82F6",
            attributes: [
              {
                id: `attr-e2e-${suffix}`,
                name: "id",
                data_type: "UUID",
                is_pk: true,
                is_fk: false,
                is_nullable: false,
              },
            ],
          },
        ],
        relations: currentModel.relations,
        change_summary: "E2E version for preview/restore flow",
      },
    }
  );
  expect(upsert.ok()).toBeTruthy();

  const consultorSession = await loginForE2E(request, {
    email: E2E_CONSULTOR_EMAIL,
    password: E2E_CONSULTOR_PASSWORD,
  });
  return {
    token: consultorSession.token,
    user: consultorSession.user,
    projectId,
    artifactId,
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
  await page.evaluate(
    ([token, user]) => {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("arqdata_auth_user", user);
    },
    [setup.token, JSON.stringify(authUser)]
  );
  await page.reload();
}

test("consultor can preview and restore conceptual model version with confirmation modal", async ({
  page,
  request,
}) => {
  const setup = await buildConceptualArtifact(request);
  await authenticateConsultor(page, setup);

  await page.goto(`/consultor/proyectos/${setup.projectId}/entregable/${setup.artifactId}`);
  await expect(page.getByText(/Diagrama Conceptual AS-IS|Diagrama Conceptual TO-BE/i)).toBeVisible();

  await page.getByRole("button", { name: /^v\d+$/ }).first().click();
  await page.getByRole("button", { name: /Previsualizar/i }).first().click();

  await expect(page.getByText(/Vista previa de versi/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Restaurar versi/i })).toBeVisible();

  await page.getByRole("button", { name: /Restaurar versi/i }).first().click();
  await expect(page.getByText(/Confirmar restauraci/i)).toBeVisible();
  await page.getByRole("button", { name: /Cancelar/i }).click();
  await expect(page.getByText(/Confirmar restauraci/i)).toHaveCount(0);
});

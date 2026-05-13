import { expect, test } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";

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
    perfil:
      session.user.tipo_usuario === "ADMINISTRADOR"
        ? "ADMIN"
        : session.user.tipo_usuario,
    avatar: null,
    estado: session.user.estado,
  };
  await page.goto("/signin");
  await page.evaluate(
    ([token, user]) => {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem("arqdata_auth_user", user);
    },
    [session.token, JSON.stringify(authUser)]
  );
}

async function createProject(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  suffix: string
): Promise<string> {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      name: `E2E TOBE Logical ${suffix}`,
      description: "TO-BE logical data model tests",
      client_company_name: "E2E Corp",
      client_company_email: `qa-tobe-logical+${suffix}@example.com`,
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
  const email = `consultor.logical.e2e+${suffix}@example.com`;
  const password = "Consultor123!";
  const res = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      nombre: `Consultor Logical ${suffix}`,
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
  const email = `empresa.logical.e2e+${suffix}@example.com`;
  const password = "Empresa123!";
  const res = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      nombre: `Empresa Logical ${suffix}`,
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

function makePayload(suffix: string, description: string) {
  return {
    nombre: `Logical TOBE ${suffix}`,
    descripcion: description,
    tablas: [
      {
        id: `tbl_${suffix}`,
        nombre: `orders_${suffix}`,
        esquema: "public",
        descripcion: "orders table",
        columnas: [
          {
            id: `col_${suffix}`,
            nombre: "id",
            tipo_dato: "uuid",
            descripcion: "pk",
            es_pk: true,
            es_fk: false,
            es_nullable: false,
            es_unique: true,
            orden: 0,
          },
        ],
        indices: [],
        constraints: [],
      },
    ],
    sql_ddl: "",
    notas_markdown: "",
    change_summary: `logical update ${suffix}`,
  };
}

test("[artifact:tobe-logical-data-model] consultor with TO-BE edit permission can open logical model and sees edit controls", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-ui-edit`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });
  await authenticateByStorage(page, consultorSession);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  await expect(page.getByRole("button", { name: /^Guardar$/i })).toBeVisible();
});

test("[artifact:tobe-logical-data-model] consultor with TO-BE read-only permission cannot save logical model", async ({ page, request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-ui-read`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });
  await authenticateByStorage(page, consultorSession);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  await expect(page.getByRole("button", { name: /^Guardar$/i })).toHaveCount(0);
});

test("[artifact:tobe-logical-data-model] empresa with read-only TO-BE permission cannot edit logical model", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const empresa = await createEmpresaUser(request, admin.token, `${suffix}-empresa-edit`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: empresa.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const empresaSession = await apiLogin(request, {
    email: empresa.email,
    password: empresa.password,
  });

  const payload = makePayload(`${suffix}_emp`, "empresa read-only should not edit");
  const write = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${empresaSession.token}` },
      data: payload,
    }
  );
  expect(write.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] non-member cannot access TO-BE logical model endpoints", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const outsider = await createConsultorUser(request, admin.token, `${suffix}-outsider`);
  const member = await createConsultorUser(request, admin.token, `${suffix}-member`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: member.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const outsiderSession = await apiLogin(request, {
    email: outsider.email,
    password: outsider.password,
  });

  const endpoints = [
    request.get(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`, {
      headers: { Authorization: `Bearer ${outsiderSession.token}` },
    }),
    request.get(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions`,
      { headers: { Authorization: `Bearer ${outsiderSession.token}` } }
    ),
    request.post(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
      {
        headers: { Authorization: `Bearer ${outsiderSession.token}` },
        data: { target_type: "tabla", target_client_id: "x1", content: "no member" },
      }
    ),
  ];

  const [readRes, versionsRes, commentRes] = await Promise.all(endpoints);
  expect(readRes.status()).toBe(403);
  expect(versionsRes.status()).toBe(403);
  expect(commentRes.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] logical comments require COMENTAR(2): level 1 denied, level 2 allowed", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-comments`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const payload = makePayload(`${suffix}_comment`, "for comments");
  const save = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: payload,
    }
  );
  expect(save.ok()).toBeTruthy();

  const denied = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        target_type: "tabla",
        target_client_id: `tbl_${suffix}_comment`,
        content: "should fail at level 1",
      },
    }
  );
  expect(denied.status()).toBe(403);

  await setMemberPermissions(request, admin.token, projectId, consultor.id, 2);

  const allowed = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        target_type: "tabla",
        target_client_id: `tbl_${suffix}_comment`,
        content: "allowed at level 2",
      },
    }
  );
  expect(allowed.ok()).toBeTruthy();
});

test("[artifact:tobe-logical-data-model] logical comment with unknown target is rejected (user mistake flow)", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-bad-target`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const badComment = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        target_type: "tabla",
        target_client_id: "tabla_que_no_existe",
        content: "comment to missing table",
      },
    }
  );
  expect(badComment.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] restore-version success restores previous logical snapshot and creates new version", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-restore-ok`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const p1 = makePayload(`${suffix}_v2`, "desc version 2");
  const v2 = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: p1,
    }
  );
  expect(v2.ok()).toBeTruthy();

  const p2 = makePayload(`${suffix}_v3`, "desc version 3");
  const v3 = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: p2,
    }
  );
  expect(v3.ok()).toBeTruthy();

  const beforeVersions = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(beforeVersions.ok()).toBeTruthy();
  const beforePayload = await beforeVersions.json();
  const beforeCount = (beforePayload.versions as Array<unknown>).length;

  const restore = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/restore`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { source_version_number: 2, change_summary: "restore to v2" },
    }
  );
  expect(restore.ok()).toBeTruthy();
  const restored = await restore.json();
  expect(restored.descripcion).toBe("desc version 2");

  const afterVersions = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(afterVersions.ok()).toBeTruthy();
  const afterPayload = await afterVersions.json();
  expect((afterPayload.versions as Array<unknown>).length).toBe(beforeCount + 1);
});

test("[artifact:tobe-logical-data-model] logical model becomes read-only for edit and comments after consultant approval", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-approved-lock`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const save = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: makePayload(`${suffix}_lock`, "before approve"),
    }
  );
  expect(save.ok()).toBeTruthy();

  const approve = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { approved: true },
    }
  );
  expect(approve.ok()).toBeTruthy();

  const blockedSave = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: makePayload(`${suffix}_lock2`, "after approve should block"),
    }
  );
  expect(blockedSave.status()).toBe(403);

  const blockedComment = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        target_type: "tabla",
        target_client_id: `tbl_${suffix}_lock`,
        content: "comment after approval",
      },
    }
  );
  expect(blockedComment.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] artifact override can downgrade TO-BE logical model from edit to read-only", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-override`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const memberRes = await request.get(`${API_BASE}/projects/${projectId}/members`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(memberRes.ok()).toBeTruthy();
  const memberPayload = await memberRes.json();
  const rawMembers = (
    Array.isArray(memberPayload)
      ? memberPayload
      : memberPayload.members ?? memberPayload.items ?? memberPayload.data ?? []
  ) as Array<{ user_id: string; email: string }>;
  const member = rawMembers.find((item) => item.email === consultor.email);
  expect(member).toBeTruthy();

  const override = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${member!.user_id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { permission_level: 1 },
    }
  );
  expect(override.ok()).toBeTruthy();

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const blockedSave = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: makePayload(`${suffix}_override`, "should be blocked by override"),
    }
  );
  expect(blockedSave.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] invalid logical payload is rejected (empty table name)", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-invalid`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const invalid = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        nombre: "Logical Invalid",
        descripcion: "bad payload",
        tablas: [
          {
            id: `tbl_${suffix}`,
            nombre: "",
            esquema: "public",
            descripcion: "",
            columnas: [],
            indices: [],
            constraints: [],
          },
        ],
        sql_ddl: "",
        notas_markdown: "",
      },
    }
  );

  expect(invalid.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] preview version returns snapshot for member with read access", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-preview-ok`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const save = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: makePayload(`${suffix}_preview`, "preview snapshot"),
    }
  );
  expect(save.ok()).toBeTruthy();

  const preview = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/2/preview`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(preview.ok()).toBeTruthy();
  const payload = await preview.json();
  expect(payload.source_version_number).toBe(2);
  expect(payload.snapshot.descripcion).toBe("preview snapshot");
});

test("[artifact:tobe-logical-data-model] preview version is denied for non-member", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const member = await createConsultorUser(request, admin.token, `${suffix}-member`);
  const outsider = await createConsultorUser(request, admin.token, `${suffix}-outsider-prev`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: member.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const outsiderSession = await apiLogin(request, {
    email: outsider.email,
    password: outsider.password,
  });

  const preview = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/1/preview`,
    { headers: { Authorization: `Bearer ${outsiderSession.token}` } }
  );
  expect(preview.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] preview and restore with missing source version return controlled 4xx", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-missing-version`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const previewMissing = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/999/preview`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(previewMissing.status()).toBeGreaterThanOrEqual(400);

  const restoreMissing = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/restore`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { source_version_number: 999, change_summary: "restore missing source version" },
    }
  );
  expect(restoreMissing.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] comment on existing column target is accepted", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-col-comment`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const save = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: makePayload(`${suffix}_col`, "column comment setup"),
    }
  );
  expect(save.ok()).toBeTruthy();

  const comment = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        target_type: "columna",
        target_client_id: `col_${suffix}_col`,
        content: "column-level feedback",
      },
    }
  );
  expect(comment.ok()).toBeTruthy();
});

test("[artifact:tobe-logical-data-model] restore is blocked after consultant approval lock", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-restore-lock`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const save = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: makePayload(`${suffix}_lock_restore`, "before lock restore"),
    }
  );
  expect(save.ok()).toBeTruthy();

  const approve = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { approved: true },
    }
  );
  expect(approve.ok()).toBeTruthy();

  const restoreAfterLock = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/restore`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { source_version_number: 1, change_summary: "should be blocked by lock" },
    }
  );
  expect(restoreAfterLock.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] invalid token cannot mutate TO-BE logical model", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  const res = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: "Bearer invalid.token.value" },
      data: makePayload(`${suffix}_badtoken`, "invalid token"),
    }
  );
  expect(res.status()).toBeGreaterThanOrEqual(401);
});

test("[artifact:tobe-logical-data-model] project-artifact boundary blocks logical model access from another project", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-boundary`);
  const projectA = await createProject(request, admin.token, `${suffix}-a`);
  const projectB = await createProject(request, admin.token, `${suffix}-b`);
  const artifactB = await getArtifactIdByCode(
    request,
    admin.token,
    projectB,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectA, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });
  const crossRead = await request.get(
    `${API_BASE}/projects/${projectA}/artifacts/${artifactB}/logical-data-model`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(crossRead.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] consultant review requires APROBAR(4) and EMPRESA cannot call consultant endpoint", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-approve-cons`);
  const empresa = await createEmpresaUser(request, admin.token, `${suffix}-approve-emp`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  await inviteMember(request, admin.token, projectId, {
    email: empresa.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 5,
    nivel_tobe: 5,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });
  const empresaSession = await apiLogin(request, {
    email: empresa.email,
    password: empresa.password,
  });

  const consultorDenied = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { approved: true },
    }
  );
  expect(consultorDenied.status()).toBe(403);

  const empresaDenied = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
    {
      headers: { Authorization: `Bearer ${empresaSession.token}` },
      data: { approved: true },
    }
  );
  expect(empresaDenied.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] company review requires EMPRESA role and APROBAR(4)", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-comp-role`);
  const empresaLow = await createEmpresaUser(request, admin.token, `${suffix}-comp-low`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 5,
    nivel_tobe: 5,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  await inviteMember(request, admin.token, projectId, {
    email: empresaLow.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });
  const empresaLowSession = await apiLogin(request, {
    email: empresaLow.email,
    password: empresaLow.password,
  });

  const denyConsultor = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { approved: true },
    }
  );
  expect(denyConsultor.status()).toBe(403);

  const denyLowEmpresa = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
    {
      headers: { Authorization: `Bearer ${empresaLowSession.token}` },
      data: { approved: true },
    }
  );
  expect(denyLowEmpresa.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] double logical model save submissions expose current concurrency behavior", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-double-save`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const payload = makePayload(`${suffix}_concurrent`, "concurrent save");
  const [a, b] = await Promise.all([
    request.put(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`, {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: payload,
    }),
    request.put(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`, {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: payload,
    }),
  ]);

  const statuses = [a.status(), b.status()];
  expect(statuses.some((status) => status < 500)).toBeTruthy();
  expect(statuses.every((status) => status >= 200 && status < 600)).toBeTruthy();
});

test("[artifact:tobe-logical-data-model] consultor EDITAR(3) can edit all logical model components and read persisted values", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-components-edit`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const payload = {
    nombre: `Logical Full ${suffix}`,
    descripcion: `desc-full-${suffix}`,
    tablas: [
      {
        id: `tbl_a_${suffix}`,
        nombre: `orders_${suffix}`,
        esquema: "public",
        descripcion: "orders",
        columnas: [
          {
            id: `col_a_${suffix}`,
            nombre: "id",
            tipo_dato: "uuid",
            descripcion: "pk",
            es_pk: true,
            es_fk: false,
            es_nullable: false,
            es_unique: true,
            orden: 0,
          },
          {
            id: `col_b_${suffix}`,
            nombre: "customer_id",
            tipo_dato: "uuid",
            descripcion: "fk to customer",
            es_pk: false,
            es_fk: true,
            es_nullable: false,
            es_unique: false,
            orden: 1,
          },
        ],
        indices: [{ name: `idx_orders_customer_${suffix}`, columns: ["customer_id"] }],
        constraints: [{ name: `pk_orders_${suffix}`, type: "PRIMARY KEY", columns: ["id"] }],
      },
    ],
    sql_ddl: `CREATE TABLE orders_${suffix}(id uuid primary key, customer_id uuid not null);`,
    notas_markdown: `# Notas ${suffix}\n- validar integridad`,
    change_summary: `full-component-edit-${suffix}`,
  };

  const save = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: payload,
    }
  );
  expect(save.ok()).toBeTruthy();

  const read = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(read.ok()).toBeTruthy();
  const model = await read.json();
  expect(model.nombre).toBe(payload.nombre);
  expect(model.descripcion).toBe(payload.descripcion);
  expect((model.tablas as Array<unknown>).length).toBe(1);
  expect(model.sql_ddl).toContain(`orders_${suffix}`);
  expect(model.notas_markdown).toContain(`Notas ${suffix}`);
});

test("[artifact:tobe-logical-data-model] consultor LECTURA(1) can read components but cannot edit them", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const editor = await createConsultorUser(request, admin.token, `${suffix}-seed-editor`);
  const reader = await createConsultorUser(request, admin.token, `${suffix}-reader`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: editor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  await inviteMember(request, admin.token, projectId, {
    email: reader.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const editorSession = await apiLogin(request, { email: editor.email, password: editor.password });
  const readerSession = await apiLogin(request, { email: reader.email, password: reader.password });

  const seedPayload = makePayload(`${suffix}_seed`, "seed for read-only user");
  const seed = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${editorSession.token}` },
      data: seedPayload,
    }
  );
  expect(seed.ok()).toBeTruthy();

  const read = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    { headers: { Authorization: `Bearer ${readerSession.token}` } }
  );
  expect(read.ok()).toBeTruthy();
  const model = await read.json();
  expect(model.nombre).toBeTruthy();
  expect(Array.isArray(model.tablas)).toBeTruthy();
  expect(typeof model.sql_ddl).toBe("string");
  expect(typeof model.notas_markdown).toBe("string");

  const blockedSave = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${readerSession.token}` },
      data: {
        ...seedPayload,
        descripcion: "reader attempted edit",
      },
    }
  );
  expect(blockedSave.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] TO-BE level 0 still allows base read path for logical model components", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-no-access`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 0,
    nivel_tobe: 0,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const denied = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(denied.status()).toBe(200);
});

test("[artifact:tobe-logical-data-model] empresa LECTURA(1) can read logical model components", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const editor = await createConsultorUser(request, admin.token, `${suffix}-seed-editor-emp`);
  const empresa = await createEmpresaUser(request, admin.token, `${suffix}-emp-reader`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: editor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  await inviteMember(request, admin.token, projectId, {
    email: empresa.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 1,
    nivel_tobe: 1,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const editorSession = await apiLogin(request, { email: editor.email, password: editor.password });
  const empresaSession = await apiLogin(request, {
    email: empresa.email,
    password: empresa.password,
  });

  const seed = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${editorSession.token}` },
      data: makePayload(`${suffix}_empread`, "empresa read verification"),
    }
  );
  expect(seed.ok()).toBeTruthy();

  const read = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    { headers: { Authorization: `Bearer ${empresaSession.token}` } }
  );
  expect(read.ok()).toBeTruthy();
  const model = await read.json();
  expect(model.descripcion).toContain("empresa read verification");
  expect(Array.isArray(model.tablas)).toBeTruthy();
});

test("[artifact:tobe-logical-data-model] comment payload rejects invalid target_type value", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-bad-target-type`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const bad = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        target_type: "general",
        target_client_id: "x1",
        content: "invalid target type",
      },
    }
  );
  expect(bad.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] comment payload rejects too-short content", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-short-comment`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 2,
    nivel_tobe: 2,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const payload = makePayload(`${suffix}_short`, "seed for short comment");
  const save = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: payload,
    }
  );
  expect(save.ok()).toBeTruthy();

  const bad = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        target_type: "tabla",
        target_client_id: `tbl_${suffix}_short`,
        content: "a",
      },
    }
  );
  expect(bad.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] restore payload rejects source_version_number 0", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-restore-zero`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const bad = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/versions/restore`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { source_version_number: 0, change_summary: "invalid zero version" },
    }
  );
  expect(bad.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] comment endpoint rejects expired token for logical model", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  const bad = await request.post(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model/comments`,
    {
      headers: { Authorization: "Bearer invalid.token.value" },
      data: {
        target_type: "tabla",
        target_client_id: "tbl_fake",
        content: "invalid token comment",
      },
    }
  );
  expect(bad.status()).toBeGreaterThanOrEqual(401);
});

test("[artifact:tobe-logical-data-model] artifact override to SIN_ACCESO(0) blocks read and write", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-override-zero`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const membersRes = await request.get(`${API_BASE}/projects/${projectId}/members`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  expect(membersRes.ok()).toBeTruthy();
  const membersPayload = await membersRes.json();
  const rawMembers = (
    Array.isArray(membersPayload)
      ? membersPayload
      : membersPayload.members ?? membersPayload.items ?? membersPayload.data ?? []
  ) as Array<{ user_id: string; email: string }>;
  const member = rawMembers.find((item) => item.email === consultor.email);
  expect(member).toBeTruthy();

  const override = await request.patch(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/permissions/${member!.user_id}`,
    {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { permission_level: 0 },
    }
  );
  expect(override.ok()).toBeTruthy();

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });
  const deniedRead = await request.get(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    { headers: { Authorization: `Bearer ${consultorSession.token}` } }
  );
  expect(deniedRead.status()).toBe(403);

  const deniedSave = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: makePayload(`${suffix}_blocked`, "blocked by override 0"),
    }
  );
  expect(deniedSave.status()).toBe(403);
});

test("[artifact:tobe-logical-data-model] save with duplicated table ids is currently accepted (validation gap)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-dup-table`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const duplicatedTableId = `tbl_dup_${suffix}`;
  const bad = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        nombre: `Logical Dup Table ${suffix}`,
        descripcion: "duplicated table ids",
        tablas: [
          {
            id: duplicatedTableId,
            nombre: `orders_a_${suffix}`,
            esquema: "public",
            descripcion: "",
            columnas: [],
            indices: [],
            constraints: [],
          },
          {
            id: duplicatedTableId,
            nombre: `orders_b_${suffix}`,
            esquema: "public",
            descripcion: "",
            columnas: [],
            indices: [],
            constraints: [],
          },
        ],
        sql_ddl: "",
        notas_markdown: "",
      },
    }
  );
  expect(bad.ok()).toBeTruthy();
  const saved = await bad.json();
  const tableIds = (saved.tablas as Array<{ id: string }>).map((item) => item.id);
  const repeatedCount = tableIds.filter((id) => id === duplicatedTableId).length;
  expect(repeatedCount).toBeGreaterThan(1);
});

test("[artifact:tobe-logical-data-model] save with duplicated column ids is currently accepted (validation gap)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-dup-col`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const duplicatedColumnId = `col_dup_${suffix}`;
  const bad = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        nombre: `Logical Dup Col ${suffix}`,
        descripcion: "duplicated column ids",
        tablas: [
          {
            id: `tbl_${suffix}`,
            nombre: `orders_${suffix}`,
            esquema: "public",
            descripcion: "",
            columnas: [
              {
                id: duplicatedColumnId,
                nombre: "id_a",
                tipo_dato: "uuid",
                descripcion: "",
                es_pk: false,
                es_fk: false,
                es_nullable: true,
                es_unique: false,
                orden: 0,
              },
              {
                id: duplicatedColumnId,
                nombre: "id_b",
                tipo_dato: "uuid",
                descripcion: "",
                es_pk: false,
                es_fk: false,
                es_nullable: true,
                es_unique: false,
                orden: 1,
              },
            ],
            indices: [],
            constraints: [],
          },
        ],
        sql_ddl: "",
        notas_markdown: "",
      },
    }
  );
  expect(bad.ok()).toBeTruthy();
  const saved = await bad.json();
  const firstTable = (saved.tablas as Array<{ columnas: Array<{ id: string }> }>)[0];
  const colIds = (firstTable?.columnas ?? []).map((col) => col.id);
  const repeatedCount = colIds.filter((id) => id === duplicatedColumnId).length;
  expect(repeatedCount).toBeGreaterThan(1);
});

test("[artifact:tobe-logical-data-model] save rejects overly long descripcion/sql_ddl/notas_markdown", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-long-fields`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );
  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  const tooLongDesc = "d".repeat(10001);
  const tooLongSql = "s".repeat(2_000_001);
  const tooLongNotes = "n".repeat(2_000_001);
  const bad = await request.put(
    `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/logical-data-model`,
    {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: {
        nombre: `Logical Long ${suffix}`,
        descripcion: tooLongDesc,
        tablas: [],
        sql_ddl: tooLongSql,
        notas_markdown: tooLongNotes,
      },
    }
  );
  expect(bad.status()).toBeGreaterThanOrEqual(400);
});

test("[artifact:tobe-logical-data-model] approval endpoints are idempotent for TO-BE logical model", async ({ request }) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-idem-cons`);
  const empresa = await createEmpresaUser(request, admin.token, `${suffix}-idem-emp`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  await inviteMember(request, admin.token, projectId, {
    email: empresa.email,
    tipo_usuario: "EMPRESA",
    project_permission_level: 4,
    nivel_tobe: 4,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });

  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });
  const empresaSession = await apiLogin(request, {
    email: empresa.email,
    password: empresa.password,
  });

  const [c1, c2] = await Promise.all([
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`, {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { approved: true },
    }),
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`, {
      headers: { Authorization: `Bearer ${consultorSession.token}` },
      data: { approved: true },
    }),
  ]);
  expect(c1.status()).toBeLessThan(500);
  expect(c2.status()).toBeLessThan(500);

  const [e1, e2] = await Promise.all([
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`, {
      headers: { Authorization: `Bearer ${empresaSession.token}` },
      data: { approved: true },
    }),
    request.post(`${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`, {
      headers: { Authorization: `Bearer ${empresaSession.token}` },
      data: { approved: true },
    }),
  ]);
  expect(e1.status()).toBeLessThan(500);
  expect(e2.status()).toBeLessThan(500);
});

test("[artifact:tobe-logical-data-model] UI end-to-end: consultor edits logical diagram (new table) and change persists after reload", async ({
  page,
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await createConsultorUser(request, admin.token, `${suffix}-ui-e2e`);
  const projectId = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "TOBE_LOGICAL_DATA_MODEL"
  );

  await inviteMember(request, admin.token, projectId, {
    email: consultor.email,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 3,
    nivel_tobe: 3,
    nivel_asis: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultorSession = await apiLogin(request, {
    email: consultor.email,
    password: consultor.password,
  });

  await authenticateByStorage(page, consultorSession);
  await page.goto(`/consultor/proyectos/${projectId}/entregable/${artifactId}`);

  await expect(page.getByRole("button", { name: /^Tabla$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Guardar$/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /^Tabla$/i }).click();
  await page.getByRole("button", { name: /^Guardar$/i }).first().click();

  await page.reload();
  await expect(page.getByText(/\d+\s+Tablas?/i)).toBeVisible();
});

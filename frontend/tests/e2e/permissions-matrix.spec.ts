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
  user: { id: string; email: string; tipo_usuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA" };
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

async function createProject(
  request: Parameters<typeof test>[0]["request"],
  adminToken: string,
  suffix: string
) {
  const res = await request.post(`${API_BASE}/projects`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      name: `E2E Perm Matrix ${suffix}`,
      description: "E2E permissions matrix tests",
      client_company_name: "E2E Corp",
      client_company_email: `qa-perm-matrix+${suffix}@example.com`,
      estimated_end_date: "2026-12-31",
    },
  });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return { projectId: payload.id as string };
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

async function setMemberProjectLevel(
  request: Parameters<typeof test>[0]["request"],
  actorToken: string,
  projectId: string,
  userId: string,
  level: number
) {
  const res = await request.patch(`${API_BASE}/projects/${projectId}/members/${userId}/permissions`, {
    headers: { Authorization: `Bearer ${actorToken}` },
    data: {
      project_permission_level: level,
      nivel_asis: level,
      nivel_tobe: level,
      nivel_brechas: level,
      nivel_roadmap: level,
    },
  });
  expect(res.ok()).toBeTruthy();
}

test("CONSULTOR: levels 0-4 map to no-access/read/comment/edit/approve (positive+negative)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );
  const consultorMember = await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 0,
    nivel_asis: 0,
    nivel_tobe: 0,
    nivel_brechas: 0,
    nivel_roadmap: 0,
  });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  for (const level of [0, 1, 2, 3, 4] as const) {
    await setMemberProjectLevel(request, admin.token, projectId, consultorMember.user_id, level);

    const readRes = await request.get(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
      { headers: { Authorization: `Bearer ${consultor.token}` } }
    );
    if (level >= 1) {
      expect(readRes.ok()).toBeTruthy();
    } else {
      expect(readRes.status()).toBe(403);
    }

    const commentRes = await request.post(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
      {
        headers: { Authorization: `Bearer ${consultor.token}` },
        data: { target_type: "general", target_client_id: null, content: `e2e comment ${suffix} L${level}` },
      }
    );
    if (level >= 2) {
      expect(commentRes.ok()).toBeTruthy();
    } else {
      expect(commentRes.status()).toBe(403);
    }

    const writeRes = await request.put(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
      {
        headers: { Authorization: `Bearer ${consultor.token}` },
        data: {
          name: "AS-IS Conceptual Diagram",
          description: "",
          entities: [],
          relations: [],
          change_summary: `e2e upsert L${level}`,
        },
      }
    );
    if (level >= 3) {
      expect(writeRes.ok()).toBeTruthy();
    } else {
      expect(writeRes.status()).toBe(403);
    }

    const approveRes = await request.post(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/consultant`,
      {
        headers: { Authorization: `Bearer ${consultor.token}` },
        data: { approved: true },
      }
    );
    if (level >= 4) {
      expect(approveRes.ok()).toBeTruthy();
    } else {
      expect(approveRes.status()).toBe(403);
    }
  }
});

test("EMPRESA: levels 0-4 map to no-access/read/comment/(no edit)/approve-company", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);
  const artifactId = await getArtifactIdByCode(
    request,
    admin.token,
    projectId,
    "ASIS_CONCEPTUAL_DIAGRAM"
  );

  const empresaMember = await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 0,
    nivel_asis: 0,
    nivel_tobe: 0,
    nivel_brechas: 0,
    nivel_roadmap: 0,
  });
  const empresa = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });

  for (const level of [0, 1, 2, 3, 4] as const) {
    await setMemberProjectLevel(request, admin.token, projectId, empresaMember.user_id, level);

    const readRes = await request.get(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
      { headers: { Authorization: `Bearer ${empresa.token}` } }
    );
    if (level >= 1) {
      expect(readRes.ok()).toBeTruthy();
    } else {
      expect(readRes.status()).toBe(403);
    }

    const commentRes = await request.post(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model/comments`,
      {
        headers: { Authorization: `Bearer ${empresa.token}` },
        data: { target_type: "general", target_client_id: null, content: `e2e empresa comment ${suffix} L${level}` },
      }
    );
    if (level >= 2) {
      expect(commentRes.ok()).toBeTruthy();
    } else {
      expect(commentRes.status()).toBe(403);
    }

    // EMPRESA should never be able to edit conceptual diagrams (role restriction), regardless of level.
    const writeRes = await request.put(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/conceptual-model`,
      {
        headers: { Authorization: `Bearer ${empresa.token}` },
        data: {
          name: "AS-IS Conceptual Diagram",
          description: "",
          entities: [],
          relations: [],
          change_summary: `e2e empresa upsert L${level}`,
        },
      }
    );
    expect(writeRes.status()).toBe(403);

    const approveRes = await request.post(
      `${API_BASE}/projects/${projectId}/artifacts/${artifactId}/review/company`,
      {
        headers: { Authorization: `Bearer ${empresa.token}` },
        data: { approved: true },
      }
    );
    if (level >= 4) {
      expect(approveRes.ok()).toBeTruthy();
    } else {
      expect(approveRes.status()).toBe(403);
    }
  }
});

test("Level 5 delegation matrix: needs DELEGAR to assign, can assign <=4 when delegated (not manager)", async ({
  request,
}) => {
  const suffix = String(Date.now());
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { projectId } = await createProject(request, admin.token, suffix);

  const consultorMember = await inviteMember(request, admin.token, projectId, {
    email: CONSULTOR_EMAIL,
    tipo_usuario: "CONSULTOR",
    project_permission_level: 5,
    nivel_asis: 5,
    nivel_tobe: 5,
    nivel_brechas: 5,
    nivel_roadmap: 5,
  });
  const empresaMember = await inviteMember(request, admin.token, projectId, {
    email: EMPRESA_EMAIL,
    tipo_usuario: "EMPRESA",
    project_permission_level: 1,
    nivel_asis: 1,
    nivel_tobe: 1,
    nivel_brechas: 1,
    nivel_roadmap: 1,
  });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });

  // With DELEGAR, can assign 4.
  const assign4 = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${empresaMember.user_id}/permissions`,
    { headers: { Authorization: `Bearer ${consultor.token}` }, data: { project_permission_level: 4 } }
  );
  expect(assign4.ok()).toBeTruthy();

  // With DELEGAR (not manager), cannot assign 5.
  const assign5 = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${empresaMember.user_id}/permissions`,
    { headers: { Authorization: `Bearer ${consultor.token}` }, data: { project_permission_level: 5 } }
  );
  expect(assign5.status()).toBe(403);

  // Without DELEGAR (set to 4), cannot assign even 1.
  await setMemberProjectLevel(request, admin.token, projectId, consultorMember.user_id, 4);
  const assign1 = await request.patch(
    `${API_BASE}/projects/${projectId}/members/${empresaMember.user_id}/permissions`,
    { headers: { Authorization: `Bearer ${consultor.token}` }, data: { project_permission_level: 1 } }
  );
  expect(assign1.status()).toBe(403);
});


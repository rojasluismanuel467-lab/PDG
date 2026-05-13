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

test("[artifact:users] route guard: unauthenticated user visiting /usuarios is redirected to /signin", async ({ page }) => {
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole("heading", { name: /Iniciar sesión/i })).toBeVisible();
});

test("[artifact:users] route guard: non-admin visiting /usuarios is redirected away", async ({ page, request }) => {
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  await authenticateByStorage(page, consultor);
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/consultor\/proyectos/);
});

test("[artifact:users] API authz: consultor and empresa cannot call admin /users endpoints", async ({ request }) => {
  const admin = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const consultor = await apiLogin(request, { email: CONSULTOR_EMAIL, password: CONSULTOR_PASSWORD });
  const empresa = await apiLogin(request, { email: EMPRESA_EMAIL, password: EMPRESA_PASSWORD });

  const suffix = Date.now();
  const payload = {
    nombre: `Authz E2E ${suffix}`,
    email: `authz.e2e+${suffix}@example.com`,
    tipo_usuario: "CONSULTOR",
    password: "Consultor123!",
  };

  for (const actor of [consultor, empresa]) {
    const listRes = await request.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${actor.token}` },
    });
    expect(listRes.status()).toBe(403);

    const createRes = await request.post(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${actor.token}` },
      data: payload,
    });
    expect(createRes.status()).toBe(403);
  }

  // Create one user as admin to test update/deactivate authz.
  const created = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${admin.token}` },
    data: payload,
  });
  expect(created.ok()).toBeTruthy();
  const createdUser = (await created.json()) as { id: string };

  for (const actor of [consultor, empresa]) {
    const patchRes = await request.patch(`${API_BASE}/users/${createdUser.id}`, {
      headers: { Authorization: `Bearer ${actor.token}` },
      data: { nombre: "Should fail" },
    });
    expect(patchRes.status()).toBe(403);

    const deactivateRes = await request.patch(`${API_BASE}/users/${createdUser.id}/deactivate`, {
      headers: { Authorization: `Bearer ${actor.token}` },
    });
    expect(deactivateRes.status()).toBe(403);
  }
});


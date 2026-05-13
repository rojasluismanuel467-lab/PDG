import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";

const EXISTING_CONSULTOR_EMAIL = process.env.E2E_CONSULTOR_EMAIL ?? "consultor@example.com";
const EXISTING_CONSULTOR_PASSWORD = process.env.E2E_CONSULTOR_PASSWORD ?? "Consultor123!";

const EXISTING_EMPRESA_EMAIL = process.env.E2E_EMPRESA_EMAIL ?? "empresa@example.com";
const EXISTING_EMPRESA_PASSWORD = process.env.E2E_EMPRESA_PASSWORD ?? "Empresa123!";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";

async function uiLogin(page: Parameters<typeof test>[0]["page"], email: string, password: string) {
  await page.goto("/signin");
  await page.getByPlaceholder("correo@ejemplo.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Ingresar/i }).click();
}

async function apiLogin(request: Parameters<typeof test>[0]["request"], email: string, password: string) {
  const res = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  const payload = await res.json();
  return {
    token: payload.tokens.access_token as string,
    user: payload.user as {
      id: string;
      nombre: string;
      email: string;
      tipo_usuario: "ADMINISTRADOR" | "CONSULTOR" | "EMPRESA";
      estado: string;
    },
  };
}

async function authenticateByStorage(
  page: Parameters<typeof test>[0]["page"],
  session: Awaited<ReturnType<typeof apiLogin>>
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
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/usuarios$/);
}

async function clearSession(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/signin");
  await page.evaluate(() => window.localStorage.clear());
}

async function createUserFromAdminConsole(page: Parameters<typeof test>[0]["page"], params: {
  tipo: "CONSULTOR" | "EMPRESA" | "ADMINISTRADOR";
  nombre: string;
  email: string;
  password: string;
}) {
  // Assume caller is already authenticated as admin; avoid extra navigation flakiness.
  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.getByRole("heading", { name: /Gestionar Usuarios/i })).toBeVisible();

  await page.getByRole("button", { name: /Nuevo Usuario/i }).click();
  await expect(page.getByRole("heading", { name: /Crear Usuario/i })).toBeVisible();

  await page.getByRole("radio", { name: new RegExp(params.tipo === "CONSULTOR" ? "Consultor" : params.tipo === "EMPRESA" ? "Empresa" : "Administrador", "i") }).check();
  await page.getByPlaceholder("Ej: Juan Pérez").fill(params.nombre);
  await page.getByPlaceholder("juan@empresa.com").fill(params.email);
  await page.getByPlaceholder(/Minimo|Mínimo/i).fill(params.password);

  const createResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/users") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: /Crear Usuario/i }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);

  // Buscar el usuario creado para confirmarlo en tabla
  await page.getByPlaceholder("Nombre o email...").fill(params.email);
  await expect(page.getByText(params.email)).toBeVisible();
}

test("[artifact:users] login works for existing registered users (admin/consultor/empresa)", async ({ page }) => {
  await uiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/usuarios$/);

  await clearSession(page);
  await uiLogin(page, EXISTING_CONSULTOR_EMAIL, EXISTING_CONSULTOR_PASSWORD);
  await expect(page).toHaveURL(/\/consultor\/proyectos/);

  await clearSession(page);
  await uiLogin(page, EXISTING_EMPRESA_EMAIL, EXISTING_EMPRESA_PASSWORD);
  await expect(page).toHaveURL(/\/empresa\/dashboard/);
});

test("[artifact:users] admin can create CONSULTOR, EMPRESA and ADMINISTRADOR users via admin console", async ({
  page,
  request,
}) => {
  const suffix = Date.now();

  // Use API auth injection for stability; UI login is covered by the previous test.
  const session = await apiLogin(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  await authenticateByStorage(page, session);
  await expect(page).toHaveURL(/\/usuarios$/);

  const newConsultor = {
    tipo: "CONSULTOR",
    nombre: "Consultor E2E",
    email: `consultor.e2e+${suffix}@example.com`,
    password: "Consultor123!",
  } as const;
  await createUserFromAdminConsole(page, newConsultor);
  await clearSession(page);
  await uiLogin(page, newConsultor.email, newConsultor.password);
  await expect(page).toHaveURL(/\/consultor\/proyectos/);
  await clearSession(page);
  await uiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/usuarios$/);

  const newEmpresa = {
    tipo: "EMPRESA",
    nombre: "Empresa E2E",
    email: `empresa.e2e+${suffix}@example.com`,
    password: "Empresa123!",
  } as const;
  await createUserFromAdminConsole(page, newEmpresa);
  await clearSession(page);
  await uiLogin(page, newEmpresa.email, newEmpresa.password);
  await expect(page).toHaveURL(/\/empresa\/dashboard/);
  await clearSession(page);
  await uiLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/usuarios$/);

  const newAdmin = {
    tipo: "ADMINISTRADOR",
    nombre: "Admin E2E",
    email: `admin.e2e+${suffix}@example.com`,
    password: "Admin12345!",
  } as const;
  await createUserFromAdminConsole(page, newAdmin);
  await clearSession(page);
  await uiLogin(page, newAdmin.email, newAdmin.password);
  await expect(page).toHaveURL(/\/usuarios$/);
});

import { expect, test } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";

async function apiLogin(
  request: Parameters<typeof test>[0]["request"],
  params: { email: string; password: string }
) {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: params.email, password: params.password },
  });
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
}

async function clearSession(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/signin");
  await page.evaluate(() => window.localStorage.clear());
}

function rowByEmail(page: Parameters<typeof test>[0]["page"], email: string) {
  return page.locator("tr", { has: page.getByText(email) });
}

test("[artifact:users] admin user lifecycle combinations: duplicate email, estado transitions, and role access guard", async ({
  page,
  request,
}) => {
  const suffix = Date.now();
  const consultorEmail = `lifecycle.consultor+${suffix}@example.com`;
  const consultorPassword = "Consultor123!";

  // Admin authenticated
  const adminSession = await apiLogin(request, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await authenticateByStorage(page, adminSession);
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/usuarios$/);

  // Create consultor
  await page.getByRole("button", { name: /Nuevo Usuario/i }).click();
  await page.getByRole("radio", { name: /Consultor/i }).check();
  await page.getByPlaceholder("Ej: Juan Pérez").fill("Lifecycle Consultor");
  await page.getByPlaceholder("juan@empresa.com").fill(consultorEmail);
  await page.getByPlaceholder(/Minimo|Mínimo/i).fill(consultorPassword);
  await page.getByRole("button", { name: /Crear Usuario/i }).click();
  await page.getByPlaceholder("Nombre o email...").fill(consultorEmail);
  await expect(page.getByText(consultorEmail)).toBeVisible();

  // Duplicate email => specific alert (mapped from backend 409)
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("alert");
    expect(dialog.message()).toMatch(/email ya est[aá] registrado/i);
    await dialog.accept();
  });
  await page.getByRole("button", { name: /Nuevo Usuario/i }).click();
  await expect(page.getByRole("heading", { name: /Crear Usuario/i })).toBeVisible();
  await page.getByRole("radio", { name: /Consultor/i }).check();
  await page.getByPlaceholder("Ej: Juan Pérez").fill("Lifecycle Consultor Dup");
  await page.getByPlaceholder("juan@empresa.com").fill(consultorEmail);
  await page.getByPlaceholder(/Minimo|Mínimo/i).fill(consultorPassword);
  await page.getByRole("button", { name: /Crear Usuario/i }).click();

  // The modal remains open after the alert; close it so it doesn't intercept next clicks.
  await page.getByRole("button", { name: /Cancelar/i }).click();
  await expect(page.getByRole("heading", { name: /Crear Usuario/i })).toHaveCount(0);

  // Edit estado -> INACTIVO and verify login blocked
  await page.getByPlaceholder("Nombre o email...").fill(consultorEmail);
  await rowByEmail(page, consultorEmail).locator('button[title="Editar usuario"]').click();
  await expect(page.getByRole("heading", { name: /Editar Usuario/i })).toBeVisible();
  await page.locator('select[name="estado"]').selectOption("INACTIVO");
  await page.getByRole("button", { name: /Guardar Cambios/i }).click();
  await expect(rowByEmail(page, consultorEmail).getByText("INACTIVO")).toBeVisible();

  await clearSession(page);
  await page.goto("/signin");
  await page.getByPlaceholder("correo@ejemplo.com").fill(consultorEmail);
  await page.getByPlaceholder("••••••••").fill(consultorPassword);
  await page.getByRole("button", { name: /Ingresar/i }).click();
  await expect(page.getByText(/Tu cuenta est[aá] inactiva o bloqueada/i)).toBeVisible();

  // Reactivate -> ACTIVO and verify login works
  await authenticateByStorage(page, adminSession);
  await page.goto("/usuarios");
  await page.getByPlaceholder("Nombre o email...").fill(consultorEmail);
  await rowByEmail(page, consultorEmail).locator('button[title="Editar usuario"]').click();
  await page.locator('select[name="estado"]').selectOption("ACTIVO");
  await page.getByRole("button", { name: /Guardar Cambios/i }).click();
  await expect(rowByEmail(page, consultorEmail).getByText("ACTIVO")).toBeVisible();

  await clearSession(page);
  await page.goto("/signin");
  await page.getByPlaceholder("correo@ejemplo.com").fill(consultorEmail);
  await page.getByPlaceholder("••••••••").fill(consultorPassword);
  await page.getByRole("button", { name: /Ingresar/i }).click();
  await expect(page).toHaveURL(/\/consultor\/proyectos/);

  // Consultor cannot access /usuarios (guard redirects)
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/consultor\/proyectos/);
});

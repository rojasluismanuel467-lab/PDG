import { expect, test } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:8000/api/v1";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@arqdata.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345!";

async function apiLogin(request: Parameters<typeof test>[0]["request"]) {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
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

async function authenticateAdminByStorage(
  page: Parameters<typeof test>[0]["page"],
  session: Awaited<ReturnType<typeof apiLogin>>
) {
  const authUser = {
    id: session.user.id,
    nombre: session.user.nombre,
    email: session.user.email,
    perfil: "ADMIN",
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
  await expect(page.getByRole("heading", { name: /Gestionar Usuarios/i })).toBeVisible();
}

async function createUserFromAdminConsole(
  page: Parameters<typeof test>[0]["page"],
  params: {
    tipo: "CONSULTOR" | "EMPRESA" | "ADMINISTRADOR";
    nombre: string;
    email: string;
    password: string;
  }
) {
  await expect(page).toHaveURL(/\/usuarios$/);
  await page.getByRole("button", { name: /Nuevo Usuario/i }).click();
  await expect(page.getByRole("heading", { name: /Crear Usuario/i })).toBeVisible();

  const tipoLabel =
    params.tipo === "CONSULTOR" ? "Consultor" : params.tipo === "EMPRESA" ? "Empresa" : "Administrador";
  await page.getByRole("radio", { name: new RegExp(tipoLabel, "i") }).check();

  await page.getByPlaceholder("Ej: Juan Pérez").fill(params.nombre);
  await page.getByPlaceholder("juan@empresa.com").fill(params.email);
  await page.getByPlaceholder(/Minimo|Mínimo/i).fill(params.password);

  const createResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/users") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: /Crear Usuario/i }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);

  await page.getByPlaceholder("Nombre o email...").fill(params.email);
  await expect(page.getByText(params.email)).toBeVisible();
}

function rowByEmail(page: Parameters<typeof test>[0]["page"], email: string) {
  return page.locator("tr", { has: page.getByText(email) });
}

test("[artifact:users] admin can filter/search users, edit user, deactivate user, and cannot deactivate self", async ({
  page,
  request,
}) => {
  const session = await apiLogin(request);
  await authenticateAdminByStorage(page, session);

  const suffix = Date.now();
  const user = {
    tipo: "CONSULTOR" as const,
    nombre: "Usuario Gestion E2E",
    email: `gestion.e2e+${suffix}@example.com`,
    password: "Consultor123!",
  };

  await createUserFromAdminConsole(page, user);

  // Filtros: tipo CONSULTOR + búsqueda por email.
  await page.getByRole("combobox").first().selectOption("CONSULTOR");
  await page.getByPlaceholder("Nombre o email...").fill(user.email);
  await expect(rowByEmail(page, user.email)).toBeVisible();

  // Editar usuario (nombre + estado).
  const editRow = rowByEmail(page, user.email);
  await editRow.locator('button[title="Editar usuario"]').click();
  await expect(page.getByRole("heading", { name: /Editar Usuario/i })).toBeVisible();
  await page.getByPlaceholder("Ej: Juan Pérez").fill("Usuario Gestion Editado E2E");
  await page.getByRole("combobox").last().selectOption("ACTIVO");

  const patchPromise = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/users/") && response.request().method() === "PATCH";
  });
  await page.getByRole("button", { name: /Guardar Cambios/i }).click();
  const patchRes = await patchPromise;
  expect(patchRes.ok()).toBeTruthy();

  await page.getByPlaceholder("Nombre o email...").fill(user.email);
  await expect(page.getByText("Usuario Gestion Editado E2E")).toBeVisible();
  await expect(rowByEmail(page, user.email).getByText("ACTIVO")).toBeVisible();

  // Desactivar usuario (confirm dialog).
  page.once("dialog", (dialog) => dialog.accept());
  const deactivatePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/v1/users/") && response.url().endsWith("/deactivate") && response.request().method() === "PATCH";
  });
  await rowByEmail(page, user.email).locator('button[title="Desactivar"]').click();
  const deactivateRes = await deactivatePromise;
  expect(deactivateRes.ok()).toBeTruthy();
  await expect(rowByEmail(page, user.email).getByText("INACTIVO")).toBeVisible();

  // No se puede desactivar a sí mismo.
  // Reset filters so the admin row is visible.
  await page.getByRole("combobox").first().selectOption("TODOS");
  await page.getByRole("combobox").nth(1).selectOption("TODOS");
  await page.getByPlaceholder("Nombre o email...").fill("");
  const adminRow = rowByEmail(page, ADMIN_EMAIL);
  await expect(adminRow).toBeVisible();
  // Self-deactivation must be blocked with a user-facing alert.
  let sawConfirm = false;
  let alertMessage = "";
  const handler = async (dialog: Parameters<typeof page.on>[1] extends (d: infer D) => any ? D : never) => {
    if (dialog.type() === "confirm") {
      sawConfirm = true;
      await dialog.accept();
      return;
    }
    if (dialog.type() === "alert") {
      alertMessage = dialog.message();
      await dialog.accept();
      return;
    }
    await dialog.dismiss();
  };
  page.on("dialog", handler as any);

  await adminRow.locator('button[title="Desactivar"]').click();
  await expect.poll(() => sawConfirm).toBeTruthy();
  await expect.poll(() => alertMessage).toContain("No puedes desactivarte");

  page.off("dialog", handler as any);
});

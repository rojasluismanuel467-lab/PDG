// Usuario mock con perfil Consultor para pruebas de UI
export const MOCK_CONSULTOR_AUTH = {
  id: "usr-001",
  nombre: "Carlos Méndez",
  email: "carlos.mendez@arqdata.co",
  perfil: "CONSULTOR" as const,
  avatar: null as string | null,
  estado: "ACTIVO" as const,
};

// Simula respuesta exitosa del endpoint POST /api/v1/auth/login
export const mockLoginSuccess = async (email: string, password: string) => {
  await new Promise((res) => setTimeout(res, 800));
  if (email === "carlos.mendez@arqdata.co" && password === "Demo1234!") {
    return { user: MOCK_CONSULTOR_AUTH, token: "mock-jwt-token-consultor" };
  }
  throw new Error("Credenciales incorrectas");
};

export const mockLoginBlocked = async () => {
  await new Promise((res) => setTimeout(res, 800));
  throw new Error("CUENTA_BLOQUEADA");
};

export const MOCK_EMPRESA = {
  id: "emp-usr-001",
  nombre: "Constructora Bolívar S.A.",
  email: "datos@constructorabolivar.com.co",
  perfil: "EMPRESA" as const,
  avatar: null as string | null,
  estado: "ACTIVO" as const,
};

export const mockLoginEmpresa = async (email: string, password: string) => {
  await new Promise((res) => setTimeout(res, 800));
  if (
    email === "datos@constructorabolivar.com.co" &&
    password === "Empresa1234!"
  ) {
    return { user: MOCK_EMPRESA, token: "mock-jwt-token-empresa" };
  }
  throw new Error("Credenciales incorrectas");
};

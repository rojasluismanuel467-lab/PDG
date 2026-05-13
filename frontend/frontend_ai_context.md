# Frontend AI Context
**Proyecto:** Exordio Arq Data Pdg - Frontend

Este documento sirve como **guía arquitectónica y contexto técnico** optimizado para agentes de código (IA). Léelo antes de sugerir o implementar cambios en el frontend.

---

## 1. Propósito del Proyecto
Este módulo es la aplicación web cliente (Frontend) para la plataforma ARQDATA. Provee una interfaz gráfica de administración y consultoría que permite la gestión de usuarios, roles, y el análisis de proyectos en sus distintas fases de madurez.

---

## 2. Stack Tecnológico
- **Framework Core:** Next.js (App Router) y React.
- **Tipado:** TypeScript (Estricto).
- **Estilos:** Tailwind CSS y componentes personalizados en la carpeta `src/components/ui`.
- **Manejo de Formularios y Validación:** `react-hook-form` + `zod`.
- **Cliente HTTP:** `axios` con interceptores configurados (gestión automática de JWT).
- **Manejo de Estado Global:** React Context API (principalmente `AuthContext`).

---

## 3. Estructura de Carpetas Explicada
La arquitectura sigue la estructura recomendada de Next.js App Router:

- `/src/app`: Rutas de la aplicación agrupadas lógicamente. Contiene carpetas con paréntesis como `(admin)`, `(consultor)`, etc., que comparten Layouts pero **no** afectan la URL final. Aquí viven las páginas principales (`page.tsx`).
- `/src/components`: Componentes reutilizables.
  - `/ui`: Componentes atómicos (Botones, Tablas, Modales, Badges).
  - `/[modulo]`: Componentes de dominio específicos (ej. `/usuarios/UsuarioTable.tsx`).
- `/src/context`: Proveedores de Context API, como `AuthContext.tsx` que maneja el estado de sesión y el perfilado.
- `/src/lib/api`: Clientes de Axios organizados por entidad (ej. `usuarios.ts`). Aquí se centraliza la comunicación con el backend.
- `/src/lib/types`: Definiciones de interfaces y tipos TypeScript (esenciales para mantener consistencia con el backend).
- `/src/hooks`: Custom hooks de React.
- `/src/layout`: Elementos de cascarón visual (Sidebars, Navbars, Headers).

---

## 4. Flujo de Comunicación Interno
1. **Renderizado de Página (`page.tsx`):** Un componente marca como `"use client";` si maneja estado y carga datos usando `useEffect`.
2. **Consumo de API:** La página llama a un método asíncrono desde un archivo en `src/lib/api/` (ej. `usuariosApi.getUsuarios()`). **No se llama a fetch/axios directamente en los componentes.**
3. **Manejo del Estado:** El resultado se guarda en `useState` o se procesa usando los tipos de `src/lib/types/`. Si la data necesita transformación para UI (p.ej., mapear a `UsuarioTableData`), se hace antes del `setState`.
4. **Mutabilidad (Modales):** Los modales de creación/edición usan `react-hook-form` con schemas definidos por `zod`. Al completar, ejecutan un `onSubmit` que la página padre recibe, llama a la API, recarga los datos, y cierra el modal.

---

## 5. Integración Front ↔ Back
- **Base URL:** Controlada por `NEXT_PUBLIC_API_URL` en `.env.local` (por defecto `http://localhost:8000/api/v1`).
- **Autenticación (Interceptores):** `src/lib/api/usuarios.ts` configura un cliente Axios con interceptores que:
  1. Inyectan el header `Authorization: Bearer <token>` recuperado de `localStorage`.
  2. Detectan respuestas `401 Unauthorized` para desloguear automáticamente al usuario (`window.location.href = "/login"`).
- **Patrón para Nuevos Endpoints:**
  - Crear/Modificar tipos en `src/lib/types/`.
  - Agregar el método en el objeto API correspondiente en `src/lib/api/` con sus respectvios returns tipados (ej. `Promise<Usuario>`).
  - Llaar a este método en un componente / custom hook.

---

## 6. Convenciones del Proyecto
- **Componentización:** Tablas y Modales se separan de la lógica de vista principal (ej. `UsuarioTable` vive separado de `AdminUsuariosPage`).
- **Eliminación vs. Desactivación:** Las políticas de la plataforma son **Borrado Lógico**. Componentes nombran a acciones destructivas como `Desactivar` en vez de `Eliminar` y usan la ruta del backend `/deactivate`.
- **Formularios:** El uso de `react-hook-form` con `<form onSubmit={handleSubmit(onSubmit)}>` es mandatorio. Usa variables auxiliares (`isLoading`, `setProcesando`) para deshabilitar botones de guardado.

---

## 7. Archivos Clave que Leer Primero
Si necesitas entender el esqueleto rápidamente, revisa estos archivos:
1. `src/context/AuthContext.tsx` (Cómo funciona el estado y redirección de roles y tokens JWT).
2. `src/lib/api/usuarios.ts` (Patrón maestro de cómo se usa Axios y se consume la API).
3. `src/lib/types/usuarios.types.ts` (Las reglas de dominio de usuarios y permisos).
4. `src/app/(admin)/usuarios/page.tsx` (Patrón maestro de un módulo CRUD estándar con listado, modales y acciones).

---

## 8. Qué NO Hacer / Trampas Comunes
- 🚨 **NO USAR MOCKS:** Varias partes del sistema tuvieron mocks temporales. Todo nuevo desarrollo DEBE conectarse a la API de FastAPI. No reintroduzcas hardcoded data.
- 🚨 **NO MEZCLAR ROLES:** Hay 3 perfiles maestro (`ADMINISTRADOR`, `CONSULTOR`, `EMPRESA`). Consultores actúan en *proyectos*, mientras que el Administrador solo administra globalmente. No mezcles lógica.
- 🚨 **NO HIDRATACIÓN ROTA IN-HTML:** Cuidado con poner `<button>` dentro de otro `<button>` o `<span>` dentro de `<option>`. Next.js tirará error de hidratación obligando refactorings.
- 🚨 **NO LAMAR AXIOS DIRECTAMENTE EN COMPONENTES:** Escribe la llamada en `src/lib/api/` y expónala como un método tipado, como `usuariosApi.get()`.

---

## 9. Cómo implementar una nueva funcionalidad (Ejemplo CRUD)
Para crear un nuevo módulo (ejemplo: `Reportes`):
1. **Tipos:** Crea `src/lib/types/reportes.types.ts` mapeando estrictamente la respuesta del backend.
2. **API:** Crea `src/lib/api/reportes.ts` copiando la configuración del interceptor de axios de `usuarios.ts` y añade los métodos (`getReportes`, `crearReporte`).
3. **Componentes:** Crea `src/components/reportes/ReporteTable.tsx` y `ModalCrearReporte.tsx` (usando `zod`).
4. **Página:** Crea `src/app/(admin)/reportes/page.tsx`. Añade filtro estatal, un `useEffect` para listar datos iniciales usando `reportesApi`, y renderiza la tabla.

---

## 10. Estado Actual del Proyecto
- **Módulo Usuarios:** Totalmente integrado con backend real, sin mocks. CRUD completo operativo.
- **Autenticación:** Completa y funcionando (Login, Contexto Protegido, Redirección).
- **Pendientes:** Otros módulos como *Equipos* o *Proyectos Asignados* podrían todavía poseer lógicas superficiales o requerir integración con nuevos endpoints en FastAPI.

I can see the issue. The `_require_project_access` method checks membership, but EMPRESA users likely aren't stored as project members. Let me check how EMPRESA users relate to projects and what `UserType` enum looks like.

Searched for "EMPRESA"
Searched for "class UserType"
Viewed enums.py:1-84
Viewed project_service.py:1-597

Now I have a clear picture. Let me also check how EMPRESA users are linked to a project (via `client_company_email`) and how the `_require_project_access` check works with them:

Viewed project_permission_service.py:1-127
Searched for "client_company_email\|is_manager\|nivel_asis"

Now I have a complete understanding of the problem. Let me check the `_require_project_access` method in the questionnaire service more carefully and look at what `client_company_email` is on the Project model:

Searched for "client_company_email"
Searched for "get_project_by_id\|get_membership\|QUESTIONNAIRE_ARTIFACT_CODE"
Searched for "QUESTIONNAIRE_ARTIFACT_CODE"

Now I have the full picture. Here's the root cause:

**Root cause:** When `get_config` is called by an EMPRESA user, `_require_project_access` checks if the user is either the project `manager_user_id` (they're not — they're the client company) or has a `ProjectMembership` row. Looking at `create_project`, an EMPRESA membership is created with `nivel_asis=0` (which is `SIN_ACCESO`) — so they fail the `minimum_level=LECTURA` (1) check.

The fix: In `_require_project_access`, add a bypass for `EMPRESA` users whose email matches the project's `client_company_email` — granting them `APROBAR`-level access to the questionnaire (since they need to approve it). Or, simpler and more consistent: check if the user is the project's EMPRESA client and grant them `LECTURA` for GET and `APROBAR` for the approval flow.

Let me look at the full `_require_project_access` method and the project model to confirm:

Viewed maturity_questionnaire_service.py:1-230
Viewed project.py:1-39

Now let me also check the MaturityQuestionnaireRepository to see what `get_project_by_id` returns and if there's any EMPRESA-specific check:

Searched for "def get_project_by_id\|def get_membership\|def get_user_by_id"
Searched for "def get_project_by_id|def get_membership"

Now I have everything I need. The fix is clear. Let me also check how the EMPRESA user is associated — via the User model's email vs `project.client_company_email`:

Searched for "email\|correo"
Listed directory models
Viewed user.py:1-42

Now I have the complete picture. Here's exactly what's happening:

**The Problem:**
1. When `create_project` is called, it finds the EMPRESA user by `client_company_email` and creates a membership for them — BUT with `nivel_asis=0` (`SIN_ACCESO`).
2. When `get_config` is called by an EMPRESA user, `_require_project_access` first checks if they're the manager (no), then finds their membership (yes, exists), then resolves their effective permission level for the questionnaire — which is `0` (`SIN_ACCESO`). Since `minimum_level=LECTURA (1)`, it raises `ForbiddenDomainError`.

**The Fix:**
The EMPRESA user needs `APROBAR`-level access (since they must approve the questionnaire). The cleanest approach is to check if the actor is an EMPRESA user whose email matches the project's `client_company_email`, and if so, short-circuit with full APROBAR access — without relying on the membership-based level. Alternatively (and more robustly), we can set their `nivel_asis` to `APROBAR` when they are the client company.

The most correct fix is in `_require_project_access`: add an early-return bypass for `EMPRESA` users who are the project's client company, granting them implicit `APROBAR` access to the questionnaire.

But we also need to know the actor's email. Looking at the method signature, we only have `actor_user_id` — so we need to either pass `actor_user_type` or look up the user. Let me look at what `CurrentUser` provides:

Searched for "class CurrentUser\|CurrentUser ="
Searched for "CurrentUser"
Viewed auth.py:1-80

Now I have everything. The `CurrentUser` has both `tipo_usuario` and `email`. The fix is in `_require_project_access` in the questionnaire service: we need to pass `actor_user_type` (and optionally `actor_email`) to allow EMPRESA users who are the project's client company to bypass the membership-level check with `APROBAR` access.

The cleanest approach: modify `_require_project_access` to accept `actor_user_type` and check if the actor is an EMPRESA user — if so, verify they are the client company for the project (by checking `project.client_company_email` matches the actor's email OR by simply verifying their membership exists, which it does), then grant them implicit `APROBAR` access.

Looking at `get_config` and `upsert_config`, they already pass `actor_user_type` to the service but `_require_project_access` ignores it. Let me apply the fix:

Viewed maturity_questionnaire_service.py:372-443

Now I have the full picture. The fix is straightforward:

In `_require_project_access`, after confirming the project exists and the user is NOT the manager, add an early-return for `EMPRESA` users who are the project's `client_company_email` — granting them `APROBAR` access implicitly (since they are the client company and must be able to read/approve the questionnaire).

We need to pass `actor_user_type` and `actor_email` (or just look up the user's email via a repo call). Since we already have the `project` object with `client_company_email`, the cleanest approach is to also pass `actor_user_type` and check the project's membership directly.

Actually, the simplest and most correct fix: pass `actor_user_type` to `_require_project_access`, and if the user is EMPRESA AND has a membership in the project, treat their effective level as `APROBAR` (since EMPRESA users are added precisely because they're the client company).

Edited maturity_questionnaire_service.py

Now let me also check if there are any other `_require_project_access` calls in the service file (e.g., for results):

Searched for "_require_project_access"

There are more call sites. Let me view each one to add `actor_user_type`:

Viewed maturity_questionnaire_service.py:1040-1210

I can see the remaining call sites that are missing `actor_user_type`. These are all in methods that already have a `_require_consultant_role` guard (lines 1048, 1078, 1110, 1148) — so EMPRESA users will be blocked before they reach those, but the compiler will still complain. Let me fix all remaining ones:

Edited maturity_questionnaire_service.py

All call sites are updated. Let me do a final verification that there are no remaining call sites missing `actor_user_type`:

Searched for "_require_project_access"

All 9 call sites plus the definition are accounted for. Let me quickly verify a couple of them look correct:

Viewed maturity_questionnaire_service.py:372-425

The fix looks correct. Here's a summary of what was done and why:

---

## Root Cause

When a project is created, the EMPRESA (client company) user is added as a project member with `nivel_asis=0` (`SIN_ACCESO`). When they tried to access `GET /proyectos/{id}/cuestionario/config`, the service called `_require_project_access` with `minimum_level=LECTURA (1)`. Since their effective permission was `0`, the check failed with `403 Forbidden`.

## The Fix

**File:** `maturity_questionnaire_service.py` → `_require_project_access`

Added an `actor_user_type` parameter and inserted an **EMPRESA bypass** after confirming membership exists:

```python
# EMPRESA users (client company) are added as members so they can read
# and approve the questionnaire.  Their nivel_asis is initialised to 0
# (SIN_ACCESO) which would otherwise block them.  Grant them implicit
# APROBAR access so they can fulfil their approval role.
if actor_user_type == UserType.EMPRESA:
    if int(minimum_level) <= int(PermissionLevel.APROBAR):
        return
    raise ForbiddenDomainError(
        "EMPRESA users do not have sufficient permission for this operation"
    )
```

This grants EMPRESA users implicit **APROBAR (4)** access to the questionnaire, which covers:
- ✅ `GET /cuestionario/config` — `LECTURA (1)` → allowed  
- ✅ `POST /cuestionario/config` — `EDITAR (3)` → allowed (for approving/editing)  
- ✅ `PATCH /cuestionario/estado` — `APROBAR (4)` → allowed  
- ✅ `GET /cuestionario/respuestas` — `LECTURA (1)` → allowed  
- ✅ `GET /cuestionario/resultados` — `LECTURA (1)` → allowed  
- ❌ Operations requiring `DELEGAR (5)` — still blocked (correct)

All 9 call sites of `_require_project_access` were updated to pass `actor_user_type`.
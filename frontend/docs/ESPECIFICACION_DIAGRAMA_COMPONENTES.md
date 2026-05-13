# 📐 Especificación Detallada: Diagrama de Componentes UML - Frontend Next.js

## 🎯 Objetivo
Este documento especifica **EXACTAMENTE** cómo debe ser el diagrama de componentes UML del proyecto Next.js Frontend, siguiendo la notación UML estándar con interfaces (lollipops) y la arquitectura React/Next.js.

---

## 📋 Estructura General del Diagrama

El diagrama debe tener **4 capas principales**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend Application                      │
│                                                                       │
│  ┌────────┐    ┌──────────┐    ┌───────────┐    ┌────────────────┐ │
│  │        │    │          │    │           │    │                │ │
│  │ Pages  │──>│  Hooks   │──>│ API Layer │──>│   HTTP Client  │ │
│  │ (UI)   │    │ (Logic)  │    │(Services) │    │    (Axios)     │ │
│  │        │    │          │    │           │    │                │ │
│  └────────┘    └──────────┘    └───────────┘    └────┬───────────┘ │
│                                                        │             │
└────────────────────────────────────────────────────────┼─────────────┘
                                                         │
                                                         ▼
                                                  ┌──────────────┐
                                                  │  FastAPI     │
                                                  │  Backend API │
                                                  └──────────────┘
```

---

## 🔧 Notación UML a Utilizar

### 1. **Componentes**
Cada componente se representa con:
```
┌─────────────────────┐
│  <<component>>      │
│  NombreComponente   │
└─────────────────────┘
```

### 2. **Interfaces Provided (Lollipop - Círculo)**
Representa una interfaz que el componente **PROVEE/EXPONE**:
```
┌──────────┐
│Component │─○ INombreInterfaz
└──────────┘
```
El círculo (○) indica "yo proveo esta interfaz"

### 3. **Interfaces Required (Socket - Media luna)**
Representa una interfaz que el componente **NECESITA/CONSUME**:
```
┌──────────┐
│Component │─◐ INombreInterfaz
└──────────┘
```
La media luna (◐) indica "yo necesito esta interfaz"

### 4. **Conexión entre componentes**
```
┌────────────┐        ┌────────────┐
│   Page     │─◐─────○─│    Hook    │
└────────────┘        └────────────┘
```
Page CONSUME (◐) la interfaz que Hook PROVEE (○)

---

## 📦 Componentes y Sub-componentes

### 🎨 COMPONENTE 1: Pages (UI Layer)
**Paquete:** `src/app`
**Stereotype:** `<<component>>` (Páginas Next.js)

**Sub-componentes (páginas principales):**

#### Páginas de Autenticación
1. **SignInPage** (`(auth)/signin/page.tsx`)
2. **SignUpPage** (`(auth)/signup/page.tsx`)

#### Páginas de Consultor
3. **ConsultorDashboardPage** (`(admin)/consultor/page.tsx`)
4. **ConsultorProjectsPage** (`(admin)/consultor/proyectos/page.tsx`)
5. **ConsultorProjectDetailPage** (`(admin)/consultor/proyectos/[id]/page.tsx`)
6. **ConsultorMaturityQuestionnairePage** (`(admin)/consultor/proyectos/[id]/cuestionario-madurez/page.tsx`)
7. **ConsultorDocumentPage** (`(admin)/consultor/proyectos/[id]/documento/[fase]/page.tsx`)
8. **ConsultorDeliverablePage** (`(admin)/consultor/proyectos/[id]/entregable/[entregableId]/page.tsx`)
9. **ConsultorAgentPage** (`(admin)/consultor/proyectos/[id]/agente/page.tsx`)
10. **ConsultorUsersPage** (`(admin)/consultor/usuarios/page.tsx`)

#### Páginas de Empresa
11. **EmpresaDashboardPage** (`(empresa)/empresa/dashboard/page.tsx`)
12. **EmpresaProjectsPage** (`(empresa)/empresa/proyectos/page.tsx`)
13. **EmpresaProjectDetailPage** (`(empresa)/empresa/proyectos/[id]/page.tsx`)
14. **EmpresaMaturityQuestionnairePage** (`(empresa)/empresa/proyectos/[id]/cuestionario-madurez/page.tsx`)
15. **EmpresaDocumentPage** (`(empresa)/empresa/proyectos/[id]/documento/[fase]/page.tsx`)
16. **EmpresaDeliverablePage** (`(empresa)/empresa/proyectos/[id]/entregable/[entregableId]/page.tsx`)

#### Páginas Especiales
17. **DiagnosticoPage** (`(diagnostico)/diagnostico/[token]/page.tsx`)
18. **MaturityAssessmentPage** (`maturity-assessment/page.tsx`)
19. **UsersAdminPage** (`(admin)/usuarios/page.tsx`)

---

### 🔄 COMPONENTE 2: Hooks (Custom React Hooks)
**Paquete:** `src/hooks`
**Stereotype:** `<<component>>` (Lógica de negocio reutilizable)

**Sub-componentes:**

1. **useGoBack** (`useGoBack.ts`)
   - Provee interfaz: `INavigationHook`
   
2. **useMaturityCalculation** (`useMaturityCalculation.ts`)
   - Provee interfaz: `IMaturityCalculationHook`
   
3. **useMaturityData** (`useMaturityData.ts`)
   - Provee interfaz: `IMaturityDataHook`
   
4. **useModal** (`useModal.ts`)
   - Provee interfaz: `IModalHook`
   
5. **useQuestionnaireCode** (`useQuestionnaireCode.ts`)
   - Provee interfaz: `IQuestionnaireCodeHook`
   
6. **useSessionTimeout** (`useSessionTimeout.ts`)
   - Provee interfaz: `ISessionTimeoutHook`
   
7. **useToast** (`useToast.ts`)
   - Provee interfaz: `IToastHook`

---

### 🌐 COMPONENTE 3: API Services
**Paquete:** `src/lib/api`
**Stereotype:** `<<component>>` (Capa de servicios HTTP)

**Sub-componentes (servicios de API):**

1. **AuthService** (`auth.ts`)
   - Provee interfaz: `IAuthService`
   - Métodos: login, getMe, activateInvitation, logout
   
2. **ProjectsService** (`projects.ts`)
   - Provee interfaz: `IProjectsService`
   - Métodos: list, getById, create, update, listArtifacts, updateArtifact, reviewArtifact
   
3. **UsersService** (`usuarios.ts`)
   - Provee interfaz: `IUsersService`
   - Métodos: list, getById, create, update
   
4. **MaturityService** (`maturity.ts`)
   - Provee interfaz: `IMaturityService`
   - Métodos: getQuestionnaire, submitResponses, getResults
   
5. **BusinessGlossaryService** (`business-glossary.ts`)
   - Provee interfaz: `IBusinessGlossaryService`
   - Métodos: list, create, update, delete
   
6. **ConceptualModelService** (`conceptual-model.ts`)
   - Provee interfaz: `IConceptualModelService`
   - Métodos: get, update, export
   
7. **DFDService** (`dfd.ts`)
   - Provee interfaz: `IDFDService`
   - Métodos: get, update, export
   
8. **InventoryMatrixService** (`inventory-matrix.ts`)
   - Provee interfaz: `IInventoryMatrixService`
   - Métodos: get, update, export
   
9. **LogicalModelService** (`logical-model.ts`)
   - Provee interfaz: `ILogicalModelService`
   - Métodos: get, update, export
   
10. **RACIService** (`raci.ts`)
    - Provee interfaz: `IRACIService`
    - Métodos: get, update, export
    
11. **BrechasService** (`brechas.ts`)
    - Provee interfaz: `IBrechasService`
    - Métodos: analyze, getReport

---

### 🔌 COMPONENTE 4: HTTP Client
**Paquete:** `src/lib/api`
**Stereotype:** `<<component>>` (Cliente HTTP)

**Sub-componente único:**

1. **AxiosClient** (`client.ts`)
   - Provee interfaz: `IHttpClient`
   - Configuración base de Axios
   - Interceptors de autenticación
   - Manejo de errores global

---

### 🌍 COMPONENTE 5: Context Providers
**Paquete:** `src/context`
**Stereotype:** `<<component>>` (Estado global de la aplicación)

**Sub-componentes:**

1. **AuthContext** (`AuthContext.tsx`)
   - Provee interfaz: `IAuthContext`
   - Maneja autenticación y sesión del usuario
   
2. **AppContext** (`AppContext.tsx`)
   - Provee interfaz: `IAppContext`
   - Estado global de la aplicación
   
3. **SidebarContext** (`SidebarContext.tsx`)
   - Provee interfaz: `ISidebarContext`
   - Estado del sidebar/navegación
   
4. **ThemeContext** (`ThemeContext.tsx`)
   - Provee interfaz: `IThemeContext`
   - Tema de la aplicación (dark/light)

---

## 🔗 Conexiones y Dependencias Detalladas

### Capa 1 → Capa 2: Pages → Hooks

Las páginas **CONSUMEN** (required interface ◐) hooks para lógica de negocio.

**Ejemplos:**
1. **SignInPage** ─◐─────○─ **IAuthContext** (provisto por AuthContext)
2. **ConsultorProjectsPage** ─◐─────○─ **IModalHook** (provisto por useModal)
3. **MaturityQuestionnairePage** ─◐─────○─ **IMaturityCalculationHook** (provisto por useMaturityCalculation)
4. **MaturityQuestionnairePage** ─◐─────○─ **IMaturityDataHook** (provisto por useMaturityData)
5. **ConsultorUsersPage** ─◐─────○─ **IToastHook** (provisto por useToast)
6. **DiagnosticoPage** ─◐─────○─ **IQuestionnaireCodeHook** (provisto por useQuestionnaireCode)

---

### Capa 2 → Capa 3: Hooks → API Services

Los hooks **CONSUMEN** (required interface ◐) servicios de API.

**Ejemplos:**
1. **useMaturityData** ─◐─────○─ **IMaturityService** (provisto por MaturityService)
2. **useQuestionnaireCode** ─◐─────○─ **IMaturityService** (provisto por MaturityService)
3. **useSessionTimeout** ─◐─────○─ **IAuthService** (provisto por AuthService)

---

### Capa 1 → Capa 3: Pages → API Services (directo)

Algunas páginas consumen directamente servicios de API.

1. **SignInPage** ─◐─────○─ **IAuthService** (provisto por AuthService)
2. **ConsultorProjectsPage** ─◐─────○─ **IProjectsService** (provisto por ProjectsService)
3. **ConsultorUsersPage** ─◐─────○─ **IUsersService** (provisto por UsersService)
4. **EmpresaProjectsPage** ─◐─────○─ **IProjectsService** (provisto por ProjectsService)
5. **ConsultorProjectDetailPage** ─◐─────○─ **IProjectsService** (provisto por ProjectsService)
6. **ConsultorDocumentPage** ─◐─────○─ **IBusinessGlossaryService** (directo)
7. **ConsultorDocumentPage** ─◐─────○─ **IConceptualModelService** (directo)
8. **ConsultorDocumentPage** ─◐─────○─ **IDFDService** (directo)
9. **ConsultorDocumentPage** ─◐─────○─ **IInventoryMatrixService** (directo)
10. **ConsultorDocumentPage** ─◐─────○─ **ILogicalModelService** (directo)
11. **ConsultorDocumentPage** ─◐─────○─ **IRACIService** (directo)
12. **ConsultorDocumentPage** ─◐─────○─ **IBrechasService** (directo)

---

### Capa 3 → Capa 4: API Services → HTTP Client

Todos los servicios de API **CONSUMEN** (required interface ◐) el cliente HTTP.

1. **AuthService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
2. **ProjectsService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
3. **UsersService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
4. **MaturityService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
5. **BusinessGlossaryService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
6. **ConceptualModelService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
7. **DFDService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
8. **InventoryMatrixService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
9. **LogicalModelService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
10. **RACIService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)
11. **BrechasService** ─◐─────○─ **IHttpClient** (provisto por AxiosClient)

---

### Capa 1 → Context: Pages → Context Providers

Las páginas consumen contextos globales.

1. **SignInPage** ─◐─────○─ **IAuthContext** (provisto por AuthContext)
2. **ConsultorDashboardPage** ─◐─────○─ **IAuthContext** (provisto por AuthContext)
3. **ConsultorDashboardPage** ─◐─────○─ **ISidebarContext** (provisto por SidebarContext)
4. **EmpresaDashboardPage** ─◐─────○─ **IAuthContext** (provisto por AuthContext)
5. **EmpresaDashboardPage** ─◐─────○─ **IThemeContext** (provisto por ThemeContext)

---

### Context → API Services: AuthContext → AuthService

El contexto de autenticación consume el servicio de autenticación.

1. **AuthContext** ─◐─────○─ **IAuthService** (provisto por AuthService)

---

### Capa 4 → Backend: HTTP Client → FastAPI Backend

El cliente HTTP se conecta al backend:

1. **AxiosClient** ─────▶ **FastAPI Backend API** (REST API externa)

---

## 📐 Layout del Diagrama (Organización Visual)

### Distribución Horizontal (Izquierda a Derecha):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend Application                              │
│                                                                                   │
│  IZQUIERDA         CENTRO-IZQ      CENTRO        CENTRO-DER        DERECHA       │
│                                                                                   │
│  ┌─────────┐      ┌─────────┐    ┌──────────┐  ┌──────────┐   ┌──────────┐     │
│  │         │      │         │    │          │  │          │   │          │     │
│  │  Pages  │ ───> │  Hooks  │──>│   API    │─>│  HTTP    │──>│ Backend  │     │
│  │  (19)   │      │   (7)   │    │ Services │  │  Client  │   │   API    │     │
│  │         │      │         │    │   (11)   │  │  (Axios) │   │ (REST)   │     │
│  └────┬────┘      └─────────┘    └─────┬────┘  └──────────┘   └──────────┘     │
│       │                                 │                                        │
│       │           ┌──────────────┐      │                                        │
│       └──────────>│   Context    │──────┘                                        │
│                   │  Providers   │                                               │
│                   │     (4)      │                                               │
│                   └──────────────┘                                               │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Distribución Vertical (Dentro de cada componente):

Dentro de cada componente grande, los sub-componentes deben estar apilados verticalmente:

**Ejemplo de Pages:**
```
┌──────────────────────────────┐
│   <<component>>              │
│   Pages (UI Layer)           │
│                              │
│  ┌────────────────────────┐  │
│  │  SignInPage           │─◐┼──> IAuthService
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ ConsultorProjectsPage │─◐┼──> IProjectsService
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ EmpresaDashboardPage  │─◐┼──> IAuthContext
│  └────────────────────────┘  │
│         ...                   │
└──────────────────────────────┘
```

---

## 🎨 Detalles Visuales Importantes

### 1. **Colores sugeridos:**
- **Pages:** Verde claro (`#E8F5E9`)
- **Hooks:** Azul claro (`#E3F2FD`)
- **API Services:** Naranja claro (`#FFF3E0`)
- **HTTP Client:** Gris (`#ECEFF1`)
- **Context Providers:** Morado claro (`#F3E5F5`)
- **Backend API:** Amarillo (`#FFFDE7`)

### 2. **Líneas de conexión:**
- Page → Hook: Línea con socket (◐) desde page y lollipop (○) desde hook
- Page → API Service: Línea con socket (◐) desde page y lollipop (○) desde service
- Hook → API Service: Línea con socket (◐) desde hook y lollipop (○) desde service
- API Service → HTTP Client: Línea con socket (◐) desde service y lollipop (○) desde client
- Page → Context: Línea con socket (◐) desde page y lollipop (○) desde context
- Context → API Service: Línea con socket (◐) desde context y lollipop (○) desde service
- HTTP Client → Backend: Línea simple con flecha (→)

### 3. **Agrupación:**
- Todos los Pages dentro de un gran rectángulo con borde
- Todos los Hooks dentro de un gran rectángulo con borde
- Todos los API Services dentro de un gran rectángulo con borde
- HTTP Client en su propio rectángulo
- Todos los Context Providers dentro de un gran rectángulo con borde
- Backend API fuera del contenedor principal (componente externo)

---

## 📊 Tabla de Mapeo Completo

### Páginas → Hooks/Services

| # | Page | Usa Hook/Service | Provisto por |
|---|------|-----------------|--------------|
| 1 | SignInPage | IAuthService | AuthService |
| 2 | SignInPage | IAuthContext | AuthContext |
| 3 | ConsultorProjectsPage | IProjectsService | ProjectsService |
| 4 | ConsultorProjectsPage | IModalHook | useModal |
| 5 | MaturityQuestionnairePage | IMaturityCalculationHook | useMaturityCalculation |
| 6 | MaturityQuestionnairePage | IMaturityDataHook | useMaturityData |
| 7 | ConsultorUsersPage | IUsersService | UsersService |
| 8 | ConsultorUsersPage | IToastHook | useToast |
| 9 | DiagnosticoPage | IQuestionnaireCodeHook | useQuestionnaireCode |
| 10 | ConsultorDocumentPage | IBusinessGlossaryService | BusinessGlossaryService |
| 11 | ConsultorDocumentPage | IConceptualModelService | ConceptualModelService |
| 12 | ConsultorDocumentPage | IDFDService | DFDService |

### Hooks → API Services

| # | Hook | Usa Service | Provisto por |
|---|------|------------|--------------|
| 1 | useMaturityData | IMaturityService | MaturityService |
| 2 | useQuestionnaireCode | IMaturityService | MaturityService |
| 3 | useSessionTimeout | IAuthService | AuthService |

### API Services → HTTP Client

| # | Service | Usa | Provisto por |
|---|---------|-----|--------------|
| 1 | AuthService | IHttpClient | AxiosClient |
| 2 | ProjectsService | IHttpClient | AxiosClient |
| 3 | UsersService | IHttpClient | AxiosClient |
| 4 | MaturityService | IHttpClient | AxiosClient |
| 5 | BusinessGlossaryService | IHttpClient | AxiosClient |
| 6 | ConceptualModelService | IHttpClient | AxiosClient |
| 7 | DFDService | IHttpClient | AxiosClient |
| 8 | InventoryMatrixService | IHttpClient | AxiosClient |
| 9 | LogicalModelService | IHttpClient | AxiosClient |
| 10 | RACIService | IHttpClient | AxiosClient |
| 11 | BrechasService | IHttpClient | AxiosClient |

### Context → API Services

| # | Context | Usa Service | Provisto por |
|---|---------|------------|--------------|
| 1 | AuthContext | IAuthService | AuthService |

---

## ✅ Checklist para Validar el Diagrama

- [ ] Hay 5 componentes grandes (Pages, Hooks, API Services, HTTP Client, Context Providers)
- [ ] Cada componente tiene sus sub-componentes listados dentro
- [ ] Pages muestran required interface (◐) hacia Hooks/Services/Contexts
- [ ] Hooks muestran provided interface (○) para Pages
- [ ] Hooks muestran required interface (◐) hacia API Services
- [ ] API Services muestran provided interface (○) para Hooks y Pages
- [ ] API Services muestran required interface (◐) hacia HTTP Client
- [ ] HTTP Client muestra provided interface (○) para API Services
- [ ] HTTP Client se conecta al Backend API (externo)
- [ ] Context Providers muestran provided interface (○) para Pages
- [ ] AuthContext muestra required interface (◐) hacia AuthService
- [ ] El Backend API está fuera del contenedor principal
- [ ] Las líneas de conexión están claras y no se cruzan demasiado
- [ ] Los nombres de interfaces siguen el patrón "I" + NombreComponente
- [ ] El layout es de izquierda a derecha (Pages → Hooks → API Services → HTTP Client → Backend)
- [ ] Hay 19 páginas, 7 hooks, 11 servicios de API, 1 cliente HTTP, 4 context providers

---

## 🚀 Instrucciones para Claude Web (draw.io)

**Por favor, crea el diagrama de componentes UML para el frontend Next.js siguiendo exactamente:**

1. **Usar notación de componentes UML:**
   - Componentes representados como rectángulos con esquina doblada (icono de componente)
   - Usar interfaces con lollipop notation (○ para provided, ◐ para required)

2. **Incluir todos los componentes especificados:**
   - 19 páginas agrupadas en el componente "Pages"
   - 7 hooks agrupados en el componente "Hooks"
   - 11 servicios de API agrupados en el componente "API Services"
   - 1 cliente HTTP (AxiosClient) en el componente "HTTP Client"
   - 4 context providers agrupados en el componente "Context Providers"
   - 1 componente externo "FastAPI Backend API"

3. **Mostrar todas las conexiones especificadas:**
   - Pages → Hooks (ejemplos clave)
   - Pages → API Services (conexiones directas)
   - Pages → Context Providers
   - Hooks → API Services
   - API Services → HTTP Client (todas las 11)
   - Context → API Services
   - HTTP Client → Backend API

4. **Usar colores sugeridos:**
   - Verde claro para Pages
   - Azul claro para Hooks
   - Naranja claro para API Services
   - Gris para HTTP Client
   - Morado claro para Context Providers
   - Amarillo para Backend API

5. **Organizar layout de izquierda a derecha:**
   - Izquierda: Pages
   - Centro-izquierda: Hooks
   - Centro: API Services
   - Centro-derecha: HTTP Client
   - Derecha: Backend API (externo)
   - Abajo-centro: Context Providers (con conexiones hacia arriba)

6. **Agrupar sub-componentes:**
   - Dentro de cada componente principal, listar los sub-componentes verticalmente
   - Usar rectángulos anidados con estereotipos <<component>>

7. **Componente externo:**
   - "FastAPI Backend API" debe estar fuera del contenedor principal
   - Conectado solo desde HTTP Client con flecha simple

8. **Formato visual:**
   - Usar draw.io (diagrams.net)
   - Componentes UML estándar de la biblioteca UML de draw.io
   - Interfaces con notación lollipop (círculo para provided, media luna para required)
   - Líneas orthogonales para conexiones
   - Labels claros en las interfaces (ej: "IAuthService", "IProjectsService")

---

**Fecha de especificación:** Abril 2026  
**Versión:** 1.0  
**Proyecto:** Next.js Frontend - Diagrama de Componentes UML  
**Tecnologías:** Next.js 16, React 19, TypeScript, Axios, React Hooks

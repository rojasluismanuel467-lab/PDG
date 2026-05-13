# 📦 Guía de Componentes UML - Proyecto FastAPI Backend

## 🎯 Objetivo
Este documento explica cómo se estructura la aplicación FastAPI en componentes UML para generar diagramas de componentes en Visual Paradigm, siguiendo el patrón arquitectónico de capas similar a Spring Boot.

---

## 🏛️ Arquitectura de Capas vs Componentes UML

En nuestra aplicación FastAPI, **cada carpeta principal representa un COMPONENTE grande**, y **cada archivo .py dentro representa un SUB-COMPONENTE** (clase).

### Mapeo: Spring Boot → FastAPI

| Spring Boot | FastAPI (Nuestro Proyecto) | Responsabilidad |
|-------------|----------------------------|-----------------|
| `Controllers` | `api/v1/endpoints/` | Exponer endpoints HTTP (REST API) |
| `Services` | `services/` | Lógica de negocio |
| `Repositories` | `repositories/` | Acceso a datos (CRUD) |
| `Models/Entities` | `models/` | Definición de tablas de BD |
| `DTOs` | `schemas/` | Validación y serialización |
| `Config` | `core/` | Configuración y utilidades |
| `Exceptions` | `exceptions/` | Manejo de errores |
| - | `dependencies/` | Inyección de dependencias |

---

## 📊 Estructura de Componentes (Vista General)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPIBackendApplication                   │
│                                                                   │
│  ┌────────────────┐      ┌────────────────┐                     │
│  │   📦 Core      │      │ 📦 Schemas     │                     │
│  │  (Component)   │      │  (Component)   │                     │
│  │                │      │                │                     │
│  │ • Config       │      │ • AuthSchemas  │                     │
│  │ • Security     │      │ • ProjectDTO   │                     │
│  │ • Enums        │      │ • UserDTO      │                     │
│  │ • Permissions  │◄─────┤ • etc...       │                     │
│  └────────────────┘      └────────────────┘                     │
│         ▲                        ▲                               │
│         │                        │                               │
│         │       ┌────────────────┴─────────────────┐            │
│         │       │                                  │            │
│  ┌──────┴───────▼─────┐    ┌───────────────────┐  │            │
│  │   📦 Dependencies   │    │  📦 Exceptions    │  │            │
│  │    (Component)      │    │   (Component)     │  │            │
│  │                     │    │                   │  │            │
│  │ • get_db()          │    │ • DomainErrors    │  │            │
│  │ • get_current_user()│    │ • Handlers        │  │            │
│  │ • auth_required()   │    │                   │  │            │
│  └──────┬──────────────┘    └───────────────────┘  │            │
│         │                             ▲             │            │
│         │                             │             │            │
│  ┌──────▼──────────────────────────────────────────┴──────────┐ │
│  │              📦 API (Presentation Layer)                    │ │
│  │                     (Component)                             │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ AuthEndpoint │  │ProjectEndpoint│ │ UserEndpoint │     │ │
│  │  │  (auth.py)   │  │(projects.py) │  │  (users.py)  │ ... │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │ │
│  │         │                  │                  │             │ │
│  └─────────┼──────────────────┼──────────────────┼─────────────┘ │
│            │                  │                  │               │
│            │                  │                  │               │
│  ┌─────────▼──────────────────▼──────────────────▼─────────────┐ │
│  │           📦 Services (Business Logic Layer)                 │ │
│  │                     (Component)                              │ │
│  │                                                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │ AuthService  │  │ProjectService│  │ UserService  │      │ │
│  │  │              │  │              │  │              │  ... │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │ │
│  │         │                  │                  │              │ │
│  └─────────┼──────────────────┼──────────────────┼──────────────┘ │
│            │                  │                  │                │
│            │                  │                  │                │
│  ┌─────────▼──────────────────▼──────────────────▼──────────────┐ │
│  │         📦 Repositories (Data Access Layer)                   │ │
│  │                     (Component)                               │ │
│  │                                                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │
│  │  │AuthRepository│  │ProjectRepo   │  │ UserRepo     │       │ │
│  │  │              │  │              │  │              │  ...  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │ │
│  │         │                  │                  │               │ │
│  └─────────┼──────────────────┼──────────────────┼───────────────┘ │
│            │                  │                  │                 │
│            │                  │                  │                 │
│  ┌─────────▼──────────────────▼──────────────────▼───────────────┐ │
│  │            📦 Models (Persistence Layer)                       │ │
│  │                     (Component)                                │ │
│  │                                                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │   User       │  │   Project    │  │  Invitation  │        │ │
│  │  │   (Model)    │  │   (Model)    │  │   (Model)    │  ...  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │ │
│  │         │                  │                  │                │ │
│  └─────────┼──────────────────┼──────────────────┼────────────────┘ │
│            │                  │                  │                  │
└────────────┼──────────────────┼──────────────────┼──────────────────┘
             │                  │                  │
             └──────────────────┴──────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   💾 PostgreSQL DB    │
                    │     (External)        │
                    └───────────────────────┘
```

---

## 🔍 Componentes Detallados

### 1. 📦 **Componente: API (Presentation Layer)**
**Carpeta:** `app/api/v1/endpoints/`

**Descripción:** Expone los endpoints HTTP REST. Recibe requests, valida entrada, llama a services, y devuelve responses.

**Sub-componentes (archivos .py):**
- `auth.py` → **AuthEndpoint**
  - POST `/api/v1/auth/login`
  - POST `/api/v1/auth/register`
  - POST `/api/v1/auth/refresh`
  - POST `/api/v1/auth/logout`
  
- `projects.py` → **ProjectEndpoint**
  - GET `/api/v1/projects`
  - POST `/api/v1/projects`
  - GET `/api/v1/projects/{id}`
  - PUT `/api/v1/projects/{id}`
  - DELETE `/api/v1/projects/{id}`
  
- `users.py` → **UserEndpoint**
  - GET `/api/v1/users`
  - GET `/api/v1/users/{id}`
  - PUT `/api/v1/users/{id}`
  - DELETE `/api/v1/users/{id}`
  
- `maturity_questionnaire.py` → **MaturityQuestionnaireEndpoint**
  - GET `/api/v1/questionnaires`
  - POST `/api/v1/questionnaires/{id}/responses`
  - GET `/api/v1/questionnaires/{id}/results`
  
- `business_glossary.py` → **BusinessGlossaryEndpoint**
- `conceptual_model.py` → **ConceptualModelEndpoint**
- `dfd.py` → **DFDEndpoint**
- `inventory_matrix.py` → **InventoryMatrixEndpoint**
- `logical_data_model.py` → **LogicalDataModelEndpoint**
- `project_memberships.py` → **ProjectMembershipEndpoint**
- `raci.py` → **RACIEndpoint**
- `brechas.py` → **BrechasEndpoint**

**Dependencias:**
- ✅ Depende de: `services/`, `schemas/`, `dependencies/`, `exceptions/`
- ❌ NO depende de: `repositories/`, `models/` (acceso indirecto vía services)

---

### 2. 📦 **Componente: Services (Business Logic Layer)**
**Carpeta:** `app/services/`

**Descripción:** Contiene toda la lógica de negocio. Orquesta operaciones complejas, valida reglas de negocio, transforma datos, y coordina múltiples repositories.

**Sub-componentes (archivos .py):**
- `auth_service.py` → **AuthService**
  - `login(email, password)` → Valida credenciales, genera JWT
  - `register(user_data)` → Crea usuario, envía invitación
  - `refresh_token(refresh_token)` → Refresca access token
  - `logout(user_id, refresh_token)` → Revoca tokens
  
- `project_service.py` → **ProjectService**
  - `create_project(data, user)` → Crea proyecto + artefactos
  - `list_user_projects(user_id)` → Lista proyectos del usuario
  - `update_project(project_id, data)` → Actualiza proyecto
  - `generate_artifacts(project_id)` → Genera artefactos automáticos
  
- `user_service.py` → **UserService**
  - `create_user(data)` → Crea usuario
  - `get_user_by_email(email)` → Busca usuario
  - `update_user(user_id, data)` → Actualiza usuario
  - `deactivate_user(user_id)` → Desactiva usuario
  
- `maturity_questionnaire_service.py` → **MaturityQuestionnaireService**
  - `get_questionnaire(project_id)` → Obtiene cuestionario
  - `submit_response(questionnaire_id, answers)` → Envía respuestas
  - `calculate_maturity_score(responses)` → Calcula puntuación
  - `generate_report(questionnaire_id)` → Genera reporte
  
- `business_glossary_service.py` → **BusinessGlossaryService**
- `conceptual_model_service.py` → **ConceptualModelService**
- `dfd_service.py` → **DFDService**
- `inventory_matrix_service.py` → **InventoryMatrixService**
- `logical_data_model_service.py` → **LogicalDataModelService**
- `project_membership_service.py` → **ProjectMembershipService**
- `project_permission_service.py` → **ProjectPermissionService**
- `raci_service.py` → **RACIService**
- `brechas_service.py` → **BrechasService**

**Dependencias:**
- ✅ Depende de: `repositories/`, `models/`, `schemas/`, `core/`, `exceptions/`
- ❌ NO depende de: `api/`

---

### 3. 📦 **Componente: Repositories (Data Access Layer)**
**Carpeta:** `app/repositories/`

**Descripción:** Encapsula el acceso a la base de datos. Provee métodos CRUD (Create, Read, Update, Delete) usando SQLAlchemy.

**Sub-componentes (archivos .py):**
- `auth_repository.py` → **AuthRepository**
  - `get_user_by_email(email)` → SELECT user WHERE email = ?
  - `create_user(user)` → INSERT INTO users
  - `save_refresh_token(token)` → INSERT INTO refresh_tokens
  - `revoke_token(token_id)` → UPDATE refresh_tokens SET revoked
  
- `project_repository.py` → **ProjectRepository**
  - `create(project)` → INSERT INTO projects
  - `get_by_id(project_id)` → SELECT * FROM projects WHERE id = ?
  - `list_by_user(user_id)` → SELECT projects JOIN memberships
  - `update(project_id, data)` → UPDATE projects SET ... WHERE id = ?
  - `delete(project_id)` → DELETE FROM projects WHERE id = ?
  
- `user_repository.py` → **UserRepository**
  - `create(user)` → INSERT INTO users
  - `get_by_id(user_id)` → SELECT * FROM users WHERE id = ?
  - `get_by_email(email)` → SELECT * FROM users WHERE email = ?
  - `list_all()` → SELECT * FROM users
  - `update(user_id, data)` → UPDATE users
  
- `maturity_questionnaire_repository.py` → **MaturityQuestionnaireRepository**
  - `get_questionnaire(project_id)` → SELECT questionnaire
  - `save_response(response)` → INSERT INTO responses
  - `get_answers(response_id)` → SELECT answers
  - `update_validation_status(answer_id, status)` → UPDATE answers
  
- `business_glossary_repository.py` → **BusinessGlossaryRepository**
- `conceptual_model_repository.py` → **ConceptualModelRepository**
- `dfd_repository.py` → **DFDRepository**
- `inventory_matrix_repository.py` → **InventoryMatrixRepository**
- `logical_data_model_repository.py` → **LogicalDataModelRepository**
- `project_membership_repository.py` → **ProjectMembershipRepository**
- `raci_repository.py` → **RACIRepository**
- `brechas_repository.py` → **BrechasRepository**

**Dependencias:**
- ✅ Depende de: `models/`, `core/database`, `exceptions/`
- ❌ NO depende de: `api/`, `services/`, `schemas/`

---

### 4. 📦 **Componente: Models (Persistence Layer)**
**Carpeta:** `app/models/`

**Descripción:** Define el esquema de la base de datos usando SQLAlchemy ORM. Cada archivo representa una tabla con sus columnas, relaciones y constraints.

**Sub-componentes (archivos .py):**
- `user.py` → **User** (Modelo/Entidad)
  ```python
  class User(Base):
      __tablename__ = "users"
      id: UUID (PK)
      nombre: str
      email: str (UNIQUE)
      password_hash: str
      tipo_usuario: UserType (ENUM)
      estado: UserStatus (ENUM)
      # Relaciones:
      projects: relationship("ProjectMembership")
      created_projects: relationship("Project")
  ```

- `project.py` → **Project** (Modelo/Entidad)
  ```python
  class Project(Base):
      __tablename__ = "projects"
      id: UUID (PK)
      nombre: str
      company_name: str
      estado: ProjectStatus (ENUM)
      manager_id: UUID (FK → users.id)
      # Relaciones:
      manager: relationship("User")
      memberships: relationship("ProjectMembership")
      artifacts: relationship("ProjectArtifact")
  ```

- `invitation.py` → **Invitation** (Modelo/Entidad)
- `refresh_token.py` → **RefreshToken** (Modelo/Entidad)
- `project_membership.py` → **ProjectMembership** (Modelo/Entidad)
- `project_artifact.py` → **ProjectArtifact** (Modelo/Entidad)
- `project_artifact_permission.py` → **ProjectArtifactPermission** (Modelo/Entidad)
- `maturity_questionnaire.py` → **MaturityQuestionnaire** (Modelo/Entidad)
- `maturity_question.py` → **MaturityQuestion** (Modelo/Entidad)
- `maturity_response.py` → **MaturityResponse** (Modelo/Entidad)
- `maturity_answer.py` → **MaturityAnswer** (Modelo/Entidad)
- `maturity_dimension.py` → **MaturityDimension** (Modelo/Entidad)
- `maturity_subdomain.py` → **MaturitySubdomain** (Modelo/Entidad)
- `business_glossary.py` → **BusinessGlossary** (Modelo/Entidad)
- `conceptual_model.py` → **ConceptualModel** (Modelo/Entidad)
- `conceptual_entity.py` → **ConceptualEntity** (Modelo/Entidad)
- `conceptual_attribute.py` → **ConceptualAttribute** (Modelo/Entidad)
- `conceptual_relation.py` → **ConceptualRelation** (Modelo/Entidad)
- `conceptual_comment.py` → **ConceptualComment** (Modelo/Entidad)
- `dfd_model.py` → **DFDModel** (Modelo/Entidad)
- `dfd_version.py` → **DFDVersion** (Modelo/Entidad)
- `dfd_comment.py` → **DFDComment** (Modelo/Entidad)
- `inventory_matrix.py` → **InventoryMatrix** (Modelo/Entidad)
- `logical_data_model.py` → **LogicalDataModel** (Modelo/Entidad)
- `logical_data_model_version.py` → **LogicalDataModelVersion** (Modelo/Entidad)
- `logical_data_model_comment.py` → **LogicalDataModelComment** (Modelo/Entidad)
- `gaps_crud_matrix.py` → **GapsCRUDMatrix** (Modelo/Entidad)
- `gap_analysis_report.py` → **GapAnalysisReport** (Modelo/Entidad)
- `integration_quality_rules.py` → **IntegrationQualityRules** (Modelo/Entidad)
- `raci.py` → **RACIMatrix, RACIRole, RACIActivity** (Modelos/Entidades)
- `audit_log.py` → **AuditLog** (Modelo/Entidad)
- `base.py` → **Base** (Clase base SQLAlchemy)

**Dependencias:**
- ✅ Depende de: `core/enums`, `core/database`
- ❌ NO depende de: `api/`, `services/`, `repositories/`, `schemas/`

---

### 5. 📦 **Componente: Schemas (DTOs - Data Transfer Objects)**
**Carpeta:** `app/schemas/`

**Descripción:** Define los esquemas de validación usando Pydantic. Valida datos de entrada (Request) y salida (Response) de la API.

**Sub-componentes (archivos .py):**
- `auth.py` → **AuthSchemas**
  - `AuthLoginRequest` → DTO para login
  - `AuthLoginResponse` → DTO respuesta login
  - `UserRegisterRequest` → DTO para registro
  - `AuthUserResponse` → DTO usuario autenticado
  - `TokenPairResponse` → DTO par de tokens
  
- `user.py` → **UserSchemas**
  - `UserCreate` → DTO crear usuario
  - `UserUpdate` → DTO actualizar usuario
  - `UserResponse` → DTO respuesta usuario
  - `UserListResponse` → DTO lista usuarios
  
- `project.py` → **ProjectSchemas**
  - `CreateProjectRequest` → DTO crear proyecto
  - `UpdateProjectRequest` → DTO actualizar proyecto
  - `ProjectResponse` → DTO respuesta proyecto
  - `ProjectDetailResponse` → DTO detalle proyecto
  - `ProjectListResponse` → DTO lista proyectos
  
- **... y 10 archivos más de schemas para cada módulo**

**Dependencias:**
- ✅ Depende de: `core/enums`
- ❌ NO depende de: Ningún otro componente interno (son DTOs puros)

---

### 6. 📦 **Componente: Core (Configuration & Utilities)**
**Carpeta:** `app/core/`

**Descripción:** Configuración central, utilidades compartidas, y funcionalidades transversales.

**Sub-componentes (archivos .py):**
- `config.py` → **Settings**
  - Configuración de base de datos
  - JWT secrets
  - CORS origins
  - Variables de entorno
  
- `security.py` → **Security**
  - `hash_password()` → Hashea contraseñas con bcrypt
  - `verify_password()` → Verifica contraseñas
  - `create_access_token()` → Genera JWT access token
  - `create_refresh_token()` → Genera JWT refresh token
  - `decode_token()` → Decodifica y valida JWT
  
- `database.py` → **Database**
  - `engine` → Motor SQLAlchemy
  - `SessionLocal` → Fábrica de sesiones
  - `get_db()` → Generador de sesiones
  
- `enums.py` → **Enums**
  - `UserType` → ADMIN, GESTOR, COLABORADOR
  - `UserStatus` → ACTIVO, INACTIVO, PENDIENTE
  - `ProjectStatus` → ACTIVO, COMPLETADO, CANCELADO
  - `ProjectBlock` → DIAGNOSTICO, PLANIFICACION, etc.
  
- `permissions.py` → **Permissions**
  - `check_project_access()` → Valida acceso a proyecto
  - `check_artifact_permission()` → Valida permisos en artefacto
  
- `artifact_catalog.py` → **ArtifactCatalog**
  - Catálogo de tipos de artefactos (DFD, RACI, etc.)
  
- `maturity_questionnaire_catalog.py` → **MaturityQuestionnaireCatalog**
  - Catálogo de preguntas del cuestionario

**Dependencias:**
- ❌ NO depende de otros componentes (es la base)

---

### 7. 📦 **Componente: Dependencies (Dependency Injection)**
**Carpeta:** `app/dependencies/`

**Descripción:** Funciones de FastAPI Depends() para inyectar dependencias comunes en endpoints.

**Sub-componentes (archivos .py):**
- `auth.py` → **AuthDependencies**
  - `get_current_user()` → Extrae y valida JWT, retorna usuario actual
  - `require_admin()` → Valida que usuario sea ADMIN
  - `require_project_access()` → Valida acceso a proyecto
  
- `database.py` → **DatabaseDependencies**
  - `get_db()` → Inyecta sesión de BD en endpoints

**Dependencias:**
- ✅ Depende de: `core/`, `models/`, `repositories/`, `exceptions/`

---

### 8. 📦 **Componente: Exceptions (Error Handling)**
**Carpeta:** `app/exceptions/`

**Descripción:** Excepciones personalizadas y handlers para errores consistentes.

**Sub-componentes (archivos .py):**
- `domain.py` → **DomainExceptions**
  - `NotFoundDomainError` → Recurso no encontrado (404)
  - `UnauthorizedDomainError` → No autorizado (401)
  - `ForbiddenDomainError` → Prohibido (403)
  - `ConflictDomainError` → Conflicto (409)
  - `ValidationDomainError` → Error de validación (400)
  
- `handlers.py` → **ExceptionHandlers**
  - Handlers que convierten excepciones en responses HTTP

**Dependencias:**
- ❌ NO depende de otros componentes

---

## 🔗 Matriz de Dependencias

| Componente | Depende de |
|------------|------------|
| **API** | Services, Schemas, Dependencies, Exceptions |
| **Services** | Repositories, Models, Schemas, Core, Exceptions |
| **Repositories** | Models, Core (database), Exceptions |
| **Models** | Core (enums, database) |
| **Schemas** | Core (enums) |
| **Core** | - (no depende de nadie) |
| **Dependencies** | Core, Models, Repositories, Exceptions |
| **Exceptions** | - (no depende de nadie) |

---

## 📋 Para Visual Paradigm - Instant Reverse

### Paso 1: Seleccionar carpeta
Selecciona: `/home/luisrojas/Documents/universidad/PDG/backend/app/`

### Paso 2: Configuración
- ✅ Lenguaje: Python
- ✅ Incluir todos los archivos .py
- ✅ Generar relaciones entre clases
- ✅ Agrupar por paquetes

### Paso 3: Resultado esperado
Visual Paradigm creará:
- **8 componentes principales** (uno por carpeta)
- **Múltiples sub-componentes** (uno por archivo .py)
- **Dependencias automáticas** basadas en imports

### Paso 4: Refinamiento manual
Después de generar:
1. Organiza los componentes visualmente en capas (de arriba a abajo)
2. Agrupa componentes relacionados
3. Oculta detalles internos para vista simplificada
4. Exporta a PNG/SVG

---

## 📸 Vista Simplificada Final

```
┌─────────────────────────────────────────────────┐
│          🌐 API Layer (Endpoints)               │
│     Controllers: 14 endpoints                   │
└─────────────────┬───────────────────────────────┘
                  │ uses
┌─────────────────▼───────────────────────────────┐
│      💼 Business Logic Layer (Services)         │
│     Services: 14 service classes                │
└─────────────────┬───────────────────────────────┘
                  │ uses
┌─────────────────▼───────────────────────────────┐
│      📊 Data Access Layer (Repositories)        │
│     Repositories: 14 repository classes         │
└─────────────────┬───────────────────────────────┘
                  │ uses
┌─────────────────▼───────────────────────────────┐
│      🗄️ Persistence Layer (Models)              │
│     Models: 34 entity classes                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
         💾 PostgreSQL Database
```

---

## ✅ Checklist para Diagrama de Componentes

- [ ] Identificar los 8 componentes principales (carpetas)
- [ ] Listar sub-componentes dentro de cada componente (archivos .py)
- [ ] Mapear dependencias entre componentes (qué usa qué)
- [ ] Usar Visual Paradigm Instant Reverse con carpeta `app/`
- [ ] Organizar visualmente en capas (arriba → abajo)
- [ ] Agregar anotaciones y descripciones
- [ ] Exportar diagrama final

---

**Fecha:** Abril 2026  
**Versión:** 1.0

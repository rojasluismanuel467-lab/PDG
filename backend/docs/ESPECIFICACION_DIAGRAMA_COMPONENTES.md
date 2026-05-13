# 📐 Especificación Detallada: Diagrama de Componentes UML

## 🎯 Objetivo
Este documento especifica **EXACTAMENTE** cómo debe ser el diagrama de componentes UML del proyecto FastAPI Backend, siguiendo la notación UML estándar con interfaces (lollipops) como en el ejemplo de Spring Boot.

---

## 📋 Estructura General del Diagrama

El diagrama debe tener **4 componentes principales**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPIBackendApplication                         │
│                                                                       │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐  │
│  │              │        │              │        │              │  │
│  │  Controllers │  ───>  │   Services   │  ───>  │ Repositories │  │
│  │   (API)      │        │              │        │              │  │
│  │              │        │              │        │              │  │
│  └──────────────┘        └──────────────┘        └──────────────┘  │
│                                                           │          │
└───────────────────────────────────────────────────────────┼──────────┘
                                                            │
                                                            ▼
                                                    ┌──────────────┐
                                                    │  PostgreSQL  │
                                                    │   Database   │
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
│ Controller │─◐─────○─│  Service   │
└────────────┘        └────────────┘
```
Controller CONSUME (◐) la interfaz que Service PROVEE (○)

---

## 📦 Componentes y Sub-componentes

### 🌐 COMPONENTE 1: Controllers (API)
**Paquete:** `app.api.v1.endpoints`
**Stereotype:** `<<component>>`

**Sub-componentes (dentro del componente grande):**
Cada endpoint es un sub-componente:

1. **AuthController** (auth.py)
2. **ProjectController** (projects.py)
3. **UserController** (users.py)
4. **MaturityQuestionnaireController** (maturity_questionnaire.py)
5. **BusinessGlossaryController** (business_glossary.py)
6. **ConceptualModelController** (conceptual_model.py)
7. **DFDController** (dfd.py)
8. **InventoryMatrixController** (inventory_matrix.py)
9. **LogicalDataModelController** (logical_data_model.py)
10. **ProjectMembershipController** (project_memberships.py)
11. **RACIController** (raci.py)
12. **BrechasController** (brechas.py)

---

### 💼 COMPONENTE 2: Services
**Paquete:** `app.services`
**Stereotype:** `<<component>>`

**Sub-componentes (dentro del componente grande):**
Cada service es un sub-componente con interfaz:

1. **AuthService** (auth_service.py)
   - Provee interfaz: `IAuthService`
   
2. **ProjectService** (project_service.py)
   - Provee interfaz: `IProjectService`
   
3. **UserService** (user_service.py)
   - Provee interfaz: `IUserService`
   
4. **MaturityQuestionnaireService** (maturity_questionnaire_service.py)
   - Provee interfaz: `IMaturityQuestionnaireService`
   
5. **BusinessGlossaryService** (business_glossary_service.py)
   - Provee interfaz: `IBusinessGlossaryService`
   
6. **ConceptualModelService** (conceptual_model_service.py)
   - Provee interfaz: `IConceptualModelService`
   
7. **DFDService** (dfd_service.py)
   - Provee interfaz: `IDFDService`
   
8. **InventoryMatrixService** (inventory_matrix_service.py)
   - Provee interfaz: `IInventoryMatrixService`
   
9. **LogicalDataModelService** (logical_data_model_service.py)
   - Provee interfaz: `ILogicalDataModelService`
   
10. **ProjectMembershipService** (project_membership_service.py)
    - Provee interfaz: `IProjectMembershipService`
    
11. **ProjectPermissionService** (project_permission_service.py)
    - Provee interfaz: `IProjectPermissionService`
    
12. **RACIService** (raci_service.py)
    - Provee interfaz: `IRACIService`
    
13. **BrechasService** (brechas_service.py)
    - Provee interfaz: `IBrechasService`

---

### 📊 COMPONENTE 3: Repositories
**Paquete:** `app.repositories`
**Stereotype:** `<<component>>`

**Sub-componentes (dentro del componente grande):**
Cada repository es un sub-componente con interfaz:

1. **AuthRepository** (auth_repository.py)
   - Provee interfaz: `IAuthRepository`
   
2. **ProjectRepository** (project_repository.py)
   - Provee interfaz: `IProjectRepository`
   
3. **UserRepository** (user_repository.py)
   - Provee interfaz: `IUserRepository`
   
4. **MaturityQuestionnaireRepository** (maturity_questionnaire_repository.py)
   - Provee interfaz: `IMaturityQuestionnaireRepository`
   
5. **BusinessGlossaryRepository** (business_glossary_repository.py)
   - Provee interfaz: `IBusinessGlossaryRepository`
   
6. **ConceptualModelRepository** (conceptual_model_repository.py)
   - Provee interfaz: `IConceptualModelRepository`
   
7. **DFDRepository** (dfd_repository.py)
   - Provee interfaz: `IDFDRepository`
   
8. **InventoryMatrixRepository** (inventory_matrix_repository.py)
   - Provee interfaz: `IInventoryMatrixRepository`
   
9. **LogicalDataModelRepository** (logical_data_model_repository.py)
   - Provee interfaz: `ILogicalDataModelRepository`
   
10. **ProjectMembershipRepository** (project_membership_repository.py)
    - Provee interfaz: `IProjectMembershipRepository`
    
11. **RACIRepository** (raci_repository.py)
    - Provee interfaz: `IRACIRepository`
    
12. **BrechasRepository** (brechas_repository.py)
    - Provee interfaz: `IBrechasRepository`

---

### 💾 COMPONENTE 4: Database
**Nombre:** `PostgreSQL`
**Stereotype:** `<<database>>` o `<<external component>>`
**Ubicación:** Fuera del contenedor principal (externo)

---

## 🔗 Conexiones y Dependencias Detalladas

### Capa 1 → Capa 2: Controllers → Services

Cada Controller **CONSUME** (required interface ◐) la interfaz del Service correspondiente.

1. **AuthController** ─◐─────○─ **IAuthService** (provista por AuthService)
2. **ProjectController** ─◐─────○─ **IProjectService** (provista por ProjectService)
3. **UserController** ─◐─────○─ **IUserService** (provista por UserService)
4. **MaturityQuestionnaireController** ─◐─────○─ **IMaturityQuestionnaireService** (provista por MaturityQuestionnaireService)
5. **BusinessGlossaryController** ─◐─────○─ **IBusinessGlossaryService** (provista por BusinessGlossaryService)
6. **ConceptualModelController** ─◐─────○─ **IConceptualModelService** (provista por ConceptualModelService)
7. **DFDController** ─◐─────○─ **IDFDService** (provista por DFDService)
8. **InventoryMatrixController** ─◐─────○─ **IInventoryMatrixService** (provista por InventoryMatrixService)
9. **LogicalDataModelController** ─◐─────○─ **ILogicalDataModelService** (provista por LogicalDataModelService)
10. **ProjectMembershipController** ─◐─────○─ **IProjectMembershipService** (provista por ProjectMembershipService)
11. **RACIController** ─◐─────○─ **IRACIService** (provista por RACIService)
12. **BrechasController** ─◐─────○─ **IBrechasService** (provista por BrechasService)

---

### Capa 2 → Capa 3: Services → Repositories

Cada Service **CONSUME** (required interface ◐) la interfaz del Repository correspondiente.

1. **AuthService** ─◐─────○─ **IAuthRepository** (provista por AuthRepository)
2. **ProjectService** ─◐─────○─ **IProjectRepository** (provista por ProjectRepository)
3. **UserService** ─◐─────○─ **IUserRepository** (provista por UserRepository)
4. **MaturityQuestionnaireService** ─◐─────○─ **IMaturityQuestionnaireRepository** (provista por MaturityQuestionnaireRepository)
5. **BusinessGlossaryService** ─◐─────○─ **IBusinessGlossaryRepository** (provista por BusinessGlossaryRepository)
6. **ConceptualModelService** ─◐─────○─ **IConceptualModelRepository** (provista por ConceptualModelRepository)
7. **DFDService** ─◐─────○─ **IDFDRepository** (provista por DFDRepository)
8. **InventoryMatrixService** ─◐─────○─ **IInventoryMatrixRepository** (provista por InventoryMatrixRepository)
9. **LogicalDataModelService** ─◐─────○─ **ILogicalDataModelRepository** (provista por LogicalDataModelRepository)
10. **ProjectMembershipService** ─◐─────○─ **IProjectMembershipRepository** (provista por ProjectMembershipRepository)
11. **RACIService** ─◐─────○─ **IRACIRepository** (provista por RACIRepository)
12. **BrechasService** ─◐─────○─ **IBrechasRepository** (provista por BrechasRepository)

**ADICIONAL:** ProjectService también usa:
- **ProjectService** ─◐─────○─ **IProjectMembershipRepository**

---

### Capa 3 → Database: Repositories → PostgreSQL

Todos los Repositories se conectan a la base de datos:

1. **AuthRepository** ─────▶ **PostgreSQL**
2. **ProjectRepository** ─────▶ **PostgreSQL**
3. **UserRepository** ─────▶ **PostgreSQL**
4. **MaturityQuestionnaireRepository** ─────▶ **PostgreSQL**
5. **BusinessGlossaryRepository** ─────▶ **PostgreSQL**
6. **ConceptualModelRepository** ─────▶ **PostgreSQL**
7. **DFDRepository** ─────▶ **PostgreSQL**
8. **InventoryMatrixRepository** ─────▶ **PostgreSQL**
9. **LogicalDataModelRepository** ─────▶ **PostgreSQL**
10. **ProjectMembershipRepository** ─────▶ **PostgreSQL**
11. **RACIRepository** ─────▶ **PostgreSQL**
12. **BrechasRepository** ─────▶ **PostgreSQL**

---

## 📐 Layout del Diagrama (Organización Visual)

### Distribución Horizontal (Izquierda a Derecha):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FastAPIBackendApplication                                │
│                                                                               │
│  IZQUIERDA                CENTRO                  DERECHA                    │
│                                                                               │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            │
│  │             │         │             │         │             │            │
│  │ Controllers │  ─────> │  Services   │  ─────> │Repositories │            │
│  │             │         │             │         │             │            │
│  │  (14 items) │         │  (13 items) │         │  (12 items) │            │
│  │             │         │             │         │             │            │
│  └─────────────┘         └─────────────┘         └──────┬──────┘            │
│                                                          │                   │
└──────────────────────────────────────────────────────────┼───────────────────┘
                                                           │
                                                           │ connects to
                                                           ▼
                                                   ┌──────────────┐
                                                   │  PostgreSQL  │
                                                   │   Database   │
                                                   └──────────────┘
```

### Distribución Vertical (Dentro de cada componente):

Dentro de cada componente grande, los sub-componentes deben estar apilados verticalmente:

**Ejemplo de Controllers:**
```
┌──────────────────────────┐
│   <<component>>          │
│   Controllers            │
│                          │
│  ┌────────────────────┐  │
│  │ AuthController     │─◐┼──> IAuthService
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ ProjectController  │─◐┼──> IProjectService
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ UserController     │─◐┼──> IUserService
│  └────────────────────┘  │
│         ...               │
└──────────────────────────┘
```

---

## 🎨 Detalles Visuales Importantes

### 1. **Colores sugeridos:**
- **Controllers:** Azul claro (`#E3F2FD`)
- **Services:** Azul medio (`#90CAF9`)
- **Repositories:** Azul oscuro (`#42A5F5`)
- **Database:** Gris/Verde (`#A5D6A7`)

### 2. **Líneas de conexión:**
- Controller → Service: Línea con socket (◐) desde controller y lollipop (○) desde service
- Service → Repository: Línea con socket (◐) desde service y lollipop (○) desde repository
- Repository → Database: Línea simple con flecha (→)

### 3. **Agrupación:**
- Todos los Controllers dentro de un gran rectángulo con borde
- Todos los Services dentro de un gran rectángulo con borde
- Todos los Repositories dentro de un gran rectángulo con borde
- Database fuera del contenedor principal

---

## 📊 Tabla de Mapeo Completo

| # | Controller | Usa Interface | Provista por Service | Service Usa Interface | Provista por Repository |
|---|------------|---------------|----------------------|----------------------|------------------------|
| 1 | AuthController | IAuthService | AuthService | IAuthRepository | AuthRepository |
| 2 | ProjectController | IProjectService | ProjectService | IProjectRepository | ProjectRepository |
| 3 | UserController | IUserService | UserService | IUserRepository | UserRepository |
| 4 | MaturityQuestionnaireController | IMaturityQuestionnaireService | MaturityQuestionnaireService | IMaturityQuestionnaireRepository | MaturityQuestionnaireRepository |
| 5 | BusinessGlossaryController | IBusinessGlossaryService | BusinessGlossaryService | IBusinessGlossaryRepository | BusinessGlossaryRepository |
| 6 | ConceptualModelController | IConceptualModelService | ConceptualModelService | IConceptualModelRepository | ConceptualModelRepository |
| 7 | DFDController | IDFDService | DFDService | IDFDRepository | DFDRepository |
| 8 | InventoryMatrixController | IInventoryMatrixService | InventoryMatrixService | IInventoryMatrixRepository | InventoryMatrixRepository |
| 9 | LogicalDataModelController | ILogicalDataModelService | LogicalDataModelService | ILogicalDataModelRepository | LogicalDataModelRepository |
| 10 | ProjectMembershipController | IProjectMembershipService | ProjectMembershipService | IProjectMembershipRepository | ProjectMembershipRepository |
| 11 | RACIController | IRACIService | RACIService | IRACIRepository | RACIRepository |
| 12 | BrechasController | IBrechasService | BrechasService | IBrechasRepository | BrechasRepository |

**Nota:** ProjectPermissionService no tiene controller propio, es usado por otros services.

---

## ✅ Checklist para Validar el Diagrama

- [ ] Hay 3 componentes grandes (Controllers, Services, Repositories)
- [ ] Cada componente tiene sus sub-componentes listados dentro
- [ ] Controllers muestran required interface (◐) hacia Services
- [ ] Services muestran provided interface (○) para Controllers
- [ ] Services muestran required interface (◐) hacia Repositories
- [ ] Repositories muestran provided interface (○) para Services
- [ ] Todos los Repositories se conectan a PostgreSQL
- [ ] La base de datos está fuera del contenedor principal
- [ ] Las líneas de conexión están claras y no se cruzan demasiado
- [ ] Los nombres de interfaces siguen el patrón "I" + NombreService/Repository
- [ ] El layout es de izquierda a derecha (Controllers → Services → Repositories → DB)

---

## 🚀 Instrucciones para Claude

**Por favor, genera el código PlantUML para este diagrama siguiendo exactamente:**

1. Usar notación de componentes UML (`component`)
2. Usar interfaces con lollipop notation (`interface` + `()` para provided, `--()` para required)
3. Incluir todos los 12 controllers, 13 services, 12 repositories
4. Mostrar todas las conexiones especificadas en la tabla de mapeo
5. Usar colores sugeridos para cada capa
6. Organizar layout de izquierda a derecha
7. Agrupar sub-componentes dentro de cada componente principal
8. Database como componente externo conectado a repositories

**Formato de salida esperado:**
```plantuml
@startuml Diagrama_Componentes_FastAPI

' Configuración
skinparam componentStyle rectangle
skinparam linetype ortho

' ... código completo del diagrama ...

@enduml
```

---

**Fecha de especificación:** Abril 2026  
**Versión:** 1.0  
**Proyecto:** FastAPI Backend - Diagrama de Componentes UML

# Tech Stack 

## 1. Overview
This is **ARQDATA** - an enterprise architecture platform with AI agents for automating architectural design and project maturity assessment. The system consists of a Next.js frontend and FastAPI backend in a monorepo structure.

## 2. Core Stack
- **Languages**: TypeScript (frontend), Python 3.11+ (backend)
- **Backend**: FastAPI 0.115+ / Uvicorn
- **Frontend**: Next.js 16.0.10 (App Router), React 19.2.0
- **Database**: PostgreSQL (psycopg)
- **Infra**: Not detected (no Docker files found)

## 3. Backend Details
- **Framework**: FastAPI with Clean Architecture (layered pattern)
- **Architecture**:
  - `app/api/` - REST endpoints
  - `app/services/` - Business logic (Service Layer)
  - `app/repositories/` - Data access (Repository Pattern)
  - `app/schemas/` - Pydantic request/response models
  - `app/core/` - Config, security, permissions, enums
- **Key Libraries**:
  - SQLAlchemy 2.0+ (ORM)
  - Alembic (migrations)
  - Pydantic 2.0+ (validation)
  - python-jose (JWT tokens)
  - bcrypt (password hashing)
- **Auth**: JWT with access/refresh token pattern, Bearer auth
- **DB Access**: SQLAlchemy with Repository pattern, PostgreSQL

## 4. Frontend Details
- **Framework**: Next.js 16.0.10 with App Router, React 19.2.0
- **State Management**: React Context API (AuthContext, ThemeContext, SidebarContext, AppContext)
- **Forms**: react-hook-form + zod validation schemas
- **API Layer**: Axios with interceptors (automatic JWT injection, 401 handling)
- **Key Libraries**:
  - Tailwind CSS 4.1.17 (styling)
  - ApexCharts + Recharts (visualizations)
  - FullCalendar (calendar component)
  - @xyflow/react (diagrams)
  - react-dnd (drag and drop)
  - @react-jvectormap/world (maps)
- **Routing**: Next.js App Router with route groups `(admin)`, `(empresa)`, `(full-width-pages)`, etc.

## 5. DevOps & Infra
- **Containers**: Not detected
- **CI/CD**: Not detected
- **Environment**: `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

## 6. Key Dependencies (Important Ones Only)

| Library | Purpose |
|--------|---------|
| `@xyflow/react` | Flow/diagram editor |
| `react-hook-form` + `zod` | Form handling with validation |
| `axios` | HTTP client with JWT interceptors |
| `@fullcalendar/*` | Calendar functionality |
| `apexcharts` + `recharts` | Data visualization |
| `@react-jvectormap/world` | Geographic maps |
| `react-dnd` | Drag and drop |
| SQLAlchemy | Backend ORM |
| python-jose | JWT token handling |
| bcrypt | Password hashing |

## 7. Architecture Summary

The project uses a **Clean Architecture** pattern with clear separation:

### Backend Layering:
```
API Routes → Services → Repositories → SQLAlchemy → PostgreSQL
```

### Frontend Pattern:
```
Pages → API Client (Axios) → Backend API
         ↓
    React Context (Auth/Theme/Sidebar/App)
         ↓
    Components (UI + Domain)
```

### Route Groups:
- `(admin)` - Admin dashboard & user management
- `(consultor)` - Consultant project management
- `(empresa)` - Enterprise workspace
- `(diagnostico)` - Questionnaire flow
- `(full-width-pages)` - Auth pages, error pages

---

## ⚠️ Maturity Assessment

**Project Level**: MVP/Production-ready
- Well-structured codebase with clear separation of concerns
- Clean Architecture properly implemented in backend
- Comprehensive API with contracts and tests
- Multiple user profiles (ADMIN, CONSULTOR, EMPRESA)

**Architecture Consistency**: Good
- Clean layered architecture
- Consistent patterns across modules
- TypeScript strict mode
- Repository + Service pattern

**Risks / Smells**:
- Secrets in default config (`JWT_SECRET_KEY` defaults to "change-this-secret-in-production")
- No Docker/Containerization detected
- No CI/CD pipeline detected
- Frontend in monorepo but no workspace config (npm workspaces)
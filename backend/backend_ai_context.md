# Backend AI Context
**Proyecto:** Exordio Arq Data Pdg - Backend

Este documento sirve como **guía arquitectónica y contexto técnico** optimizado para agentes de código (IA). Léelo antes de sugerir o implementar problemas en el backend.

---

## 1. Propósito del Proyecto
Este módulo expone la API RESTful (Backend) de ARQDATA. Provee los endpoints para gestión de usuarios, roles de proyecto y lógica analítica del sistema, operando como única verdad (single source of truth) y custodiando la persistencia y la seguridad del negocio.

---

## 2. Stack Tecnológico
- **Framework Core:** FastAPI (Python 3.11+).
- **Tipado Intenso:** Uso extensivo de typing nativo de Python (`dict`, `list`, `UUID`) y Pydantic V2 para validación.
- **ORM & BD:** SQLAlchemy 2.0 + Psycopg (PostgreSQL), con migraciones controladas por Alembic.
- **Autenticación & Seguridad:** JWT (jose) para tokens, **bcrypt** (uso directo transaccionado por bug de passlib) para hash de passwords.
- **Entorno Local:** Contenedor de Docker con PostgreSQL mapeado en puerto `5434`.

---

## 3. Estructura de Carpetas Explicada
Arquitectura orientada a dominio (Clean Architecture / Capas):

- `/app/api/v1/endpoints`: Controladores. Definen las rutas (verbos HTTP), inyectan dependencias de auth (y DB), y delegan la lógica al archivo `Service`. Retornan un esquema Response de Pydantic.
- `/app/core`: Configuraciones críticas, enumeradores (`enums.py`), seguridad y hashes (`security.py`), y setup del motor de base de datos (`database.py`).
- `/app/dependencies`: Elementos inyectables por `Depends()`. Aquí vive `auth.py` para recuperación del token de usuario actual y abstracciones de roles (`require_admin`).
- `/app/models`: Clases puras de SQLAlchemy (Mapeo a Tablas de Bases de Datos).
- `/app/repositories`: Capa de interacción cruda con la Base de Datos. Puros Queries y Consultas. Nunca reciben ni retornan esquemas Pydantic, transaccionan clases Model de SQLAlchemy.
- `/app/schemas`: Clases de Pydantic. `Create`, `Update`, `Response` para parsear el Request Body o dar forma al JSON de salida.
- `/app/services`: Lógica de negocio. Donde los Repositorios devuelven un objeto de SQLAlchemy, los Servicios lo transforman a objeto Pydantic (`Response`). Lanzan excepciones de negocio (`ConflictDomainError`).

---

## 4. Flujo de Comunicación Interno
1. Petición entra en un router (`/app/api/...`). Pydantic valida Request Body basado en archivo `/app/schemas/`.
2. El Router inyecta sesión DB y llama a la clase de la Capa Servicio (ej. `UserService.create_user`).
3. El Servicio aplica reglas de negocio, y pide / guarda objetos desde Capa Repositorio (ej. `UserRepository.create`).
4. Repositorio ejecuta SQLAlchemy contra la base de datos usando `/app/models/` y devuelve un objeto instancia.
5. El Servicio toma la instancia de Database, lo formatea con su método `_to_response` a validación Pydantic, y se lo pasa de vuelta a FastAPI para emitir la respuesta 200 HTTP.

---

## 5. Integración Front ↔ Back
- **Documentación API:** Se debe usar y testear en el swagger auto-generado: `http://localhost:8000/api/v1/docs` (o `/redoc`).
- **Autenticación Frontend:** Toda petición (excepto Login) exigirá Header `Authorization: Bearer <TOKEN>`.
- **Nuevo Endpoint:** Debe sumarse en `/app/api/v1/endpoints/nuevo.py` y luego incluirlo en `/app/api/v1/router.py`. Usar `from app.dependencies.auth import get_current_user` para protegerlo.

---

## 6. Convenciones del Proyecto
- **Schemas (Pydantic):** Siempre usar sufijos descriptivos (`UserCreate`, `UserUpdate`, `UserResponse`).
- **Domain Errors:** Para lanzar código 4xx, usar Custom Exceptions de `app/exceptions/domain.py` (ej. `NotFoundDomainError`, `ForbiddenDomainError`). FastAPI los captura en `handlers.py` y genera JSONs de error semánticos.
- **Passwords:** La validación se gestiona de manera imperativa en `app/core/security.py` inyectando `bcrypt` directo, por carencias de paquetes viejos en `passlib`.
- **Desactivación Soft:** Al borrar un recurso, preferir `deactivated_at = now()` (borrado lógico) en vez de `db.delete()`.

---

## 7. Archivos Clave que Leer Primero
1. `/app/api/v1/endpoints/auth.py` y `/app/dependencies/auth.py` (Para entender la inyección de JWT y extracción de usuario logueado en cualquier ruta).
2. `/app/services/user_service.py` (Excelente ejemplo de Mapeo Model -> Schema y manejo de repositorios).
3. `/app/core/enums.py` (Toda la definición viva de enumeraciones en Base de Datos de Tipos y Estados de usuario).
4. `alembic/env.py` (Punto focal de todas las migraciones, si se crea un Model nuevo hay que asegurar que migre aquí).

---

## 8. Qué NO Hacer / Trampas Comunes
- 🚨 **NO USAR `EmailStr` SIN PRECAUCIÓN:** Por reglas del negocio, es preferente aceptar correso con extensiones restrictivas como `.local`. Usa tipo `str` genérico temporalmente en campos como `email: str` en esquemas para permitir testing en desarrollo, si surgen fallos extraños `422 Unprocessable Entity` durante Login o Create User.
- 🚨 **NO CREAR ENUMS EN ALEMBIC CIEGAMENTE:** PostgreSQL arroja error si un tipo `ENUM` existe al ser creado con `alembic upgrade head`. Si un modelo usa Enum, asegurar de que la migración autogenerada se altere con lógicas seguras como crear el Enum manualmente usando sentencias `IF NOT EXISTS`, o `create_type=False` en Columnas.
- 🚨 **NO MEZCLAR REPOSITORIOS Y PYDANTIC:** Nunca devolver un objeto Serializado Schema/Pydantic desde un Repositorio. Un Repositorio recibe Models y suelta Models.
- 🚨 **DOCKER COMPOSE:** Siempre la DB levanta en el puerto `5434` (NO 5432) localmente.

---

## 9. Cómo implementar una nueva funcionalidad (Ejemplo Endpoint)
Si deseas crear entidad "Reporte":
1. **Model:** Genera `app/models/reporte.py` con atributos SQLAlchemy.
2. **Alembic:** Corre `alembic revision --autogenerate -m "Add Reporte"`. Edita la migración cuidando los ENUMs si es que lleva, revisa y luego aplica `alembic upgrade head`.
3. **Repository:** Crea `app/repositories/reporte_repository.py` con métodos `get_by_id`, `create`, `list_all`.
4. **Schemas:** Crea `app/schemas/reporte.py` para `ReporteCreate` y `ReporteResponse`.
5. **Service:** Crea `app/services/reporte_service.py` aplicando lógicas condicionales si aplica antes de guardar. Convierte Model -> Schema Response.
6. **API Endpoint:** Modifica `app/api/v1/endpoints/reporte.py` agregando los requests GET y POST que requieran `Depends(get_current_user)`.
7. **Router:** Únelo a `app/api/v1/router.py`.

---

## 10. Estado Actual del Proyecto
- Base de datos conectada correctamente a Postgres15 (Alembic estable si se sigue convención de Enum custom).
- Core de seguridad, JWT, y Auditoria (`AuthLog`) funcionando.
- Modelos de `User`, `Project`, y `ProjectMembership` inicializados en su base arquitectónica.

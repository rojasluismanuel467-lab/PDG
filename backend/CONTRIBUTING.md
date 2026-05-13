# Guía de contribución — Backend

## Requisitos previos

Tener `uv` instalado y haber corrido `uv sync` al menos una vez para instalar las dependencias de desarrollo (incluye `ruff`).

## Configuración inicial (solo la primera vez)

Al clonar el repositorio, ejecuta este comando para activar los hooks de git:

```bash
git config core.hooksPath .husky
```

---

## Antes de cada commit

Los hooks se ejecutan automáticamente. No necesitas correr nada manualmente, pero si quieres verificar tu código antes:

```bash
# Verificar formato
uv run ruff format --check .

# Corregir formato automáticamente
uv run ruff format .

# Verificar lint
uv run ruff check .

# Corregir lint automáticamente (cuando sea posible)
uv run ruff check --fix .
```

---

## Reglas de formato y estilo

| Regla | Valor |
|---|---|
| Longitud máxima de línea | 100 caracteres |
| Indentación | 4 espacios |
| Comillas | Dobles `"` |
| Saltos de línea | LF |
| Orden de imports | stdlib → third-party → first-party (`app`) |

### Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables y funciones | snake_case | `get_user_by_id` |
| Clases | PascalCase | `UserService` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Archivos | snake_case | `user_service.py` |

---

## Mensajes de commit

Se usa la convención **Conventional Commits**. El hook `commit-msg` rechazará cualquier mensaje que no cumpla el formato.

```
<tipo>(<alcance opcional>): <descripción>
```

### Tipos permitidos

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Cambios en documentación |
| `style` | Formato, espacios, punto y coma (sin cambios de lógica) |
| `refactor` | Refactorización sin nueva funcionalidad ni bug fix |
| `perf` | Mejoras de rendimiento |
| `test` | Añadir o corregir tests |
| `build` | Cambios en dependencias o build |
| `ci` | Cambios en pipelines de CI/CD |
| `chore` | Tareas de mantenimiento |
| `infra` | Cambios de infraestructura |
| `revert` | Revertir un commit anterior |
| `merge` | Merge de ramas |

### Ejemplos válidos

```
feat(auth): add JWT login endpoint
fix: resolve null pointer in user service
docs: update README with Docker instructions
refactor(users): extract validation logic to separate method
test(projects): add integration tests for membership endpoints
```

### Ejemplos inválidos

```
arregle el bug
WIP
cambios
update
```

# Guía de contribución — Frontend

## Requisitos previos

Tener `node` y `npm` instalados. Al clonar el repositorio, instala las dependencias:

```bash
npm install
```

## Configuración inicial (solo la primera vez)

Al clonar el repositorio, ejecuta este comando para activar los hooks de git:

```bash
git config core.hooksPath .husky
```

---

## Antes de cada commit

Los hooks se ejecutan automáticamente sobre los archivos que tengas en stage. No necesitas correr nada manualmente, pero si quieres verificar tu código antes:

```bash
# Verificar lint en todo el proyecto
npm run lint

# Formatear archivos con prettier
npx prettier --write src/
```

> El hook solo analiza los archivos que hayas añadido con `git add`, no todo el proyecto.
> Esto significa que el código existente no bloquea tus commits, pero el código nuevo o
> modificado sí debe pasar las reglas.

---

## Pruebas E2E (Playwright)

Las pruebas E2E viven en `frontend/tests/e2e/` y asumen el frontend corriendo en `http://127.0.0.1:3000` y el backend en `http://localhost:8000`.

```bash
# (solo la primera vez) descargar browsers
npx playwright install

# ejecutar E2E
npm run test:e2e
```

---

## Reglas de formato y estilo

El proyecto usa **Prettier** con el plugin de Tailwind CSS para ordenar clases automáticamente.

| Regla           | Valor                                  |
| --------------- | -------------------------------------- |
| Comillas        | Dobles `"`                             |
| Punto y coma    | Sí                                     |
| Ancho de línea  | 80 caracteres                          |
| Indentación     | 2 espacios                             |
| Clases Tailwind | Ordenadas automáticamente por Prettier |

### Nomenclatura

| Elemento                | Convención                  | Ejemplo          |
| ----------------------- | --------------------------- | ---------------- |
| Componentes             | PascalCase                  | `UserCard.tsx`   |
| Hooks                   | camelCase con prefijo `use` | `useAuthUser.ts` |
| Variables y funciones   | camelCase                   | `getUserById`    |
| Constantes              | UPPER_SNAKE_CASE            | `API_BASE_URL`   |
| Archivos no-componentes | kebab-case                  | `auth-utils.ts`  |

### Reglas ESLint activas

- No llamar `setState` directamente dentro de `useEffect` (`react-hooks/set-state-in-effect`)
- Declarar todas las dependencias en arrays de `useEffect`/`useCallback`/`useMemo` (`react-hooks/exhaustive-deps`)
- No usar funciones impuras como `Date.now()` durante el render (`react-hooks/purity`)
- Escapar caracteres especiales en JSX como `'` → `&apos;` (`react/no-unescaped-entities`)

---

## Mensajes de commit

Se usa la convención **Conventional Commits**. El hook `commit-msg` rechazará cualquier mensaje que no cumpla el formato.

```
<tipo>(<alcance opcional>): <descripción>
```

### Tipos permitidos

| Tipo       | Cuándo usarlo                                      |
| ---------- | -------------------------------------------------- |
| `feat`     | Nueva funcionalidad                                |
| `fix`      | Corrección de bug                                  |
| `docs`     | Cambios en documentación                           |
| `style`    | Formato, espacios (sin cambios de lógica)          |
| `refactor` | Refactorización sin nueva funcionalidad ni bug fix |
| `perf`     | Mejoras de rendimiento                             |
| `test`     | Añadir o corregir tests                            |
| `build`    | Cambios en dependencias o build                    |
| `ci`       | Cambios en pipelines de CI/CD                      |
| `chore`    | Tareas de mantenimiento                            |
| `infra`    | Cambios de infraestructura                         |
| `revert`   | Revertir un commit anterior                        |
| `merge`    | Merge de ramas                                     |

### Ejemplos válidos

```
feat(sidebar): add collapsible submenu
fix: resolve broken link in navbar
style: format components with prettier
refactor(auth): extract token validation to hook
test(calendar): add unit tests for event creation
```

### Ejemplos inválidos

```
arregle el bug
WIP
cambios
update
```

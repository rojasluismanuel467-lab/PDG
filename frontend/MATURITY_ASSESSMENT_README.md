# Cuestionario de Madurez de Gobernanza de Datos

## 📋 Descripción

Prototipo funcional de un cuestionario de madurez de gobernanza de datos basado en **DAMA DMBook**. Permite evaluar el nivel de madurez de una organización en 6 dimensiones clave, con filtrado de preguntas por rol y generación de gráficos de araña.

## ✨ Características

- ✅ **Formulario adaptativo**: Las preguntas se filtran según el rol del respondente
- ✅ **8 Roles DAMA**: Data Owner, Steward, Custodian, Analyst, Architect, CDO, IT Manager, Business Manager
- ✅ **6 Dimensiones**: Gobernanza, Gestión, Arquitectura, Seguridad, Calidad, Tecnología
- ✅ **18 Preguntas**: 3-4 preguntas por dimensión con criterios de evaluación
- ✅ **Escala 0-5**: No pudo evaluar, Nulo, Insuficiente, Bueno, Muy Bueno, Excelente
- ✅ **Gráfico de Araña**: Visualización de resultados con Recharts
- ✅ **Cálculos de Madurez**: Puntuación ponderada por dimensión
- ✅ **Datos Mock**: 3 respondentes de demostración
- ✅ **Validación**: React Hook Form + Zod

## 🚀 Instalación

### 1. Instalar Dependencias

Las librerías necesarias ya están instaladas:

```bash
npm install recharts react-hook-form zod @hookform/resolvers --legacy-peer-deps
```

Si necesitas instalarlas manualmente:

```bash
cd /mnt/desktop/Exordio-Arq-Data-Pdg/frontend
npm install recharts react-hook-form zod @hookform/resolvers --legacy-peer-deps
```

### 2. Librerías Utilizadas

| Librería | Versión | Propósito |
|----------|---------|----------|
| `recharts` | ^2.x | Gráficos (Radar Chart) |
| `react-hook-form` | ^7.x | Gestión de formularios |
| `zod` | ^3.x | Validación de esquemas |
| `@hookform/resolvers` | ^3.x | Integración Zod + React Hook Form |
| `tailwindcss` | ^4.x | Estilos CSS |

## 📁 Estructura de Archivos

```
frontend/
├── src/
│   ├── app/
│   │   └── maturity-assessment/
│   │       └── page.tsx                 # Página principal
│   ├── components/
│   │   └── maturity/
│   │       ├── MaturityQuestionnaireForm.tsx    # Formulario
│   │       ├── MaturityRadarChart.tsx           # Gráfico
│   │       └── MaturityResultsSummary.tsx       # Resumen
│   ├── data/
│   │   └── maturityAssessmentMock.ts   # Datos mock y tipos
│   └── hooks/
│       └── useMaturityCalculation.ts   # Lógica de cálculos
└── MATURITY_ASSESSMENT_README.md       # Este archivo
```

## 🎯 Uso

### 1. Acceder a la Página

```
http://localhost:3000/maturity-assessment
```

### 2. Flujo de Usuario

#### Opción A: Responder el Cuestionario

1. Ingresa tu nombre y email
2. Selecciona tu rol (Data Owner, Steward, etc.)
3. Responde las preguntas filtradas para tu rol
4. Navega entre dimensiones
5. Envía las respuestas
6. Visualiza los resultados

#### Opción B: Ver Demostración

1. Haz clic en "Ver Demostración"
2. Observa los resultados con datos mock
3. Visualiza el gráfico de araña
4. Lee el resumen de resultados

### 3. Datos Mock

El sistema incluye 3 respondentes de demostración:

- **Juan García** (Data Owner): Puntuación general 3.22
- **María López** (Data Steward): Puntuación general 3.22
- **Carlos Rodríguez** (Data Analyst): Puntuación general 3.22

## 🧮 Cálculos de Madurez

### Fórmula de Puntuación por Dimensión

```
Puntuación = (Suma de respuestas) / (Número de respuestas)

Ejemplo:
Dimensión "Gobernanza" con 4 preguntas:
- Respondente 1: 4 + 3 + 4 + 3 = 14 / 4 = 3.5
- Respondente 2: 3 + 2 + 3 + 2 = 10 / 4 = 2.5
- Respondente 3: 4 + 3 + 5 + 3 = 15 / 4 = 3.75

Promedio Final = (3.5 + 2.5 + 3.75) / 3 = 3.25
```

### Fórmula de Puntuación General Ponderada

```
Puntuación Final = Σ(Dimensión × Peso)

Pesos:
- Gobernanza: 25%
- Gestión: 20%
- Arquitectura: 15%
- Seguridad: 20%
- Calidad: 15%
- Tecnología: 5%

Ejemplo:
(3.25 × 0.25) + (3.67 × 0.20) + (3.0 × 0.15) + 
(2.67 × 0.20) + (3.33 × 0.15) + (2.33 × 0.05) = 3.22
```

### Niveles de Madurez

| Rango | Nivel | Descripción |
|-------|-------|-------------|
| 0.0 - 1.5 | Inicial | Procesos caóticos, no documentados |
| 1.5 - 2.5 | Repetible | Algunos procesos documentados |
| 2.5 - 3.5 | Definido | Procesos estandarizados |
| 3.5 - 4.5 | Gestionado | Procesos monitoreados |
| 4.5 - 5.0 | Optimizado | Mejora continua |

## 🔌 Integración con Backend

El frontend está listo para conectarse a FastAPI. Los endpoints esperados son:

### 1. Enviar Respuestas

```
POST /api/v1/maturity-assessments/{assessmentId}/responses
```

**Request:**
```json
{
  "respondentName": "Juan García",
  "respondentEmail": "juan@empresa.com",
  "role": "data-owner",
  "answers": {
    "1": 4,
    "2": 3,
    ...
  }
}
```

**Response:**
```json
{
  "id": "response-123",
  "assessmentId": "assessment-123",
  "message": "Respuestas guardadas exitosamente"
}
```

### 2. Obtener Resultados

```
GET /api/v1/maturity-assessments/{assessmentId}/results
```

**Response:**
```json
{
  "assessmentId": "assessment-123",
  "overallScore": 3.22,
  "byDimension": [
    {
      "dimensionId": 1,
      "dimensionName": "Gobernanza y Organización",
      "score": 3.33,
      "weight": 0.25
    },
    ...
  ],
  "radarData": [...]
}
```

**Ver:** `BACKEND_REQUIREMENTS.md` para especificación completa

## 📝 Componentes Principales

### MaturityQuestionnaireForm.tsx

Formulario adaptativo con:
- Validación con Zod
- Filtrado de preguntas por rol
- Navegación entre dimensiones
- Barra de progreso
- Criterios de evaluación

**Props:**
```typescript
interface MaturityQuestionnaireFormProps {
  onSubmit: (data: QuestionnaireFormData) => void;
  isLoading?: boolean;
}
```

### MaturityRadarChart.tsx

Gráfico de araña con:
- 6 ejes (dimensiones)
- Escala 0-5
- Leyenda de colores
- Tooltips interactivos

**Props:**
```typescript
interface MaturityRadarChartProps {
  data: Array<{
    dimension: string;
    score: number;
    fullMark: number;
  }>;
  title?: string;
}
```

### MaturityResultsSummary.tsx

Resumen de resultados con:
- Puntuación general
- Resultados por dimensión
- Interpretación de niveles
- Recomendaciones

**Props:**
```typescript
interface MaturityResultsSummaryProps {
  results: MaturityResult[];
  overallScore: number;
  respondentCount: number;
}
```

## 🎨 Estilos

El proyecto utiliza **Tailwind CSS** para todos los estilos. Los componentes incluyen:

- Colores según escala de evaluación
- Diseño responsivo
- Animaciones suaves
- Accesibilidad

## 🔍 Debugging

### Ver datos mock

```typescript
import { MOCK_RESPONSES, QUESTIONNAIRE_QUESTIONS } from '@/data/maturityAssessmentMock';

console.log(MOCK_RESPONSES);
console.log(QUESTIONNAIRE_QUESTIONS);
```

### Ver cálculos

```typescript
import { useMaturityCalculation } from '@/hooks/useMaturityCalculation';

const results = useMaturityCalculation(responses);
console.log(results);
```

## 🧪 Pruebas

### Prueba 1: Formulario Básico

1. Accede a `/maturity-assessment`
2. Completa el formulario
3. Verifica que las preguntas se filtren por rol
4. Envía las respuestas

### Prueba 2: Validación

1. Intenta enviar sin completar todas las preguntas
2. Verifica que muestre error
3. Completa y envía correctamente

### Prueba 3: Gráfico

1. Envía respuestas
2. Verifica que el gráfico se genere correctamente
3. Comprueba que los colores correspondan a la escala

### Prueba 4: Cálculos

1. Verifica que la puntuación general sea correcta
2. Comprueba que los pesos se apliquen correctamente
3. Valida que los niveles de madurez sean correctos

## 📊 Ejemplo de Resultado

```
Puntuación General: 3.22 / 5.0 (64%)
Nivel: Definido

Por Dimensión:
- Gobernanza: 3.33 (Definido)
- Gestión: 3.67 (Definido)
- Arquitectura: 3.0 (Definido)
- Seguridad: 2.67 (Insuficiente)
- Calidad: 3.33 (Definido)
- Tecnología: 2.33 (Insuficiente)
```

## 🚀 Próximos Pasos

1. **Backend**: Implementar endpoints en FastAPI
2. **BD**: Crear tablas en PostgreSQL/MySQL
3. **Autenticación**: Integrar con sistema de usuarios
4. **Exportación**: Agregar opción para descargar PDF
5. **Histórico**: Guardar evaluaciones anteriores
6. **Comparación**: Comparar evaluaciones en el tiempo

## 📚 Referencias

- [DAMA DMBook](https://www.dama.org/)
- [Recharts Documentation](https://recharts.org/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)

## 🤝 Contribuciones

Para agregar nuevas preguntas o dimensiones:

1. Edita `src/data/maturityAssessmentMock.ts`
2. Agrega las preguntas al array `QUESTIONNAIRE_QUESTIONS`
3. Actualiza los pesos en `MATURITY_DIMENSIONS` si es necesario
4. Prueba el formulario

## 📞 Soporte

Para problemas o preguntas:

1. Revisa `BACKEND_REQUIREMENTS.md` para especificación técnica
2. Consulta los tipos en `maturityAssessmentMock.ts`
3. Verifica los cálculos en `useMaturityCalculation.ts`

---

**Versión:** 1.0  
**Fecha:** 21 de Marzo de 2026  
**Basado en:** DAMA DMBook Framework

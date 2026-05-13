import type { AgentMessage, ADMPhase, DocumentSection } from "./types";

export function buildGreeting(
  consultorNombre: string,
  phase: ADMPhase
): string {
  const estadoTexto: Record<string, string> = {
    completado: "completada",
    en_revision: "en revisión por la empresa",
    en_progreso: "en progreso",
    pendiente: "pendiente de inicio",
  };
  return `Hola, ${consultorNombre}. Estoy revisando el proyecto **Transformación Digital - Empresa ABC**.\n\nLa fase activa actualmente es **${phase.nombre}**, que se encuentra ${estadoTexto[phase.estado]}.\n\n¿Deseas que abramos el proyecto y revisemos el estado del documento?`;
}

export function buildDocumentStatus(sections: DocumentSection[]): string {
  const completas = sections.filter((s) => s.estado === "completo");
  const incompletas = sections.filter((s) => s.estado === "incompleto");
  const vacias = sections.filter((s) => s.estado === "vacio");

  const lines: string[] = [
    `He revisado el documento de esta fase. Aquí el estado actual:\n`,
    `**Secciones completas (${completas.length}):**`,
    ...completas.map((s) => `- ${s.codigo_seccion} · ${s.titulo}`),
  ];

  if (incompletas.length > 0) {
    lines.push(`\n**Secciones incompletas (${incompletas.length}):**`);
    lines.push(...incompletas.map((s) => `- ${s.codigo_seccion} · ${s.titulo}`));
  }

  if (vacias.length > 0) {
    lines.push(`\n**Secciones vacías (${vacias.length}):**`);
    lines.push(...vacias.map((s) => `- ${s.codigo_seccion} · ${s.titulo}`));
  }

  if (vacias.length > 0 || incompletas.length > 0) {
    const primera = incompletas[0] ?? vacias[0];
    lines.push(
      `\nTe propongo que trabajemos en **${primera.codigo_seccion} · ${primera.titulo}**. ¿Comenzamos?`
    );
  } else {
    lines.push(
      `\nTodas las secciones están completas. ¿Deseas enviar el documento a revisión de la empresa?`
    );
  }

  return lines.join("\n");
}

export const SECTION_QUESTIONS: Record<string, string[]> = {
  "B.2": [
    "Para la arquitectura To-Be de negocio, necesito entender la visión objetivo. ¿Cuáles son los 3 procesos que la empresa considera más críticos de transformar en los próximos 12 meses?",
    "¿La organización planea crear nuevas unidades de negocio o restructurar las existentes como parte de la transformación?",
    "¿Qué roles o cargos nuevos se anticipan como resultado de la transformación digital?",
  ],
  "B.3": [
    "Para el análisis de brechas de negocio, comparemos el estado actual con el objetivo. ¿Cuáles son las principales brechas que identifica el equipo directivo entre cómo operan hoy y cómo desean operar?",
    "¿Existen iniciativas de mejora de procesos que ya están en curso y que debemos considerar como parte del estado de transición?",
    "¿Qué nivel de madurez en gestión de procesos tiene actualmente la organización? (Inicial / Definido / Gestionado / Optimizado)",
  ],
};

export function getQuestionsForSection(sectionCode: string): string {
  const questions = SECTION_QUESTIONS[sectionCode];
  if (!questions) {
    return `Para completar la sección **${sectionCode}**, necesito que me proporciones la información correspondiente. Puedes escribirla directamente o adjuntar un archivo con el contenido relevante.`;
  }
  return questions[0];
}

export function buildSectionIncorporated(
  sectionTitle: string,
  remainingCount: number
): string {
  const remaining =
    remainingCount > 0
      ? `Quedan **${remainingCount} sección${remainingCount > 1 ? "es" : ""}** por completar.`
      : `Este era el último ítem pendiente. El documento está **completo**. ¿Deseas enviarlo a revisión de la empresa?`;
  return `He incorporado tu respuesta a la sección **${sectionTitle}**. ${remaining}`;
}

export function buildCompletionNotice(): string {
  return `El documento de esta fase está **completo**. Todas las secciones obligatorias han sido llenadas.\n\n¿Deseas enviarlo ahora para revisión de la empresa?`;
}

export function buildSentToReview(): string {
  return `El documento ha sido enviado a la empresa para su revisión. El estado de la fase ahora es **"En revisión"**.\n\nTe notificaré cuando la empresa responda con comentarios o apruebe el documento.`;
}

export interface MockAgentOptions {
  consultorNombre: string;
  phase: ADMPhase;
  sections: DocumentSection[];
}

// Simulates agent response with a delay
export function simulateAgentReply(
  content: string,
  onReply: (msg: AgentMessage) => void,
  delayMs = 1400
): void {
  setTimeout(() => {
    onReply({
      id: `agent-${Date.now()}`,
      role: "assistant",
      content,
      timestamp: new Date(),
    });
  }, delayMs);
}

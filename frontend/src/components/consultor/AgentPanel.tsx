"use client";
import React, { useState, useRef, useEffect } from "react";
import { ChatWindow } from "@/components/chat";
import AgentAvatar from "@/components/agent/AgentAvatar";
import type { Message } from "@/components/chat";
import type { AgentMessage, DocumentSection } from "@/lib/types";
import {
  buildGreeting,
  buildDocumentStatus,
  buildSectionIncorporated,
  buildSentToReview,
  getQuestionsForSection,
  simulateAgentReply,
} from "@/lib/mock-agent";
import {
  MOCK_CONSULTOR,
  MOCK_PHASES,
  SECTIONS_FASE_B,
} from "@/lib/mock-data";

// Convert AgentMessage to Message for ChatWindow
function toMsg(m: AgentMessage): Message {
  return { id: m.id, role: m.role as "user" | "assistant" | "system", content: m.content, timestamp: m.timestamp };
}

type AgentStep = "greeting" | "status" | "guiding" | "complete" | "sent";

export default function AgentPanel() {
  const activePhase = MOCK_PHASES.find((p) => p.codigo_fase === "B")!;
  const [sections, setSections] = useState<DocumentSection[]>(SECTIONS_FASE_B);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<AgentStep>("greeting");
  const [targetSection, setTargetSection] = useState<DocumentSection | null>(null);
  const initialized = useRef(false);

  // Boot sequence
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const greeting = buildGreeting(MOCK_CONSULTOR.nombre, activePhase);
    setIsLoading(true);
    simulateAgentReply(
      greeting,
      (msg) => {
        setMessages([toMsg(msg)]);
        setIsLoading(false);
        setStep("greeting");
      },
      900
    );
  }, [activePhase]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    if (step === "greeting") {
      // User confirmed → show document status
      simulateAgentReply(buildDocumentStatus(sections), (msg) => {
        setMessages((prev) => [...prev, toMsg(msg)]);
        setIsLoading(false);
        // Find first incomplete/empty section
        const first = sections.find((s) => s.estado !== "completo") ?? null;
        setTargetSection(first);
        setStep("status");
      });
    } else if (step === "status") {
      // User said yes → ask first question
      if (targetSection) {
        simulateAgentReply(getQuestionsForSection(targetSection.codigo_seccion), (msg) => {
          setMessages((prev) => [...prev, toMsg(msg)]);
          setIsLoading(false);
          setStep("guiding");
        });
      }
    } else if (step === "guiding" && targetSection) {
      // Incorporate the answer
      setSections((prev) =>
        prev.map((s) =>
          s.id === targetSection.id
            ? { ...s, estado: "completo", contenido_actual: input.trim() }
            : s
        )
      );
      const remaining = sections.filter(
        (s) => s.estado !== "completo" && s.id !== targetSection.id
      ).length;
      simulateAgentReply(
        buildSectionIncorporated(targetSection.titulo, remaining),
        (msg) => {
          setMessages((prev) => [...prev, toMsg(msg)]);
          setIsLoading(false);
          if (remaining === 0) {
            setStep("complete");
          } else {
            const next = sections.find(
              (s) => s.estado !== "completo" && s.id !== targetSection.id
            );
            setTargetSection(next ?? null);
            setStep("status");
          }
        }
      );
    } else if (step === "complete") {
      // User confirmed send to review
      simulateAgentReply(buildSentToReview(), (msg) => {
        setMessages((prev) => [...prev, toMsg(msg)]);
        setIsLoading(false);
        setStep("sent");
      });
    }
  };

  const incomplete = sections.filter((s) => s.estado !== "completo").length;
  const complete = sections.filter((s) => s.estado === "completo").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 h-[calc(100vh-160px)]">
      {/* Chat */}
      <ChatWindow
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        agentName="Archi"
        agentStatus={isLoading ? "thinking" : "online"}
        agentModel="TOGAF ADM Agent"
        isLoading={isLoading}
        placeholder="Responde al agente…"
        className="h-full"
      />

      {/* Document status sidebar */}
      <div className="flex flex-col gap-3 overflow-y-auto">
        {/* Agent identity */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <AgentAvatar name="Archi" status={isLoading ? "thinking" : "online"} size="large" />
          <div>
            <p className="font-semibold text-gray-800 dark:text-white/90 text-sm">Archi</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Agente TOGAF ADM</p>
          </div>
        </div>

        {/* Phase & completeness */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.04] space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Fase B — Arquitectura de Negocio
          </p>
          <div className="flex gap-4 text-center">
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-900 dark:text-white/90">{complete}</p>
              <p className="text-xs text-gray-400">Completas</p>
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-gray-500 dark:text-white/40">{incomplete}</p>
              <p className="text-xs text-gray-400">Pendientes</p>
            </div>
          </div>
          {/* Section list */}
          <div className="space-y-2">
            {sections.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    s.estado === "completo"
                      ? "bg-gray-900 dark:bg-white/70"
                      : s.estado === "incompleto"
                      ? "bg-gray-400 dark:bg-white/30"
                      : "bg-gray-200 dark:bg-white/10"
                  }`}
                />
                <span className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                  {s.codigo_seccion} · {s.titulo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

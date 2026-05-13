"use client";

import React, { useState } from "react";
import { AgentAvatar, AgentCard, AgentStatusBadge } from "@/components/agent";
import { ChatWindow, ChatHistory } from "@/components/chat";
import { Timeline } from "@/components/timeline";
import type { Message } from "@/components/chat";
import type { ChatSection } from "@/components/chat";
import type { Milestone } from "@/components/timeline";

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_SECTIONS: ChatSection[] = [
  {
    id: "1",
    title: "Project architecture review",
    preview: "Can you help me design the microservice layout?",
    timestamp: new Date(Date.now() - 3 * 60_000),
    unread: 2,
    pinned: true,
  },
  {
    id: "2",
    title: "Bug in auth flow",
    preview: "The JWT refresh is failing silently on mobile",
    timestamp: new Date(Date.now() - 25 * 60_000),
    pinned: true,
  },
  {
    id: "3",
    title: "Dashboard components",
    preview: "I need a timeline and chat UI for agents",
    timestamp: new Date(Date.now() - 2 * 3_600_000),
  },
  {
    id: "4",
    title: "Performance optimisation",
    preview: "LCP is at 4.2s on mobile — ideas?",
    timestamp: new Date(Date.now() - 86_400_000),
  },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "sys-1",
    role: "system",
    content: "Conversation started",
    timestamp: new Date(Date.now() - 10 * 60_000),
  },
  {
    id: "msg-1",
    role: "user",
    content: "Hey! Can you help me build a conversational AI UI for my dashboard?",
    timestamp: new Date(Date.now() - 9 * 60_000),
    status: "sent",
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "Absolutely! I'd suggest splitting it into four pieces: a ChatHistory sidebar for navigation, a ChatWindow for the conversation itself, ChatMessage for individual bubbles, and ChatInput for the composer. Want me to scaffold those out?",
    timestamp: new Date(Date.now() - 8 * 60_000),
  },
  {
    id: "msg-3",
    role: "user",
    content: "Yes please — and add a timeline for project milestones too.",
    timestamp: new Date(Date.now() - 7 * 60_000),
    status: "sent",
  },
  {
    id: "msg-4",
    role: "assistant",
    content:
      "Done! The Timeline component accepts an array of milestones with status values (completed, current, upcoming, failed) and renders the connector lines automatically. The compact variant strips descriptions for tight layouts.",
    timestamp: new Date(Date.now() - 6 * 60_000),
  },
];

const DEMO_MILESTONES: Milestone[] = [
  {
    id: "m1",
    title: "Project kickoff",
    description: "Stakeholder alignment, scope definition, and team onboarding completed.",
    date: "Jan 10",
    status: "completed",
  },
  {
    id: "m2",
    title: "Design system",
    description: "Tokens, components, and Figma library shipped to engineering.",
    date: "Jan 24",
    status: "completed",
    badge: "v1.0",
  },
  {
    id: "m3",
    title: "Alpha release",
    description: "Core dashboard with authentication and main data views deployed to staging.",
    date: "Feb 14",
    status: "completed",
  },
  {
    id: "m4",
    title: "AI agent integration",
    description: "Chat, timeline, and agent-avatar components in progress.",
    date: "Feb 28",
    status: "current",
    badge: "In progress",
  },
  {
    id: "m5",
    title: "Beta testing",
    description: "External testers invited; feedback cycle begins.",
    date: "Mar 15",
    status: "upcoming",
  },
  {
    id: "m6",
    title: "Public launch",
    description: "Production deployment, monitoring, and go-to-market.",
    date: "Apr 1",
    status: "upcoming",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiComponentsPage() {
  const [activeSection, setActiveSection] = useState("3");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      status: "sent",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate assistant reply
    setTimeout(() => {
      const reply: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "This is a template — wire me up to your real AI endpoint!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsLoading(false);
    }, 1800);
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* ── Section title ── */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">AI Components</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Chat, timeline, and agent-avatar components — ready to wire up.
        </p>
      </div>

      {/* ── Agent avatars & cards ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Agent Avatars
        </h2>

        {/* Size showcase */}
        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          {(["xsmall", "small", "medium", "large", "xlarge", "xxlarge"] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <AgentAvatar name="Nova AI" status="online" size={size} />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{size}</span>
            </div>
          ))}
          <div className="ml-4 flex flex-col items-center gap-2">
            <AgentAvatar name="Nova AI" status="thinking" size="large" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">thinking</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AgentAvatar name="Nova AI" status="busy" size="large" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">busy</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AgentAvatar name="Nova AI" status="offline" size="large" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">offline</span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <AgentStatusBadge status="online" />
          <AgentStatusBadge status="thinking" />
          <AgentStatusBadge status="busy" />
          <AgentStatusBadge status="offline" />
          <AgentStatusBadge status="online" showLabel={false} />
        </div>

        {/* Agent cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AgentCard
            name="Nova"
            role="General-purpose assistant"
            model="claude-sonnet-4-6"
            status="online"
            capabilities={["Code review", "Summarisation", "Q&A"]}
            actions={
              <button className="btn-primary w-full justify-center">
                Open chat
              </button>
            }
          />
          <AgentCard
            name="Aria"
            role="Data analysis specialist"
            model="claude-opus-4-6"
            status="thinking"
            capabilities={["SQL", "Visualisation", "Forecasting"]}
          />
          <AgentCard
            name="Bolt"
            role="DevOps automation agent"
            model="claude-haiku-4-5"
            status="busy"
            capabilities={["CI/CD", "IaC", "Monitoring"]}
          />
        </div>
      </section>

      {/* ── Chat + History ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Chat Window
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <ChatHistory
            sections={DEMO_SECTIONS}
            activeId={activeSection}
            onSelect={setActiveSection}
            onNew={() => setActiveSection("")}
            className="h-[560px]"
          />
          <ChatWindow
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            agentName="Nova"
            agentStatus={isLoading ? "thinking" : "online"}
            agentModel="claude-sonnet-4-6"
            isLoading={isLoading}
            placeholder="Ask Nova anything…"
            className="h-[560px]"
          />
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Milestone Timeline
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Timeline
            title="Project roadmap"
            milestones={DEMO_MILESTONES}
            card
          />
          <Timeline
            title="Compact view"
            milestones={DEMO_MILESTONES}
            variant="compact"
            card
          />
        </div>
      </section>
    </div>
  );
}

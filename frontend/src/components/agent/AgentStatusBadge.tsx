import React from "react";
import type { AgentStatus } from "./AgentAvatar";

interface AgentStatusBadgeProps {
  status: AgentStatus;
  showLabel?: boolean;
  className?: string;
}

const config: Record<
  AgentStatus,
  { dot: string; label: string; text: string; bg: string; pulse: boolean }
> = {
  online: {
    dot: "bg-white/80 dark:bg-white/70",
    label: "Online",
    text: "text-gray-700 dark:text-white/70",
    bg: "bg-gray-100 dark:bg-white/[0.06]",
    pulse: false,
  },
  offline: {
    dot: "bg-gray-400 dark:bg-white/20",
    label: "Offline",
    text: "text-gray-500 dark:text-white/30",
    bg: "bg-gray-100 dark:bg-white/[0.03]",
    pulse: false,
  },
  busy: {
    dot: "bg-gray-500 dark:bg-white/30",
    label: "Busy",
    text: "text-gray-600 dark:text-white/50",
    bg: "bg-gray-100 dark:bg-white/[0.05]",
    pulse: false,
  },
  thinking: {
    dot: "bg-gray-400 dark:bg-white/40",
    label: "Thinking…",
    text: "text-gray-500 dark:text-white/40",
    bg: "bg-gray-100 dark:bg-white/[0.04]",
    pulse: true,
  },
};

const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({
  status,
  showLabel = true,
  className = "",
}) => {
  const { dot, label, text, bg, pulse } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-theme-xs font-medium ${bg} ${text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`} />
      {showLabel && label}
    </span>
  );
};

export default AgentStatusBadge;

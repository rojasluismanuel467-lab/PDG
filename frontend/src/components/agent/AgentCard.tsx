import React from "react";
import AgentAvatar from "./AgentAvatar";
import AgentStatusBadge from "./AgentStatusBadge";
import type { AgentStatus } from "./AgentAvatar";

interface AgentCardProps {
  name: string;
  role: string;
  model?: string;
  status?: AgentStatus;
  avatarSrc?: string;
  capabilities?: string[];
  actions?: React.ReactNode;
  className?: string;
}

const AgentCard: React.FC<AgentCardProps> = ({
  name,
  role,
  model,
  status = "offline",
  avatarSrc,
  capabilities = [],
  actions,
  className = "",
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.04] ${className}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <AgentAvatar name={name} src={avatarSrc} status={status} size="large" />

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
            {name}
          </h4>
          <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">{role}</p>
          {model && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/[0.08] dark:text-white/60">
              {model}
            </span>
          )}
        </div>

        <AgentStatusBadge status={status} className="shrink-0" />
      </div>

      {/* Capabilities */}
      {capabilities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {capabilities.map((cap) => (
            <span
              key={cap}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600 dark:bg-white/[0.06] dark:text-white/50"
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Actions slot */}
      {actions && (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/[0.06]">{actions}</div>
      )}
    </div>
  );
};

export default AgentCard;

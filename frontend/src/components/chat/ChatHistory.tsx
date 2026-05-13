"use client";

import React from "react";

export interface ChatSection {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  unread?: number;
  pinned?: boolean;
}

interface ChatHistoryProps {
  sections: ChatSection[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew?: () => void;
  className?: string;
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const PlusIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
);

const PinIcon = () => (
  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 12V4a1 1 0 00-1-1H9a1 1 0 00-1 1v8l-2 3h14l-2-3zM12 22a2 2 0 002-2h-4a2 2 0 002 2z" />
  </svg>
);

interface SectionItemProps {
  section: ChatSection;
  isActive: boolean;
  onSelect: (id: string) => void;
}

const SectionItem: React.FC<SectionItemProps> = ({ section, isActive, onSelect }) => (
  <button
    onClick={() => onSelect(section.id)}
    className={`group w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
      isActive
        ? "bg-gray-100 dark:bg-white/[0.08]"
        : "hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    }`}
  >
    <div className="flex items-start gap-2">
      {section.pinned && (
        <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
          <PinIcon />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`truncate text-sm font-medium ${
              isActive
                ? "text-gray-900 dark:text-white/90"
                : "text-gray-700 dark:text-white/80"
            }`}
          >
            {section.title}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {section.unread ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-700 dark:bg-white/30 text-[9px] font-bold text-white dark:text-white/90">
                {section.unread > 9 ? "9+" : section.unread}
              </span>
            ) : null}
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {formatRelativeTime(section.timestamp)}
            </span>
          </div>
        </div>

        <p className="mt-0.5 truncate text-theme-xs text-gray-400 dark:text-gray-500">
          {section.preview}
        </p>
      </div>
    </div>
  </button>
);

const ChatHistory: React.FC<ChatHistoryProps> = ({
  sections,
  activeId,
  onSelect,
  onNew,
  className = "",
}) => {
  const pinned = sections.filter((s) => s.pinned);
  const recent = sections.filter((s) => !s.pinned);

  return (
    <aside
      className={`flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.04] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Conversations</h3>
        {onNew && (
          <button
            onClick={onNew}
            aria-label="New conversation"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/80"
          >
            <PlusIcon />
          </button>
        )}
      </div>

      {/* Scrollable section list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 pt-1">
        {pinned.length > 0 && (
          <div className="mb-1">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Pinned
            </p>
            <div className="space-y-0.5">
              {pinned.map((s) => (
                <SectionItem key={s.id} section={s} isActive={activeId === s.id} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}

        {recent.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Recent
              </p>
            )}
            <div className="space-y-0.5">
              {recent.map((s) => (
                <SectionItem key={s.id} section={s} isActive={activeId === s.id} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}

        {sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No conversations yet</p>
            {onNew && (
              <button
                onClick={onNew}
                className="mt-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80"
              >
                Start one
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default ChatHistory;

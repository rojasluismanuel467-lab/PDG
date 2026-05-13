"use client";

import React, { useRef, useEffect } from "react";
import AgentAvatar from "../agent/AgentAvatar";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import type { Message } from "./ChatMessage";
import type { AgentStatus } from "../agent/AgentAvatar";

interface ChatWindowProps {
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  agentName?: string;
  agentSrc?: string;
  agentStatus?: AgentStatus;
  agentModel?: string;
  userName?: string;
  userSrc?: string;
  isLoading?: boolean;
  placeholder?: string;
  /** Extra buttons rendered inside ChatInput's left slot */
  inputActions?: React.ReactNode;
  className?: string;
}

const statusDotColors: Record<AgentStatus, string> = {
  online:   "bg-success-500 dark:bg-white/70",
  offline:  "bg-gray-400   dark:bg-white/20",
  busy:     "bg-error-500  dark:bg-white/30",
  thinking: "bg-warning-400 dark:bg-white/40 animate-pulse",
};

const statusLabels: Record<AgentStatus, string> = {
  online: "Online",
  offline: "Offline",
  busy: "Busy",
  thinking: "Thinking…",
};

const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce dark:bg-white/40 [animation-delay:0ms]" />
    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce dark:bg-white/40 [animation-delay:150ms]" />
    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce dark:bg-white/40 [animation-delay:300ms]" />
  </div>
);

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  input,
  onInputChange,
  onSend,
  agentName = "AI Assistant",
  agentSrc,
  agentStatus = "online",
  agentModel,
  userName = "You",
  userSrc,
  isLoading = false,
  placeholder,
  inputActions,
  className = "",
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] ${className}`}
    >
      {/* Agent header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
        <AgentAvatar name={agentName} src={agentSrc} status={agentStatus} size="small" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
            {agentName}
          </h3>
          <p className="flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDotColors[agentStatus]}`}
            />
            {statusLabels[agentStatus]}
            {agentModel && <span>· {agentModel}</span>}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-4 py-4">
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
            <AgentAvatar name={agentName} src={agentSrc} size="xxlarge" showStatus={false} />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-white/70">
                Start a conversation with {agentName}
              </p>
              {agentModel && (
                <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">{agentModel}</p>
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            agentName={agentName}
            agentSrc={agentSrc}
            userName={userName}
            userSrc={userSrc}
          />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <AgentAvatar name={agentName} src={agentSrc} size="small" status="thinking" />
            <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 dark:bg-white/[0.06]">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-100 p-3 dark:border-white/[0.06]">
        <ChatInput
          value={input}
          onChange={onInputChange}
          onSend={onSend}
          disabled={isLoading}
          placeholder={placeholder}
          actions={inputActions}
        />
      </div>
    </div>
  );
};

export default ChatWindow;

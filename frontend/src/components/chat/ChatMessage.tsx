import React from "react";
import AgentAvatar from "../agent/AgentAvatar";

export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "sending" | "sent" | "error";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
}

interface ChatMessageProps {
  message: Message;
  agentName?: string;
  agentSrc?: string;
  userName?: string;
  userSrc?: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  agentName = "AI Assistant",
  agentSrc,
  userName = "You",
  userSrc,
}) => {
  const isUser = message.role === "user";

  // System messages render as a centered pill
  if (message.role === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-theme-xs text-gray-500 dark:bg-white/[0.06] dark:border dark:border-white/[0.08] dark:text-gray-400">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <AgentAvatar
        name={isUser ? userName : agentName}
        src={isUser ? userSrc : agentSrc}
        size="small"
        showStatus={!isUser}
        status="online"
        className="mt-0.5 shrink-0"
      />

      <div className={`flex max-w-[75%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {/* Sender & time */}
        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
          {isUser ? userName : agentName} · {formatTime(message.timestamp)}
        </span>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-[#0F172A] text-white dark:bg-white dark:text-[#000000]"
              : "rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-white/[0.07] dark:border dark:border-white/[0.06] dark:text-white/90"
          }`}
        >
          {message.content}
        </div>

        {/* Status feedback */}
        {message.status === "error" && (
          <span className="text-theme-xs text-error-500">Failed to send · Retry</span>
        )}
        {message.status === "sending" && (
          <span className="text-theme-xs text-gray-400 dark:text-gray-500">Sending…</span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

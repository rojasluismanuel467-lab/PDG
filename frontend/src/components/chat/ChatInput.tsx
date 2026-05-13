"use client";

import React, { useRef, useEffect, KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxRows?: number;
  /** Optional action buttons rendered to the left of the send button */
  actions?: React.ReactNode;
}

const SendIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L15 22l-4-9-9-4 20-7z" />
  </svg>
);

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type a message…",
  maxRows = 6,
  actions,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to maxRows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * maxRows)}px`;
  }, [value, maxRows]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-theme-xs dark:border-white/[0.08] dark:bg-white/[0.04]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="block w-full resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white/90 dark:placeholder:text-gray-500"
      />

      <div className="mt-2 flex items-center justify-between">
        {/* Left slot for extra actions (attach, emoji, etc.) */}
        <div className="flex items-center gap-1">{actions}</div>

        <div className="flex items-center gap-2">
          <span className="hidden text-theme-xs text-gray-400 dark:text-gray-500 sm:block">
            ⏎ Send · ⇧⏎ Newline
          </span>
          <button
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              canSend
                ? "bg-brand-500 text-white hover:bg-brand-600 dark:bg-white dark:text-[#000000] dark:hover:bg-gray-100"
                : "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-white/20"
            }`}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;

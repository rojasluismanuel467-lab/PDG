import Image from "next/image";
import React from "react";

export type AgentStatus = "online" | "offline" | "busy" | "thinking";
export type AgentAvatarSize = "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";

interface AgentAvatarProps {
  name: string;
  src?: string;
  status?: AgentStatus;
  size?: AgentAvatarSize;
  showStatus?: boolean;
  className?: string;
}

const sizeClasses: Record<AgentAvatarSize, string> = {
  xsmall: "h-6 w-6 max-w-6",
  small: "h-8 w-8 max-w-8",
  medium: "h-10 w-10 max-w-10",
  large: "h-12 w-12 max-w-12",
  xlarge: "h-14 w-14 max-w-14",
  xxlarge: "h-16 w-16 max-w-16",
};

const textSizeClasses: Record<AgentAvatarSize, string> = {
  xsmall: "text-[10px]",
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
  xlarge: "text-lg",
  xxlarge: "text-xl",
};

const statusDotClasses: Record<AgentAvatarSize, string> = {
  xsmall: "h-1.5 w-1.5 max-w-1.5",
  small: "h-2 w-2 max-w-2",
  medium: "h-2.5 w-2.5 max-w-2.5",
  large: "h-3 w-3 max-w-3",
  xlarge: "h-3.5 w-3.5 max-w-3.5",
  xxlarge: "h-4 w-4 max-w-4",
};

const statusColorClasses: Record<AgentStatus, string> = {
  online:   "bg-success-500 dark:bg-white/70",
  offline:  "bg-gray-400   dark:bg-white/20",
  busy:     "bg-error-500  dark:bg-white/30",
  thinking: "bg-warning-400 dark:bg-white/40",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AgentAvatar: React.FC<AgentAvatarProps> = ({
  name,
  src,
  status = "offline",
  size = "medium",
  showStatus = true,
  className = "",
}) => {
  return (
    <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
      {/* Avatar image or initials */}
      <div
        className={`flex items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-white dark:ring-black bg-gradient-to-br from-gray-500 to-gray-800 dark:from-white/20 dark:to-white/[0.06] ${sizeClasses[size]} ${textSizeClasses[size]}`}
      >
        {src ? (
          <Image
            width={0}
            height={0}
            sizes="100vw"
            src={src}
            alt={name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {/* Status dot */}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-[1.5px] border-white dark:border-black ${statusDotClasses[size]} ${statusColorClasses[status]} ${status === "thinking" ? "animate-pulse" : ""}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

export default AgentAvatar;

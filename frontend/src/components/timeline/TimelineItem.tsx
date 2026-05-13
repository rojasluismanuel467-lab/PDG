import React from "react";

export type MilestoneStatus = "completed" | "current" | "upcoming" | "failed";

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  date?: string;
  status: MilestoneStatus;
  /** Override the default icon inside the dot */
  icon?: React.ReactNode;
  /** Small label tag rendered next to the title */
  badge?: string;
}

interface TimelineItemProps {
  milestone: Milestone;
  isLast?: boolean;
  variant?: "default" | "compact";
}

// --- Icon helpers ---
const CheckIcon = () => (
  <svg
    className="h-3 w-3 text-gray-700 dark:text-gray-800"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const XIcon = () => (
  <svg
    className="h-3 w-3 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

// --- Style maps ---
const dotStyles: Record<MilestoneStatus, string> = {
  completed: "bg-gradient-to-b from-white to-gray-200 dark:from-white dark:to-gray-300 ring-gray-200 dark:ring-white/20 shadow-sm",
  current:   "bg-gradient-to-b from-white to-gray-300 dark:from-white/90 dark:to-gray-200 ring-gray-200 dark:ring-white/15 animate-pulse shadow-sm",
  upcoming:  "bg-gray-200 ring-gray-100 dark:bg-white/[0.12] dark:ring-white/[0.06]",
  failed:    "bg-gray-400 ring-gray-100 dark:bg-white/20 dark:ring-white/10",
};

const lineStyles: Record<MilestoneStatus, string> = {
  completed: "bg-white/40 dark:bg-white/15",
  current:   "bg-gray-200 dark:bg-white/[0.08]",
  upcoming:  "bg-gray-200 dark:bg-white/[0.05]",
  failed:    "bg-gray-200 dark:bg-white/[0.05]",
};

const titleStyles: Record<MilestoneStatus, string> = {
  completed: "text-gray-800 dark:text-white/90",
  current: "text-gray-800 dark:text-white/90",
  upcoming: "text-gray-400 dark:text-gray-500",
  failed: "text-gray-800 dark:text-white/90",
};

// --- Component ---
const TimelineItem: React.FC<TimelineItemProps> = ({
  milestone,
  isLast = false,
  variant = "default",
}) => {
  const compact = variant === "compact";

  const renderDotContent = () => {
    if (milestone.icon) {
      return <span className={compact ? "h-3 w-3" : "h-4 w-4"}>{milestone.icon}</span>;
    }
    if (milestone.status === "completed") return <CheckIcon />;
    if (milestone.status === "failed") return <XIcon />;
    // current / upcoming: inner circle
    return (
      <span
        className={`rounded-full bg-gray-400 dark:bg-white/30 ${compact ? "h-2 w-2" : "h-2.5 w-2.5"}`}
      />
    );
  };

  return (
    <div className="relative flex gap-4">
      {/* Dot + vertical line */}
      <div className="flex flex-col items-center">
        <div
          className={`relative z-10 flex shrink-0 items-center justify-center rounded-full ring-4 ${dotStyles[milestone.status]} ${compact ? "h-6 w-6" : "h-8 w-8"}`}
        >
          {renderDotContent()}
        </div>
        {!isLast && (
          <div className={`mt-1 w-0.5 flex-1 ${lineStyles[milestone.status]}`} />
        )}
      </div>

      {/* Content */}
      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : compact ? "pb-4" : "pb-6"}`}>
        {/* Title row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${titleStyles[milestone.status]}`}>
            {milestone.title}
          </span>
          {milestone.badge && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/[0.06] dark:text-white/50">
              {milestone.badge}
            </span>
          )}
          {milestone.date && (
            <span className="ml-auto shrink-0 text-theme-xs text-gray-400 dark:text-gray-500">
              {milestone.date}
            </span>
          )}
        </div>

        {/* Description — hidden in compact mode */}
        {!compact && milestone.description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{milestone.description}</p>
        )}
      </div>
    </div>
  );
};

export default TimelineItem;

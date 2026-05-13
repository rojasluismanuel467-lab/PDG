import React from "react";
import TimelineItem from "./TimelineItem";
import type { Milestone } from "./TimelineItem";

interface TimelineProps {
  milestones: Milestone[];
  variant?: "default" | "compact";
  title?: string;
  /** Render inside a styled card */
  card?: boolean;
  className?: string;
}

const Timeline: React.FC<TimelineProps> = ({
  milestones,
  variant = "default",
  title,
  card = false,
  className = "",
}) => {
  const inner = (
    <>
      {title && (
        <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      )}
      <div>
        {milestones.map((milestone, index) => (
          <TimelineItem
            key={milestone.id}
            milestone={milestone}
            isLast={index === milestones.length - 1}
            variant={variant}
          />
        ))}
      </div>
    </>
  );

  if (card) {
    return (
      <div
        className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.04] ${className}`}
      >
        {inner}
      </div>
    );
  }

  return <div className={className}>{inner}</div>;
};

export default Timeline;

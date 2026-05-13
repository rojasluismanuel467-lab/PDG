"use client";

import React from "react";

interface AreaCardProps {
  /** Primary title */
  title: string;
  /** Optional supporting text below the title */
  description?: string;
  /**
   * Icon slot — displayed to the left of the title.
   * Pass any ReactNode (SVG, Image, emoji, etc.)
   */
  icon?: React.ReactNode;
  /**
   * Badge slot — rendered below the title row.
   * Typically a <StageBadge />, <Badge />, or any chip.
   */
  badge?: React.ReactNode;
  /**
   * Alert indicator — adds a colored left border and an optional icon.
   * Useful for flagging items that need attention.
   */
  alert?: boolean;
  /** Icon shown next to the badge when alert is true */
  alertIcon?: React.ReactNode;
  /**
   * Metric slot — rendered at the bottom of the card content.
   * Typically a <ScoreBar />, stat text, or any metric component.
   */
  metric?: React.ReactNode;
  /**
   * Makes the card interactive (pointer cursor + hover styles + chevron icon).
   */
  onClick?: () => void;
  /**
   * Extra content rendered at the very bottom, below the metric.
   * Useful for tags, links, or secondary actions.
   */
  footer?: React.ReactNode;
  className?: string;
}

const ChevronRightIcon = () => (
  <svg
    className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const DefaultAlertIcon = () => (
  <svg
    className="h-4 w-4 text-warning-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const AreaCard: React.FC<AreaCardProps> = ({
  title,
  description,
  icon,
  badge,
  alert = false,
  alertIcon,
  metric,
  onClick,
  footer,
  className = "",
}) => {
  const isClickable = !!onClick;

  const inner = (
    <div className="flex flex-col gap-3">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
              {title}
            </p>
            {description && (
              <p className="mt-0.5 truncate text-theme-xs text-gray-400 dark:text-gray-500">
                {description}
              </p>
            )}
          </div>
        </div>
        {isClickable && <ChevronRightIcon />}
      </div>

      {/* Badge + alert icon row */}
      {(badge || alert) && (
        <div className="flex items-center gap-2">
          {badge}
          {alert && (alertIcon ?? <DefaultAlertIcon />)}
        </div>
      )}

      {/* Metric slot */}
      {metric && <div>{metric}</div>}

      {/* Footer slot */}
      {footer && (
        <div className="border-t border-gray-100 pt-2 dark:border-white/[0.08]">{footer}</div>
      )}
    </div>
  );

  const baseClasses = `rounded-2xl border bg-white p-4 dark:bg-white/[0.04] ${
    alert
      ? "border-l-4 border-warning-400 border-t-gray-200 border-r-gray-200 border-b-gray-200 dark:border-l-warning-500 dark:border-t-white/[0.08] dark:border-r-white/[0.08] dark:border-b-white/[0.08]"
      : "border-gray-200 dark:border-white/[0.08]"
  } ${isClickable ? "cursor-pointer transition-shadow hover:shadow-theme-sm dark:hover:bg-white/[0.07]" : ""} ${className}`;

  if (isClickable) {
    return (
      <button onClick={onClick} className={`w-full text-left ${baseClasses}`}>
        {inner}
      </button>
    );
  }

  return <div className={baseClasses}>{inner}</div>;
};

export default AreaCard;

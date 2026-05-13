import React from "react";

interface ProgressTrackProps {
  /**
   * Ordered list of step labels.
   * e.g. ["Initial", "Emerging", "Defined", "Managed", "Optimized"]
   */
  steps: string[];
  /**
   * Index of the current active step (0-based).
   * Steps before this index are considered "completed".
   */
  currentStep: number;
  size?: "sm" | "md";
  /**
   * Show step labels below the track — defaults to true.
   * Set to false for compact / tight layouts.
   */
  showLabels?: boolean;
  className?: string;
}

const dotSize: Record<"sm" | "md", string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
};

const labelSize: Record<"sm" | "md", string> = {
  sm: "text-[9px]",
  md: "text-[10px]",
};

const ProgressTrack: React.FC<ProgressTrackProps> = ({
  steps,
  currentStep,
  size = "md",
  showLabels = true,
  className = "",
}) => {
  const clampedStep = Math.min(Math.max(currentStep, 0), steps.length - 1);

  return (
    <div className={`w-full ${className}`}>
      {/* Track row */}
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < clampedStep;
          const isCurrent = i === clampedStep;
          const isLast = i === steps.length - 1;

          return (
            <React.Fragment key={step}>
              {/* Dot */}
              <div
                className={`shrink-0 rounded-full transition-colors ${dotSize[size]} ${
                  isCompleted
                    ? "bg-brand-500"
                    : isCurrent
                    ? "bg-brand-400 ring-2 ring-brand-100 dark:ring-brand-500/25"
                    : "bg-gray-300 dark:bg-white/[0.15]"
                }`}
                aria-label={step}
              />

              {/* Connector line — skip after last dot */}
              {!isLast && (
                <div className="h-0.5 flex-1 transition-colors">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted ? "bg-brand-500" : "bg-gray-200 dark:bg-white/[0.08]"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Labels row */}
      {showLabels && (
        <div className="mt-1.5 flex items-start">
          {steps.map((step, i) => {
            const isCompleted = i < clampedStep;
            const isCurrent = i === clampedStep;
            const isLast = i === steps.length - 1;

            return (
              <React.Fragment key={`label-${step}`}>
                {/* Label — centered on its dot */}
                <span
                  className={`shrink-0 ${labelSize[size]} font-medium leading-none ${
                    isCurrent
                      ? "text-brand-500 dark:text-brand-400"
                      : isCompleted
                      ? "text-gray-500 dark:text-gray-400"
                      : "text-gray-400 dark:text-white/[0.20]"
                  }`}
                  style={{ transform: "translateX(-40%)" }}
                >
                  {step}
                </span>
                {/* Spacer that matches the connector line width */}
                {!isLast && <div className="flex-1" />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgressTrack;

import React from "react";

export type ScoreBarColor = "brand" | "success" | "warning" | "error" | "gray";

interface ScoreBarProps {
  /** Current value */
  value: number;
  /** Maximum value — defaults to 100 */
  max?: number;
  /** Optional label rendered above the bar */
  label?: string;
  /** Show the numeric value (e.g. "2.4 / 5") — defaults to true */
  showValue?: boolean;
  /** Number of decimal places for the displayed value — defaults to 1 */
  decimals?: number;
  size?: "sm" | "md";
  color?: ScoreBarColor;
  /**
   * Override color based on fill ratio (0–1).
   * Takes priority over `color`.
   * Useful for threshold-based coloring (e.g. red < 0.4, yellow < 0.7, green).
   */
  colorFn?: (ratio: number) => ScoreBarColor;
  className?: string;
}

const trackHeight: Record<"sm" | "md", string> = {
  sm: "h-1",
  md: "h-1.5",
};

const fillColors: Record<ScoreBarColor, string> = {
  brand: "bg-brand-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  error: "bg-error-500",
  gray: "bg-gray-400",
};

const ScoreBar: React.FC<ScoreBarProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
  decimals = 1,
  size = "md",
  color = "brand",
  colorFn,
  className = "",
}) => {
  const clamped = Math.min(Math.max(value, 0), max);
  const ratio = max > 0 ? clamped / max : 0;
  const pct = `${(ratio * 100).toFixed(1)}%`;

  const resolvedColor = colorFn ? colorFn(ratio) : color;

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</span>
          )}
          {showValue && (
            <span className="ml-auto text-theme-xs font-medium text-gray-600 dark:text-gray-400">
              {clamped.toFixed(decimals)}
              <span className="font-normal text-gray-400 dark:text-gray-500"> / {max}</span>
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${trackHeight[size]}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillColors[resolvedColor]}`}
          style={{ width: pct }}
        />
      </div>
    </div>
  );
};

export default ScoreBar;

import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center gap-1 rounded-full font-medium tracking-[0.03em]";

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-3 py-1",
  };

  const variants = {
    light: {
      // Primary → proyecto turquesa #28b8d5
      primary:
        "bg-[#28b8d5]/10 text-[#28b8d5] border border-[#28b8d5]/25 dark:bg-[#28b8d5]/10 dark:text-[#28b8d5] dark:border-[#28b8d5]/20",
      success:
        "bg-success-50 text-success-700 border border-success-200 dark:bg-success-400/10 dark:text-success-400 dark:border-success-400/15",
      error:
        "bg-error-50 text-error-700 border border-error-200 dark:bg-error-400/10 dark:text-error-400 dark:border-error-400/15",
      warning:
        "bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-400/10 dark:text-warning-400 dark:border-warning-400/15",
      info: "bg-blue-light-50 text-blue-light-700 border border-blue-light-200 dark:bg-blue-light-400/10 dark:text-blue-light-400 dark:border-blue-light-400/15",
      light:
        "bg-gray-50 text-gray-600 border border-gray-200 dark:bg-white/[0.04] dark:text-white/60 dark:border-white/[0.08]",
      dark: "bg-gray-100 text-gray-800 border border-gray-300 dark:bg-white/[0.06] dark:text-white/80 dark:border-white/[0.10]",
    },
    solid: {
      // Primary solid → turquesa con glow sutil
      primary:
        "bg-[#28b8d5] text-white shadow-[0_0_12px_rgba(40,184,213,0.35)] border border-[#28b8d5]",
      success:
        "bg-success-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.25)] border border-success-500",
      error:
        "bg-error-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.25)] border border-error-500",
      warning:
        "bg-warning-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)] border border-warning-500",
      info: "bg-blue-light-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.25)] border border-blue-light-500",
      light:
        "bg-gray-200 text-gray-700 border border-gray-300 dark:bg-white/10 dark:text-white dark:border-white/[0.12]",
      dark: "bg-gray-700 text-white border border-gray-700 dark:bg-white/[0.08] dark:text-white dark:border-white/[0.10]",
    },
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && (
        <span className="flex-shrink-0 flex items-center justify-center w-3 h-3">
          {startIcon}
        </span>
      )}
      {children}
      {endIcon && (
        <span className="flex-shrink-0 flex items-center justify-center w-3 h-3">
          {endIcon}
        </span>
      )}
    </span>
  );
};

export default Badge;

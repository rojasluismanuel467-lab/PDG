import React, { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium gap-2 rounded-xl transition-all duration-200 tracking-[0.01em] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]";

  const sizeClasses = {
    sm: "px-4 py-2.5 text-sm",
    md: "px-5 py-3 text-sm",
  };

  const variantClasses = {
    // Primary → navy #0F172A en light | white-on-black en dark
    primary:
      "bg-[#0F172A] text-white shadow-sm hover:bg-[#1e293b] dark:bg-white dark:text-[#000000] dark:shadow-none dark:hover:bg-gray-100 dark:hover:shadow-none",
    // Outline → borde #334155 + texto navy en light | glass en dark
    outline:
      "bg-white text-[#0F172A] border border-[#334155] hover:bg-slate-50 hover:border-[#0F172A] dark:bg-white/[0.07] dark:text-white/85 dark:border-white/[0.18] dark:hover:bg-white/[0.12] dark:hover:text-white dark:hover:border-white/40",
  };

  return (
    <button
      className={`${baseStyles} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;

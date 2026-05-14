import React, { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  defaultValue,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  // Determine input styles based on state (disabled, success, error)
  let inputClasses = `h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-white/30 ${className}`;

  // Add styles for the different states
  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-white/[0.03] dark:text-gray-400 dark:border-white/[0.06]`;
  } else if (error) {
    inputClasses += ` text-gray-800 border-gray-400 focus:ring-3 focus:ring-gray-900/5 focus:border-gray-500 dark:text-white/40 dark:border-white/30 dark:focus:border-white/40`;
  } else if (success) {
    inputClasses += ` text-gray-800 border-gray-400 focus:ring-gray-900/5 focus:border-gray-400 dark:text-white/40 dark:border-white/30`;
  } else {
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-gray-400 focus:ring-3 focus:ring-gray-900/5 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white/90 dark:focus:border-white/30`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        defaultValue={value !== undefined ? undefined : defaultValue}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
      />

      {/* Optional Hint Text */}
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error || success
              ? "text-gray-500 dark:text-white/40"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;

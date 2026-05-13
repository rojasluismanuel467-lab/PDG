"use client";
import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface SwitchProps {
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  color?: "blue" | "gray"; // Added prop to toggle color theme
}

const Switch: React.FC<SwitchProps> = ({
  label,
  defaultChecked = false,
  disabled = false,
  onChange,
  color = "blue", // Default to blue color
}) => {
  const [isChecked, setIsChecked] = useState(defaultChecked);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleToggle = () => {
    if (disabled) return;
    const newCheckedState = !isChecked;
    setIsChecked(newCheckedState);
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  const switchColors =
    color === "blue"
      ? {
          background: isChecked
            ? isDark ? "bg-white" : "bg-brand-500"
            : "bg-gray-200 dark:bg-white/[0.10]",
          knob: isChecked
            ? isDark ? "translate-x-full bg-gray-900" : "translate-x-full bg-white"
            : "translate-x-0 bg-white dark:bg-white/90",
        }
      : {
          background: isChecked
            ? "bg-gray-700 dark:bg-white/[0.15]"
            : "bg-gray-200 dark:bg-white/[0.08]",
          knob: isChecked
            ? "translate-x-full bg-white"
            : "translate-x-0 bg-white dark:bg-white/90",
        };

  return (
    <label
      className={`flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
        disabled ? "text-gray-400" : "text-gray-700 dark:text-gray-400"
      }`}
      onClick={handleToggle} // Toggle when the label itself is clicked
    >
      <div className="relative">
        <div
          className={`block transition duration-150 ease-linear h-6 w-11 rounded-full ${
            disabled
              ? "bg-gray-100 pointer-events-none dark:bg-gray-800"
              : switchColors.background
          }`}
        ></div>
        <div
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-theme-sm duration-150 ease-linear transform ${switchColors.knob}`}
        ></div>
      </div>
      {label}
    </label>
  );
};

export default Switch;

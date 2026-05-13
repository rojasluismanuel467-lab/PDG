import React from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: string; // Description text
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <div
      className={`relative rounded-2xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.04] overflow-hidden ${className}`}
    >
      {/* Top accent line */}
      <div className="absolute -top-px left-8 right-8 h-[1px] rounded-full bg-gradient-to-r from-transparent via-gray-300/60 to-transparent dark:via-white/20 pointer-events-none" />

      {/* Card Header */}
      <div className="px-6 py-5">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {desc && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 border-t border-gray-100 dark:border-white/[0.06] sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;

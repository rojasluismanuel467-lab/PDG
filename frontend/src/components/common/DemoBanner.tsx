"use client";
export default function DemoBanner() {
  return (
    <div
      className="w-full border-b border-gray-200 px-4 py-2 text-center text-xs font-medium text-gray-500 bg-gray-50
        dark:border-white/[0.06] dark:text-white/30"
      style={{ ['--dark-bg' as string]: 'none' }}
    >
      <span className="hidden dark:inline">
        <span className="inline-flex items-center gap-1.5 mr-2">
          <span className="h-1 w-1 rounded-full bg-white/30" />
        </span>
      </span>
      Modo demo · datos ficticios ·{" "}
      <span className="text-gray-400 dark:text-white/20 underline cursor-pointer decoration-dotted">
        consultor@demo.com / empresa@demo.com
      </span>
    </div>
  );
}

"use client";

const showDemoCredentials = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS !== "false";
const demoCredentials =
  process.env.NEXT_PUBLIC_DEMO_CREDENTIALS ||
  "admin@arqdata.local:Admin12345!,consultor@example.com:Consultor123!,empresa@example.com:Empresa123!";

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
      Modo demo · datos ficticios
      {showDemoCredentials ? (
        <>
          {" "}
          ·{" "}
          <span className="text-gray-400 dark:text-white/20">
            {demoCredentials}
          </span>
        </>
      ) : null}
    </div>
  );
}

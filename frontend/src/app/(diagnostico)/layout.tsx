export default function DiagnosticoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Header mínimo sin login */}
      <header className="border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#111]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <span className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
            ARQDATA
          </span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">
            · Evaluación de Madurez en Gestión de Datos
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">{children}</main>

      <footer className="mt-16 border-t border-gray-200 dark:border-white/[0.06] py-6 text-center text-xs text-gray-400 dark:text-gray-600">
        Tus respuestas son confidenciales y se usarán exclusivamente para el análisis de madurez.
      </footer>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

interface ResponderCuestionarioPageProps {
  searchParams: Promise<{
    code?: string;
  }>;
}

export default async function ResponderCuestionarioPage({
  searchParams,
}: ResponderCuestionarioPageProps) {
  const { code } = await searchParams;

  if (code?.trim()) {
    redirect(`/diagnostico/${encodeURIComponent(code.trim())}`);
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Se requiere codigo de acceso
        </h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Esta ruta usa el flujo real del backend. Abre el cuestionario con un codigo valido
          o usa el enlace directo de diagnostico compartido por el consultor.
        </p>
        <div className="mt-6">
          <Link
            href="/signin"
            className="inline-flex rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            Ir a iniciar sesion
          </Link>
        </div>
      </div>
    </div>
  );
}

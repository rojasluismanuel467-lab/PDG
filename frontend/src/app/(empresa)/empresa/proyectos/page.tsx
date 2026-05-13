"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { projectsApi } from "@/lib/api/projects";
import { toLegacyProject, type LegacyProject as Proyecto } from "@/lib/adapters/project.adapter";
import { calcularProgreso, formatearFecha } from "@/lib/utils/proyecto.utils";
import Badge from "@/components/ui/badge/Badge";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type FiltroEstado = "TODOS" | "ACTIVO" | "EN_PAUSA";

// ── Helpers de estado ─────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<
  "ACTIVO" | "EN_PAUSA",
  { color: "success" | "warning"; label: string }
> = {
  ACTIVO: { color: "success", label: "Activo" },
  EN_PAUSA: { color: "warning", label: "En pausa" },
};

const FILTROS: { key: FiltroEstado; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "ACTIVO", label: "Activo" },
  { key: "EN_PAUSA", label: "En pausa" },
];

// ── Skeleton de fila ──────────────────────────────────────────────────────────

function SkeletonFila() {
  return (
    <tr className="border-b border-gray-100 dark:border-white/[0.05]">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ── Banner de error de acceso ─────────────────────────────────────────────────

function BannerError({ mensaje }: { mensaje: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 dark:border-error-400/20 dark:bg-error-400/10">
      <svg
        className="mt-0.5 flex-shrink-0 text-error-500"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-error-700 dark:text-error-400">{mensaje}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="flex-shrink-0 text-error-400 hover:text-error-600 dark:text-error-400/70 dark:hover:text-error-400 transition-colors"
        aria-label="Cerrar aviso"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Fila de proyecto ──────────────────────────────────────────────────────────

function FilaProyecto({ proyecto }: { proyecto: Proyecto }) {
  const progreso = calcularProgreso(
    proyecto.entregables.aprobados,
    proyecto.entregables.no_aplica
  );
  const estado = proyecto.estado as "ACTIVO" | "EN_PAUSA";
  const badge = ESTADO_BADGE[estado];

  return (
    <tr className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
      {/* Nombre */}
      <td className="px-5 py-4 max-w-[240px]">
        <Link
          href={`/empresa/proyectos/${proyecto.id}`}
          className="text-sm font-medium text-gray-800 dark:text-white/90 hover:text-[#28b8d5] dark:hover:text-[#28b8d5] transition-colors line-clamp-2"
        >
          {proyecto.nombre}
        </Link>
      </td>

      {/* Estado */}
      <td className="px-5 py-4">
        {badge && (
          <Badge variant="light" color={badge.color} size="sm">
            {badge.label}
          </Badge>
        )}
      </td>

      {/* Progreso */}
      <td className="px-5 py-4 min-w-[150px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#28b8d5] transition-all duration-500"
              style={{ width: `${progreso}%` }}
              role="progressbar"
              aria-valuenow={progreso}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right shrink-0">
            {progreso}%
          </span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          {proyecto.entregables.aprobados} de {proyecto.entregables.total} entregables aprobados
        </p>
      </td>

      {/* Consultor */}
      <td className="px-5 py-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {proyecto.consultor_gerente.nombre}
        </span>
      </td>

      {/* Fecha cierre */}
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatearFecha(proyecto.fecha_estimada_cierre)}
        </span>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

function ProyectosEmpresaPageInner() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const qParam = (searchParams.get("q") ?? "").trim().toLowerCase();

  useEffect(() => {
    projectsApi
      .list()
      .then((items) => setProyectos(items.map(toLegacyProject)))
      .finally(() => setCargando(false));
  }, []);

  // Conteos por estado para las pills
  const conteos = useMemo(() => {
    const counts: Record<FiltroEstado, number> = {
      TODOS: proyectos.length,
      ACTIVO: 0,
      EN_PAUSA: 0,
    };
    proyectos.forEach((p) => {
      if (p.estado === "ACTIVO" || p.estado === "EN_PAUSA") {
        counts[p.estado]++;
      }
    });
    return counts;
  }, [proyectos]);

  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((p) => {
      const byStatus = filtroEstado === "TODOS" || p.estado === filtroEstado;
      const byQuery = !qParam || p.nombre.toLowerCase().includes(qParam);
      return byStatus && byQuery;
    });
  }, [proyectos, filtroEstado, qParam]);

  return (
    <div className="p-6 space-y-6">
      {/* Banner de error (redirección desde detalle) */}
      {errorParam === "acceso_denegado" && (
        <BannerError mensaje="No tienes acceso a ese proyecto o no existe. Verifica el enlace e intenta nuevamente." />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mis proyectos
        </h1>
        {!cargando && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {proyectos.length}{" "}
            {proyectos.length === 1 ? "proyecto asignado" : "proyectos asignados"}
          </p>
        )}
      </div>

      {/* Pills de filtro */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTROS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltroEstado(key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
              filtroEstado === key
                ? "bg-[#0F172A] text-white dark:bg-white dark:text-black"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-white/60 dark:hover:bg-white/[0.10]"
            }`}
          >
            {label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                filtroEstado === key
                  ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                  : "bg-gray-200 text-gray-500 dark:bg-white/[0.08] dark:text-white/40"
              }`}
            >
              {cargando ? "—" : conteos[key as FiltroEstado]}
            </span>
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.03]">
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Consultor
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Cierre estimado
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <>
                  <SkeletonFila />
                  <SkeletonFila />
                  <SkeletonFila />
                </>
              ) : proyectosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-gray-300 dark:text-white/20"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {filtroEstado !== "TODOS"
                          ? "No hay proyectos en esta categoría"
                          : "No tienes proyectos asignados todavía"}
                      </p>
                      {filtroEstado !== "TODOS" && (
                        <button
                          onClick={() => setFiltroEstado("TODOS")}
                          className="text-xs text-[#28b8d5] hover:underline"
                        >
                          Ver todos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                proyectosFiltrados.map((proyecto) => (
                  <FilaProyecto key={proyecto.id} proyecto={proyecto} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Wrapper con Suspense requerido por useSearchParams en Next.js 14 App Router
import { Suspense } from "react";

export default function ProyectosEmpresaPage() {
  return (
    <Suspense fallback={<div className="p-6 animate-pulse text-gray-400">Cargando...</div>}>
      <ProyectosEmpresaPageInner />
    </Suspense>
  );
}

"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { projectsApi } from "@/lib/api/projects";
import { toLegacyProject, type LegacyProject as Proyecto } from "@/lib/adapters/project.adapter";
import { calcularProgreso, formatearFecha } from "@/lib/utils/proyecto.utils";
import Badge from "@/components/ui/badge/Badge";

// ── Helpers de estado ─────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<
  "ACTIVO" | "EN_PAUSA",
  { color: "success" | "warning"; label: string }
> = {
  ACTIVO: { color: "success", label: "Activo" },
  EN_PAUSA: { color: "warning", label: "En pausa" },
};

// ── Fecha actual en DD/MM/AAAA ─────────────────────────────────────────────

function fechaActual(): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date());
}

// ── Skeleton de tarjeta métrica ───────────────────────────────────────────────

function SkeletonMetrica() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-white/[0.06] mb-5" />
      <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/[0.06] mb-2" />
      <div className="h-7 w-16 rounded bg-gray-200 dark:bg-white/[0.06]" />
    </div>
  );
}

// ── Skeleton de tarjeta de proyecto ──────────────────────────────────────────

function SkeletonProyecto() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/[0.06] mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-white/[0.06]" />
        <div className="h-3 w-20 rounded bg-gray-200 dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}

// ── Tarjeta de métrica ────────────────────────────────────────────────────────

interface MetricaCardProps {
  label: string;
  valor: number;
  icon: React.ReactNode;
}

function MetricaCard({ label, valor, icon }: MetricaCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-xl dark:bg-gray-800 mb-5">
        {icon}
      </div>
      <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </span>
      <h4 className="font-bold text-gray-800 dark:text-white/90 text-2xl">
        {valor}
      </h4>
    </div>
  );
}

// ── Tarjeta de proyecto ───────────────────────────────────────────────────────

interface ProyectoCardProps {
  proyecto: Proyecto;
}

function ProyectoCard({ proyecto }: ProyectoCardProps) {
  const progreso = calcularProgreso(
    proyecto.entregables.aprobados,
    proyecto.entregables.no_aplica
  );
  const estado = proyecto.estado as "ACTIVO" | "EN_PAUSA";
  const badge = ESTADO_BADGE[estado];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] flex flex-col gap-3 hover:border-gray-300 dark:hover:border-white/[0.12] transition-colors">
      {/* Nombre + badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 line-clamp-2 flex-1">
          {proyecto.nombre}
        </h3>
        {badge && (
          <Badge variant="light" color={badge.color} size="sm">
            {badge.label}
          </Badge>
        )}
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Progreso
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-white/70">
            {progreso}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#28b8d5] transition-all duration-500"
            style={{ width: `${progreso}%` }}
            role="progressbar"
            aria-valuenow={progreso}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
          {proyecto.entregables.aprobados} de {proyecto.entregables.total} entregables aprobados
        </p>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <span>
          <span className="text-gray-400 dark:text-white/30">Consultor: </span>
          {proyecto.consultor_gerente.nombre}
        </span>
        <span>
          <span className="text-gray-400 dark:text-white/30">Cierre: </span>
          {formatearFecha(proyecto.fecha_estimada_cierre)}
        </span>
      </div>

      {/* CTA */}
      <div className="pt-1 border-t border-gray-100 dark:border-white/[0.05]">
        <Link
          href={`/empresa/proyectos/${proyecto.id}`}
          className="text-xs font-medium text-[#28b8d5] hover:underline"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function EmpresaDashboardPage() {
  const { user } = useAuth();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    projectsApi
      .list()
      .then((items) => setProyectos(items.map(toLegacyProject)))
      .finally(() => setCargando(false));
  }, []);

  const metricas = useMemo(() => {
    const total = proyectos.length;
    const activos = proyectos.filter((p) => p.estado === "ACTIVO").length;
    const enPausa = proyectos.filter((p) => p.estado === "EN_PAUSA").length;
    const totalAprobados = proyectos.reduce(
      (acc, p) => acc + p.entregables.aprobados,
      0
    );
    return { total, activos, enPausa, totalAprobados };
  }, [proyectos]);

  // Máximo 3 proyectos en el dashboard
  const proyectosVisibles = proyectos.slice(0, 3);
  const hayMas = proyectos.length > 3;

  return (
    <div className="p-6 space-y-8">
      {/* ── Saludo ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bienvenida, {user?.nombre ?? "empresa"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {fechaActual()}
        </p>
      </div>

      {/* ── Métricas ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25 mb-4">
          Resumen
        </h2>
        {cargando ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonMetrica key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricaCard
              label="Total proyectos"
              valor={metricas.total}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600 dark:text-white/60">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.75" />
                </svg>
              }
            />
            <MetricaCard
              label="Proyectos activos"
              valor={metricas.activos}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-success-600 dark:text-success-400">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <MetricaCard
              label="Proyectos en pausa"
              valor={metricas.enPausa}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-warning-600 dark:text-warning-400">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                  <path d="M10 8v8M14 8v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              }
            />
            <MetricaCard
              label="Entregables aprobados"
              valor={metricas.totalAprobados}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#28b8d5]">
                  <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        )}
      </div>

      {/* ── Lista de proyectos ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-white/25">
            Mis proyectos
          </h2>
          {!cargando && proyectos.length > 0 && (
            <Link
              href="/empresa/proyectos"
              className="text-xs text-[#28b8d5] hover:underline font-medium"
            >
              Ver todos →
            </Link>
          )}
        </div>

        {cargando ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map((i) => (
              <SkeletonProyecto key={i} />
            ))}
          </div>
        ) : proyectos.length === 0 ? (
          /* Estado vacío */
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] px-6 py-12 text-center">
            <svg
              className="mx-auto mb-3 text-gray-300 dark:text-white/20"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
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
              No tienes proyectos asignados todavía.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Contacta a tu consultor gerente para más información.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {proyectosVisibles.map((proyecto) => (
                <ProyectoCard key={proyecto.id} proyecto={proyecto} />
              ))}
            </div>

            {hayMas && (
              <div className="mt-4 text-center">
                <Link
                  href="/empresa/proyectos"
                  className="inline-flex items-center gap-1.5 text-sm text-[#28b8d5] hover:underline font-medium"
                >
                  Ver todos mis proyectos ({proyectos.length}) →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

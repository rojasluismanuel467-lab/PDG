"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { projectsApi } from "@/lib/api/projects";
import { useAuth } from "@/context/AuthContext";
import { toLegacyProject, type LegacyProject as Proyecto, type LegacyProjectStatus as EstadoProyecto } from "@/lib/adapters/project.adapter";
import { calcularProgreso, formatearFecha } from "@/lib/utils/proyecto.utils";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { useModal } from "@/hooks/useModal";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import ModalCrearProyecto from "@/components/consultor/ModalCrearProyecto";
import ModalConfirmarCierre from "@/components/consultor/ModalConfirmarCierre";

// ── Tipos locales ────────────────────────────────────────────────────────────

type FiltroEstado = "TODOS" | EstadoProyecto;

interface AccionPendiente {
  proyectoId: string;
  nombreProyecto: string;
  nuevoEstado: "ACTIVO" | "EN_PAUSA" | "CERRADO";
}

// ── Helpers de UI ────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<
  EstadoProyecto,
  { color: "success" | "warning" | "light" | "error"; label: string }
> = {
  ACTIVO: { color: "success", label: "Activo" },
  EN_PAUSA: { color: "warning", label: "En pausa" },
  CERRADO: { color: "light", label: "Cerrado" },
  BLOQUEADO: { color: "error", label: "Bloqueado" },
};

const FILTROS: { key: FiltroEstado; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "ACTIVO", label: "Activo" },
  { key: "EN_PAUSA", label: "En pausa" },
  { key: "CERRADO", label: "Cerrado" },
  { key: "BLOQUEADO", label: "Bloqueado" },
];

// Icono de candado para proyectos bloqueados
function IconoCandado() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Skeleton de fila de tabla
function SkeletonFila() {
  return (
    <tr className="border-b border-gray-100 dark:border-white/[0.05]">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ── Componente de fila de proyecto ──────────────────────────────────────────

interface FilaProyectoProps {
  proyecto: Proyecto;
  onCambiarEstado: (accion: AccionPendiente) => void;
}

function FilaProyecto({ proyecto, onCambiarEstado }: FilaProyectoProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const progreso = calcularProgreso(
    proyecto.entregables.aprobados,
    proyecto.entregables.no_aplica
  );
  const badge = ESTADO_BADGE[proyecto.estado];
  const tieneAcciones = proyecto.estado === "ACTIVO" || proyecto.estado === "EN_PAUSA";

  useEffect(() => { setMounted(true); }, []);

  const handleToggleMenu = () => {
    if (!menuAbierto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuAbierto((prev) => !prev);
  };

  // Cierra al hacer clic fuera del menú
  useEffect(() => {
    if (!menuAbierto) return;
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuAbierto]);

  // Portal: evita que overflow-hidden de la tabla recorte el menú
  const menuPortal = menuAbierto && mounted
    ? ReactDOM.createPortal(
        <div
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="min-w-[170px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/[0.08] dark:bg-[#0d0d0d] dark:shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
        >
          {proyecto.estado === "ACTIVO" && (
            <DropdownItem
              onClick={() => {
                setMenuAbierto(false);
                onCambiarEstado({
                  proyectoId: proyecto.id,
                  nombreProyecto: proyecto.nombre,
                  nuevoEstado: "EN_PAUSA",
                });
              }}
            >
              Poner en pausa
            </DropdownItem>
          )}
          {proyecto.estado === "EN_PAUSA" && (
            <DropdownItem
              onClick={() => {
                setMenuAbierto(false);
                onCambiarEstado({
                  proyectoId: proyecto.id,
                  nombreProyecto: proyecto.nombre,
                  nuevoEstado: "ACTIVO",
                });
              }}
            >
              Reactivar
            </DropdownItem>
          )}
          <DropdownItem
            onClick={() => {
              setMenuAbierto(false);
              onCambiarEstado({
                proyectoId: proyecto.id,
                nombreProyecto: proyecto.nombre,
                nuevoEstado: "CERRADO",
              });
            }}
            className="text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-400/10"
          >
            Cerrar proyecto
          </DropdownItem>
        </div>,
        document.body
      )
    : null;

  return (
    <tr className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
      {/* Nombre */}
      <td className="px-5 py-4 max-w-[220px]">
        <Link
          href={`/consultor/proyectos/${proyecto.id}`}
          className="text-sm font-medium text-gray-800 dark:text-white/90 hover:text-[#28b8d5] dark:hover:text-[#28b8d5] transition-colors line-clamp-2"
        >
          {proyecto.nombre}
        </Link>
      </td>

      {/* Empresa */}
      <td className="px-5 py-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {proyecto.empresa_cliente.nombre}
        </span>
      </td>

      {/* Estado */}
      <td className="px-5 py-4">
        <Badge
          variant="light"
          color={badge.color}
          size="sm"
          startIcon={proyecto.estado === "BLOQUEADO" ? <IconoCandado /> : undefined}
        >
          {badge.label}
        </Badge>
      </td>

      {/* Progreso */}
      <td className="px-5 py-4 min-w-[130px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#28b8d5] transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right shrink-0">
            {progreso}%
          </span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          {proyecto.entregables.aprobados}/{proyecto.entregables.total} aprobados
        </p>
      </td>

      {/* Fecha cierre */}
      <td className="px-5 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatearFecha(proyecto.fecha_estimada_cierre)}
        </span>
      </td>

      {/* Consultor */}
      <td className="px-5 py-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {proyecto.consultor_gerente.nombre}
        </span>
      </td>

      {/* Acciones */}
      <td className="px-5 py-4">
        {tieneAcciones ? (
          <>
            <button
              ref={btnRef}
              onClick={handleToggleMenu}
              aria-label="Acciones del proyecto"
              aria-expanded={menuAbierto}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-white/60 dark:hover:bg-white/[0.06] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuPortal}
          </>
        ) : (
          <span className="text-sm text-gray-300 dark:text-white/20 select-none">—</span>
        )}
      </td>
    </tr>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function ProyectosPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const [busqueda, setBusqueda] = useState(qParam);

  // Modales
  const modalCrear = useModal();
  const modalCierre = useModal();
  const [accionPendiente, setAccionPendiente] = useState<AccionPendiente | null>(null);
  const [procesandoCierre, setProcesandoCierre] = useState(false);

  const { toasts, addToast, removeToast } = useToast();
  const canCreateProject = user?.perfil === "ADMIN" || user?.perfil === "CONSULTOR";

  // Carga inicial
  useEffect(() => {
    projectsApi
      .list()
      .then((items) => setProyectos(items.map(toLegacyProject)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    setBusqueda(qParam);
  }, [qParam]);

  // Filtrado
  const proyectosFiltrados = useMemo(() => {
    return proyectos.filter((p) => {
      const coincideEstado = filtroEstado === "TODOS" || p.estado === filtroEstado;
      const coincideBusqueda =
        busqueda.trim() === "" ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return coincideEstado && coincideBusqueda;
    });
  }, [proyectos, filtroEstado, busqueda]);

  // Conteos por estado para las pills
  const conteos = useMemo(() => {
    const counts: Record<FiltroEstado, number> = {
      TODOS: proyectos.length,
      ACTIVO: 0,
      EN_PAUSA: 0,
      CERRADO: 0,
      BLOQUEADO: 0,
    };
    proyectos.forEach((p) => counts[p.estado]++);
    return counts;
  }, [proyectos]);

  // Éxito al crear
  const handleProyectoCreado = useCallback((nuevo: Proyecto) => {
    setProyectos((prev) => [nuevo, ...prev]);
    addToast(`Proyecto "${nuevo.nombre}" creado correctamente.`, "success");
  }, [addToast]);

  // Solicitar acción (pausa, reactivar, cierre)
  const handleSolicitarAccion = useCallback((accion: AccionPendiente) => {
    if (accion.nuevoEstado === "CERRADO") {
      setAccionPendiente(accion);
      modalCierre.openModal();
    } else {
      // Reactivar o poner en pausa — sin modal de confirmación
      ejecutarCambioEstado(accion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalCierre]);

  const ejecutarCambioEstado = useCallback(async (accion: AccionPendiente) => {
    // Actualización optimista
    const estadoAnterior = proyectos.find((p) => p.id === accion.proyectoId)?.estado;
    setProyectos((prev) =>
      prev.map((p) =>
        p.id === accion.proyectoId ? { ...p, estado: accion.nuevoEstado } : p
      )
    );

    try {
      await projectsApi.update(accion.proyectoId, { status: accion.nuevoEstado });
      const labelEstado =
        accion.nuevoEstado === "ACTIVO"
          ? "reactivado"
          : accion.nuevoEstado === "EN_PAUSA"
          ? "pausado"
          : "cerrado";
      addToast(`Proyecto ${labelEstado} correctamente.`, "success");
    } catch (err) {
      // Revertir si falla
      if (estadoAnterior) {
        setProyectos((prev) =>
          prev.map((p) =>
            p.id === accion.proyectoId ? { ...p, estado: estadoAnterior } : p
          )
        );
      }
      const msg = err instanceof Error ? err.message : "Error al cambiar estado";
      addToast(msg, "error");
    }
  }, [proyectos, addToast]);

  const handleConfirmarCierre = useCallback(async () => {
    if (!accionPendiente) return;
    setProcesandoCierre(true);
    await ejecutarCambioEstado(accionPendiente);
    setProcesandoCierre(false);
    setAccionPendiente(null);
    modalCierre.closeModal();
  }, [accionPendiente, ejecutarCambioEstado, modalCierre]);

  const handleCancelarCierre = useCallback(() => {
    setAccionPendiente(null);
    modalCierre.closeModal();
  }, [modalCierre]);

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Proyectos
            </h1>
            {!cargando && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {proyectos.length}{" "}
                {proyectos.length === 1 ? "proyecto" : "proyectos"}
              </p>
            )}
          </div>
          {canCreateProject && (
            <Button
              size="md"
              variant="primary"
              onClick={modalCrear.openModal}
              startIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
            >
              Nuevo proyecto
            </Button>
          )}
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Pills de estado */}
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
                  {conteos[key]}
                </span>
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative sm:ml-auto sm:w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/5 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-white/20"
            />
          </div>
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
                    Empresa cliente
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Progreso
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Cierre estimado
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Consultor
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <span className="sr-only">Acciones</span>
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
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-gray-300 dark:text-white/20"
                        >
                          <path
                            d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {busqueda
                            ? `No se encontraron proyectos con "${busqueda}"`
                            : "No hay proyectos en esta categoría"}
                        </p>
                        {(busqueda || filtroEstado !== "TODOS") && (
                          <button
                            onClick={() => {
                              setBusqueda("");
                              setFiltroEstado("TODOS");
                            }}
                            className="text-xs text-[#28b8d5] hover:underline"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  proyectosFiltrados.map((proyecto) => (
                    <FilaProyecto
                      key={proyecto.id}
                      proyecto={proyecto}
                      onCambiarEstado={handleSolicitarAccion}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modales */}
      {canCreateProject && (
        <ModalCrearProyecto
          isOpen={modalCrear.isOpen}
          onClose={modalCrear.closeModal}
          onSuccess={handleProyectoCreado}
        />
      )}

      {accionPendiente && (
        <ModalConfirmarCierre
          isOpen={modalCierre.isOpen}
          nombreProyecto={accionPendiente.nombreProyecto}
          onConfirm={handleConfirmarCierre}
          onCancel={handleCancelarCierre}
          isLoading={procesandoCierre}
        />
      )}

      {/* Toast container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

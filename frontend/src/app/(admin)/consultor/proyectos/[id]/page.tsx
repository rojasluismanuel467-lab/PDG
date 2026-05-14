"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { projectsApi } from "@/lib/api/projects";
import {
  toLegacyArtifact,
  toLegacyProject,
  type LegacyArtifact as Entregable,
  type LegacyProject as Proyecto,
  type LegacyProjectStatus as EstadoProyecto,
} from "@/lib/adapters/project.adapter";
import {
  mockGetEquipo,
  mockRemoverMiembro,
  type MiembroProyecto,
} from "@/lib/mocks/equipo.mock";
import AvatarAsistente from "@/components/ui/AvatarAsistente";
import {
  etapaHabilitada,
  etapaCompletada,
  progresoEtapa,
  mensajeBloqueoEtapa,
} from "@/lib/utils/etapas.utils";
import { calcularProgreso, formatearFecha } from "@/lib/utils/proyecto.utils";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal/index";
import EtapaProgress from "@/components/consultor/EtapaProgress";
import AvatarText from "@/components/ui/avatar/AvatarText";
import ModalGestionarPermisos from "@/components/consultor/ModalGestionarPermisos";
import ModalInvitarConsultor from "@/components/consultor/ModalInvitarConsultor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ETAPAS: EtapaEntregable[] = ["CUESTIONARIO", "AS_IS", "TO_BE", "BRECHAS", "ROADMAP"];

type EtapaEntregable = "CUESTIONARIO" | "AS_IS" | "TO_BE" | "BRECHAS" | "ROADMAP";
type EstadoEntregable = Entregable["estado"];

const ETAPA_LABEL: Record<EtapaEntregable, string> = {
  CUESTIONARIO: "Diagnóstico",
  AS_IS: "AS-IS",
  TO_BE: "TO-BE",
  BRECHAS: "Brechas",
  ROADMAP: "Roadmap",
};

type TabPrincipal = EtapaEntregable | "EQUIPO";

function estadoBadge(estado: EstadoProyecto) {
  switch (estado) {
    case "ACTIVO":
      return (
        <Badge color="success" variant="light">
          Activo
        </Badge>
      );
    case "EN_PAUSA":
      return (
        <Badge color="warning" variant="light">
          En Pausa
        </Badge>
      );
    case "CERRADO":
      return (
        <Badge color="dark" variant="light">
          Cerrado
        </Badge>
      );
    case "BLOQUEADO":
      return (
        <Badge color="error" variant="light">
          Bloqueado
        </Badge>
      );
  }
}

function estadoEntregableBadge(estado: EstadoEntregable) {
  switch (estado) {
    case "PENDIENTE":
      return (
        <Badge color="light" variant="light" size="sm">
          Pendiente
        </Badge>
      );
    case "EN_PROGRESO":
      return (
        <Badge color="info" variant="light" size="sm">
          En Progreso
        </Badge>
      );
    case "APROBADO":
      return (
        <Badge color="success" variant="light" size="sm">
          Aprobado
        </Badge>
      );
    case "PENDIENTE_APROBACION_EMPRESA":
      return (
        <Badge color="info" variant="light" size="sm">
          Rev. Empresa
        </Badge>
      );
    case "NO_APLICA":
      return (
        <Badge color="dark" variant="light" size="sm">
          No Aplica
        </Badge>
      );
  }
}

function detectarEtapaInicial(entregables: Entregable[]): EtapaEntregable {
  // Primera etapa habilitada con entregables no completados
  for (const etapa of ETAPAS) {
    if (etapaHabilitada(entregables, etapa) && !etapaCompletada(entregables, etapa)) {
      return etapa;
    }
  }
  // Si todas están completas, la primera habilitada
  for (const etapa of ETAPAS) {
    if (etapaHabilitada(entregables, etapa)) {
      return etapa;
    }
  }
  return "AS_IS";
}

function esCuestionarioMadurez(entregable: Entregable): boolean {
  return (
    entregable.code === "ASIS_MATURITY_QUESTIONNAIRE" ||
    entregable.nombre === "Cuestionario de Madurez"
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonDetalle() {
  return (
    <div className="p-6 animate-pulse space-y-4 max-w-4xl">
      <div className="h-4 w-40 bg-gray-200 dark:bg-white/[0.08] rounded" />
      <div className="h-8 w-2/3 bg-gray-200 dark:bg-white/[0.08] rounded" />
      <div className="h-4 w-24 bg-gray-200 dark:bg-white/[0.08] rounded" />
      <div className="h-20 w-full bg-gray-200 dark:bg-white/[0.08] rounded-xl" />
      <div className="h-28 w-full bg-gray-200 dark:bg-white/[0.08] rounded-xl" />
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-24 w-full bg-gray-200 dark:bg-white/[0.08] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente de tarjeta de entregable
// ---------------------------------------------------------------------------

interface EntregableCardProps {
  entregable: Entregable;
  idProyecto: string;
  proyectoActivo: boolean;
  etapaHabilitadaFlag: boolean;
  onCambiarEstado: (id: string, nuevoEstado: EstadoEntregable) => Promise<void>;
}

function EntregableCard({
  entregable,
  idProyecto,
  proyectoActivo,
  etapaHabilitadaFlag,
  onCambiarEstado,
}: EntregableCardProps) {
  const [expandido, setExpandido] = useState(false);
  const [modalAprobar, setModalAprobar] = useState(false);
  const [cargando, setCargando] = useState(false);

  const puedeActuar = proyectoActivo && etapaHabilitadaFlag;

  const handleAccion = async (nuevoEstado: EstadoEntregable) => {
    setCargando(true);
    try {
      await onCambiarEstado(entregable.id, nuevoEstado);
    } finally {
      setCargando(false);
    }
  };

  const handleAprobar = async () => {
    setModalAprobar(false);
    await handleAccion("APROBADO");
  };

  return (
    <div
      className={`rounded-xl border p-4 bg-white dark:bg-[#0f0f0f] transition-all duration-200 ${
        entregable.estado === "APROBADO"
          ? "border-success-200 dark:border-success-400/15"
          : entregable.estado === "NO_APLICA"
          ? "border-gray-200 dark:border-white/[0.06] opacity-70"
          : entregable.estado === "PENDIENTE_APROBACION_EMPRESA"
          ? "border-amber-200 dark:border-amber-400/20"
          : entregable.estado === "EN_PROGRESO"
          ? "border-blue-light-200 dark:border-blue-light-400/15"
          : "border-gray-200 dark:border-white/[0.08]"
      }`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-gray-400 dark:text-white/30 shrink-0">
            {entregable.orden_etapa}
          </span>
          <h4
            className={`text-sm font-semibold text-gray-800 dark:text-white/90 truncate ${
              entregable.estado === "NO_APLICA" ? "line-through text-gray-400 dark:text-white/30" : ""
            }`}
          >
            {entregable.nombre}
          </h4>
        </div>
        <div className="shrink-0">{estadoEntregableBadge(entregable.estado)}</div>
      </div>

      {/* Descripción */}
      <p
        className={`text-sm text-gray-500 dark:text-gray-400 mb-3 ${
          expandido ? "" : "line-clamp-2"
        }`}
      >
        {entregable.descripcion}
      </p>
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="text-xs text-[#28b8d5] hover:underline mb-3 focus:outline-none"
      >
        {expandido ? "Ver menos" : "Ver más"}
      </button>

      {/* Info de aprobación */}
      {entregable.estado === "APROBADO" && entregable.aprobado_por && (
        <p className="text-xs text-success-600 dark:text-success-400 mb-3">
          Aprobado por{" "}
          <span className="font-medium">{entregable.aprobado_por}</span>
          {entregable.fecha_aprobacion && (
            <> el {formatearFecha(entregable.fecha_aprobacion)}</>
          )}
        </p>
      )}
      {entregable.estado === "APROBADO" && entregable.aprobacion_empresa && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
          Revisión de empresa registrada
          {entregable.fecha_aprobacion_empresa && (
            <> el {formatearFecha(entregable.fecha_aprobacion_empresa)}</>
          )}
          . Se completó la aprobación dual.
        </p>
      )}
      {entregable.estado === "PENDIENTE_APROBACION_EMPRESA" && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
          Aprobado por consultor. Esperando revisión de la empresa para aprobar.
        </p>
      )}
      {entregable.estado === "EN_PROGRESO" && entregable.ciclos_revision > 0 && entregable.ultimo_motivo_rechazo && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/30">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">
            Rechazado por la empresa · ciclo {entregable.ciclos_revision}
          </p>
          <p className="text-xs text-red-600 dark:text-red-300 mt-0.5 italic">
            &ldquo;{entregable.ultimo_motivo_rechazo}&rdquo;
          </p>
        </div>
      )}
      {entregable.ciclos_revision > 0 && entregable.estado !== "EN_PROGRESO" && (
        <p className="text-xs text-gray-400 dark:text-white/30 mb-3">
          {entregable.ciclos_revision} {entregable.ciclos_revision === 1 ? "ciclo de revisión" : "ciclos de revisión"}
        </p>
      )}

      {/* Acciones */}
      {puedeActuar && (
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {/* Lógica especial para Cuestionario de Madurez */}
          {esCuestionarioMadurez(entregable) ? (
            <>
              {entregable.estado !== "APROBADO" && entregable.estado !== "NO_APLICA" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cargando}
                  onClick={() => handleAccion("NO_APLICA")}
                >
                  No aplica
                </Button>
              )}
              <Link
                href={`/consultor/proyectos/${idProyecto}/cuestionario-madurez`}
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-[#334155] bg-white text-[#0F172A] hover:bg-slate-50 transition-all duration-200 dark:bg-white/[0.07] dark:text-white/85 dark:border-white/[0.18] dark:hover:bg-white/[0.12] dark:hover:text-white"
              >
                Ver / Editar
              </Link>
            </>
          ) : entregable.estado === "PENDIENTE" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={cargando}
                onClick={() => handleAccion("NO_APLICA")}
              >
                No aplica
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={cargando}
                onClick={() => handleAccion("EN_PROGRESO")}
              >
                Iniciar
              </Button>
            </>
          ) : entregable.estado === "EN_PROGRESO" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={cargando}
                onClick={() => handleAccion("NO_APLICA")}
              >
                No aplica
              </Button>
              <Link
                href={`/consultor/proyectos/${idProyecto}/entregable/${entregable.id}`}
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-xl border border-[#334155] bg-white text-[#0F172A] hover:bg-slate-50 transition-all duration-200 dark:bg-white/[0.07] dark:text-white/85 dark:border-white/[0.18] dark:hover:bg-white/[0.12] dark:hover:text-white"
              >
                Ver / Editar
              </Link>
              <Button
                size="sm"
                variant="primary"
                disabled={cargando}
                onClick={() => setModalAprobar(true)}
              >
                Aprobar
              </Button>
            </>
          )}

          {entregable.estado === "NO_APLICA" && (
            <Button
              size="sm"
              variant="outline"
              disabled={cargando}
              onClick={() => handleAccion("PENDIENTE")}
            >
              Reactivar
            </Button>
          )}
        </div>
      )}

      {/* Modal de confirmación de aprobación */}
      <Modal
        isOpen={modalAprobar}
        onClose={() => setModalAprobar(false)}
        className="max-w-md mx-4 p-6"
        showCloseButton={false}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Confirmar aprobación
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Al aprobar este entregable quedará bloqueado para edición.
          ¿Confirmas que está listo y completo?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={() => setModalAprobar(false)}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleAprobar}>
            Confirmar aprobación
          </Button>
        </div>
      </Modal>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Pestaña Equipo
// ---------------------------------------------------------------------------

interface TabEquipoProps {
  equipo: MiembroProyecto[];
  entregables: Entregable[];
  idProyecto: string;
  idUsuarioActual: string;
  proyectoActivo: boolean;
  soloLectura: boolean;
  onEquipoChange: (equipo: MiembroProyecto[]) => void;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}

function TabEquipo({
  equipo,
  entregables,
  idProyecto,
  idUsuarioActual,
  proyectoActivo,
  soloLectura,
  onEquipoChange,
  addToast,
}: TabEquipoProps) {
  const [vistaEquipo, setVistaEquipo] = useState<"LISTA" | "INVITAR">("LISTA");
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<MiembroProyecto | null>(null);
  const [misPermisosOpen, setMisPermisosOpen] = useState(false);
  const [miembroARemover, setMiembroARemover] = useState<MiembroProyecto | null>(null);
  const [removiendo, setRemoviendo] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const miPropiaMem = equipo.find((m) => m.id_usuario === idUsuarioActual);

  const handleNuevoMiembro = (nuevo: MiembroProyecto) => {
    onEquipoChange([...equipo, nuevo]);
    addToast(`Invitación enviada a ${nuevo.nombre}.`, "success");
  };

  const handleConfirmarRemover = async () => {
    if (!miembroARemover || removiendo) return;
    setRemoviendo(true);
    try {
      await mockRemoverMiembro(idProyecto, miembroARemover.id);
      onEquipoChange(equipo.filter((m) => m.id !== miembroARemover.id));
      addToast(`${miembroARemover.nombre} fue removido del proyecto.`, "success");
    } catch {
      addToast("No se pudo remover al miembro. Intenta de nuevo.", "error");
    } finally {
      setRemoviendo(false);
      setMiembroARemover(null);
    }
  };

  const puedeEditarMiembro = (m: MiembroProyecto) =>
    !soloLectura && !m.es_gerente && proyectoActivo && m.id_usuario !== idUsuarioActual;

  const motivoSoloLectura = (m: MiembroProyecto): string | undefined => {
    if (m.es_gerente) return "Los permisos del Consultor Gerente no pueden modificarse.";
    if (m.id_usuario === idUsuarioActual) return "Estás viendo tus propios permisos en este proyecto.";
    if (!proyectoActivo) return "El proyecto no está activo. No se pueden modificar permisos.";
    if (soloLectura) return "No tienes permisos suficientes para gestionar los permisos de este miembro.";
    return undefined;
  };

  const equipoOrdenado = [...equipo].sort((a, b) =>
    a.es_gerente === b.es_gerente ? 0 : a.es_gerente ? -1 : 1
  );
  const terminoBusqueda = busqueda.trim().toLowerCase();
  const equipoFiltrado = equipoOrdenado.filter((m) => {
    if (!terminoBusqueda) return true;
    const rol = m.es_gerente ? "gerente" : "consultor";
    return (
      m.nombre.toLowerCase().includes(terminoBusqueda) ||
      m.email.toLowerCase().includes(terminoBusqueda) ||
      rol.includes(terminoBusqueda)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Equipo del proyecto
          </h2>
          <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
            {equipo.length} miembro{equipo.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {miPropiaMem && (
            <Button variant="outline" size="sm" onClick={() => setMisPermisosOpen(true)}>
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
                </svg>
                Mis permisos
              </span>
            </Button>
          )}
        </div>
      </div>

      {!soloLectura && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVistaEquipo("LISTA")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              vistaEquipo === "LISTA"
                ? "bg-[#28b8d5]/15 text-[#0f172a] dark:text-white"
                : "text-gray-500 hover:bg-gray-100 dark:text-white/55 dark:hover:bg-white/[0.06]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M3 18c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" strokeLinecap="round" />
                <path d="M14 18c.2-1.8 1.6-3.3 3.5-3.9" strokeLinecap="round" />
              </svg>
              Miembros
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVistaEquipo("INVITAR")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              vistaEquipo === "INVITAR"
                ? "bg-[#28b8d5]/15 text-[#0f172a] dark:text-white"
                : "text-gray-500 hover:bg-gray-100 dark:text-white/55 dark:hover:bg-white/[0.06]"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="10" cy="8" r="3" />
                <path d="M4 18c0-3 2.7-5.5 6-5.5S16 15 16 18" strokeLinecap="round" />
                <path d="M19 8v6M16 11h6" strokeLinecap="round" />
              </svg>
              Invitar miembro
            </span>
          </button>
        </div>
      )}

      {vistaEquipo === "INVITAR" && !soloLectura ? (
        <ModalInvitarConsultor
          isOpen
          embedded
          onClose={() => setVistaEquipo("LISTA")}
          idProyecto={idProyecto}
          entregables={entregables}
          miembrosActuales={equipo}
          onSuccess={(nuevo) => {
            handleNuevoMiembro(nuevo);
            setVistaEquipo("LISTA");
          }}
        />
      ) : (
        <>
      {/* Buscador */}
      <div className="mb-3">
        <label htmlFor="buscar-miembro-proyecto" className="sr-only">
          Buscar miembro
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="buscar-miembro-proyecto"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o rol..."
            className="w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-white/85 placeholder:text-gray-400 dark:placeholder:text-white/25 outline-none focus:border-[#28b8d5] focus:ring-2 focus:ring-[#28b8d5]/15"
          />
        </div>
      </div>

      {/* Lista de miembros */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] overflow-hidden">
        <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
          {equipoFiltrado.map((miembro) => {
            const esTu = miembro.id_usuario === idUsuarioActual;
            return (
              <li key={miembro.id}>
                <button
                  type="button"
                  onClick={() => setMiembroSeleccionado(miembro)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                    esTu ? "bg-[#28b8d5]/[0.03] dark:bg-[#28b8d5]/[0.04]" : ""
                  }`}
                >
                  <AvatarText
                    name={miembro.nombre}
                    className={`h-9 w-9 shrink-0 text-xs ${esTu ? "ring-2 ring-[#28b8d5]/40" : ""}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {miembro.nombre}
                      </span>
                      {esTu && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#28b8d5]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#28b8d5]">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
                          </svg>
                          Tú
                        </span>
                      )}
                      {miembro.es_gerente && (
                        <Badge color="dark" variant="solid" size="sm">
                          Gerente
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-white/30">
                      {miembro.email}
                    </p>
                  </div>
                  {miembro.estado_invitacion === "PENDIENTE" && (
                    <Badge color="warning" variant="light" size="sm">
                      Pendiente
                    </Badge>
                  )}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="shrink-0 text-gray-300 dark:text-white/20"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
          {equipoFiltrado.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-gray-500 dark:text-white/45">
              No se encontraron miembros con ese criterio.
            </li>
          )}
        </ul>
      </div>
      </>
      )}

      {/* Popup mis permisos (solo lectura) */}
      {miPropiaMem && (
        <ModalGestionarPermisos
          isOpen={misPermisosOpen}
          onClose={() => setMisPermisosOpen(false)}
          miembro={miPropiaMem}
          idProyecto={idProyecto}
          entregables={entregables}
          soloLectura
          mensajeSoloLectura="Estás viendo tus propios permisos en este proyecto."
          onArtifactSaved={() => {}}
        />
      )}

      {/* Popup miembro seleccionado */}
      {miembroSeleccionado && (
        <ModalGestionarPermisos
          isOpen
          onClose={() => setMiembroSeleccionado(null)}
          miembro={miembroSeleccionado}
          idProyecto={idProyecto}
          entregables={entregables}
          soloLectura={!puedeEditarMiembro(miembroSeleccionado)}
          mensajeSoloLectura={!puedeEditarMiembro(miembroSeleccionado) ? motivoSoloLectura(miembroSeleccionado) : undefined}
          onArtifactSaved={() => addToast("Permiso actualizado.", "success")}
          onRemover={
            puedeEditarMiembro(miembroSeleccionado)
              ? () => {
                  setMiembroARemover(miembroSeleccionado);
                  setMiembroSeleccionado(null);
                }
              : undefined
          }
        />
      )}

      {/* Modal confirmar remover */}
      <Modal
        isOpen={miembroARemover !== null}
        onClose={() => setMiembroARemover(null)}
        className="max-w-md mx-4 p-6"
        showCloseButton={false}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Remover miembro</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          ¿Estás seguro de que deseas remover a{" "}
          <span className="font-semibold text-gray-800 dark:text-white/90">
            {miembroARemover?.nombre}
          </span>{" "}
          del proyecto? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMiembroARemover(null)}
            disabled={removiendo}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmarRemover}
            disabled={removiendo}
            className="bg-error-600 hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600"
          >
            {removiendo ? "Removiendo..." : "Remover"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function DetalleProyectoPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [equipo, setEquipo] = useState<MiembroProyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<TabPrincipal>("AS_IS");
  const [etapaActiva, setEtapaActiva] = useState<EtapaEntregable>("AS_IS");
  const [mensajeTabBloqueado, setMensajeTabBloqueado] = useState<string | null>(null);

  // Guardamos el estado de habilitación anterior para detectar desbloqueos
  const habilitacionAnteriorRef = useRef<Record<EtapaEntregable, boolean>>({
    CUESTIONARIO: true,
    AS_IS: false,
    TO_BE: false,
    BRECHAS: false,
    ROADMAP: false,
  });

  useEffect(() => {
    Promise.all([projectsApi.getById(id), mockGetEquipo(id)])
      .then(([projectDetail, eq]) => {
        const proy = toLegacyProject(projectDetail);
        const ents = projectDetail.artifact_items.map(toLegacyArtifact);
        setProyecto(proy);
        setEntregables(ents);
        setEquipo(eq);
        const etapaInicial = detectarEtapaInicial(ents);
        setEtapaActiva(etapaInicial);
        setTabActiva(etapaInicial);
        // Inicializar ref de habilitación
        habilitacionAnteriorRef.current = {
          CUESTIONARIO: etapaHabilitada(ents, "CUESTIONARIO"),
          AS_IS: etapaHabilitada(ents, "AS_IS"),
          TO_BE: etapaHabilitada(ents, "TO_BE"),
          BRECHAS: etapaHabilitada(ents, "BRECHAS"),
          ROADMAP: etapaHabilitada(ents, "ROADMAP"),
        };
      })
      .catch((error) => {
        console.error("Error cargando proyecto:", error);
        const status =
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { status?: number } }).response?.status === "number"
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        if (status === 401) {
          setError("Sesión expirada. Inicia sesión nuevamente.");
          return;
        }
        if (status === 403) {
          setError("No tienes permisos para ver este proyecto.");
          return;
        }
        if (status === 404) {
          setError("Proyecto no encontrado");
          return;
        }
        setError("No se pudo cargar el proyecto. Intenta de nuevo.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCambiarEstado = async (
    idEntregable: string,
    nuevoEstado: EstadoEntregable
  ) => {
    let actualizado: Entregable;
    const artifact = entregables.find((item) => item.id === idEntregable);

    if (!artifact) {
      throw new Error("ENTREGABLE_NO_ENCONTRADO");
    }

    if (nuevoEstado === "NO_APLICA" || nuevoEstado === "PENDIENTE") {
      actualizado = toLegacyArtifact(
        await projectsApi.updateArtifact(id, idEntregable, {
          is_applicable: nuevoEstado !== "NO_APLICA",
          status: nuevoEstado === "NO_APLICA" ? "NOT_APPLICABLE" : "PENDING",
        })
      );
    } else if (nuevoEstado === "APROBADO") {
      actualizado = toLegacyArtifact(
        await projectsApi.reviewArtifactConsultant(id, idEntregable, {
          approved: true,
        })
      );
    } else if (nuevoEstado === "EN_PROGRESO") {
      const estadoActual = artifact.estado;
      if (estadoActual === "PENDIENTE") {
        actualizado = toLegacyArtifact(
          await projectsApi.updateArtifact(id, idEntregable, {
            status: "IN_PROGRESS",
          })
        );
      } else {
        throw new Error("El entregable ya fue aprobado por consultor y no puede reabrirse.");
      }
    } else {
      throw new Error(`Transición de estado no soportada: ${nuevoEstado}`);
    }

    setEntregables((prev) => {
      const nuevos = prev.map((e) =>
        e.id === idEntregable ? actualizado : e
      );

      // Detectar etapas que se desbloquean
      const habAnt = habilitacionAnteriorRef.current;
      const nuevaHab: Record<EtapaEntregable, boolean> = {
        CUESTIONARIO: etapaHabilitada(nuevos, "CUESTIONARIO"),
        AS_IS: etapaHabilitada(nuevos, "AS_IS"),
        TO_BE: etapaHabilitada(nuevos, "TO_BE"),
        BRECHAS: etapaHabilitada(nuevos, "BRECHAS"),
        ROADMAP: etapaHabilitada(nuevos, "ROADMAP"),
      };

      ETAPAS.forEach((etapa) => {
        if (!habAnt[etapa] && nuevaHab[etapa]) {
          addToast(`¡Etapa ${ETAPA_LABEL[etapa]} desbloqueada! Ya puedes trabajar en ella.`, "success");
        }
      });

      habilitacionAnteriorRef.current = nuevaHab;
      return nuevos;
    });
  };

  const handleEtapaClick = (etapa: EtapaEntregable) => {
    setMensajeTabBloqueado(null);
    setEtapaActiva(etapa);
    setTabActiva(etapa);
  };

  const handleTabEtapaClick = (etapa: EtapaEntregable) => {
    const habilitada = etapaHabilitada(entregables, etapa);
    if (!habilitada) {
      setMensajeTabBloqueado(mensajeBloqueoEtapa(etapa));
      return;
    }
    setMensajeTabBloqueado(null);
    setEtapaActiva(etapa);
    setTabActiva(etapa);
  };

  if (loading) return <SkeletonDetalle />;

  if (error || !proyecto) {
    return (
      <div className="p-6">
        <p className="text-error-500 mb-4">{error ?? "Proyecto no encontrado"}</p>
        <Link href="/consultor/proyectos" className="text-[#28b8d5] hover:underline text-sm">
          ← Volver a proyectos
        </Link>
      </div>
    );
  }

  const isAdmin = user?.perfil === "ADMIN";
  const esMiProyecto = proyecto.consultor_gerente.id === user?.id;

  // Membership del usuario actual en el equipo (si existe)
  const miPropiaMembership = equipo.find((m) => m.id_usuario === user?.id);

  // Puede gestionar permisos: admin, gerente O consultor delegado (nivel 5 en algún bloque)
  const esDelegado =
    !esMiProyecto &&
    (miPropiaMembership?.nivel_asis === 5 ||
      miPropiaMembership?.nivel_tobe === 5 ||
      miPropiaMembership?.nivel_brechas === 5);
  const puedeGestionarPermisos = isAdmin || esMiProyecto || !!esDelegado;

  // Puede ver la pestaña Equipo: admin, gerente o cualquier miembro del proyecto
  const puedeVerEquipo = isAdmin || esMiProyecto || !!miPropiaMembership;

  const aprobados = entregables.filter((e) => e.estado === "APROBADO").length;
  const noAplica = entregables.filter((e) => e.estado === "NO_APLICA").length;
  const progreso = calcularProgreso(aprobados, noAplica);
  const proyectoActivo = proyecto.estado === "ACTIVO";

  const entregablesEtapaActiva = entregables
    .filter((e) => e.etapa === etapaActiva)
    .sort((a, b) => a.orden_etapa - b.orden_etapa);

  const etapaActivaHabilitada = etapaHabilitada(entregables, etapaActiva);
  const progresoEtapaActiva = progresoEtapa(entregables, etapaActiva);

  const esTabEquipoActiva = tabActiva === "EQUIPO";

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="p-6 max-w-5xl space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* SECCIÓN A — Header                                               */}
        {/* ---------------------------------------------------------------- */}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/40">
          <Link
            href="/consultor/proyectos"
            className="hover:text-[#28b8d5] hover:underline transition-colors"
          >
            Proyectos
          </Link>
          <span>→</span>
          <span className="text-gray-700 dark:text-white/70 truncate max-w-xs">
            {proyecto.nombre}
          </span>
        </nav>

        {/* Título + badge */}
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight flex-1">
            {proyecto.nombre}
          </h1>
          {estadoBadge(proyecto.estado)}
        </div>

        {/* Banners contextuales */}
        {proyecto.estado === "BLOQUEADO" && (
          <Alert
            variant="error"
            title="Proyecto bloqueado"
            message="Este proyecto está bloqueado porque el Consultor Gerente fue desactivado. Contacta al Administrador para resolverlo."
          />
        )}
        {proyecto.estado === "EN_PAUSA" && (
          <Alert
            variant="warning"
            title="Proyecto en pausa"
            message="Este proyecto está en pausa. Los entregables no pueden modificarse."
          />
        )}
        {proyecto.estado === "CERRADO" && (
          <Alert
            variant="info"
            title="Proyecto cerrado"
            message="Este proyecto está cerrado. Solo lectura."
          />
        )}

        {/* Metadatos */}
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] p-5 space-y-4">
          {/* Empresa cliente */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 text-gray-400"
              aria-hidden="true"
            >
              <path
                d="M3 21h18M3 7l9-4 9 4M4 21V7M20 21V7M8 10v2M8 14v2M12 10v2M12 14v2M16 10v2M16 14v2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              <span className="text-gray-400 dark:text-white/30">Empresa cliente:</span>{" "}
              <span className="font-medium text-gray-700 dark:text-white/80">
                {proyecto.empresa_cliente.nombre}
              </span>
            </span>
          </div>

          {/* Fecha estimada de cierre */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 text-gray-400"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>
              <span className="text-gray-400 dark:text-white/30">Cierre estimado:</span>{" "}
              <span className="font-medium text-gray-700 dark:text-white/80">
                {formatearFecha(proyecto.fecha_estimada_cierre)}
              </span>
            </span>
          </div>

          {/* Consultor gerente */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 text-gray-400"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>
              <span className="text-gray-400 dark:text-white/30">Consultor Gerente:</span>{" "}
              <span className="font-medium text-gray-700 dark:text-white/80">
                {proyecto.consultor_gerente.nombre}
                {esMiProyecto && (
                  <span className="ml-1 text-[#28b8d5] text-xs">(Tú)</span>
                )}
              </span>
            </span>
          </div>

          {/* Progreso global */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 dark:text-white/30">Progreso global</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-white/70">
                {progreso}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#28b8d5] transition-all duration-500"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
              {aprobados} aprobados · {noAplica} no aplica · {proyecto.entregables.total - aprobados - noAplica} pendientes
            </p>
          </div>
        </div>

        {/* EtapaProgress */}
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] p-5">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-4">
            Progreso por etapa
          </h2>
          <EtapaProgress
            entregables={entregables}
            etapaActiva={etapaActiva}
            onEtapaClick={handleEtapaClick}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* SECCIÓN B — Tabs principales (Etapas + Equipo)                   */}
        {/* ---------------------------------------------------------------- */}

        <div>
          {/* Tabs */}
          <div
            className="flex gap-1 border-b border-gray-200 dark:border-white/[0.08] mb-4 overflow-x-auto"
            role="tablist"
            aria-label="Secciones del proyecto"
          >
            {/* Tabs de etapas */}
            {ETAPAS.map((etapa) => {
              const habilitada = etapaHabilitada(entregables, etapa);
              const esActiva = tabActiva === etapa;
              const prog = progresoEtapa(entregables, etapa);

              return (
                <button
                  key={etapa}
                  type="button"
                  role="tab"
                  aria-selected={esActiva}
                  aria-controls={`panel-${etapa}`}
                  title={!habilitada ? mensajeBloqueoEtapa(etapa) : undefined}
                  onClick={() => handleTabEtapaClick(etapa)}
                  className={`
                    flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all duration-200 whitespace-nowrap shrink-0
                    ${!habilitada
                      ? "cursor-not-allowed text-gray-300 dark:text-white/20 border-transparent"
                      : esActiva
                      ? "text-[#28b8d5] border-[#28b8d5]"
                      : "text-gray-500 dark:text-white/50 border-transparent hover:text-gray-700 dark:hover:text-white/70 hover:border-gray-300 dark:hover:border-white/20"
                    }
                  `}
                >
                  {!habilitada && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                  {ETAPA_LABEL[etapa]}
                  {habilitada && (
                    <span className="text-[10px] opacity-60">{prog}%</span>
                  )}
                </button>
              );
            })}

            {/* Tab Equipo — visible para gerente y todos los miembros del proyecto */}
            {puedeVerEquipo && (
              <button
                type="button"
                role="tab"
                aria-selected={esTabEquipoActiva}
                aria-controls="panel-EQUIPO"
                onClick={() => {
                  setMensajeTabBloqueado(null);
                  setTabActiva("EQUIPO");
                }}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all duration-200 whitespace-nowrap shrink-0
                  ${esTabEquipoActiva
                    ? "text-[#28b8d5] border-[#28b8d5]"
                    : "text-gray-500 dark:text-white/50 border-transparent hover:text-gray-700 dark:hover:text-white/70 hover:border-gray-300 dark:hover:border-white/20"
                  }
                `}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M1 20c0-3.3 3.6-6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10 20c0-3.3 3.6-6 8-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Equipo
                <span className="text-[10px] opacity-60">{equipo.length}</span>
              </button>
            )}
          </div>

          {/* Mensaje de tab bloqueado */}
          {mensajeTabBloqueado && (
            <p
              role="alert"
              className="mb-4 text-sm text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-400/10 border border-warning-200 dark:border-warning-400/15 rounded-lg px-4 py-2"
            >
              {mensajeTabBloqueado}
            </p>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* SECCIÓN C — Panel de etapa activa                               */}
          {/* ---------------------------------------------------------------- */}

          {!esTabEquipoActiva && (
            <div
              id={`panel-${etapaActiva}`}
              role="tabpanel"
              aria-label={`Entregables de ${ETAPA_LABEL[etapaActiva]}`}
            >
              {/* Cabecera de etapa */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    {ETAPA_LABEL[etapaActiva]}
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-white/30">
                    {entregablesEtapaActiva.length} entregable
                    {entregablesEtapaActiva.length !== 1 ? "s" : ""} · {progresoEtapaActiva}% completado
                  </p>
                </div>

                {!etapaActivaHabilitada && (
                  <Badge color="warning" variant="light" size="sm">
                    Bloqueada
                  </Badge>
                )}
              </div>

              {/* Mensaje si etapa bloqueada */}
              {!etapaActivaHabilitada && (
                <Alert
                  variant="warning"
                  title="Etapa bloqueada"
                  message={mensajeBloqueoEtapa(etapaActiva)}
                />
              )}

              {/* Lista de entregables */}
              {entregablesEtapaActiva.length > 0 ? (
                <div className="space-y-3 mt-3">
                  {entregablesEtapaActiva.map((entregable) => (
                    <EntregableCard
                      key={entregable.id}
                      entregable={entregable}
                      idProyecto={id}
                      proyectoActivo={proyectoActivo}
                      etapaHabilitadaFlag={etapaActivaHabilitada}
                      onCambiarEstado={handleCambiarEstado}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-white/30 mt-3">
                  No hay entregables para esta etapa.
                </p>
              )}


            </div>
          )}

          {/* Avatar asistente (solo visible en etapa AS-IS) */}
          {!esTabEquipoActiva && etapaActiva === "AS_IS" && <AvatarAsistente />}

          {/* ---------------------------------------------------------------- */}
          {/* SECCIÓN D — Panel de equipo                                     */}
          {/* ---------------------------------------------------------------- */}

          {esTabEquipoActiva && puedeVerEquipo && (
            <div id="panel-EQUIPO" role="tabpanel" aria-label="Equipo del proyecto">
              <TabEquipo
                equipo={equipo}
                entregables={entregables}
                idProyecto={id}
                idUsuarioActual={user?.id ?? ""}
                proyectoActivo={proyectoActivo}
                soloLectura={!puedeGestionarPermisos}
                onEquipoChange={setEquipo}
                addToast={addToast}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

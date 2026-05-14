"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import {
  mockActualizarPermisoArtefacto,
  mockDeletePermisoArtefacto,
  mockGetArtifactPermissions,
  type MiembroProyecto,
  type NivelPermiso,
} from "@/lib/mocks/equipo.mock";
import { ETIQUETAS_NIVEL, BADGE_COLOR_NIVEL } from "@/lib/utils/permisos.utils";
import type { LegacyArtifact as Entregable } from "@/lib/adapters/project.adapter";

interface ModalPermisosArtefactoProps {
  isOpen: boolean;
  onClose: () => void;
  idProyecto: string;
  miembro: MiembroProyecto;
  entregables: Entregable[];
  onSaved: () => void;
}

type FiltroEtapa = "ALL" | Entregable["etapa"];

const ETAPA_LABEL: Record<Entregable["etapa"], string> = {
  CUESTIONARIO: "Diagnóstico",
  AS_IS: "AS-IS",
  TO_BE: "TO-BE",
  BRECHAS: "Brechas",
  ROADMAP: "Roadmap",
};

const NIVELES: NivelPermiso[] = [0, 1, 2, 3, 4, 5];

function nivelFase(miembro: MiembroProyecto, etapa: Entregable["etapa"]): NivelPermiso {
  if (etapa === "AS_IS") return miembro.nivel_asis;
  if (etapa === "TO_BE") return miembro.nivel_tobe;
  if (etapa === "BRECHAS") return miembro.nivel_brechas;
  return 3;
}

export default function ModalPermisosArtefacto({
  isOpen,
  onClose,
  idProyecto,
  miembro,
  entregables,
  onSaved,
}: ModalPermisosArtefactoProps) {
  const [filtro, setFiltro] = useState<FiltroEtapa>("ALL");
  const [cargando, setCargando] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [restableciendo, setRestableciendo] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  // overrides[artifactId] = nivel personalizado guardado en BD
  const [overrides, setOverrides] = useState<Record<string, NivelPermiso>>({});
  // pendientes[artifactId] = nivel que el usuario ha seleccionado en el selector (no guardado aún)
  const [pendientes, setPendientes] = useState<Record<string, NivelPermiso>>({});

  // Cargar overrides reales al abrir el modal
  useEffect(() => {
    if (!isOpen) return;
    setCargando(true);
    setErrorId(null);
    setPendientes({});
    mockGetArtifactPermissions(idProyecto, miembro.id_usuario)
      .then((data) => {
        setOverrides(data);
        // Inicializar pendientes con los overrides cargados
        setPendientes(
          Object.fromEntries(
            entregables.map((e) => [
              e.id,
              data[e.id] !== undefined ? data[e.id] : nivelFase(miembro, e.etapa),
            ])
          )
        );
      })
      .catch(() => setErrorId("_load"))
      .finally(() => setCargando(false));
  }, [isOpen, idProyecto, miembro, entregables]);

  const artifactosFiltrados = useMemo(
    () => (filtro === "ALL" ? entregables : entregables.filter((e) => e.etapa === filtro)),
    [entregables, filtro]
  );

  const handleGuardar = async (artifact: Entregable) => {
    const nivel = pendientes[artifact.id];
    if (nivel === undefined) return;
    setGuardandoId(artifact.id);
    setErrorId(null);
    try {
      await mockActualizarPermisoArtefacto(idProyecto, artifact.id, miembro.id_usuario, nivel);
      setOverrides((prev) => ({ ...prev, [artifact.id]: nivel }));
      onSaved();
    } catch {
      setErrorId(artifact.id);
    } finally {
      setGuardandoId(null);
    }
  };

  const handleRestablecer = async (artifact: Entregable) => {
    setRestableciendo(artifact.id);
    setErrorId(null);
    try {
      await mockDeletePermisoArtefacto(idProyecto, artifact.id, miembro.id_usuario);
      const fase = nivelFase(miembro, artifact.etapa);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[artifact.id];
        return next;
      });
      setPendientes((prev) => ({ ...prev, [artifact.id]: fase }));
      onSaved();
    } catch {
      setErrorId(artifact.id);
    } finally {
      setRestableciendo(null);
    }
  };

  const totalOverrides = Object.keys(overrides).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl mx-4 p-0">
      {/* Header */}
      <div className="border-b border-gray-100 dark:border-white/[0.06] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Permisos por artefacto
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-white/40">
              <span className="font-medium text-gray-700 dark:text-white/80">{miembro.nombre}</span>
              {" · "}
              {miembro.email}
            </p>
          </div>
          {totalOverrides > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#28b8d5]/15 px-2 py-1 text-[11px] font-semibold text-[#28b8d5]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {totalOverrides} personalizado{totalOverrides !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Permisos de fase (referencia) */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-[11px] text-gray-400 dark:text-white/30 self-center">Nivel de fase:</span>
          {(
            [
              { label: "AS-IS", nivel: miembro.nivel_asis },
              { label: "TO-BE", nivel: miembro.nivel_tobe },
              { label: "Brechas", nivel: miembro.nivel_brechas },
            ] as Array<{ label: string; nivel: NivelPermiso }>
          ).map(({ label, nivel }) => (
            <span key={label} className="inline-flex items-center gap-1 rounded-md bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-2 py-0.5 text-[11px]">
              <span className="text-gray-400 dark:text-white/30">{label}:</span>
              <Badge color={BADGE_COLOR_NIVEL[nivel]} variant="light" size="sm">
                {ETIQUETAS_NIVEL[nivel]}
              </Badge>
            </span>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="px-5 py-2 flex items-center gap-4 bg-gray-50/60 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/[0.06] text-[11px] text-gray-400 dark:text-white/30">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#28b8d5]/70" />
          Personalizado — permiso específico para este artefacto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-300 dark:bg-white/20" />
          Hereda del bloque/fase
        </span>
      </div>

      {/* Filtros */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap border-b border-gray-100 dark:border-white/[0.06]">
        <span className="text-xs text-gray-400 dark:text-white/30">Filtrar:</span>
        {(["ALL", "AS_IS", "TO_BE", "BRECHAS", "ROADMAP"] as FiltroEtapa[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filtro === f
                ? "bg-[#28b8d5] text-white"
                : "border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            }`}
          >
            {f === "ALL" ? "Todos" : ETAPA_LABEL[f as Entregable["etapa"]]}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-y-auto max-h-[52vh]">
        {cargando ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-white/30 animate-pulse">
            Cargando permisos...
          </div>
        ) : errorId === "_load" ? (
          <div className="px-5 py-8 text-center text-sm text-red-500 dark:text-red-400">
            No se pudieron cargar los permisos. Intenta cerrar y volver a abrir el modal.
          </div>
        ) : artifactosFiltrados.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-white/30">
            No hay artefactos para esta etapa.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-[#111]">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Artefacto</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Etapa</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Fuente</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Nivel</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {artifactosFiltrados.map((artifact) => {
                const tieneOverride = overrides[artifact.id] !== undefined;
                const nivelActual = pendientes[artifact.id] ?? nivelFase(miembro, artifact.etapa);
                const nivelOriginalFase = nivelFase(miembro, artifact.etapa);
                const guardando = guardandoId === artifact.id;
                const restableciendo_ = restableciendo === artifact.id;
                const error = errorId === artifact.id;
                const hayCambio = nivelActual !== (tieneOverride ? overrides[artifact.id] : nivelOriginalFase);

                return (
                  <tr
                    key={artifact.id}
                    className={`border-b border-gray-100 dark:border-white/[0.06] last:border-0 transition-colors ${
                      tieneOverride ? "bg-[#28b8d5]/[0.03] dark:bg-[#28b8d5]/[0.04]" : ""
                    }`}
                  >
                    {/* Artefacto */}
                    <td className={`px-4 py-2.5 ${tieneOverride ? "border-l-2 border-[#28b8d5]" : ""}`}>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{artifact.nombre}</p>
                      <p className="text-[11px] text-gray-400 dark:text-white/30">{artifact.code}</p>
                    </td>

                    {/* Etapa */}
                    <td className="px-4 py-2.5">
                      <Badge color="light" variant="light" size="sm">{ETAPA_LABEL[artifact.etapa]}</Badge>
                    </td>

                    {/* Fuente */}
                    <td className="px-4 py-2.5">
                      {tieneOverride ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#28b8d5]/15 px-2 py-0.5 text-[10px] font-semibold text-[#28b8d5]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#28b8d5]" />
                          Personalizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-white/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-white/20" />
                          Hereda fase
                        </span>
                      )}
                    </td>

                    {/* Nivel selector */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={nivelActual}
                          onChange={(e) =>
                            setPendientes((prev) => ({
                              ...prev,
                              [artifact.id]: Number(e.target.value) as NivelPermiso,
                            }))
                          }
                          className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                        >
                          {NIVELES.map((n) => (
                            <option key={n} value={n}>
                              {n} — {ETIQUETAS_NIVEL[n]}
                            </option>
                          ))}
                        </select>
                        {!tieneOverride && (
                          <span className="text-[10px] text-gray-300 dark:text-white/20">
                            (fase: {nivelOriginalFase})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tieneOverride && (
                          <button
                            type="button"
                            onClick={() => void handleRestablecer(artifact)}
                            disabled={restableciendo_ || guardando}
                            title="Eliminar override — el miembro heredará el nivel de su bloque"
                            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 dark:border-white/[0.08] dark:text-white/40 dark:hover:bg-white/[0.05]"
                          >
                            {restableciendo_ ? "..." : "Restablecer"}
                          </button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => void handleGuardar(artifact)}
                          disabled={guardando || restableciendo_ || !hayCambio}
                          variant={hayCambio ? "primary" : "outline"}
                        >
                          {guardando ? "Guardando..." : tieneOverride ? "Actualizar" : "Personalizar"}
                        </Button>
                      </div>
                      {error && (
                        <p className="mt-1 text-[10px] text-red-500">Error al guardar</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-white/[0.06] px-5 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-white/30">
          {totalOverrides > 0
            ? `${totalOverrides} artefacto${totalOverrides !== 1 ? "s" : ""} con permiso personalizado`
            : "Todos los artefactos heredan el nivel de su bloque/fase"}
        </p>
        <Button size="sm" variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}

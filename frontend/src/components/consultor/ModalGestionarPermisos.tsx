"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import AvatarText from "@/components/ui/avatar/AvatarText";
import {
  mockActualizarPermisoArtefacto,
  mockDeletePermisoArtefacto,
  mockGetArtifactPermissions,
  type MiembroProyecto,
  type NivelPermiso,
} from "@/lib/mocks/equipo.mock";
import {
  ETIQUETAS_NIVEL,
  DESCRIPCION_NIVEL,
  BADGE_COLOR_NIVEL,
} from "@/lib/utils/permisos.utils";
import type { MaxNivelesBloques } from "./ModalEditarPermisos";
import type { LegacyArtifact as Entregable } from "@/lib/adapters/project.adapter";

// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

interface ModalGestionarPermisosProps {
  isOpen: boolean;
  onClose: () => void;
  miembro: MiembroProyecto;
  idProyecto: string;
  maxNiveles?: MaxNivelesBloques;
  entregables: Entregable[];
  soloLectura?: boolean;
  mensajeSoloLectura?: string;
  onMemberUpdated?: (updated: MiembroProyecto) => void;
  onArtifactSaved: () => void;
  onRemover?: () => void;
}

export default function ModalGestionarPermisos({
  isOpen,
  onClose,
  miembro,
  idProyecto,
  entregables,
  soloLectura = false,
  mensajeSoloLectura,
  onArtifactSaved,
  onRemover,
}: ModalGestionarPermisosProps) {
  const [filtro, setFiltro] = useState<"ALL" | Entregable["etapa"]>("ALL");
  const [cargando, setCargando] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, NivelPermiso>>({});
  const [valores, setValores] = useState<Record<string, NivelPermiso>>({});
  const [estados, setEstados] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [leyendaAbierta, setLeyendaAbierta] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFiltro("ALL");
    setEstados({});
    setLeyendaAbierta(false);
    setCargando(true);
    mockGetArtifactPermissions(idProyecto, miembro.id_usuario)
      .then((data) => {
        setOverrides(data);
        setValores(
          Object.fromEntries(
            entregables.map((e) => [
              e.id,
              data[e.id] !== undefined ? data[e.id] : nivelFase(miembro, e.etapa),
            ])
          )
        );
      })
      .catch(() => {
        setOverrides({});
        setValores(
          Object.fromEntries(entregables.map((e) => [e.id, nivelFase(miembro, e.etapa)]))
        );
      })
      .finally(() => setCargando(false));
  }, [isOpen, idProyecto, miembro, entregables]);

  const artifactosFiltrados = useMemo(
    () => (filtro === "ALL" ? entregables : entregables.filter((e) => e.etapa === filtro)),
    [entregables, filtro]
  );

  const handleChange = async (artifact: Entregable, nivel: NivelPermiso) => {
    if (soloLectura) return;
    setValores((prev) => ({ ...prev, [artifact.id]: nivel }));
    setEstados((prev) => ({ ...prev, [artifact.id]: "saving" }));
    try {
      const nivelBase = nivelFase(miembro, artifact.etapa);
      if (nivel === nivelBase && overrides[artifact.id] !== undefined) {
        await mockDeletePermisoArtefacto(idProyecto, artifact.id, miembro.id_usuario);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[artifact.id];
          return next;
        });
      } else {
        await mockActualizarPermisoArtefacto(idProyecto, artifact.id, miembro.id_usuario, nivel);
        setOverrides((prev) => ({ ...prev, [artifact.id]: nivel }));
      }
      setEstados((prev) => ({ ...prev, [artifact.id]: "saved" }));
      onArtifactSaved();
      setTimeout(() => {
        setEstados((prev) => {
          const next = { ...prev };
          delete next[artifact.id];
          return next;
        });
      }, 1500);
    } catch {
      setEstados((prev) => ({ ...prev, [artifact.id]: "error" }));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl mx-4 p-0">
      {/* Header — info del miembro */}
      <div className="border-b border-gray-100 dark:border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <AvatarText name={miembro.nombre} className="h-10 w-10 text-sm" />
            {miembro.es_gerente && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 dark:bg-amber-500 shadow-sm">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
            )}
            {soloLectura && !miembro.es_gerente && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 dark:bg-white/30 shadow-sm">
                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {miembro.nombre}
              </h3>
              {miembro.es_gerente ? (
                <Badge color="dark" variant="solid" size="sm">Consultor Gerente</Badge>
              ) : (
                <Badge color="light" variant="light" size="sm">Consultor</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">{miembro.email}</p>
          </div>
          {/* Indicador editable / solo lectura */}
          <div className="shrink-0">
            {soloLectura ? (
              <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-white/30">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
                </svg>
                Solo lectura
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-[#28b8d5]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Editable
              </span>
            )}
          </div>
        </div>

        {/* Permisos de fase */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { label: "AS-IS", nivel: miembro.nivel_asis },
              { label: "TO-BE", nivel: miembro.nivel_tobe },
              { label: "Brechas", nivel: miembro.nivel_brechas },
            ] as Array<{ label: string; nivel: NivelPermiso }>
          ).map(({ label, nivel }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] px-2 py-0.5 text-[11px]"
            >
              <span className="text-gray-400 dark:text-white/30">{label}:</span>
              <Badge color={BADGE_COLOR_NIVEL[nivel]} variant="light" size="sm">
                {ETIQUETAS_NIVEL[nivel]}
              </Badge>
            </span>
          ))}
        </div>
      </div>

      {/* Banner solo lectura */}
      {soloLectura && mensajeSoloLectura && (
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/40">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="mt-px shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {mensajeSoloLectura}
        </div>
      )}

      {/* Leyenda de niveles (colapsable) */}
      <div className="px-5 pt-4">
        <button
          type="button"
          onClick={() => setLeyendaAbierta((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          ¿Qué significa cada nivel de permiso?
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition-transform duration-200 ${leyendaAbierta ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {leyendaAbierta && (
          <div className="mt-3 mb-1 grid grid-cols-1 gap-1.5 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50/60 dark:bg-white/[0.02] p-3">
            {NIVELES.map((n) => (
              <div key={n} className="flex items-start gap-2.5">
                <Badge color={BADGE_COLOR_NIVEL[n]} variant="light" size="sm">
                  {n}
                </Badge>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-700 dark:text-white/70">
                    {ETIQUETAS_NIVEL[n]}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-white/30">
                    {" — "}{DESCRIPCION_NIVEL[n]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros de fase */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap border-b border-gray-100 dark:border-white/[0.06] mt-3">
        {(["ALL", "AS_IS", "TO_BE", "BRECHAS", "ROADMAP"] as const).map((f) => (
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

      {/* Lista de artefactos */}
      <div className="overflow-y-auto max-h-[40vh]">
        {cargando ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-white/30 animate-pulse">
            Cargando...
          </div>
        ) : artifactosFiltrados.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-white/30">
            No hay artefactos para esta fase.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {artifactosFiltrados.map((artifact) => {
              const nivel = valores[artifact.id] ?? nivelFase(miembro, artifact.etapa);
              const estado = estados[artifact.id];

              return (
                <li key={artifact.id} className="flex items-center gap-3 px-5 py-3">
                  {/* Icono de fase */}
                  <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/30">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                      {artifact.nombre}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">
                      {ETAPA_LABEL[artifact.etapa]}
                    </p>
                  </div>

                  {soloLectura ? (
                    <Badge color={BADGE_COLOR_NIVEL[nivel]} variant="light" size="sm">
                      {ETIQUETAS_NIVEL[nivel]}
                    </Badge>
                  ) : (
                    <>
                      <select
                        value={nivel}
                        disabled={estado === "saving"}
                        onChange={(e) =>
                          void handleChange(artifact, Number(e.target.value) as NivelPermiso)
                        }
                        className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm disabled:opacity-50 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                      >
                        {NIVELES.map((n) => (
                          <option key={n} value={n}>
                            {n} — {ETIQUETAS_NIVEL[n]}
                          </option>
                        ))}
                      </select>

                      <span className="w-5 shrink-0 flex items-center justify-center">
                        {estado === "saving" && (
                          <svg className="animate-spin text-[#28b8d5]" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-label="Guardando">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12" />
                          </svg>
                        )}
                        {estado === "saved" && (
                          <svg className="text-green-500" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-label="Guardado">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        {estado === "error" && (
                          <svg className="text-red-500" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-label="Error">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-white/[0.06] px-5 py-3 flex items-center justify-between">
        {onRemover ? (
          <button
            type="button"
            onClick={onRemover}
            className="flex items-center gap-1.5 text-sm text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
              <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Remover del proyecto
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {!soloLectura && (
            <Button size="sm" variant="primary" onClick={onClose}>
              Guardar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

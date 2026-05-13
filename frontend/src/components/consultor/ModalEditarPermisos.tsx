"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal/index";
import Button from "@/components/ui/button/Button";
import NivelPermisoSelector from "./NivelPermisoSelector";
import {
  mockActualizarPermisos,
  type MiembroProyecto,
  type NivelPermiso,
} from "@/lib/mocks/equipo.mock";

export interface MaxNivelesBloques {
  asis: NivelPermiso;
  tobe: NivelPermiso;
  brechas: NivelPermiso;
}

interface ModalEditarPermisosProps {
  isOpen: boolean;
  onClose: () => void;
  miembro: MiembroProyecto;
  idProyecto: string;
  /** Nivel máximo asignable por bloque para el usuario que abre el modal */
  maxNiveles: MaxNivelesBloques;
  onSuccess: (miembroActualizado: MiembroProyecto) => void;
}

export default function ModalEditarPermisos({
  isOpen,
  onClose,
  miembro,
  idProyecto,
  maxNiveles,
  onSuccess,
}: ModalEditarPermisosProps) {
  const [nivelAsis, setNivelAsis] = useState<NivelPermiso>(miembro.nivel_asis);
  const [nivelTobe, setNivelTobe] = useState<NivelPermiso>(miembro.nivel_tobe);
  const [nivelBrechas, setNivelBrechas] = useState<NivelPermiso>(miembro.nivel_brechas);
  const [verAuditoria, setVerAuditoria] = useState<boolean>(miembro.ver_auditoria);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNivelAsis(miembro.nivel_asis);
      setNivelTobe(miembro.nivel_tobe);
      setNivelBrechas(miembro.nivel_brechas);
      setVerAuditoria(miembro.ver_auditoria);
      setError(null);
    }
  }, [isOpen, miembro]);

  const huboCambios =
    nivelAsis !== miembro.nivel_asis ||
    nivelTobe !== miembro.nivel_tobe ||
    nivelBrechas !== miembro.nivel_brechas ||
    verAuditoria !== miembro.ver_auditoria;

  const puedeEditar =
    maxNiveles.asis > 0 || maxNiveles.tobe > 0 || maxNiveles.brechas > 0;

  // Solo el gerente (max 5 en todos) puede cambiar acceso a auditoría
  const puedeEditarAuditoria = maxNiveles.asis === 5;

  const handleGuardar = async () => {
    if (!huboCambios || guardando || !puedeEditar) return;
    setGuardando(true);
    setError(null);
    try {
      const actualizado = await mockActualizarPermisos(idProyecto, miembro.id, {
        nivel_asis: nivelAsis,
        nivel_tobe: nivelTobe,
        nivel_brechas: nivelBrechas,
        ver_auditoria: verAuditoria,
      });
      onSuccess(actualizado);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      setError(
        msg === "NO_SE_PUEDE_MODIFICAR_GERENTE"
          ? "No se pueden modificar los permisos del Consultor Gerente."
          : "Ocurrió un error al guardar los cambios. Intenta de nuevo."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg mx-4 p-6" showCloseButton={false}>
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar permisos</h3>
        <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">
          <span className="font-medium text-gray-700 dark:text-white/80">{miembro.nombre}</span>
          {" · "}
          {miembro.email}
        </p>
        <p className="text-xs text-warning-600 dark:text-warning-400 mt-2">
          Los cambios tienen efecto inmediato.
        </p>
      </div>

      <div className="space-y-5">
        <NivelPermisoSelector
          label="AS-IS"
          value={nivelAsis}
          onChange={setNivelAsis}
          maxNivel={maxNiveles.asis}
          disabled={maxNiveles.asis === 0}
          disabledTooltip="No tienes permiso de delegar en el bloque AS-IS"
        />
        <NivelPermisoSelector
          label="TO-BE"
          value={nivelTobe}
          onChange={setNivelTobe}
          maxNivel={maxNiveles.tobe}
          disabled={maxNiveles.tobe === 0}
          disabledTooltip="No tienes permiso de delegar en el bloque TO-BE"
        />
        <NivelPermisoSelector
          label="Brechas"
          value={nivelBrechas}
          onChange={setNivelBrechas}
          maxNivel={maxNiveles.brechas}
          disabled={maxNiveles.brechas === 0}
          disabledTooltip="No tienes permiso de delegar en el bloque Brechas"
        />

        <div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-white/80">
                Acceso al log de auditoría
              </p>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-0.5">
                Permite al consultor ver el historial de cambios del proyecto
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={verAuditoria}
              disabled={!puedeEditarAuditoria}
              onClick={() => puedeEditarAuditoria && setVerAuditoria((v) => !v)}
              className={`
                relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none
                ${!puedeEditarAuditoria ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
                ${verAuditoria ? "bg-brand-500 dark:bg-white" : "bg-gray-200 dark:bg-white/10"}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-gray-900
                  shadow-sm transform transition-transform duration-200 ease-in-out
                  ${verAuditoria ? "translate-x-5" : "translate-x-0"}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-400/10 rounded-lg px-3 py-2 border border-error-200 dark:border-error-400/15">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
        <Button variant="outline" size="sm" onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleGuardar}
          disabled={!huboCambios || guardando || !puedeEditar}
        >
          {guardando ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Guardando...
            </span>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </Modal>
  );
}

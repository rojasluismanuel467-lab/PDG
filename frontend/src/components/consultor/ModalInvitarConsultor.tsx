"use client";
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal/index";
import Button from "@/components/ui/button/Button";
import NivelPermisoSelector from "./NivelPermisoSelector";
import {
  mockInvitarConsultor,
  mockActualizarPermisoArtefacto,
  type MiembroProyecto,
  type NivelPermiso,
} from "@/lib/mocks/equipo.mock";
import { DESCRIPCION_NIVEL } from "@/lib/utils/permisos.utils";
import { usuariosApi } from "@/lib/api/usuarios";
import type { LegacyArtifact as Entregable } from "@/lib/adapters/project.adapter";
import type { Usuario } from "@/lib/types/usuarios.types";

interface ModalInvitarConsultorProps {
  isOpen: boolean;
  onClose: () => void;
  idProyecto: string;
  entregables: Entregable[];
  miembrosActuales: MiembroProyecto[];
  onSuccess: (nuevoMiembro: MiembroProyecto) => void;
  embedded?: boolean;
}

export default function ModalInvitarConsultor({
  isOpen,
  onClose,
  idProyecto,
  entregables,
  miembrosActuales,
  onSuccess,
  embedded = false,
}: ModalInvitarConsultorProps) {
  const [email, setEmail] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState<"CONSULTOR" | "EMPRESA">("CONSULTOR");
  const [permisosArtefacto, setPermisosArtefacto] = useState<Record<string, NivelPermiso>>({});
  const [busquedaUsuario, setBusquedaUsuario] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [sinPermisoListadoUsuarios, setSinPermisoListadoUsuarios] = useState(false);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setTipoUsuario("CONSULTOR");
    setPermisosArtefacto(
      Object.fromEntries(entregables.map((ent) => [ent.id, 1 as NivelPermiso]))
    );
    setBusquedaUsuario("");
    setUsuarios([]);
    setSinPermisoListadoUsuarios(false);
    setErrorEmail(null);
    setErrorGeneral(null);
    setEnviando(false);
    setConfirmandoEnvio(false);
  }, [isOpen, entregables]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const fetchUsuarios = async () => {
      setCargandoUsuarios(true);
      try {
        const data = await usuariosApi.getUsuarios({
          busqueda: busquedaUsuario.trim() || undefined,
          estado: "ACTIVO",
          tipo_usuario: tipoUsuario,
        });
        if (active) {
          setUsuarios(data);
          setSinPermisoListadoUsuarios(false);
        }
      } catch {
        if (active) {
          setUsuarios([]);
          setSinPermisoListadoUsuarios(true);
        }
      } finally {
        if (active) setCargandoUsuarios(false);
      }
    };
    void fetchUsuarios();
    return () => {
      active = false;
    };
  }, [isOpen, busquedaUsuario, tipoUsuario]);

  const validarEmail = (): boolean => {
    const value = email.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!emailValido) {
      setErrorEmail("Ingresa un correo electrónico válido.");
      return false;
    }
    const yaEsMiembro = miembrosActuales.some((m) => m.email.toLowerCase() === value);
    if (yaEsMiembro) {
      setErrorEmail("Este usuario ya pertenece al proyecto.");
      return false;
    }
    setErrorEmail(null);
    return true;
  };

  const handleEnviar = async () => {
    if (!validarEmail() || enviando) return;
    setEnviando(true);
    setErrorGeneral(null);
    try {
      const nuevo = await mockInvitarConsultor(idProyecto, {
        email: email.trim().toLowerCase(),
        tipo_usuario: tipoUsuario,
        nivel_asis: 0,
        nivel_tobe: 0,
        nivel_brechas: 0,
      });
      await Promise.all(
        entregables.map((art) =>
          mockActualizarPermisoArtefacto(
            idProyecto,
            art.id,
            nuevo.id_usuario,
            permisosArtefacto[art.id] ?? 0
          )
        )
      );
      onSuccess(nuevo);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ERROR";
      if (msg === "CONSULTOR_YA_EN_PROYECTO" || msg === "MIEMBRO_DUPLICADO") {
        setErrorEmail("Este usuario ya pertenece al proyecto.");
      } else {
        setErrorGeneral("Ocurrió un error al enviar la invitación. Intenta de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  };

  const formularioValido = email.trim().length > 0 && errorEmail === null;
  const usuariosFiltrados = usuarios.filter(
    (u) => !miembrosActuales.some((m) => m.email.toLowerCase() === u.email.toLowerCase())
  );
  const usuarioSeleccionado =
    usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ?? null;

  const content = (
    <div className={embedded ? "rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f] p-5" : ""}>
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invitar miembro</h3>
        <p className="text-sm text-gray-500 dark:text-white/50 mt-0.5">
          Se enviará una invitación al correo y quedará pendiente de activación.
        </p>
      </div>

      {!confirmandoEnvio && (
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-2">
          Tipo de usuario
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "CONSULTOR" as const, label: "Consultor" },
            { value: "EMPRESA" as const, label: "Empresa" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTipoUsuario(option.value)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                tipoUsuario === option.value
                  ? "border-[#28b8d5] bg-[#28b8d5]/10 text-[#0f172a] dark:text-white"
                  : "border-gray-200 text-gray-600 dark:border-white/[0.08] dark:text-white/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {!confirmandoEnvio && (
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
          Buscar usuario registrado
        </label>
        <div className="relative mb-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            value={busquedaUsuario}
            onChange={(e) => setBusquedaUsuario(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/20"
          />
        </div>
        {!sinPermisoListadoUsuarios && (
          <div className="mb-3 max-h-36 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]">
            {cargandoUsuarios && (
              <p className="px-3 py-2 text-xs text-gray-500 dark:text-white/40">Buscando usuarios...</p>
            )}
            {!cargandoUsuarios &&
              usuariosFiltrados.slice(0, 6).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setErrorEmail(null);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-gray-800 dark:text-white/85">{u.nombre}</span>
                    <span className="block truncate text-[11px] text-gray-500 dark:text-white/40">{u.email}</span>
                  </span>
                  <span className="text-[10px] text-[#28b8d5] font-semibold">Seleccionar</span>
                </button>
              ))}
            {!cargandoUsuarios && usuariosFiltrados.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500 dark:text-white/40">Sin coincidencias.</p>
            )}
          </div>
        )}
        {sinPermisoListadoUsuarios && (
          <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
            No tienes permiso para listar usuarios. Puedes invitar escribiendo el correo manualmente.
          </p>
        )}
        <label className="block text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-1.5">
          Correo electrónico
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrorEmail(null);
          }}
          placeholder="nombre@empresa.co"
          className={`
            w-full rounded-xl border px-4 py-2.5 text-sm
            bg-white dark:bg-white/[0.04]
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-white/20
            focus:outline-none focus:ring-2 transition-colors duration-150
            ${
              errorEmail
                ? "border-error-400 focus:ring-error-400/30 dark:border-error-400"
                : "border-gray-200 dark:border-white/[0.08] focus:border-[#28b8d5] focus:ring-[#28b8d5]/20"
            }
          `}
        />
        {errorEmail && (
          <p className="mt-1.5 text-xs text-error-600 dark:text-error-400">{errorEmail}</p>
        )}
      </div>
      )}

      {!confirmandoEnvio && (
      <div className="space-y-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
          Permisos por artefacto
        </p>
        {entregables.map((art) => (
          <NivelPermisoSelector
            key={art.id}
            label={art.nombre}
            value={permisosArtefacto[art.id] ?? 0}
            onChange={(nivel) =>
              setPermisosArtefacto((prev) => ({ ...prev, [art.id]: nivel }))
            }
            maxNivel={5}
          />
        ))}
      </div>
      )}

      {confirmandoEnvio && (
        <div className="mb-5 rounded-xl border border-[#28b8d5]/30 bg-[#28b8d5]/[0.05] dark:bg-[#28b8d5]/[0.08] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#28b8d5]/15 text-[#28b8d5]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Confirmar envío de invitación
            </h4>
          </div>
          <div className="mb-3 rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white/70 dark:bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-white/35 mb-1">
              Usuario a invitar
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
              {usuarioSeleccionado?.nombre ?? email.trim().toLowerCase()}
            </p>
            <p className="text-xs text-gray-500 dark:text-white/45 mt-0.5">{email.trim().toLowerCase()}</p>
            <p className="text-xs text-gray-500 dark:text-white/45 mt-1">
              Tipo: {tipoUsuario === "CONSULTOR" ? "Consultor" : "Empresa"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white/70 dark:bg-black/20 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-white/35">
              Resumen de accesos por artefacto
            </p>
            <ul className="space-y-2">
              {entregables.map((art) => (
                <li
                  key={art.id}
                  className="flex items-start justify-between gap-2 rounded-md border border-gray-100 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] px-2.5 py-2"
                >
                  <span className="text-xs text-gray-700 dark:text-white/75">{art.nombre}</span>
                  <span className="text-xs font-semibold text-[#1e9bb5] dark:text-[#28b8d5] text-right">
                    {DESCRIPCION_NIVEL[permisosArtefacto[art.id] ?? 0]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {errorGeneral && (
        <p className="mb-4 text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-400/10 rounded-lg px-3 py-2 border border-error-200 dark:border-error-400/15">
          {errorGeneral}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
        {confirmandoEnvio ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmandoEnvio(false)}
              disabled={enviando}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Volver a editar
              </span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEnviar}
              disabled={!formularioValido || enviando}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 11.5L21 3l-8.5 18-1.8-7.7L3 11.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {enviando ? "Enviando..." : "Confirmar envío de invitación"}
              </span>
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (validarEmail()) setConfirmandoEnvio(true);
              }}
              disabled={!formularioValido || enviando}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
                  <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
                </svg>
                Revisar invitación
              </span>
            </Button>
          </>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl mx-4 p-6"
      showCloseButton={false}
    >
      {content}
    </Modal>
  );
}

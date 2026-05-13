"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { UserIcon, GroupIcon } from "@/icons";
import { companiesApi } from "@/lib/api/companies";
import type { CompanyResponse } from "@/lib/types/company.types";

const crearUsuarioSchema = z
  .object({
    tipo_usuario: z.enum(["ADMINISTRADOR", "CONSULTOR", "EMPRESA"]),
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    company_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_usuario === "EMPRESA" && !data.company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes seleccionar una empresa para este usuario",
        path: ["company_id"],
      });
    }
  });

type CrearUsuarioFormData = z.infer<typeof crearUsuarioSchema>;

interface ModalCrearUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CrearUsuarioFormData) => Promise<void>;
  isLoading?: boolean;
}

// ── Inline sub-form para crear empresa ──────────────────────────────────────
function CrearEmpresaInline({
  onCreated,
  onCancel,
}: {
  onCreated: (c: CompanyResponse) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; contact_email?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const inputBase =
    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-white/90 border-gray-300";
  const inputErr =
    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-white/[0.03] dark:text-white/90 border-red-500";

  const handleGuardar = async () => {
    const errs: typeof errors = {};
    if (!name.trim() || name.trim().length < 2)
      errs.name = "El nombre debe tener al menos 2 caracteres.";
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))
      errs.contact_email = "Ingresa un correo válido.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const created = await companiesApi.create({
        name: name.trim(),
        contact_email: contactEmail.trim(),
      });
      onCreated(created);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Error al crear la empresa." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-4">
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-3 uppercase tracking-wide">
        Nueva empresa
      </p>
      {errors.general && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{errors.general}</p>
      )}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-white/80 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            value={name}
            placeholder="Ej: Empresa ABC S.A.S."
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? inputErr : inputBase}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-white/80 mb-1">
            Correo de contacto *
          </label>
          <input
            type="email"
            value={contactEmail}
            placeholder="contacto@empresa.com"
            onChange={(e) => setContactEmail(e.target.value)}
            className={errors.contact_email ? inputErr : inputBase}
          />
          {errors.contact_email && (
            <p className="text-xs text-red-600 mt-1">{errors.contact_email}</p>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs rounded-md border border-gray-300 dark:border-white/[0.08] text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar empresa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Selector de empresa ──────────────────────────────────────────────────────
function CompanySelectorField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [showCrear, setShowCrear] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) setSelectedLabel("");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await companiesApi.list(search || undefined);
        setCompanies(results);
      } catch {
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [search, open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (c: CompanyResponse) => {
    onChange(c.id);
    setSelectedLabel(`${c.name} — ${c.contact_email}`);
    setSearch("");
    setOpen(false);
    setShowCrear(false);
  };

  const handleCreated = (c: CompanyResponse) => {
    handleSelect(c);
    setCompanies((prev) => [c, ...prev]);
  };

  const inputBase =
    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-white/90 border-gray-300";
  const inputErrClass =
    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-white/[0.03] dark:text-white/90 border-red-500";

  return (
    <div ref={containerRef}>
      {value && !open ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 border border-gray-300 dark:border-white/[0.08] rounded-md text-sm text-gray-800 dark:text-white/90 bg-transparent">
            {selectedLabel}
          </div>
          <button
            type="button"
            onClick={() => { onChange(""); setSelectedLabel(""); setOpen(true); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-white/[0.08] rounded-md text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/80"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={search}
            placeholder="Buscar empresa por nombre..."
            autoComplete="off"
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className={error ? inputErrClass : inputBase}
          />
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-3 text-sm text-gray-400">Cargando...</div>
              ) : companies.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">Sin resultados</div>
              ) : (
                companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/[0.05] border-b border-gray-100 dark:border-white/[0.04] last:border-0"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                    <span className="ml-2 text-gray-400 text-xs">{c.contact_email}</span>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => { setOpen(false); setShowCrear(true); }}
                className="w-full text-left px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] font-medium border-t border-gray-100 dark:border-white/[0.08]"
              >
                + Crear nueva empresa
              </button>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}
      {showCrear && (
        <CrearEmpresaInline
          onCreated={handleCreated}
          onCancel={() => setShowCrear(false)}
        />
      )}
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────
export const ModalCrearUsuario: React.FC<ModalCrearUsuarioProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<CrearUsuarioFormData>({
    resolver: zodResolver(crearUsuarioSchema),
    defaultValues: {
      tipo_usuario: "CONSULTOR",
      nombre: "",
      email: "",
      password: "",
      company_id: undefined,
    },
  });

  const tipoUsuario = watch("tipo_usuario");

  const handleFormSubmit = async (data: CrearUsuarioFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl mx-4 p-6"
      showCloseButton={true}
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          ➕ Crear Usuario
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Asigna una contraseña inicial para que el usuario pueda acceder
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Tipo de Usuario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white/90 mb-3">
            Tipo de Usuario: *
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]">
              <input
                type="radio"
                value="CONSULTOR"
                {...register("tipo_usuario")}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-white/90 flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Consultor
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Miembro de tu equipo de consultoría (trabaja para ARQDATA)
                </span>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]">
              <input
                type="radio"
                value="EMPRESA"
                {...register("tipo_usuario")}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-white/90 flex items-center gap-2">
                  <GroupIcon className="w-5 h-5" />
                  Empresa
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Usuario del cliente (trabaja para la empresa evaluada)
                </span>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/[0.08] cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]">
              <input
                type="radio"
                value="ADMINISTRADOR"
                {...register("tipo_usuario")}
                className="mt-1 w-4 h-4 text-red-600"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-white/90 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-red-500" />
                  Administrador
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Acceso total global a la plataforma
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Empresa — solo visible cuando tipo = EMPRESA */}
        {tipoUsuario === "EMPRESA" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/90 mb-1">
              Empresa a la que pertenece *
            </label>
            <Controller
              name="company_id"
              control={control}
              render={({ field }) => (
                <CompanySelectorField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.company_id?.message}
                />
              )}
            />
          </div>
        )}

        {/* Información básica */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/90 mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              {...register("nombre")}
              placeholder="Ej: Juan Pérez"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-white/90 ${
                errors.nombre ? "border-red-500" : "border-gray-300 dark:border-white/[0.08]"
              }`}
              disabled={isLoading}
            />
            {errors.nombre && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/90 mb-1">
              Email corporativo *
            </label>
            <input
              type="email"
              {...register("email")}
              placeholder="juan@empresa.com"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-white/90 ${
                errors.email ? "border-red-500" : "border-gray-300 dark:border-white/[0.08]"
              }`}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white/90 mb-1">
              Contraseña inicial *
            </label>
            <input
              type="password"
              {...register("password")}
              placeholder="Mínimo 8 caracteres"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-white/[0.03] dark:border-white/[0.08] dark:text-white/90 ${
                errors.password ? "border-red-500" : "border-gray-300 dark:border-white/[0.08]"
              }`}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Crear Usuario
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

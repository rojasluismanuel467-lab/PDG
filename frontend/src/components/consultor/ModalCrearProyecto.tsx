"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import { projectsApi } from "@/lib/api/projects";
import { companiesApi } from "@/lib/api/companies";
import type { LegacyProject as Proyecto } from "@/lib/adapters/project.adapter";
import { toLegacyProject } from "@/lib/adapters/project.adapter";
import type { CompanyResponse } from "@/lib/types/company.types";

interface ModalCrearProyectoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (proyecto: Proyecto) => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  company_id: string;
  fecha_estimada_cierre: string;
}

interface FormErrors {
  nombre?: string;
  descripcion?: string;
  company_id?: string;
  fecha_estimada_cierre?: string;
  general?: string;
}

const INITIAL_FORM: FormState = {
  nombre: "",
  descripcion: "",
  company_id: "",
  fecha_estimada_cierre: "",
};

const HOY_ISO = new Date().toISOString().split("T")[0];
const DESC_MAX = 2000;

function validar(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.nombre.trim()) {
    errors.nombre = "El nombre del proyecto es obligatorio.";
  } else if (form.nombre.trim().length < 3) {
    errors.nombre = "El nombre debe tener al menos 3 caracteres.";
  } else if (form.nombre.trim().length > 120) {
    errors.nombre = "El nombre no puede superar los 120 caracteres.";
  }

  if (!form.descripcion.trim()) {
    errors.descripcion = "La descripción es obligatoria.";
  } else if (form.descripcion.trim().length < 10) {
    errors.descripcion = "La descripción debe tener al menos 10 caracteres.";
  } else if (form.descripcion.trim().length > DESC_MAX) {
    errors.descripcion = `La descripción no puede superar los ${DESC_MAX} caracteres.`;
  }

  if (!form.company_id) {
    errors.company_id = "Debes seleccionar una empresa cliente.";
  }

  if (!form.fecha_estimada_cierre) {
    errors.fecha_estimada_cierre = "La fecha estimada de cierre es obligatoria.";
  } else if (form.fecha_estimada_cierre <= HOY_ISO) {
    errors.fecha_estimada_cierre = "La fecha de cierre debe ser posterior a hoy.";
  }

  return errors;
}

function hayDatos(form: FormState): boolean {
  return (
    form.nombre.trim() !== "" ||
    form.descripcion.trim() !== "" ||
    form.company_id !== "" ||
    form.fecha_estimada_cierre !== ""
  );
}

// Sub-modal para crear empresa
interface ModalCrearEmpresaProps {
  onCreated: (company: CompanyResponse) => void;
  onClose: () => void;
}

function ModalCrearEmpresa({ onCreated, onClose }: ModalCrearEmpresaProps) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; contact_email?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const inputBase =
    "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-gray-400 focus:ring-gray-900/5 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white/90 dark:focus:border-white/30";
  const inputErr =
    "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 text-gray-800 border-error-400 focus:ring-error-500/10 focus:border-error-400 dark:text-white/90 dark:border-error-400/50 dark:bg-white/[0.05]";

  const handleGuardar = async () => {
    const errs: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) errs.name = "El nombre debe tener al menos 2 caracteres.";
    if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))
      errs.contact_email = "Ingresa un correo válido.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

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
    <div className="p-5">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Nueva empresa cliente</h3>
      {errors.general && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-400/20 dark:bg-error-400/10 dark:text-error-400">
          {errors.general}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <Label htmlFor="empresa-nombre">Nombre <span className="text-error-500">*</span></Label>
          <input
            id="empresa-nombre"
            type="text"
            value={name}
            placeholder="Ej: Empresa ABC S.A.S."
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? inputErr : inputBase}
          />
          {errors.name && <p className="mt-1.5 text-xs text-error-500">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="empresa-email">Correo de contacto <span className="text-error-500">*</span></Label>
          <input
            id="empresa-email"
            type="email"
            value={contactEmail}
            placeholder="contacto@empresa.com"
            onChange={(e) => setContactEmail(e.target.value)}
            className={errors.contact_email ? inputErr : inputBase}
          />
          {errors.contact_email && <p className="mt-1.5 text-xs text-error-500">{errors.contact_email}</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all bg-[#0F172A] text-white hover:bg-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Creando..." : "Crear empresa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Selector de empresa con búsqueda
interface CompanySelectorProps {
  value: string;
  onChange: (id: string, label: string) => void;
  error?: string;
  touched?: boolean;
}

function CompanySelector({ value, onChange, error, touched }: CompanySelectorProps) {
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
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const inputBase =
    "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-gray-400 focus:ring-gray-900/5 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white/90 dark:focus:border-white/30";
  const inputErr =
    "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 text-gray-800 border-error-400 focus:ring-error-500/10 focus:border-error-400 dark:text-white/90 dark:border-error-400/50 dark:bg-white/[0.05]";

  const handleSelect = (c: CompanyResponse) => {
    onChange(c.id, `${c.name} — ${c.contact_email}`);
    setSelectedLabel(`${c.name} — ${c.contact_email}`);
    setSearch("");
    setOpen(false);
  };

  const handleCreated = (c: CompanyResponse) => {
    handleSelect(c);
    setShowCrear(false);
    setCompanies((prev) => [c, ...prev]);
  };

  if (showCrear) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
        <ModalCrearEmpresa onCreated={handleCreated} onClose={() => setShowCrear(false)} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {value && !open ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-11 rounded-lg border border-gray-300 dark:border-white/[0.08] px-4 py-2.5 text-sm bg-transparent text-gray-800 dark:text-white/90 flex items-center">
            {selectedLabel}
          </div>
          <button
            type="button"
            onClick={() => { onChange("", ""); setSelectedLabel(""); setOpen(true); }}
            className="h-11 px-3 rounded-lg border border-gray-300 dark:border-white/[0.08] text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/80 text-sm"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            placeholder="Buscar empresa por nombre..."
            autoComplete="off"
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className={touched && error ? inputErr : inputBase}
          />
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900 shadow-lg max-h-56 overflow-y-auto">
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
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/[0.05] border-b border-gray-100 dark:border-white/[0.04] last:border-0"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                    <span className="ml-2 text-gray-400 text-xs">{c.contact_email}</span>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => { setOpen(false); setShowCrear(true); }}
                className="w-full text-left px-4 py-3 text-sm text-brand-600 dark:text-brand-400 hover:bg-gray-50 dark:hover:bg-white/[0.05] font-medium border-t border-gray-100 dark:border-white/[0.08]"
              >
                + Crear nueva empresa
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ModalCrearProyecto({ isOpen, onClose, onSuccess }: ModalCrearProyectoProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors({});
    setTouched({});
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    if (hayDatos(form)) {
      const confirmar = window.confirm("Tienes datos ingresados. ¿Deseas cerrar sin guardar?");
      if (!confirmar) return;
    }
    resetForm();
    onClose();
  }, [form, onClose, resetForm]);

  const handleBlur = useCallback(
    (field: keyof FormState) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validar(form);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    },
    [form]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTouched({ nombre: true, descripcion: true, company_id: true, fecha_estimada_cierre: true });

      const fieldErrors = validar(form);
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length > 0) return;

      setIsLoading(true);
      setErrors({});

      try {
        const nuevo = await projectsApi.create({
          name: form.nombre.trim(),
          description: form.descripcion.trim(),
          company_id: form.company_id,
          estimated_end_date: form.fecha_estimada_cierre,
        });
        resetForm();
        onSuccess(toLegacyProject(nuevo));
        onClose();
      } catch (err) {
        setErrors({
          general:
            err instanceof Error
              ? err.message
              : "Ocurrió un error al crear el proyecto. Intenta de nuevo.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [form, onClose, onSuccess, resetForm]
  );

  const inputBaseClass =
    "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-gray-400 focus:ring-gray-900/5 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white/90 dark:focus:border-white/30";

  const inputErrorClass =
    "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 text-gray-800 border-error-400 focus:ring-error-500/10 focus:border-error-400 dark:text-white/90 dark:border-error-400/50 dark:bg-white/[0.05]";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} showCloseButton={true} className="max-w-lg mx-4 w-full">
      <div className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Nuevo proyecto</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Completa los datos para registrar el proyecto de consultoría.
        </p>

        {errors.general && (
          <div className="mb-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-400/20 dark:bg-error-400/10 dark:text-error-400">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <Label htmlFor="nuevo-nombre">
              Nombre del proyecto <span className="text-error-500">*</span>
            </Label>
            <input
              id="nuevo-nombre"
              type="text"
              value={form.nombre}
              placeholder="Ej: Diagnóstico de Arquitectura de Datos — Empresa S.A."
              maxLength={120}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              onBlur={() => handleBlur("nombre")}
              className={touched.nombre && errors.nombre ? inputErrorClass : inputBaseClass}
            />
            {touched.nombre && errors.nombre && (
              <p className="mt-1.5 text-xs text-error-500 dark:text-error-400">{errors.nombre}</p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-right">{form.nombre.length}/120</p>
          </div>

          <div>
            <Label htmlFor="nuevo-descripcion">
              Descripción <span className="text-error-500">*</span>
            </Label>
            <TextArea
              placeholder="Describe el alcance y objetivo principal del proyecto..."
              rows={4}
              value={form.descripcion}
              onChange={(val) => setForm((prev) => ({ ...prev, descripcion: val }))}
              error={!!(touched.descripcion && errors.descripcion)}
            />
            <div className="mt-1 flex justify-between">
              {touched.descripcion && errors.descripcion ? (
                <p className="text-xs text-error-500 dark:text-error-400">{errors.descripcion}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">{form.descripcion.length}/{DESC_MAX}</p>
            </div>
          </div>

          <div>
            <Label>
              Empresa cliente <span className="text-error-500">*</span>
            </Label>
            <CompanySelector
              value={form.company_id}
              onChange={(id) => {
                setForm((prev) => ({ ...prev, company_id: id }));
                setTouched((prev) => ({ ...prev, company_id: true }));
                if (id) setErrors((prev) => ({ ...prev, company_id: undefined }));
              }}
              error={errors.company_id}
              touched={touched.company_id}
            />
            {touched.company_id && errors.company_id && (
              <p className="mt-1.5 text-xs text-error-500 dark:text-error-400">{errors.company_id}</p>
            )}
          </div>

          <div>
            <Label htmlFor="nuevo-fecha">
              Fecha estimada de cierre <span className="text-error-500">*</span>
            </Label>
            <input
              id="nuevo-fecha"
              type="date"
              value={form.fecha_estimada_cierre}
              min={HOY_ISO}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fecha_estimada_cierre: e.target.value }))
              }
              onBlur={() => handleBlur("fecha_estimada_cierre")}
              className={
                touched.fecha_estimada_cierre && errors.fecha_estimada_cierre
                  ? inputErrorClass
                  : inputBaseClass
              }
            />
            {touched.fecha_estimada_cierre && errors.fecha_estimada_cierre && (
              <p className="mt-1.5 text-xs text-error-500 dark:text-error-400">
                {errors.fecha_estimada_cierre}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="md" onClick={handleClose} disabled={isLoading} className="flex-1">
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 bg-[#0F172A] text-white hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-gray-100"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creando...
                </>
              ) : (
                "Crear proyecto"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

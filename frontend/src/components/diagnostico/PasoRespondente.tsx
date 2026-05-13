"use client";

import { useState } from "react";
import type { DatosRespondente } from "@/lib/mocks/mad.mock";
import Label from "@/components/form/Label";

interface Props {
  inicial: DatosRespondente | null;
  onSiguiente: (datos: DatosRespondente) => void;
}

const campoBase =
  "h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-none focus:ring-3 bg-transparent text-gray-800 dark:text-white/90 border-gray-300 focus:border-gray-400 focus:ring-gray-900/5 dark:border-white/[0.08] dark:focus:border-white/30";
const campoError =
  "h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-none focus:ring-3 bg-transparent text-gray-800 dark:text-white/90 border-red-400 focus:ring-red-500/10 dark:border-red-400/50";

export default function PasoRespondente({ inicial, onSiguiente }: Props) {
  const [form, setForm] = useState<DatosRespondente>(
    inicial ?? { nombre: "", cargo: "", area: "" }
  );
  const [errors, setErrors] = useState<Partial<DatosRespondente>>({});

  const validar = (): Partial<DatosRespondente> => {
    const e: Partial<DatosRespondente> = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio.";
    if (!form.cargo.trim()) e.cargo = "El cargo es obligatorio.";
    if (!form.area.trim()) e.area = "El área es obligatoria.";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSiguiente(form);
  };

  const set = (key: keyof DatosRespondente) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
        Datos del respondente
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Esta información contextualiza tus respuestas dentro de la evaluación. No se compartirá
        individualmente con terceros.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <Label htmlFor="resp-nombre">
            Nombre completo <span className="text-red-500">*</span>
          </Label>
          <input
            id="resp-nombre"
            type="text"
            value={form.nombre}
            placeholder="Ej: María Rodríguez"
            onChange={set("nombre")}
            className={errors.nombre ? campoError : campoBase}
          />
          {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
        </div>

        <div>
          <Label htmlFor="resp-cargo">
            Cargo <span className="text-red-500">*</span>
          </Label>
          <input
            id="resp-cargo"
            type="text"
            value={form.cargo}
            placeholder="Ej: Jefe de Tecnología"
            onChange={set("cargo")}
            className={errors.cargo ? campoError : campoBase}
          />
          {errors.cargo && <p className="mt-1 text-xs text-red-500">{errors.cargo}</p>}
        </div>

        <div>
          <Label htmlFor="resp-area">
            Área o dependencia <span className="text-red-500">*</span>
          </Label>
          <input
            id="resp-area"
            type="text"
            value={form.area}
            placeholder="Ej: Dirección de TI"
            onChange={set("area")}
            className={errors.area ? campoError : campoBase}
          />
          {errors.area && <p className="mt-1 text-xs text-red-500">{errors.area}</p>}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 bg-[#0F172A] text-white hover:bg-[#1e293b] active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            Siguiente →
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type {
  ArchitectureStandards,
  Standard,
  StandardCategory,
  StandardStatus,
} from "@/lib/types/roadmap.types";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

const CATEGORY_LABEL: Record<StandardCategory, string> = {
  Nomenclatura: "Nomenclatura",
  Seguridad: "Seguridad",
  Performance: "Performance",
  Documentacion: "Documentación",
  TiposDeDatos: "Tipos de Datos",
  Compliance: "Compliance",
};

const STATUS_LABEL: Record<StandardStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  DEPRECATED: "Deprecado",
};

const STATUS_BADGE: Record<StandardStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
  DEPRECATED: "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70",
};

interface ArchitectureStandardsEditorProps {
  standardsDoc: ArchitectureStandards;
  readOnly?: boolean;
  onStandardsChange?: (next: ArchitectureStandards) => void;
  onSave?: () => Promise<void>;
  isSaving?: boolean;
}

const buildStandardVacio = (): Standard => ({
  id: `std-${Date.now()}`,
  name: "Nuevo estándar",
  description: "",
  category: "Nomenclatura",
  recommendation: "",
  mandatory: false,
  status: "DRAFT",
  applies_to: ["GENERAL"],
  effective_from: new Date().toISOString().slice(0, 10),
});

export default function ArchitectureStandardsEditor({
  standardsDoc,
  readOnly = false,
  onStandardsChange,
  onSave,
  isSaving = false,
}: ArchitectureStandardsEditorProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StandardCategory | "ALL">("ALL");
  const [status, setStatus] = useState<StandardStatus | "ALL">("ALL");
  const [mandatory, setMandatory] = useState<"ALL" | "YES" | "NO">("ALL");

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateDoc = (next: ArchitectureStandards) => {
    if (!onStandardsChange) return;
    onStandardsChange({ ...next, updated_at: new Date().toISOString() });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return standardsDoc.standards.filter((s) => {
      if (category !== "ALL" && s.category !== category) return false;
      if (status !== "ALL" && s.status !== status) return false;
      if (mandatory === "YES" && !s.mandatory) return false;
      if (mandatory === "NO" && s.mandatory) return false;
      if (!q) return true;
      const blob = `${s.name} ${s.description} ${s.recommendation}`.toLowerCase();
      return blob.includes(q);
    });
  }, [standardsDoc.standards, query, category, status, mandatory]);

  const editing = useMemo(() => {
    if (!editingId) return null;
    return standardsDoc.standards.find((s) => s.id === editingId) ?? null;
  }, [standardsDoc.standards, editingId]);

  const setEditingField = (updater: (s: Standard) => Standard) => {
    if (!editing) return;
    updateDoc({
      ...standardsDoc,
      standards: standardsDoc.standards.map((s) => (s.id === editing.id ? updater(s) : s)),
    });
  };

  const handleAdd = () => {
    if (readOnly) return;
    const s = buildStandardVacio();
    updateDoc({ ...standardsDoc, standards: [s, ...standardsDoc.standards] });
    setEditingId(s.id);
    setEditOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setEditOpen(true);
  };

  const handleDelete = (id: string) => {
    if (readOnly) return;
    updateDoc({
      ...standardsDoc,
      standards: standardsDoc.standards.filter((s) => s.id !== id),
    });
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f0f0f]">
      <div className="border-b border-gray-200 dark:border-white/[0.08] px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Estándares de Arquitectura de Datos
            </h1>
            <p className="text-sm text-gray-500 dark:text-white/40">
              Políticas, lineamientos y convenciones a seguir durante la implementación.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={readOnly}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-50"
            >
              Nuevo estándar
            </button>
            <button
              onClick={() => void onSave?.()}
              disabled={readOnly || !onSave || isSaving}
              className="px-4 py-2 rounded-lg bg-[#28b8d5] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#1ea7c3]"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar estándar..."
            className="h-10 w-full sm:w-[320px] px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white"
          >
            <option value="ALL">Todas las categorías</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white"
          >
            <option value="ALL">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={mandatory}
            onChange={(e) => setMandatory(e.target.value as any)}
            className="h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white"
          >
            <option value="ALL">Obligatorio: Todos</option>
            <option value="YES">Obligatorio: Sí</option>
            <option value="NO">Obligatorio: No</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Catálogo de estándares
              </div>
              <div className="text-xs text-gray-500 dark:text-white/40">
                Versión {standardsDoc.version} · Vigente desde {standardsDoc.effective_date}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-white/40">
              {filtered.length} de {standardsDoc.standards.length}
            </div>
          </div>

          <div className="overflow-auto">
            <Table className="w-full">
              <TableHeader className="bg-white dark:bg-[#0f0f0f]">
                <TableRow>
                  <TableCell isHeader className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">
                    Estándar
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">
                    Aplica a
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">
                    Categoría
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">
                    Estado
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">
                    Obligatorio
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs text-gray-600 dark:text-white/60">
                    Vigente
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs text-gray-600 dark:text-white/60 text-right">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="border-t border-gray-200 dark:border-white/[0.08]">
                    <TableCell className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-white/40 line-clamp-2">
                        {s.description}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {s.applies_to.slice(0, 3).map((k) => (
                          <span
                            key={k}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70"
                          >
                            {k}
                          </span>
                        ))}
                        {s.applies_to.length > 3 ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70">
                            +{s.applies_to.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-white/80">
                      {CATEGORY_LABEL[s.category]}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_BADGE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-white/80">
                      {s.mandatory ? "Sí" : "No"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-white/80">
                      {s.effective_from}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70 text-xs hover:bg-gray-200 dark:hover:bg-white/[0.10]"
                        >
                          Ver / Editar
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={readOnly}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-gray-500 dark:text-white/40"
                    >
                      No hay estándares que coincidan con los filtros.
                    </td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        className="max-w-3xl w-full mx-4 p-0 overflow-hidden"
      >
        <div className="p-5 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0f0f0f]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {editing ? "Editar estándar" : "Detalle"}
              </div>
              <div className="text-xs text-gray-500 dark:text-white/40">
                Define qué es obligatorio y a qué artefactos aplica.
              </div>
            </div>
            <button
              onClick={() => setEditOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-sm text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#0f0f0f] space-y-4">
          {editing ? (
            <>
              <Field label="Nombre">
                <input
                  value={editing.name}
                  onChange={(e) => setEditingField((s) => ({ ...s, name: e.target.value }))}
                  disabled={readOnly}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                />
              </Field>
              <Field label="Descripción">
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditingField((s) => ({ ...s, description: e.target.value }))}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Categoría">
                  <select
                    value={editing.category}
                    onChange={(e) =>
                      setEditingField((s) => ({ ...s, category: e.target.value as any }))
                    }
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Estado">
                  <select
                    value={editing.status}
                    onChange={(e) =>
                      setEditingField((s) => ({ ...s, status: e.target.value as any }))
                    }
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Obligatorio">
                  <select
                    value={editing.mandatory ? "YES" : "NO"}
                    onChange={(e) => setEditingField((s) => ({ ...s, mandatory: e.target.value === "YES" }))}
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="YES">Sí</option>
                    <option value="NO">No</option>
                  </select>
                </Field>
                <Field label="Vigente desde">
                  <input
                    value={editing.effective_from}
                    onChange={(e) => setEditingField((s) => ({ ...s, effective_from: e.target.value }))}
                    disabled={readOnly}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </Field>
              </div>
              <Field label="Recomendación">
                <textarea
                  value={editing.recommendation}
                  onChange={(e) => setEditingField((s) => ({ ...s, recommendation: e.target.value }))}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white disabled:opacity-50"
                />
              </Field>
              <Field label="Aplica a (selección múltiple simple)">
                <div className="flex flex-wrap gap-2">
                  {[
                    "CONCEPTUAL_MODEL",
                    "LOGICAL_MODEL",
                    "DFD",
                    "INTEGRATION",
                    "NAMING",
                    "SECURITY",
                    "GENERAL",
                  ].map((k) => {
                    const active = editing.applies_to.includes(k as any);
                    return (
                      <button
                        key={k}
                        onClick={() => {
                          if (readOnly) return;
                          setEditingField((s) => ({
                            ...s,
                            applies_to: active
                              ? s.applies_to.filter((x) => x !== (k as any))
                              : [...s.applies_to, k as any],
                          }));
                        }}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          active
                            ? "bg-[#28b8d5] text-white border-[#28b8d5]"
                            : "bg-white dark:bg-white/[0.04] text-gray-700 dark:text-white/70 border-gray-200 dark:border-white/[0.08]"
                        }`}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {editing.traceability?.artifacts?.length ? (
                <Field label="Trazabilidad (placeholder para backend)">
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 dark:text-white/40">
                      Artefactos relacionados
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editing.traceability.artifacts.map((a) => (
                        <span
                          key={a.id}
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-white/70"
                        >
                          {a.stage.replace("_", "-")}: {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Field>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-white/40">Selecciona un estándar.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1">{label}</div>
      {children}
    </label>
  );
}

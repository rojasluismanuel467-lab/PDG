"use client";

import type {
  CRUDMatrix,
  CRUDComparison,
  ImpactoCRUD,
} from "@/lib/types/crud-matrix.types";

interface CRUDMatrixEditorProps {
  matriz: CRUDMatrix;
  readOnly?: boolean;
  onMatrizChange?: (next: CRUDMatrix) => void;
  onSave?: () => Promise<void>;
  onGenerateIA?: () => Promise<void>;
  isSaving?: boolean;
  isGenerating?: boolean;
}

type LadoCRUD = "asis" | "tobe";
type OperacionCRUD = "create" | "read" | "update" | "delete";
type CampoCRUDOperacion = `${LadoCRUD}_${OperacionCRUD}`;

const OPERACIONES: Array<{ key: OperacionCRUD; label: string }> = [
  { key: "create", label: "C" },
  { key: "read", label: "R" },
  { key: "update", label: "U" },
  { key: "delete", label: "D" },
];

const IMPACTO_COLOR: Record<ImpactoCRUD, string> = {
  Alto: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Medio: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Bajo: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
};

const CAMBIO_COLOR = "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300";

const getCampo = (lado: LadoCRUD, operacion: OperacionCRUD): CampoCRUDOperacion =>
  `${lado}_${operacion}` as CampoCRUDOperacion;

const getCambiosPorFila = (row: CRUDComparison): number =>
  Number(row.asis_create !== row.tobe_create) +
  Number(row.asis_read !== row.tobe_read) +
  Number(row.asis_update !== row.tobe_update) +
  Number(row.asis_delete !== row.tobe_delete);

const getImpactoSugerido = (row: CRUDComparison): ImpactoCRUD => {
  const key = row.entidad
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const esEntidadCritica = /(cliente|cuenta|transaccion|pago|orden|contrato|factura|riesgo|fraude|wallet|saldo)/.test(
    key
  );

  let score = 0;
  if (row.asis_create !== row.tobe_create) score += 2;
  if (row.asis_read !== row.tobe_read) score += 3;
  if (row.asis_update !== row.tobe_update) score += 2;
  if (row.asis_delete !== row.tobe_delete) score += 4;
  if (esEntidadCritica) score += 2;
  if (!row.tobe_read) score += 2;
  if (!row.asis_delete && row.tobe_delete) score += 2;

  if (score >= 9) return "Alto";
  if (score >= 5) return "Medio";
  return "Bajo";
};

const buildNewRow = (): CRUDComparison => ({
  id: `crud-row-${Date.now()}`,
  entidad: "Nueva entidad",
  asis_create: false,
  asis_read: true,
  asis_update: false,
  asis_delete: false,
  tobe_create: false,
  tobe_read: true,
  tobe_update: false,
  tobe_delete: false,
  brecha: "",
  impacto: "Bajo",
});

const OperacionCelda = ({
  value,
  changed,
  readOnly,
  onToggle,
}: {
  value: boolean;
  changed: boolean;
  readOnly: boolean;
  onToggle: () => void;
}) => {
  if (readOnly) {
    return (
      <span
        className={`inline-flex h-10 min-w-[56px] items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
          value
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
            : "border-gray-200 bg-gray-50 text-gray-400 dark:border-white/[0.10] dark:bg-white/[0.03] dark:text-white/30"
        } ${changed ? `${CAMBIO_COLOR} ring-1 ring-indigo-300/70 dark:ring-indigo-400/40` : ""}`}
      >
        {value ? "Si" : "No"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex h-10 min-w-[56px] items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28b8d5]/70 ${
        value
          ? "border-green-300 bg-green-50 text-green-700 shadow-sm hover:-translate-y-[1px] hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:bg-green-500/20"
          : "border-gray-200 bg-white text-gray-500 hover:-translate-y-[1px] hover:bg-gray-50 dark:border-white/[0.10] dark:bg-white/[0.03] dark:text-white/45 dark:hover:bg-white/[0.06]"
      } ${changed ? `${CAMBIO_COLOR} ring-1 ring-indigo-300/70 dark:ring-indigo-400/40` : ""}`}
      aria-label={value ? "Desactivar operacion" : "Activar operacion"}
    >
      {value ? "Si" : "No"}
    </button>
  );
};

export default function CRUDMatrixEditor({
  matriz,
  readOnly = false,
  onMatrizChange,
  onSave,
  onGenerateIA,
  isSaving = false,
  isGenerating = false,
}: CRUDMatrixEditorProps) {
  const comparaciones = matriz.comparaciones;

  const updateMatrix = (rows: CRUDComparison[]) => {
    if (!onMatrizChange) return;
    onMatrizChange({
      ...matriz,
      comparaciones: rows,
      updated_at: new Date().toISOString(),
    });
  };

  const updateRow = (rowId: string, updater: (row: CRUDComparison) => CRUDComparison) => {
    const rows = comparaciones.map((row) => (row.id === rowId ? updater(row) : row));
    updateMatrix(rows);
  };

  const handleToggleOperacion = (
    rowId: string,
    lado: LadoCRUD,
    operacion: OperacionCRUD
  ) => {
    const campo = getCampo(lado, operacion);
    updateRow(rowId, (row) => {
      const next = { ...row, [campo]: !row[campo] } as CRUDComparison;
      return { ...next, impacto: getImpactoSugerido(next) };
    });
  };

  const handleEntidadChange = (rowId: string, value: string) => {
    updateRow(rowId, (row) => ({ ...row, entidad: value }));
  };

  const handleBrechaChange = (rowId: string, value: string) => {
    updateRow(rowId, (row) => ({ ...row, brecha: value }));
  };

  const handleImpactoChange = (rowId: string, value: ImpactoCRUD) => {
    updateRow(rowId, (row) => ({ ...row, impacto: value }));
  };

  const handleAddRow = () => {
    updateMatrix([...comparaciones, buildNewRow()]);
  };

  const handleDeleteRow = (rowId: string) => {
    updateMatrix(comparaciones.filter((row) => row.id !== rowId));
  };

  const totalCambios = comparaciones.reduce((total, row) => total + getCambiosPorFila(row), 0);
  const entidadesConCambios = comparaciones.filter((row) => getCambiosPorFila(row) > 0).length;

  const brechasAltoImpacto = comparaciones.filter((row) => row.impacto === "Alto").length;

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {matriz.nombre}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
              {matriz.descripcion}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-white/45">
              Version: <span className="font-semibold">{matriz.version_actual}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-white/45">
              Ultima actualizacion:{" "}
              {new Date(matriz.updated_at).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Entidades</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {comparaciones.length}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Cambios CRUD detectados</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {totalCambios}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Entidades con cambios</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {entidadesConCambios}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <p className="text-xs text-gray-500 dark:text-white/45">Brechas alto impacto</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {brechasAltoImpacto}
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex min-h-11 items-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-[1px] hover:bg-gray-50 dark:border-white/[0.14] dark:text-white/75 dark:hover:bg-white/[0.05]"
            >
              + Agregar entidad
            </button>
            <button
              type="button"
              onClick={() => {
                void onGenerateIA?.();
              }}
              disabled={!onGenerateIA || isGenerating}
              className="inline-flex min-h-11 items-center rounded-xl border border-[#28b8d5] px-4 py-2.5 text-sm font-semibold text-[#28b8d5] shadow-sm transition hover:-translate-y-[1px] hover:bg-[#28b8d5]/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? "Generando..." : "Generar con IA"}
            </button>
            <button
              type="button"
              onClick={() => {
                void onSave?.();
              }}
              disabled={!onSave || isSaving}
              className="inline-flex min-h-11 items-center rounded-xl bg-[#28b8d5] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-[#22a5bf] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar matriz"}
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
            Activo
          </span>
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white/55">
            Inactivo
          </span>
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-400/35 dark:bg-indigo-500/10 dark:text-indigo-300">
            Cambio AS-IS vs TO-BE
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#0f0f0f]">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/[0.03]">
            <tr>
              <th className="sticky left-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/[0.08] dark:bg-[#121212] dark:text-white/50">
                Entidad
              </th>
              <th
                colSpan={4}
                className="border-b border-gray-200 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/[0.08] dark:text-white/50"
              >
                AS-IS
              </th>
              <th
                colSpan={4}
                className="border-b border-gray-200 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/[0.08] dark:text-white/50"
              >
                TO-BE
              </th>
              <th className="border-b border-gray-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Brecha
              </th>
              <th className="border-b border-gray-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                Impacto
              </th>
              {!readOnly && (
                <th className="border-b border-gray-200 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/[0.08] dark:text-white/50">
                  Acciones
                </th>
              )}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/[0.08] dark:bg-[#121212]" />
              {[...OPERACIONES, ...OPERACIONES].map((op, idx) => (
                <th
                  key={`${op.key}-${idx}`}
                  className="border-b border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-500 dark:border-white/[0.08] dark:text-white/45"
                >
                  {op.label}
                </th>
              ))}
              <th className="border-b border-gray-200 px-3 py-2 dark:border-white/[0.08]" />
              <th className="border-b border-gray-200 px-3 py-2 dark:border-white/[0.08]" />
              {!readOnly && <th className="border-b border-gray-200 px-3 py-2 dark:border-white/[0.08]" />}
            </tr>
          </thead>
          <tbody>
            {comparaciones.map((row) => {
              const cambiosFila = getCambiosPorFila(row);
              const badgeColor =
                cambiosFila >= 3
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                  : cambiosFila >= 1
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/35 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-gray-200 bg-gray-50 text-gray-500 dark:border-white/[0.10] dark:bg-white/[0.03] dark:text-white/45";

              return (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 dark:border-white/[0.05] dark:hover:bg-white/[0.02]"
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 align-top dark:bg-[#0f0f0f]">
                    <span
                      className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeColor}`}
                    >
                      {cambiosFila} cambios
                    </span>
                  {readOnly ? (
                    <span className="font-medium text-gray-800 dark:text-white/85">
                      {row.entidad}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={row.entidad}
                      onChange={(event) => handleEntidadChange(row.id, event.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                    />
                  )}
                </td>

                {OPERACIONES.map((op) => {
                  const asisCampo = getCampo("asis", op.key);
                  const tobeCampo = getCampo("tobe", op.key);
                  const changed = row[asisCampo] !== row[tobeCampo];

                  return (
                    <td key={`asis-${row.id}-${op.key}`} className="px-2 py-3 text-center">
                      <OperacionCelda
                        value={row[asisCampo]}
                        changed={changed}
                        readOnly={readOnly}
                        onToggle={() => handleToggleOperacion(row.id, "asis", op.key)}
                      />
                    </td>
                  );
                })}

                {OPERACIONES.map((op) => {
                  const asisCampo = getCampo("asis", op.key);
                  const tobeCampo = getCampo("tobe", op.key);
                  const changed = row[asisCampo] !== row[tobeCampo];

                  return (
                    <td key={`tobe-${row.id}-${op.key}`} className="px-2 py-3 text-center">
                      <OperacionCelda
                        value={row[tobeCampo]}
                        changed={changed}
                        readOnly={readOnly}
                        onToggle={() => handleToggleOperacion(row.id, "tobe", op.key)}
                      />
                    </td>
                  );
                })}

                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <p className="max-w-[340px] text-sm text-gray-700 dark:text-white/70">
                      {row.brecha || "Sin descripcion"}
                    </p>
                  ) : (
                    <textarea
                      value={row.brecha}
                      onChange={(event) => handleBrechaChange(row.id, event.target.value)}
                      rows={2}
                      className="w-full min-w-[260px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                      placeholder="Describe la brecha detectada..."
                    />
                  )}
                </td>

                <td className="px-3 py-3 align-top">
                  {readOnly ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${IMPACTO_COLOR[row.impacto]}`}
                    >
                      {row.impacto}
                    </span>
                  ) : (
                    <select
                      value={row.impacto}
                      onChange={(event) =>
                        handleImpactoChange(row.id, event.target.value as ImpactoCRUD)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#28b8d5] focus:outline-none dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/85"
                    >
                      <option value="Alto">Alto</option>
                      <option value="Medio">Medio</option>
                      <option value="Bajo">Bajo</option>
                    </select>
                  )}
                </td>

                  {!readOnly && (
                    <td className="px-3 py-3 text-center align-top">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        className="inline-flex min-h-10 items-center rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 dark:text-white/40">
        Nota: Celdas resaltadas indican cambio entre AS-IS y TO-BE para esa operacion.
      </p>
    </div>
  );
}

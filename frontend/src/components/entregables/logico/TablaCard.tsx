"use client";
import React, { useState } from "react";
import type {
  TablaLogica,
  ColumnaLogica,
  IndiceLogico,
  ConstraintLogico,
} from "@/lib/types/modelo-logico.types";

// ============================================================================
// TablaCard — Tarjeta expandible de una tabla del modelo lógico
// Muestra columnas, índices y constraints en formato tabular editable
// ============================================================================

interface TablaCardProps {
  tabla: TablaLogica;
  isSelected: boolean;
  onSelect: (tablaId: string) => void;
  onEditTabla: (tablaId: string) => void;
  onEditColumna: (tablaId: string, columnaId: string) => void;
  onAddColumna: (tablaId: string) => void;
  onDeleteColumna: (tablaId: string, columnaId: string) => void;
  readOnly?: boolean;
}

type SubTab = "columnas" | "indices" | "constraints";

const TIPO_DATO_COLOR: Record<string, string> = {
  UUID: "text-purple-600 dark:text-purple-400",
  VARCHAR: "text-blue-600 dark:text-blue-400",
  CHAR: "text-blue-600 dark:text-blue-400",
  TEXT: "text-blue-500 dark:text-blue-300",
  INT: "text-green-600 dark:text-green-400",
  BIGINT: "text-green-600 dark:text-green-400",
  SMALLINT: "text-green-600 dark:text-green-400",
  DECIMAL: "text-amber-600 dark:text-amber-400",
  FLOAT: "text-amber-600 dark:text-amber-400",
  DOUBLE: "text-amber-600 dark:text-amber-400",
  BOOLEAN: "text-rose-600 dark:text-rose-400",
  DATE: "text-cyan-600 dark:text-cyan-400",
  TIME: "text-cyan-600 dark:text-cyan-400",
  DATETIME: "text-cyan-600 dark:text-cyan-400",
  TIMESTAMP: "text-cyan-600 dark:text-cyan-400",
  JSON: "text-orange-600 dark:text-orange-400",
  JSONB: "text-orange-600 dark:text-orange-400",
  BLOB: "text-gray-600 dark:text-gray-400",
  ARRAY: "text-indigo-600 dark:text-indigo-400",
  ENUM: "text-pink-600 dark:text-pink-400",
};

function formatTipoDato(col: ColumnaLogica): string {
  if (col.longitud) return `${col.tipo_dato}(${col.longitud})`;
  return col.tipo_dato;
}

export default function TablaCard({
  tabla,
  isSelected,
  onSelect,
  onEditTabla,
  onEditColumna,
  onAddColumna,
  onDeleteColumna,
  readOnly = false,
}: TablaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("columnas");

  const pkCount = tabla.columnas.filter((c) => c.es_pk).length;
  const fkCount = tabla.columnas.filter((c) => c.es_fk).length;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isSelected
          ? "border-[#28b8d5] shadow-lg shadow-[#28b8d5]/10"
          : "border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15]"
      } bg-white dark:bg-[#0f0f0f] overflow-hidden`}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => {
          setExpanded(!expanded);
          onSelect(tabla.id);
        }}
      >
        <div className="flex items-center gap-3">
          {/* Icono de tabla */}
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#28b8d5]/10 text-[#28b8d5]">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M11.25 12h.008v.008h-.008V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                {tabla.esquema}.
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {tabla.nombre}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
              {tabla.descripcion}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badges de resumen */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400">
              {tabla.columnas.length} cols
            </span>
            {pkCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {pkCount} PK
              </span>
            )}
            {fkCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                {fkCount} FK
              </span>
            )}
            {tabla.volumen_estimado && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400">
                ~{tabla.volumen_estimado} rows
              </span>
            )}
          </div>

          {/* Botón editar */}
          {!readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditTabla(tabla.id);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-[#28b8d5] hover:bg-[#28b8d5]/10 transition-colors"
              title="Editar tabla"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </button>
          )}

          {/* Flecha expandir */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* ── Contenido expandible ────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/[0.06]">
          {/* Sub-tabs */}
          <div className="flex border-b border-gray-100 dark:border-white/[0.06] px-4">
            {(["columnas", "indices", "constraints"] as SubTab[]).map((tab) => {
              const count =
                tab === "columnas"
                  ? tabla.columnas.length
                  : tab === "indices"
                  ? tabla.indices.length
                  : tabla.constraints.length;
              return (
                <button
                  key={tab}
                  onClick={() => setSubTab(tab)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize ${
                    subTab === tab
                      ? "border-[#28b8d5] text-[#28b8d5]"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Tabla de columnas */}
          {subTab === "columnas" && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.03]">
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">PK</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">FK</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">NULL</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">UQ</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Default</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Referencia FK</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Descripción</th>
                    {!readOnly && (
                      <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                  {tabla.columnas
                    .sort((a, b) => a.orden - b.orden)
                    .map((col) => (
                      <tr
                        key={col.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                        onClick={() => onEditColumna(tabla.id, col.id)}
                      >
                        <td className="px-3 py-2 text-gray-400 font-mono">{col.orden}</td>
                        <td className="px-3 py-2 font-mono font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            {col.es_pk && (
                              <span className="text-amber-500" title="Primary Key">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 4a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M8 1a7 7 0 0 1 4.95 11.95l4.55 4.55a.75.75 0 0 1-1.06 1.06l-4.55-4.55A7 7 0 1 1 8 1Zm0 12A5 5 0 1 0 8 3a5 5 0 0 0 0 10Z" clipRule="evenodd" />
                                </svg>
                              </span>
                            )}
                            {col.es_fk && (
                              <span className="text-blue-500" title="Foreign Key">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
                                  <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
                                </svg>
                              </span>
                            )}
                            {col.nombre}
                          </div>
                        </td>
                        <td className={`px-3 py-2 font-mono ${TIPO_DATO_COLOR[col.tipo_dato] || "text-gray-600"}`}>
                          {formatTipoDato(col)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {col.es_pk && <span className="text-amber-500 font-bold">PK</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {col.es_fk && <span className="text-blue-500 font-bold">FK</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {col.es_nullable ? (
                            <span className="text-gray-400">YES</span>
                          ) : (
                            <span className="text-red-500 font-medium">NO</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {col.es_unique && <span className="text-purple-500 font-bold">UQ</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">
                          {col.valor_default || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-blue-500 dark:text-blue-400">
                          {col.es_fk && col.fk_tabla_ref
                            ? `${col.fk_tabla_ref}.${col.fk_columna_ref}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                          {col.descripcion}
                        </td>
                        {!readOnly && (
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteColumna(tabla.id, col.id);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              title="Eliminar columna"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
              {!readOnly && (
                <div className="px-4 py-2 border-t border-gray-100 dark:border-white/[0.04]">
                  <button
                    onClick={() => onAddColumna(tabla.id)}
                    className="flex items-center gap-1.5 text-xs text-[#28b8d5] hover:text-[#1fa3be] font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Agregar columna
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tabla de índices */}
          {subTab === "indices" && (
            <div className="overflow-x-auto">
              {tabla.indices.length === 0 ? (
                <p className="px-4 py-6 text-xs text-gray-400 text-center">Sin índices definidos</p>
              ) : (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.03]">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Columnas</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500">Único</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {tabla.indices.map((idx) => (
                      <tr key={idx.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{idx.nombre}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              idx.tipo === "PRIMARY"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                : idx.tipo === "UNIQUE"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                                : "bg-gray-100 text-gray-700 dark:bg-white/[0.05] dark:text-gray-400"
                            }`}
                          >
                            {idx.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">
                          {idx.columnas.join(", ")}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {idx.es_unico ? (
                            <span className="text-green-500">Si</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                          {idx.descripcion || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tabla de constraints */}
          {subTab === "constraints" && (
            <div className="overflow-x-auto">
              {tabla.constraints.length === 0 ? (
                <p className="px-4 py-6 text-xs text-gray-400 text-center">Sin constraints adicionales</p>
              ) : (
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.03]">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Expresión</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Columnas</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Descripción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {tabla.constraints.map((con) => (
                      <tr key={con.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">{con.nombre}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                            {con.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400 max-w-[250px] truncate">
                          {con.expresion}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">
                          {con.columnas.join(", ")}
                        </td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                          {con.descripcion || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Metadata de la tabla */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-white/[0.04] flex items-center gap-4 text-[10px] text-gray-400">
            {tabla.entidad_origen && (
              <span>
                Origen: <span className="font-medium text-gray-500">{tabla.entidad_origen}</span>
              </span>
            )}
            {tabla.frecuencia_actualizacion && (
              <span>
                Frecuencia: <span className="font-medium text-gray-500">{tabla.frecuencia_actualizacion}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

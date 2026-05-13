"use client";
import React, { useState, useCallback, useEffect } from "react";
import type {
  GlosarioNegocio,
  TerminoGlosario,
  ComentarioGlosario,
} from "@/lib/types/glosario-negocio.types";
import PanelTermino from "./PanelTermino";

// ============================================================================
// GlosarioNegocioEditor — Editor principal del Glosario de Negocio TO-BE
// Formato: Tabla editable con panel lateral de detalle por término
// ============================================================================

interface GlosarioNegocioEditorProps {
  glosario: GlosarioNegocio;
  onSave: (glosario: GlosarioNegocio) => Promise<void>;
  onGenerateIA: () => Promise<void>;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "termino" | "general",
    contenido: string
  ) => Promise<void>;
  isSaving: boolean;
  isGenerating: boolean;
  readOnly?: boolean;
}

type TabActiva = "tabla" | "comentarios" | "versiones";

export default function GlosarioNegocioEditor({
  glosario: glosarioInicial,
  onSave,
  onGenerateIA,
  onAddComment,
  isSaving,
  isGenerating,
  readOnly = false,
}: GlosarioNegocioEditorProps) {
  const [glosario, setGlosario] = useState<GlosarioNegocio>(glosarioInicial);
  const [terminoSeleccionadoId, setTerminoSeleccionadoId] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<TabActiva>("tabla");
  const [nuevoComentarioGeneral, setNuevoComentarioGeneral] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // ── Columnas dinámicas ─────────────────────────────────────────────────
  const storageKey = `glosario-columnas-${glosarioInicial.id || "default"}`;
  const [columnasDinamicas, setColumnasDinamicas] = useState<{ id: string; label: string }[]>([]);
  const [showAddCol, setShowAddCol] = useState(false);
  const [nuevaColLabel, setNuevaColLabel] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setColumnasDinamicas(JSON.parse(saved));
      } catch (e) {}
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnasDinamicas));
  }, [columnasDinamicas, storageKey]);

  const handleAddColumn = () => {
    const label = nuevaColLabel.trim();
    if (!label) return;
    const id = `col_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    if (!columnasDinamicas.some((c) => c.id === id)) {
      setColumnasDinamicas((prev) => [...prev, { id, label }]);
    }
    setNuevaColLabel("");
    setShowAddCol(false);
  };

  // ── Término seleccionado ─────────────────────────────────────────────────
  const terminoSeleccionado = terminoSeleccionadoId
    ? glosario.terminos.find((t) => t.id === terminoSeleccionadoId)
    : undefined;

  // ── Filtro de búsqueda ───────────────────────────────────────────────────
  const terminosFiltrados = glosario.terminos.filter((t) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      t.termino.toLowerCase().includes(q) ||
      t.definicion.toLowerCase().includes(q) ||
      t.propietario.toLowerCase().includes(q) ||
      t.sinonimos.some((s) => s.toLowerCase().includes(q)) ||
      t.entidades_relacionadas.some((e) => e.toLowerCase().includes(q))
    );
  });

  // ── CRUD Términos ────────────────────────────────────────────────────────
  const handleAddTermino = useCallback(() => {
    const conteo = glosario.terminos.length;
    const nuevo: TerminoGlosario = {
      id: `ter-${Date.now()}`,
      termino: `Nuevo Término ${conteo + 1}`,
      definicion: "",
      propietario: "",
      entidades_relacionadas: [],
      sinonimos: [],
      notas: "",
    };
    setGlosario((prev) => ({
      ...prev,
      terminos: [...prev.terminos, nuevo],
    }));
    setTerminoSeleccionadoId(nuevo.id);
    setHasChanges(true);
  }, [glosario.terminos.length]);

  const handleUpdateTermino = useCallback((updated: TerminoGlosario) => {
    setGlosario((prev) => ({
      ...prev,
      terminos: prev.terminos.map((t) => (t.id === updated.id ? updated : t)),
    }));
    setHasChanges(true);
  }, []);

  const handleDeleteTermino = useCallback((id: string) => {
    setGlosario((prev) => ({
      ...prev,
      terminos: prev.terminos.filter((t) => t.id !== id),
    }));
    setTerminoSeleccionadoId(null);
    setHasChanges(true);
  }, []);

  // ── Comentarios ──────────────────────────────────────────────────────────
  const handleAddCommentLocal = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "termino" | "general",
      contenido: string
    ) => {
      const nuevoComentario: ComentarioGlosario = {
        id: `com-glos-${Date.now()}`,
        referencia_id: referenciaId,
        referencia_tipo: referenciaTipo,
        autor_id: "usr-001",
        autor_nombre: "Carlos Méndez",
        autor_perfil: "CONSULTOR",
        contenido,
        estado: "abierto",
        created_at: new Date().toISOString(),
      };
      setGlosario((prev) => ({
        ...prev,
        comentarios: [...prev.comentarios, nuevoComentario],
      }));
      await onAddComment(referenciaId, referenciaTipo, contenido);
    },
    [onAddComment]
  );

  const handleAddComentarioGeneral = async () => {
    if (!nuevoComentarioGeneral.trim()) return;
    await handleAddCommentLocal(null, "general", nuevoComentarioGeneral.trim());
    setNuevoComentarioGeneral("");
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    await onSave(glosario);
    setHasChanges(false);
  };

  const comentariosGenerales = glosario.comentarios.filter(
    (c) => c.referencia_tipo === "general"
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar superior ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111]">
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-white/[0.04] p-0.5">
            {(["tabla", "comentarios", "versiones"] as TabActiva[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setTabActiva(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tabActiva === tab
                    ? "bg-white dark:bg-white/[0.1] text-gray-800 dark:text-white/90 shadow-sm"
                    : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                }`}
              >
                {tab === "tabla" && `Términos (${glosario.terminos.length})`}
                {tab === "comentarios" && `Comentarios (${comentariosGenerales.length})`}
                {tab === "versiones" && `v${glosario.version_actual}`}
              </button>
            ))}
          </div>

          {/* Indicadores */}
          {!readOnly && hasChanges && (
            <span className="text-[10px] font-medium text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
              Cambios sin guardar
            </span>
          )}
          {readOnly && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full">
              Solo lectura
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {/* Agregar columna dinámica */}
            <div className="relative">
              <button
                onClick={() => setShowAddCol(!showAddCol)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.04] text-xs font-medium text-gray-700 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors"
              >
                + Columna
              </button>
              {showAddCol && (
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-lg z-50">
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide mb-1">
                    Nombre de columna
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={nuevaColLabel}
                      onChange={(e) => setNuevaColLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                      placeholder="Ej. Validaciones"
                      className="flex-1 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] px-2 py-1.5 text-xs text-gray-800 dark:text-white/80 outline-none focus:border-[#28b8d5]" 
                    />
                    <button 
                      onClick={handleAddColumn}
                      className="px-3 py-1.5 rounded-lg bg-[#28b8d5] text-white text-xs font-medium"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Agregar término */}
            <button
              onClick={handleAddTermino}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#28b8d5]/30 text-xs font-medium text-[#28b8d5] hover:bg-[#28b8d5]/5 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Agregar término
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-white/[0.08]" />

            {/* Generar con IA */}
            <button
              onClick={onGenerateIA}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#28b8d5] to-purple-500 text-white text-xs font-semibold hover:from-[#23a7c2] hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  Generar con IA
                </>
              )}
            </button>

            {/* Guardar */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Tab: Tabla */}
        {tabActiva === "tabla" && (
          <>
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Barra de búsqueda */}
              <div className="px-5 py-2.5 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-[#0d0d0d]">
                <div className="relative max-w-sm">
                  <svg
                    width="14" height="14"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar término, sinónimo o propietario..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-xs text-gray-700 dark:text-white/70 placeholder-gray-400 outline-none focus:border-[#28b8d5]"
                  />
                </div>
                {busqueda && (
                  <p className="text-[10px] text-gray-400 dark:text-white/25 mt-1">
                    {terminosFiltrados.length} resultado{terminosFiltrados.length !== 1 ? "s" : ""} para &ldquo;{busqueda}&rdquo;
                  </p>
                )}
              </div>

              {/* Tabla */}
              <div className="flex-1 overflow-auto">
                {glosario.terminos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-white/20">
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-white/50 mb-1">
                        Sin términos registrados
                      </p>
                      <p className="text-xs text-gray-400 dark:text-white/25">
                        Agrega términos manualmente o usa IA para generarlos.
                      </p>
                    </div>
                  </div>
                ) : terminosFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <p className="text-sm text-gray-500 dark:text-white/40">
                      Sin resultados para &ldquo;{busqueda}&rdquo;
                    </p>
                    <button
                      onClick={() => setBusqueda("")}
                      className="text-xs text-[#28b8d5] hover:underline"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02]">
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap">
                          #
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide">
                          Término
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide">
                          Definición
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide">
                          Propietario
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap">
                          Entidades
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap">
                          Sinónimos
                        </th>
                        <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide whitespace-nowrap">
                          Coment.
                        </th>
                        {columnasDinamicas.map((col) => (
                          <th key={col.id} className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 dark:text-white/35 uppercase tracking-wide">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {terminosFiltrados.map((termino, idx) => {
                        const isSelected = terminoSeleccionadoId === termino.id;
                        const comentTermino = glosario.comentarios.filter(
                          (c) => c.referencia_id === termino.id
                        ).length;
                        return (
                          <tr
                            key={termino.id}
                            onClick={() =>
                              setTerminoSeleccionadoId(isSelected ? null : termino.id)
                            }
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-[#28b8d5]/5 dark:bg-[#28b8d5]/10"
                                : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                            }`}
                          >
                            {/* # */}
                            <td className="px-4 py-3 text-[11px] font-mono text-gray-400 dark:text-white/25 whitespace-nowrap">
                              {String(idx + 1).padStart(2, "0")}
                            </td>

                            {/* Término */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#28b8d5] shrink-0" />
                                )}
                                <span className="text-sm font-semibold text-gray-800 dark:text-white/80 truncate max-w-[160px]">
                                  {termino.termino}
                                </span>
                              </div>
                            </td>

                            {/* Definición */}
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-white/40 max-w-[280px]">
                              <span className="line-clamp-2 leading-relaxed">
                                {termino.definicion || (
                                  <span className="text-gray-300 dark:text-white/20 italic">Sin definición</span>
                                )}
                              </span>
                            </td>

                            {/* Propietario */}
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-white/50 whitespace-nowrap truncate max-w-[160px]">
                              {termino.propietario || (
                                <span className="text-gray-300 dark:text-white/20">—</span>
                              )}
                            </td>

                            {/* Entidades */}
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {termino.entidades_relacionadas.slice(0, 2).map((ent) => (
                                  <span
                                    key={ent}
                                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium whitespace-nowrap"
                                  >
                                    {ent}
                                  </span>
                                ))}
                                {termino.entidades_relacionadas.length > 2 && (
                                  <span className="text-[9px] text-gray-400 dark:text-white/25">
                                    +{termino.entidades_relacionadas.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Sinónimos */}
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {termino.sinonimos.slice(0, 2).map((sin) => (
                                  <span
                                    key={sin}
                                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 font-medium whitespace-nowrap"
                                  >
                                    {sin}
                                  </span>
                                ))}
                                {termino.sinonimos.length > 2 && (
                                  <span className="text-[9px] text-gray-400 dark:text-white/25">
                                    +{termino.sinonimos.length - 2}
                                  </span>
                                )}
                                {termino.sinonimos.length === 0 && (
                                  <span className="text-gray-300 dark:text-white/20 text-xs">—</span>
                                )}
                              </div>
                            </td>

                            {/* Comentarios */}
                            <td className="px-4 py-3 text-center">
                              {comentTermino > 0 ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                  {comentTermino}
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-white/20 text-xs">—</span>
                              )}
                            </td>
                            {columnasDinamicas.map((col) => (
                              <td key={col.id} className="px-4 py-3 text-xs text-gray-600 dark:text-white/50 truncate max-w-[160px]">
                                {(termino as any)[col.id] || (
                                  <span className="text-gray-300 dark:text-white/20">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Panel lateral de detalle */}
            {terminoSeleccionado && (
              <PanelTermino
                termino={terminoSeleccionado}
                comentarios={glosario.comentarios}
                columnasDinamicas={columnasDinamicas}
                onUpdate={handleUpdateTermino}
                onDelete={handleDeleteTermino}
                onClose={() => setTerminoSeleccionadoId(null)}
                onAddComment={handleAddCommentLocal}
                readOnly={readOnly}
              />
            )}
          </>
        )}

        {/* Tab: Comentarios generales */}
        {tabActiva === "comentarios" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">
              Comentarios generales del glosario
            </h3>

            <div className="space-y-3 mb-6">
              {comentariosGenerales.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-white/30 italic">
                  No hay comentarios generales aún.
                </p>
              )}
              {comentariosGenerales.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/70">
                      {c.autor_nombre}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        c.autor_perfil === "CONSULTOR"
                          ? "bg-[#28b8d5]/10 text-[#28b8d5]"
                          : "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
                      }`}
                    >
                      {c.autor_perfil === "CONSULTOR" ? "Consultor" : "Empresa"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-white/40">
                      General
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-white/60">{c.contenido}</p>
                  <span className="text-[10px] text-gray-400 dark:text-white/25 mt-2 block">
                    {new Date(c.created_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>

            {!readOnly && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoComentarioGeneral}
                  onChange={(e) => setNuevoComentarioGeneral(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddComentarioGeneral()
                  }
                  placeholder="Agregar comentario general sobre el glosario..."
                  className="flex-1 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-4 py-2.5 text-sm text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5]"
                />
                <button
                  onClick={handleAddComentarioGeneral}
                  disabled={!nuevoComentarioGeneral.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Versiones */}
        {tabActiva === "versiones" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">
              Historial de Versiones
            </h3>

            <div className="space-y-0">
              {[...glosario.historial_versiones].reverse().map((v, i) => (
                <div key={v.version} className="flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        i === 0 ? "bg-[#28b8d5]" : "bg-gray-300 dark:bg-white/[0.15]"
                      }`}
                    />
                    {i < glosario.historial_versiones.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-white/[0.08]" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold ${
                          i === 0 ? "text-[#28b8d5]" : "text-gray-600 dark:text-white/50"
                        }`}
                      >
                        v{v.version}
                      </span>
                      {i === 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                          Actual
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-white/25">
                        · {v.total_terminos} términos
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-white/60 mb-1">
                      {v.descripcion_cambio}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-white/25">
                      <span>{v.autor}</span>
                      <span>·</span>
                      <span>
                        {new Date(v.fecha).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer: Resumen ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-white/35">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#28b8d5]" />
            {glosario.terminos.length}{" "}
            {glosario.terminos.length === 1 ? "término" : "términos"}
          </span>
          {glosario.terminos.filter((t) => t.sinonimos.length > 0).length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              {glosario.terminos.reduce((acc, t) => acc + t.sinonimos.length, 0)} sinónimos
            </span>
          )}
          <span className="text-gray-300 dark:text-white/20">·</span>
          <span>{glosario.comentarios.length} comentarios</span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-white/25">
          Última modificación:{" "}
          {new Date(glosario.updated_at).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

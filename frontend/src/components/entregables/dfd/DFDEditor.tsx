"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { Connection } from "@xyflow/react";
import type {
  ComentarioDFD,
  DiagramaFlujoDatos,
  EstiloLineaDFD,
  FlujoDatos,
  NodoDFD,
  TipoRelacionDFD,
  TipoNodoDFD,
} from "@/lib/types/dfd.types";
import DFDCanvas from "./DFDCanvas";
import PanelNodoDFD from "./PanelNodoDFD";
import PanelFlujoDFD from "./PanelFlujoDFD";
import {
  DEFAULT_DFD_LINE_STYLE,
  DEFAULT_DFD_RELATION,
  getInvalidConnectionMessage,
  isValidDFDConnection,
} from "./dfdNotation";

interface DFDEditorProps {
  dfd: DiagramaFlujoDatos;
  onSave: (dfd: DiagramaFlujoDatos) => Promise<void>;
  onGenerateIA?: () => Promise<void>;
  onAddComment: (
    referenciaId: string | null,
    referenciaTipo: "nodo" | "flujo",
    contenido: string
  ) => Promise<ComentarioDFD | void>;
  onPreviewVersion?: (versionNumber: number) => Promise<DiagramaFlujoDatos>;
  onRestoreVersion?: (versionNumber: number) => Promise<DiagramaFlujoDatos | null>;
  isSaving: boolean;
  isGenerating?: boolean;
  readOnly?: boolean;
}

type PanelActivo =
  | { tipo: "nodo"; id: string }
  | { tipo: "flujo"; id: string }
  | null;

type TabActiva = "diagrama" | "comentarios" | "versiones";

function parseVersionNumber(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isFinite(direct)) return direct;
  const digits = trimmed.match(/\d+/);
  if (!digits) return null;
  const parsed = Number(digits[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFirstValidFlowPair(
  nodos: NodoDFD[]
): { sourceId: string; targetId: string } | null {
  for (const source of nodos) {
    for (const target of nodos) {
      if (isValidDFDConnection(nodos, source.id, target.id)) {
        return { sourceId: source.id, targetId: target.id };
      }
    }
  }
  return null;
}

export default function DFDEditor({
  dfd: dfdInicial,
  onSave,
  onGenerateIA,
  onAddComment,
  onPreviewVersion,
  onRestoreVersion,
  isSaving,
  isGenerating = false,
  readOnly = false,
}: DFDEditorProps) {
  const [dfd, setDfd] = useState<DiagramaFlujoDatos>(dfdInicial);
  const [panelActivo, setPanelActivo] = useState<PanelActivo>(null);
  const [tabActiva, setTabActiva] = useState<TabActiva>("diagrama");
  const [nuevoComentarioGeneral, setNuevoComentarioGeneral] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [previewDFD, setPreviewDFD] = useState<DiagramaFlujoDatos | null>(null);
  const [previewingVersion, setPreviewingVersion] = useState<number | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [defaultLineStyle, setDefaultLineStyle] =
    useState<EstiloLineaDFD>(DEFAULT_DFD_LINE_STYLE);
  const [defaultFlowRelation, setDefaultFlowRelation] =
    useState<TipoRelacionDFD>(DEFAULT_DFD_RELATION);

  useEffect(() => {
    setDfd(dfdInicial);
    setHasChanges(false);
    const detectedStyle =
      dfdInicial.flujos.find((flujo) => flujo.estilo_linea)?.estilo_linea ??
      DEFAULT_DFD_LINE_STYLE;
    setDefaultLineStyle(detectedStyle);
    const detectedRelation =
      dfdInicial.flujos.find((flujo) => flujo.tipo_relacion)?.tipo_relacion ??
      DEFAULT_DFD_RELATION;
    setDefaultFlowRelation(detectedRelation);
  }, [dfdInicial]);

  const handleSelectNodo = useCallback((id: string) => {
    setPanelActivo({ tipo: "nodo", id });
  }, []);

  const handleSelectFlujo = useCallback((id: string) => {
    setPanelActivo({ tipo: "flujo", id });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setPanelActivo(null);
  }, []);

  const handleNodeDragStop = useCallback((id: string, x: number, y: number) => {
    setDfd((prev) => ({
      ...prev,
      nodos: prev.nodos.map((n) => (n.id === id ? { ...n, posicion_x: x, posicion_y: y } : n)),
    }));
    setHasChanges(true);
  }, []);

  const handleNodeResize = useCallback((id: string, width: number, height: number) => {
    setDfd((prev) => ({
      ...prev,
      nodos: prev.nodos.map((n) => (n.id === id ? { ...n, width, height } : n)),
    }));
    setHasChanges(true);
  }, []);

  const handleUpdateNodo = useCallback((updated: NodoDFD) => {
    setDfd((prev) => ({
      ...prev,
      nodos: prev.nodos.map((n) => (n.id === updated.id ? updated : n)),
    }));
    setHasChanges(true);
  }, []);

  const handleDeleteNodo = useCallback((id: string) => {
    setDfd((prev) => ({
      ...prev,
      nodos: prev.nodos.filter((n) => n.id !== id),
      flujos: prev.flujos.filter((f) => f.origen_id !== id && f.destino_id !== id),
    }));
    setPanelActivo(null);
    setHasChanges(true);
  }, []);

  const handleAddNodo = useCallback(
    (tipo: TipoNodoDFD) => {
      const conteo = dfd.nodos.filter((n) => n.tipo === tipo).length;
      const numero = conteo + 1;
      const nuevoNodo: NodoDFD = {
        id: `${tipo}-${Date.now()}`,
        tipo,
        nombre:
          tipo === "proceso"
            ? `Process ${numero}`
            : tipo === "almacen"
              ? `Data Store ${numero}`
              : `External Entity ${numero}`,
        descripcion: "",
        numero_proceso: tipo === "proceso" ? `${numero}` : undefined,
        ubicacion_proceso: tipo === "proceso" ? "" : undefined,
        prefijo_almacen: tipo === "almacen" ? "D" : undefined,
        tipo_dato_almacen: tipo === "almacen" ? "" : undefined,
        posicion_x: 300 + Math.random() * 200,
        posicion_y: 200 + Math.random() * 200,
      };
      setDfd((prev) => ({ ...prev, nodos: [...prev.nodos, nuevoNodo] }));
      setPanelActivo({ tipo: "nodo", id: nuevoNodo.id });
      setHasChanges(true);
    },
    [dfd.nodos]
  );

  const handleUpdateFlujo = useCallback(
    (updated: FlujoDatos) => {
      const invalidConnection = getInvalidConnectionMessage(
        dfd.nodos,
        updated.origen_id,
        updated.destino_id
      );

      if (invalidConnection) {
        setFeedbackMessage(invalidConnection);
        return;
      }

      setDfd((prev) => ({
        ...prev,
        flujos: prev.flujos.map((f) => (f.id === updated.id ? updated : f)),
      }));
      setHasChanges(true);
    },
    [dfd.nodos]
  );

  const handleDeleteFlujo = useCallback((id: string) => {
    setDfd((prev) => ({ ...prev, flujos: prev.flujos.filter((f) => f.id !== id) }));
    setPanelActivo(null);
    setHasChanges(true);
  }, []);

  const handleAddFlujo = useCallback(() => {
    if (dfd.nodos.length < 2) return;
    const pair = getFirstValidFlowPair(dfd.nodos);
    if (!pair) {
      setFeedbackMessage(
        "Necesitas al menos un Process para crear un Data Flow válido."
      );
      return;
    }

      const nuevoFlujo: FlujoDatos = {
        id: `flujo-${Date.now()}`,
        origen_id: pair.sourceId,
        destino_id: pair.targetId,
        etiqueta: `data_flow_${dfd.flujos.length + 1}`,
        datos_descripcion: "",
        datos_campos: [],
        tipo_relacion: defaultFlowRelation,
        estilo_linea: defaultLineStyle,
      };
    setDfd((prev) => ({ ...prev, flujos: [...prev.flujos, nuevoFlujo] }));
    setPanelActivo({ tipo: "flujo", id: nuevoFlujo.id });
    setHasChanges(true);
  }, [defaultFlowRelation, defaultLineStyle, dfd.nodos, dfd.flujos.length]);

  const handleConnectFlow = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const invalidConnection = getInvalidConnectionMessage(
        dfd.nodos,
        connection.source,
        connection.target
      );
      if (invalidConnection) {
        setFeedbackMessage(invalidConnection);
        return;
      }

      const nuevoFlujo: FlujoDatos = {
        id: `flujo-${Date.now()}`,
        origen_id: connection.source,
        destino_id: connection.target,
        source_handle: connection.sourceHandle ?? null,
        target_handle: connection.targetHandle ?? null,
        etiqueta: `data_flow_${dfd.flujos.length + 1}`,
        datos_descripcion: "",
        datos_campos: [],
        tipo_relacion: defaultFlowRelation,
        estilo_linea: defaultLineStyle,
      };

      setDfd((prev) => ({ ...prev, flujos: [...prev.flujos, nuevoFlujo] }));
      setPanelActivo({ tipo: "flujo", id: nuevoFlujo.id });
      setHasChanges(true);
    },
    [defaultFlowRelation, defaultLineStyle, dfd.nodos, dfd.flujos.length]
  );

  const handleAddCommentLocal = useCallback(
    async (
      referenciaId: string | null,
      referenciaTipo: "nodo" | "flujo",
      contenido: string
    ) => {
      try {
        const created = await onAddComment(referenciaId, referenciaTipo, contenido);
        if (created) {
          setDfd((prev) => ({
            ...prev,
            comentarios: [...prev.comentarios, created],
          }));
        } else {
          const fallback: ComentarioDFD = {
            id: `com-${Date.now()}`,
            referencia_id: referenciaId,
            referencia_tipo: referenciaTipo,
            autor_id: "unknown",
            autor_nombre: "Usuario",
            autor_perfil: "CONSULTOR",
            contenido,
            estado: "abierto",
            created_at: new Date().toISOString(),
          };
          setDfd((prev) => ({
            ...prev,
            comentarios: [...prev.comentarios, fallback],
          }));
        }
      } catch (error) {
        const message =
          axios.isAxiosError(error) && error.response?.status === 422
            ? "No fue posible registrar el comentario en este elemento. Guarda el diagrama y vuelve a intentar."
            : "No fue posible registrar el comentario.";
        setFeedbackMessage(message);
      }
    },
    [onAddComment]
  );

  const handlePreviewVersion = useCallback(
    async (versionNumber: number) => {
      if (!onPreviewVersion) return;
      setPreviewingVersion(versionNumber);
      try {
        const preview = await onPreviewVersion(versionNumber);
        setPreviewDFD(preview);
      } catch (error) {
        const message =
          axios.isAxiosError(error) && error.response?.status === 404
            ? `No se encontró la versión v${versionNumber} para previsualizar.`
            : "No fue posible previsualizar la versión seleccionada.";
        setFeedbackMessage(message);
      } finally {
        setPreviewingVersion(null);
      }
    },
    [onPreviewVersion]
  );

  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      if (readOnly || !onRestoreVersion) return;
      setRestoringVersion(versionNumber);
      try {
        const restored = await onRestoreVersion(versionNumber);
        if (restored) {
          setDfd(restored);
          setHasChanges(false);
        }
        setPreviewDFD(null);
        setConfirmRestoreVersion(null);
      } catch {
        setFeedbackMessage("No fue posible restaurar la versión seleccionada.");
      } finally {
        setRestoringVersion(null);
      }
    },
    [onRestoreVersion, readOnly]
  );

  const handleSave = async () => {
    const invalidFlow = dfd.flujos.find(
      (flujo) =>
        !isValidDFDConnection(dfd.nodos, flujo.origen_id, flujo.destino_id)
    );

    if (invalidFlow) {
      setFeedbackMessage(
        "No se puede guardar: hay Data Flow con conexión inválida."
      );
      return;
    }

    try {
      await onSave(dfd);
      setHasChanges(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        const message =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail
                  .map((item) =>
                    item?.msg ? String(item.msg) : JSON.stringify(item)
                  )
                  .join(" | ")
              : "No fue posible guardar el diagrama (error de validación).";
        setFeedbackMessage(message);
        return;
      }
      setFeedbackMessage("No fue posible guardar el diagrama.");
    }
  };

  const handleAddComentarioGeneral = async () => {
    setFeedbackMessage("Los comentarios generales están deshabilitados. Comenta directamente sobre nodos o flujos.");
  };

  const nodoSeleccionado = panelActivo?.tipo === "nodo" ? dfd.nodos.find((n) => n.id === panelActivo.id) : undefined;
  const flujoSeleccionado = panelActivo?.tipo === "flujo" ? dfd.flujos.find((f) => f.id === panelActivo.id) : undefined;

  const conteoProcesos = dfd.nodos.filter((n) => n.tipo === "proceso").length;
  const conteoAlmacenes = dfd.nodos.filter((n) => n.tipo === "almacen").length;
  const conteoExternas = dfd.nodos.filter((n) => n.tipo === "entidad_externa").length;
  const hasValidFlowPair = useMemo(
    () => getFirstValidFlowPair(dfd.nodos) !== null,
    [dfd.nodos]
  );

  const versionesOrdenadas = useMemo(
    () =>
      [...dfd.historial_versiones].sort(
        (a, b) =>
          (parseVersionNumber(b.version) ?? Number.MIN_SAFE_INTEGER) -
          (parseVersionNumber(a.version) ?? Number.MIN_SAFE_INTEGER)
      ),
    [dfd.historial_versiones]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111111]">
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-gray-100 dark:bg-white/[0.04] p-0.5">
            {(["diagrama", "comentarios", "versiones"] as TabActiva[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setTabActiva(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tabActiva === tab
                    ? "bg-white dark:bg-white/[0.1] text-gray-800 dark:text-white/90 shadow-sm"
                    : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                }`}
              >
                {tab === "diagrama" && "Diagrama"}
                {tab === "versiones" && `v${dfd.version_actual}`}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-medium text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full">
            Nivel {dfd.nivel}
          </span>
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
            {onGenerateIA && (
              <button
                onClick={onGenerateIA}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#28b8d5] to-[#1e9bb5] text-white text-xs font-semibold hover:from-[#23a7c2] hover:to-[#1a8da5] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {isGenerating ? "Generando..." : "Generar con IA"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tabActiva === "diagrama" && (
          <>
            <div className="flex-1 p-4">
              <DFDCanvas
                dfd={dfd}
                nodoSeleccionadoId={panelActivo?.tipo === "nodo" ? panelActivo.id : null}
                flujoSeleccionadoId={panelActivo?.tipo === "flujo" ? panelActivo.id : null}
                onSelectNodo={readOnly ? () => {} : handleSelectNodo}
                onSelectFlujo={readOnly ? () => {} : handleSelectFlujo}
                onDeselectAll={readOnly ? () => {} : handleDeselectAll}
                onNodeDragStop={readOnly ? () => {} : handleNodeDragStop}
                onNodeResize={readOnly ? () => {} : handleNodeResize}
                onConnectFlow={readOnly ? undefined : handleConnectFlow}
                canCreateConnections={!readOnly}
                onAddProcess={readOnly ? undefined : () => handleAddNodo("proceso")}
                onAddDataStore={readOnly ? undefined : () => handleAddNodo("almacen")}
                onAddExternalEntity={
                  readOnly ? undefined : () => handleAddNodo("entidad_externa")
                }
                onAddDataFlow={readOnly ? undefined : handleAddFlujo}
                onInvalidConnectionAttempt={
                  readOnly ? undefined : setFeedbackMessage
                }
                canAddDataFlow={hasValidFlowPair}
                defaultLineStyle={defaultLineStyle}
                onChangeDefaultLineStyle={
                  readOnly ? undefined : setDefaultLineStyle
                }
                defaultFlowRelation={defaultFlowRelation}
                onChangeDefaultFlowRelation={
                  readOnly ? undefined : setDefaultFlowRelation
                }
                onAddComment={
                  readOnly
                    ? undefined
                    : async (nodeId, contenido) => {
                        await handleAddCommentLocal(nodeId, "nodo", contenido);
                      }
                }
              />
            </div>
            {nodoSeleccionado && !readOnly && (
              <PanelNodoDFD
                nodo={nodoSeleccionado}
                comentarios={dfd.comentarios}
                onUpdate={handleUpdateNodo}
                onDelete={handleDeleteNodo}
                onClose={handleDeselectAll}
                onAddComment={handleAddCommentLocal}
              />
            )}
            {flujoSeleccionado && !readOnly && (
              <PanelFlujoDFD
                flujo={flujoSeleccionado}
                nodos={dfd.nodos}
                comentarios={dfd.comentarios}
                onUpdate={handleUpdateFlujo}
                onDelete={handleDeleteFlujo}
                onClose={handleDeselectAll}
                onAddComment={handleAddCommentLocal}
              />
            )}
          </>
        )}

        {tabActiva === "comentarios" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">Comentarios del DFD</h3>
            <div className="space-y-3 mb-6">
              {dfd.comentarios.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-white/30 italic">No hay comentarios aún.</p>
              )}
              {dfd.comentarios.map((c) => (
                <div key={c.id} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{c.autor_nombre}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-[#28b8d5]/10 text-[#28b8d5]">
                      {c.autor_perfil === "EMPRESA" ? "Empresa" : "Consultor"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-white/40">
                      {c.referencia_tipo}
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
                  onKeyDown={(e) => e.key === "Enter" && handleAddComentarioGeneral()}
                  placeholder="Agregar comentario general sobre el DFD..."
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

        {tabActiva === "versiones" && (
          <div className="flex-1 p-6 overflow-y-auto max-w-3xl mx-auto">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4">Historial de Versiones</h3>
            <div className="space-y-0">
              {versionesOrdenadas.map((v, i) => {
                const versionNumber = parseVersionNumber(v.version);
                const currentVersion = parseVersionNumber(dfd.version_actual);
                const isCurrent =
                  versionNumber !== null && currentVersion !== null && versionNumber === currentVersion;
                return (
                  <div key={`${v.version}-${i}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${isCurrent ? "bg-[#28b8d5]" : "bg-gray-300 dark:bg-white/[0.15]"}`} />
                      {i < versionesOrdenadas.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-white/[0.08]" />}
                    </div>
                    <div className="pb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${isCurrent ? "text-[#28b8d5]" : "text-gray-600 dark:text-white/50"}`}>
                          v{v.version}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#28b8d5]/10 text-[#28b8d5] font-medium">
                            Actual
                          </span>
                        )}
                        {!isCurrent && onPreviewVersion && versionNumber !== null && (
                          <button
                            onClick={() => handlePreviewVersion(versionNumber)}
                            disabled={previewingVersion === versionNumber}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.04] disabled:opacity-50"
                          >
                            {previewingVersion === versionNumber ? "Cargando..." : "Previsualizar"}
                          </button>
                        )}
                        {!isCurrent && onRestoreVersion && !readOnly && versionNumber !== null && (
                          <button
                            onClick={() => setConfirmRestoreVersion(versionNumber)}
                            disabled={restoringVersion === versionNumber}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 disabled:opacity-50"
                          >
                            {restoringVersion === versionNumber ? "Restaurando..." : "Restaurar"}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-white/60 mb-1">{v.descripcion_cambio}</p>
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
                );
              })}
            </div>
          </div>
        )}
      </div>

      {previewDFD && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#111111] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">
                  Vista previa de versión v{previewDFD.version_actual}
                </h4>
                <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                  {previewDFD.nodos.length} nodos · {previewDFD.flujos.length} flujos
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && onRestoreVersion && parseVersionNumber(previewDFD.version_actual) !== null && (
                  <button
                    onClick={() => {
                      const number = parseVersionNumber(previewDFD.version_actual);
                      if (number !== null) setConfirmRestoreVersion(number);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-xs font-medium"
                  >
                    Restaurar versión
                  </button>
                )}
                <button
                  onClick={() => setPreviewDFD(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="p-5 h-[68vh] min-h-[420px]">
              <DFDCanvas
                dfd={previewDFD}
                nodoSeleccionadoId={null}
                flujoSeleccionadoId={null}
                onSelectNodo={() => {}}
                onSelectFlujo={() => {}}
                onDeselectAll={() => {}}
                onNodeDragStop={() => {}}
                onNodeResize={() => {}}
                canCreateConnections={false}
              />
            </div>
          </div>
        </div>
      )}

      {confirmRestoreVersion !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#111111] shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">Confirmar restauración</h4>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-1">
                Se restaurará la versión v{confirmRestoreVersion} y se creará una nueva versión con ese contenido.
              </p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmRestoreVersion(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs font-medium text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleRestoreVersion(confirmRestoreVersion)}
                disabled={restoringVersion === confirmRestoreVersion}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {restoringVersion === confirmRestoreVersion ? "Restaurando..." : "Restaurar versión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-[#111111] shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white/90">Aviso</h4>
              <p className="text-xs text-gray-500 dark:text-white/40 mt-1">{feedbackMessage}</p>
            </div>
            <div className="px-5 py-4 flex items-center justify-end">
              <button
                onClick={() => setFeedbackMessage(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors dark:bg-white/[0.1] dark:hover:bg-white/[0.15]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex items-center gap-4 text-[11px] text-gray-500 dark:text-white/35">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#28b8d5]" />
            {conteoProcesos} process
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {conteoAlmacenes} data store
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            {conteoExternas} external entity
          </span>
          <span>{dfd.flujos.length} data flow</span>
          <span>{dfd.comentarios.length} comentarios</span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-white/25">
          Última modificación:{" "}
          {new Date(dfd.updated_at).toLocaleDateString("es-CO", {
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

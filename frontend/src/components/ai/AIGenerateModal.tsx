"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { aiApi, type AIGenerateParams, type ProjectDocument } from "@/lib/api/ai";

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:    { label: "Pendiente",    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  PROCESSING: { label: "Procesando",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
  READY:      { label: "Listo",       cls: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" },
  ERROR:      { label: "Error",       cls: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" },
} as const;

function StatusBadge({ status }: { status: ProjectDocument["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with form params; should resolve when the generation completes. */
  onGenerate: (params: AIGenerateParams) => Promise<void>;
  projectId: string;
  artifactLabel?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AIGenerateModal({
  isOpen,
  onClose,
  onGenerate,
  projectId,
  artifactLabel = "artefacto",
}: AIGenerateModalProps) {
  const [contextText, setContextText]     = useState("");
  const [consultantNote, setConsultantNote] = useState("");
  const [docLanguage, setDocLanguage]     = useState("");
  const [generating, setGenerating]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // ── Documents ──────────────────────────────────────────────────────────────
  const [docs, setDocs]         = useState<ProjectDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const list = await aiApi.listDocuments(projectId);
      setDocs(list);
      return list;
    } catch {
      return [];
    }
  }, [projectId]);

  // Poll while any doc is pending/processing
  const schedulePoll = useCallback(
    (list: ProjectDocument[]) => {
      if (pollRef.current) clearTimeout(pollRef.current);
      const busy = list.some(
        (d) => d.status === "PENDING" || d.status === "PROCESSING",
      );
      if (busy) {
        pollRef.current = setTimeout(async () => {
          const next = await fetchDocs();
          schedulePoll(next);
        }, 3000);
      }
    },
    [fetchDocs],
  );

  useEffect(() => {
    if (!isOpen) return;
    setLoadingDocs(true);
    fetchDocs()
      .then(schedulePoll)
      .finally(() => setLoadingDocs(false));
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [isOpen, fetchDocs, schedulePoll]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setContextText("");
      setConsultantNote("");
      setDocLanguage("");
      setError(null);
      setGenerating(false);
    }
  }, [isOpen]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setUploading(true);
      try {
        await aiApi.uploadDocument(projectId, file);
        const next = await fetchDocs();
        schedulePoll(next);
      } catch {
        // silently ignore — show on the list
      } finally {
        setUploading(false);
      }
    },
    [fetchDocs, projectId, schedulePoll],
  );

  const handleDelete = useCallback(
    async (docId: string) => {
      setDeletingId(docId);
      try {
        await aiApi.deleteDocument(projectId, docId);
        setDocs((prev) => prev.filter((d) => d.id !== docId));
      } finally {
        setDeletingId(null);
      }
    },
    [projectId],
  );

  // ── Generate ───────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGenerating(true);
    try {
      await onGenerate({ contextText, consultantNote, docLanguage });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al generar. Intenta de nuevo.";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [contextText, consultantNote, docLanguage, onGenerate, onClose]);

  const readyDocs = docs.filter((d) => d.status === "READY");

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl mx-4 my-8">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#28b8d5]/10 flex items-center justify-center">
            <Sparkles size={16} className="text-[#28b8d5]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Generar {artifactLabel} con IA
            </h2>
            <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
              Proporciona contexto para obtener mejores resultados.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Context text */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700 dark:text-white/60">
            Contexto del cliente
            <span className="ml-1 font-normal text-gray-400 dark:text-white/30">(opcional)</span>
          </label>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            rows={4}
            placeholder="Pega aquí extractos de documentos, correos, notas del cliente... La IA los usará como base para generar el artefacto."
            className="w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-2 text-xs text-gray-800 dark:text-white/80 placeholder:text-gray-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/30 resize-none"
          />
        </div>

        {/* Language + note row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-white/60">
              Idioma del contexto
            </label>
            <select
              value={docLanguage}
              onChange={(e) => setDocLanguage(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-xs text-gray-800 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/30"
            >
              <option value="">Auto-detectar</option>
              <option value="español">Español</option>
              <option value="inglés">Inglés</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 dark:text-white/60">
              Instrucción adicional
            </label>
            <input
              type="text"
              value={consultantNote}
              onChange={(e) => setConsultantNote(e.target.value)}
              placeholder="Énfasis, restricciones…"
              className="w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-3 py-2 text-xs text-gray-800 dark:text-white/80 placeholder:text-gray-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#28b8d5]/30"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
          <span className="text-[10px] font-medium text-gray-400 dark:text-white/25 uppercase tracking-wide">
            Documentos del proyecto
          </span>
          <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
        </div>

        {/* Documents section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-500 dark:text-white/35">
              {readyDocs.length > 0
                ? `${readyDocs.length} documento${readyDocs.length !== 1 ? "s" : ""} listo${readyDocs.length !== 1 ? "s" : ""} — la IA los consultará si no hay texto pegado.`
                : "Sube PDFs o TXTs para que la IA los use como fuente de contexto."}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-[11px] font-medium text-[#28b8d5] hover:text-[#28b8d5]/80 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                </svg>
              ) : (
                <Upload size={12} />
              )}
              Subir archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.csv,.xls,.xlsx"
              className="hidden"
              onChange={handleUpload}
            />
          </div>

          {/* Doc list */}
          {loadingDocs ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin w-4 h-4 text-[#28b8d5]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
              </svg>
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08] py-5 flex flex-col items-center gap-2">
              <FileText size={20} className="text-gray-300 dark:text-white/15" />
              <p className="text-[11px] text-gray-400 dark:text-white/25">
                Sin documentos — puedes subir PDF, TXT o CSV
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] px-2.5 py-2"
                >
                  <FileText size={13} className="flex-shrink-0 text-gray-400 dark:text-white/30" />
                  <p
                    className="flex-1 text-[11px] text-gray-700 dark:text-white/60 truncate"
                    title={doc.original_name}
                  >
                    {doc.original_name}
                  </p>
                  <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-white/25">
                    {formatBytes(doc.size_bytes)}
                  </span>
                  <StatusBadge status={doc.status} />
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="flex-shrink-0 p-0.5 rounded text-gray-300 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deletingId === doc.id ? (
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-gray-400 dark:text-white/25">
            El resultado reemplazará el contenido actual del artefacto.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#28b8d5] text-white text-xs font-semibold hover:bg-[#28b8d5]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  Generando…
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Generar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

"use client";
import React, { useEffect, useRef, useState } from "react";
import { Check, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import type { ComentarioLogico } from "@/lib/types/modelo-logico.types";

export interface CommentPopoverLogicoState {
  x: number;
  y: number;
  referenciaId: string;
  referenciaTipo: "tabla" | "columna" | "general";
  nombre: string;
}

interface CommentPopoverLogicoProps extends CommentPopoverLogicoState {
  comentarios: ComentarioLogico[];
  onClose: () => void;
  onAddComment: (contenido: string) => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

function CommentCard({ c, onResolve, onReopen }: { c: ComentarioLogico; onResolve: (id: string) => void; onReopen: (id: string) => void }) {
  const resolved = c.estado === "resuelto";
  return (
    <div className={`px-4 py-3 border-b border-gray-50 dark:border-white/[0.04] last:border-b-0 ${resolved ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[10px] font-semibold text-gray-700 dark:text-white/70">{c.autor}</span>
            <span className="text-[9px] text-gray-400 dark:text-white/25">{formatDate(c.fecha)}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${c.rol === "CONSULTOR" ? "bg-[#28b8d5]/10 text-[#28b8d5]" : "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"}`}>
              {c.rol === "CONSULTOR" ? "Consultor" : "Empresa"}
            </span>
          </div>
          <p className={`text-xs leading-relaxed ${resolved ? "text-gray-400 dark:text-white/25 line-through" : "text-gray-700 dark:text-white/60"}`}>
            {c.texto}
          </p>
          {resolved && <p className="mt-0.5 text-[10px] text-emerald-500 dark:text-emerald-400">Resuelto</p>}
        </div>
        <button
          onClick={() => resolved ? onReopen(c.id) : onResolve(c.id)}
          title={resolved ? "Reabrir" : "Resolver"}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${resolved ? "text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]" : "text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"}`}
        >
          {resolved ? <RotateCcw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

export default function CommentPopoverLogico({ x, y, nombre, comentarios, onClose, onAddComment, onResolve, onReopen }: CommentPopoverLogicoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [onClose]);

  const handleSend = () => {
    if (!texto.trim()) return;
    onAddComment(texto.trim());
    setTexto("");
  };

  const open = comentarios.filter(c => c.estado !== "resuelto");
  const resolved = comentarios.filter(c => c.estado === "resuelto");

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: x, top: y, zIndex: 1000 }}
      className="w-80 max-h-[420px] flex flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/[0.1] dark:bg-[#1a1a1a] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageCircle className="h-3.5 w-3.5 text-[#28b8d5] shrink-0" />
          <h4 className="text-xs font-bold text-gray-800 dark:text-white/90 truncate">{nombre}</h4>
          {open.length > 0 && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {open.length} abierto{open.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button onClick={onClose} className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {comentarios.length === 0 && (
          <div className="px-4 py-8 text-center">
            <MessageCircle className="h-6 w-6 text-gray-200 dark:text-white/10 mx-auto mb-2" />
            <p className="text-xs text-gray-400 dark:text-white/30">Sin comentarios aún.</p>
          </div>
        )}
        {open.map(c => <CommentCard key={c.id} c={c} onResolve={onResolve} onReopen={onReopen} />)}
        {resolved.length > 0 && (
          <>
            <div className="px-4 py-1.5 bg-gray-50 dark:bg-white/[0.02]">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-wide">Resueltos ({resolved.length})</p>
            </div>
            {resolved.map(c => <CommentCard key={c.id} c={c} onResolve={onResolve} onReopen={onReopen} />)}
          </>
        )}
      </div>

      <div className="border-t border-gray-100 dark:border-white/[0.06] px-3 py-3 shrink-0">
        <div className="flex gap-2">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Agregar comentario... (Enter para enviar)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-xs text-gray-700 dark:text-white/70 outline-none focus:border-[#28b8d5] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!texto.trim()}
            className="self-end p-2 rounded-lg bg-[#28b8d5] text-white hover:bg-[#23a7c2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

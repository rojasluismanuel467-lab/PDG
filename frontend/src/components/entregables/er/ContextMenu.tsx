"use client";
import React, { useEffect, useRef } from "react";
import { Edit2, Plus, MessageCirclePlus, MessageSquare, Trash2, ArrowLeftRight, Copy } from "lucide-react";

export interface ContextMenuState {
  x: number;
  y: number;
  tipo: "entidad" | "relacion";
  id: string;
  nombre: string;
  comentariosCount: number;
}

interface ContextMenuProps extends ContextMenuState {
  onClose: () => void;
  onEdit: () => void;
  onAddComment: () => void;
  onViewComments: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddAttribute?: () => void;   // entity only
  onReverseDirection?: () => void; // relation only
}

export default function ContextMenu({ x, y, tipo, nombre, comentariosCount, onClose, onEdit, onAddComment, onViewComments, onDelete, onDuplicate, onAddAttribute, onReverseDirection }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [onClose]);

  // Clamp to viewport
  const safeX = typeof window !== "undefined" ? Math.min(x, window.innerWidth - 220) : x;
  const safeY = typeof window !== "undefined" ? Math.min(y, window.innerHeight - 260) : y;

  type Item = { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void };
  type Group = Item[];

  const groups: Group[] = [
    [
      { icon: <Edit2 className="h-3.5 w-3.5" />, label: "Editar", onClick: () => { onEdit(); onClose(); } },
      { icon: <Copy className="h-3.5 w-3.5" />, label: tipo === "entidad" ? "Duplicar entidad" : "Duplicar relación", onClick: () => { onDuplicate(); onClose(); } },
      ...(tipo === "entidad" && onAddAttribute
        ? [{ icon: <Plus className="h-3.5 w-3.5" />, label: "Agregar atributo", onClick: () => { onAddAttribute!(); onClose(); } }]
        : []),
      ...(tipo === "relacion" && onReverseDirection
        ? [{ icon: <ArrowLeftRight className="h-3.5 w-3.5" />, label: "Invertir dirección", onClick: () => { onReverseDirection!(); onClose(); } }]
        : []),
    ],
    [
      { icon: <MessageCirclePlus className="h-3.5 w-3.5" />, label: "Agregar comentario...", onClick: () => { onAddComment(); onClose(); } },
      ...(comentariosCount > 0
        ? [{ icon: <MessageSquare className="h-3.5 w-3.5" />, label: `Ver comentarios (${comentariosCount})`, onClick: () => { onViewComments(); onClose(); } }]
        : []),
    ],
    [
      { icon: <Trash2 className="h-3.5 w-3.5" />, label: tipo === "entidad" ? "Eliminar entidad" : "Eliminar relación", danger: true, onClick: () => { onDelete(); onClose(); } },
    ],
  ];

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: safeX, top: safeY, zIndex: 1000 }}
      className="w-52 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/[0.1] dark:bg-[#1a1a1a] overflow-hidden py-1"
    >
      <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-white/30 truncate">{nombre}</p>
      </div>
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="my-1 border-t border-gray-100 dark:border-white/[0.06]" />}
          {group.map((item, ii) => (
            <button
              key={ii}
              onClick={item.onClick}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors text-left
                ${item.danger
                  ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  : "text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                }`}
            >
              <span className={item.danger ? "text-red-400" : "text-gray-400 dark:text-white/30"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

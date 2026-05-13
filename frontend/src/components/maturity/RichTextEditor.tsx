"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Redo,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";

// ── Image compression ────────────────────────────────────────────────────────

async function compressToBase64(file: File, maxPx = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new window.Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

// ── Toolbar button ───────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`rounded p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, disabled = false, placeholder }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: true, inline: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "Escribe observaciones o justificación adicional...",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-gray-400 before:dark:text-white/30 before:float-left before:pointer-events-none before:h-0",
      }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate({ editor: ed }) {
      onChange(ed.isEmpty ? "" : ed.getHTML());
    },
    editorProps: {
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (!imageItem) return false;
        event.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return false;
        void compressToBase64(file).then((src) => {
          view.dispatch(
            view.state.tr.replaceSelectionWith(
              view.state.schema.nodes.image.create({ src })
            )
          );
        });
        return true;
      },
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const src = await compressToBase64(file);
    editor.chain().focus().setImage({ src }).run();
    e.target.value = "";
  };

  if (!editor) return null;

  const divider = (
    <span className="mx-0.5 h-4 w-px self-center bg-gray-300 dark:bg-white/[0.12]" />
  );

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        disabled
          ? "border-gray-200 bg-gray-50 dark:border-white/[0.06] dark:bg-white/[0.02]"
          : "border-gray-300 bg-white focus-within:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.03] dark:focus-within:border-blue-400"
      }`}
    >
      {/* Barra de herramientas */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Negrita (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Cursiva (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Subrayado (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          {divider}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Título"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Subtítulo"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>

          {divider}

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Lista con viñetas"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Lista numerada"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>

          {divider}

          {/* Insertar imagen */}
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insertar imagen o pantallazo (también puedes pegar con Ctrl+V)"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFileChange(e)}
          />

          {divider}

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rehacer (Ctrl+Y)"
          >
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      )}

      {/* Área de edición */}
      <EditorContent
        editor={editor}
        className="rich-text max-h-64 min-h-[100px] overflow-x-auto overflow-y-auto px-3 py-2 text-sm text-gray-900 dark:text-white [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}

// ── Viewer (solo lectura) ────────────────────────────────────────────────────

interface ViewerProps {
  html: string;
}

export function RichTextViewer({ html }: ViewerProps) {
  if (!html) return null;
  return (
    <div
      className="rich-text max-h-64 overflow-x-auto overflow-y-auto text-sm text-gray-800 dark:text-white/80"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

"use client";

import { useState } from "react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const EMPTY_STATE = {
  html: "",
  bold: false,
  italic: false,
  heading2: false,
  heading3: false,
  bulletList: false,
  orderedList: false,
  link: false,
  linkHref: "",
};

export default function RichTextEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [linkPromptOpen, setLinkPromptOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
    ],
    content: defaultValue || "",
    immediatelyRender: false,
  });

  // Tiptap v3 doesn't re-render the parent on every transaction by default —
  // without this, the hidden input below would keep the HTML from first render.
  // The selector's snapshot only refreshes after the first transaction, so this
  // must never gate whether the editor itself renders (see EMPTY_STATE fallback).
  const editorState = useEditorState({
    editor,
    selector: (ctx) =>
      ctx.editor
        ? {
            html: ctx.editor.getHTML(),
            bold: ctx.editor.isActive("bold"),
            italic: ctx.editor.isActive("italic"),
            heading2: ctx.editor.isActive("heading", { level: 2 }),
            heading3: ctx.editor.isActive("heading", { level: 3 }),
            bulletList: ctx.editor.isActive("bulletList"),
            orderedList: ctx.editor.isActive("orderedList"),
            link: ctx.editor.isActive("link"),
            linkHref: (ctx.editor.getAttributes("link").href as string | undefined) ?? "",
          }
        : null,
  });

  if (!editor) return null;

  const state = editorState ?? { ...EMPTY_STATE, html: editor.getHTML() };

  function openLinkPrompt() {
    setLinkValue(state.linkHref);
    setLinkPromptOpen(true);
  }

  function applyLink() {
    const url = linkValue.trim();
    if (!url) {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkPromptOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 p-1.5">
        <ToolbarButton
          label="Bold"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={state.heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={state.heading3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton label="Link" active={state.link} onClick={openLinkPrompt}>
          Link
        </ToolbarButton>

        {linkPromptOpen && (
          <span className="flex items-center gap-1">
            <input
              type="text"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") setLinkPromptOpen(false);
              }}
              placeholder="https://..."
              autoFocus
              className="rounded border border-input bg-transparent px-2 py-1 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <button
              type="button"
              onClick={applyLink}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setLinkPromptOpen(false)}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </span>
        )}
      </div>

      <EditorContent
        editor={editor}
        className="prose prose-sm min-h-[200px] max-w-none rounded-md border border-input px-3 py-2 text-sm text-foreground [&_.ProseMirror]:min-h-[180px] [&_.ProseMirror]:outline-none"
      />

      <input type="hidden" name={name} value={state.html} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium ${
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

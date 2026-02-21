import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const valueRef = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing...',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const md = // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.storage as any).markdown.getMarkdown();
      valueRef.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[350px] px-4 py-3',
      },
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== valueRef.current) {
      editor.commands.setContent(value);
      valueRef.current = value;
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card/20 focus-within:border-primary/50 transition-colors">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { EditorToolbar } from './EditorToolbar';

interface TipTapMarkdownStorage {
  markdown: {
    getMarkdown: () => string;
  };
}

export interface MarkdownEditorHandle {
  focus: () => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor({ value, onChange, placeholder }, ref) {
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
      const md = (editor.storage as unknown as TipTapMarkdownStorage).markdown.getMarkdown();
      valueRef.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[350px] pt-4',
      },
    },
  });

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
  }), [editor]);

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== valueRef.current) {
      editor.commands.setContent(value);
      valueRef.current = value;
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
});

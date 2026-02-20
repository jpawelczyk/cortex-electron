import { useEffect, useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll } from '@milkdown/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder: _placeholder }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorRef.current!);
        ctx.set(defaultValueCtx, value);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          valueRef.current = markdown;
          onChange(markdown);
        });
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(listener);

    editor.create().then((instance) => {
      editorInstanceRef.current = instance;
    });

    return () => {
      editorInstanceRef.current?.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editorInstanceRef.current && value !== valueRef.current) {
      editorInstanceRef.current.action(replaceAll(value));
      valueRef.current = value;
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      data-testid="milkdown-editor"
      className="milkdown-editor min-h-[400px] p-4 rounded-lg bg-card/20 border border-border focus-within:border-primary/50 transition-colors"
    />
  );
}

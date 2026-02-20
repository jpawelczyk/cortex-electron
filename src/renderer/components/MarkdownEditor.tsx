import { useCallback, useEffect, useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx, commandsCtx } from '@milkdown/core';
import {
  commonmark,
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
  toggleLinkCommand,
  createCodeBlockCommand,
} from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { nord } from '@milkdown/theme-nord';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { replaceAll, callCommand } from '@milkdown/utils';
import { EditorToolbar } from './EditorToolbar';

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

    let cancelled = false;

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
      if (cancelled) {
        instance.destroy();
        return;
      }
      editorInstanceRef.current = instance;
    });

    return () => {
      cancelled = true;
      editorInstanceRef.current?.destroy();
      editorInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editorInstanceRef.current && value !== valueRef.current) {
      editorInstanceRef.current.action(replaceAll(value));
      valueRef.current = value;
    }
  }, [value]);

  const runCommand = useCallback((command: { key: unknown }, payload?: unknown) => {
    if (!editorInstanceRef.current) return;
    editorInstanceRef.current.action(
      callCommand(command.key as never, payload as never),
    );
  }, []);

  const handleBold = useCallback(() => runCommand(toggleStrongCommand), [runCommand]);
  const handleItalic = useCallback(() => runCommand(toggleEmphasisCommand), [runCommand]);
  const handleH1 = useCallback(() => runCommand(wrapInHeadingCommand, 1), [runCommand]);
  const handleH2 = useCallback(() => runCommand(wrapInHeadingCommand, 2), [runCommand]);
  const handleH3 = useCallback(() => runCommand(wrapInHeadingCommand, 3), [runCommand]);
  const handleBulletList = useCallback(() => runCommand(wrapInBulletListCommand), [runCommand]);
  const handleOrderedList = useCallback(() => runCommand(wrapInOrderedListCommand), [runCommand]);
  const handleTaskList = useCallback(() => runCommand(wrapInBulletListCommand), [runCommand]);
  const handleLink = useCallback(() => runCommand(toggleLinkCommand), [runCommand]);
  const handleCode = useCallback(() => runCommand(createCodeBlockCommand), [runCommand]);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(valueRef.current);
  }, []);

  return (
    <div
      data-testid="editor-wrapper"
      className="rounded-lg border border-border overflow-hidden"
    >
      <EditorToolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onH1={handleH1}
        onH2={handleH2}
        onH3={handleH3}
        onBulletList={handleBulletList}
        onOrderedList={handleOrderedList}
        onTaskList={handleTaskList}
        onLink={handleLink}
        onCode={handleCode}
        onCopy={handleCopy}
      />
      <div
        ref={editorRef}
        data-testid="milkdown-editor"
        className="milkdown-editor min-h-[400px] p-4 bg-card/20"
      />
    </div>
  );
}

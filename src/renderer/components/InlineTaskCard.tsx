import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Circle } from 'lucide-react';
import { useStore } from '../stores';

export function InlineTaskCard() {
  const createTask = useStore((s) => s.createTask);
  const cancelInlineCreate = useStore((s) => s.cancelInlineCreate);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef(title);
  const notesRef = useRef(notes);
  titleRef.current = title;
  notesRef.current = notes;

  const saveAndClose = useCallback(() => {
    const trimmed = titleRef.current.trim();
    if (trimmed) {
      const input: { title: string; notes?: string } = { title: trimmed };
      if (notesRef.current.trim()) {
        input.notes = notesRef.current.trim();
      }
      createTask(input);
    }
    cancelInlineCreate();
  }, [createTask, cancelInlineCreate]);

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    }
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelInlineCreate();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cancelInlineCreate]);

  // Click-outside handler — save if title present, otherwise just dismiss
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        saveAndClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [saveAndClose]);

  return (
    <div
      ref={cardRef}
      data-testid="inline-task-card"
      className="bg-card border border-border rounded-xl shadow-sm my-2"
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="shrink-0">
          <Circle
            className="size-[18px] text-muted-foreground/50"
            strokeWidth={1.5}
          />
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="New task"
          className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
          autoFocus
        />
      </div>
      <div className="pr-4 pt-1 pb-3" style={{ paddingLeft: 46 }}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={1}
          className="w-full bg-transparent text-[13px] text-foreground/80 placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}

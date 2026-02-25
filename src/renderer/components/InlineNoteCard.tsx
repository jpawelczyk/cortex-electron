import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { FileText } from 'lucide-react';
import { useStore } from '../stores';

interface InlineNoteCardProps {
  onClose: () => void;
}

export function InlineNoteCard({ onClose }: InlineNoteCardProps) {
  const createNote = useStore((s) => s.createNote);
  const navigateTab = useStore((s) => s.navigateTab);
  const activeContextIds = useStore((s) => s.activeContextIds);

  const [title, setTitle] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const saveAndClose = useCallback(async () => {
    const trimmed = titleRef.current.trim();
    if (trimmed) {
      const input: { title: string; context_id?: string } = { title: trimmed };
      if (activeContextIds.length === 1) {
        input.context_id = activeContextIds[0];
      }
      const note = await createNote(input);
      navigateTab({ view: 'notes', entityId: note.id, entityType: 'note' });
    }
    onClose();
  }, [createNote, navigateTab, onClose, activeContextIds]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
      data-testid="inline-note-card"
      className="rounded-lg border border-primary/50 bg-card/40 backdrop-blur-xl p-4 mb-4 animate-card-enter"
    >
      <div className="flex items-center gap-3">
        <FileText className="size-4 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New note"
          className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
          autoFocus
        />
      </div>
    </div>
  );
}

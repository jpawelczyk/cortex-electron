import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { FolderKanban } from 'lucide-react';
import { useStore } from '../stores';

interface InlineProjectCardProps {
  onClose: () => void;
}

export function InlineProjectCard({ onClose }: InlineProjectCardProps) {
  const createProject = useStore((s) => s.createProject);
  const [title, setTitle] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const saveAndClose = useCallback(async () => {
    const trimmed = titleRef.current.trim();
    if (trimmed) {
      await createProject({ title: trimmed, status: 'planned' });
    }
    onClose();
  }, [createProject, onClose]);

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
      data-testid="inline-project-card"
      className="rounded-lg border border-primary/50 bg-card/40 backdrop-blur-xl p-4 animate-card-enter"
    >
      <div className="flex items-center gap-3">
        <FolderKanban className="size-4 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New project"
          className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
          autoFocus
        />
      </div>
    </div>
  );
}

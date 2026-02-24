import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Video } from 'lucide-react';
import { useStore } from '../stores';

interface InlineMeetingCardProps {
  onClose: () => void;
}

export function InlineMeetingCard({ onClose }: InlineMeetingCardProps) {
  const createMeeting = useStore((s) => s.createMeeting);
  const selectMeeting = useStore((s) => s.selectMeeting);
  const [title, setTitle] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const saveAndClose = useCallback(async () => {
    const trimmed = titleRef.current.trim();
    if (trimmed) {
      const created = await createMeeting({
        title: trimmed,
        start_time: new Date().toISOString(),
      });
      if (created?.id) {
        selectMeeting(created.id);
      }
    }
    onClose();
  }, [createMeeting, selectMeeting, onClose]);

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
      data-testid="inline-meeting-card"
      className="rounded-lg border border-primary/50 bg-card/40 backdrop-blur-xl p-4 animate-card-enter"
    >
      <div className="flex items-center gap-3">
        <Video className="size-4 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New meeting"
          className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
          autoFocus
        />
      </div>
    </div>
  );
}

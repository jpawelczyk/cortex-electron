import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Users } from 'lucide-react';
import { useStore } from '../stores';

interface InlineStakeholderCardProps {
  onClose: () => void;
}

export function InlineStakeholderCard({ onClose }: InlineStakeholderCardProps) {
  const createStakeholder = useStore((s) => s.createStakeholder);
  const navigateTab = useStore((s) => s.navigateTab);
  const [name, setName] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef(name);
  nameRef.current = name;

  const saveAndClose = useCallback(async () => {
    const trimmed = nameRef.current.trim();
    if (trimmed) {
      const created = await createStakeholder({ name: trimmed });
      if (created?.id) {
        navigateTab({ view: 'stakeholders', entityId: created.id, entityType: 'stakeholder' });
      }
    }
    onClose();
  }, [createStakeholder, navigateTab, onClose]);

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
      data-testid="inline-stakeholder-card"
      className="rounded-lg border border-primary/50 bg-card/40 backdrop-blur-xl p-4 animate-card-enter"
    >
      <div className="flex items-center gap-3">
        <Users className="size-4 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="New stakeholder"
          className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
          autoFocus
        />
      </div>
    </div>
  );
}

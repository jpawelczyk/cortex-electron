import { useState, useEffect, useRef, useCallback, useMemo, KeyboardEvent } from 'react';
import { Circle, CheckCircle2 } from 'lucide-react';
import type { ChecklistItem } from '@shared/types';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

const DEBOUNCE_MS = 500;
const EMPTY_ARRAY: ChecklistItem[] = [];

interface ChecklistListProps {
  taskId: string;
  isExpanded?: boolean;
}

function ChecklistItemRow({
  item,
  taskId,
  tabIndex,
  onEnter,
  onBackspaceEmpty,
  autoFocus,
}: {
  item: ChecklistItem;
  taskId: string;
  tabIndex: number;
  onEnter: () => void;
  onBackspaceEmpty: (id: string) => void;
  autoFocus?: boolean;
}) {
  const updateChecklistItem = useStore((s) => s.updateChecklistItem);
  const [title, setTitle] = useState(item.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveTitle = useCallback(
    (value: string) => {
      if (value !== item.title) {
        updateChecklistItem(item.id, taskId, { title: value });
      }
    },
    [item.id, item.title, taskId, updateChecklistItem],
  );

  const { debouncedFn: debouncedSaveTitle, flush: flushTitle, cancel: cancelTitle } =
    useDebouncedCallback(saveTitle, DEBOUNCE_MS);

  // Sync local state when item changes externally
  useEffect(() => {
    setTitle(item.title);
  }, [item.title]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushTitle();
    };
  }, [flushTitle]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (value: string) => {
    setTitle(value);
    debouncedSaveTitle(value);
  };

  const handleToggle = () => {
    updateChecklistItem(item.id, taskId, { is_done: !item.is_done });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      flushTitle();
      onEnter();
    }
    if (e.key === 'Backspace' && title === '') {
      e.preventDefault();
      cancelTitle();
      onBackspaceEmpty(item.id);
    }
  };

  const handleBlur = () => {
    if (title.trim() === '') {
      cancelTitle();
      onBackspaceEmpty(item.id);
    } else {
      flushTitle();
    }
  };

  return (
    <div className="flex items-center gap-2 py-0.5 group/item">
      <button
        onClick={handleToggle}
        tabIndex={tabIndex}
        className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
      >
        {item.is_done ? (
          <CheckCircle2 className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        ) : (
          <Circle className="size-3.5 text-muted-foreground/50" strokeWidth={1.5} />
        )}
      </button>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        tabIndex={tabIndex}
        className={`flex-1 bg-transparent text-[13px] leading-snug outline-none min-w-0 ${
          item.is_done ? 'line-through text-muted-foreground/60' : 'text-foreground/80'
        }`}
      />
    </div>
  );
}

export function ChecklistList({ taskId, isExpanded }: ChecklistListProps) {
  const items = useStore((s) => s.checklistItems[taskId] ?? EMPTY_ARRAY);
  const fetchChecklistItems = useStore((s) => s.fetchChecklistItems);
  const createChecklistItem = useStore((s) => s.createChecklistItem);
  const deleteChecklistItem = useStore((s) => s.deleteChecklistItem);

  const [addingText, setAddingText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChecklistItems(taskId);
  }, [taskId, fetchChecklistItems]);

  const handleAddKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && addingText.trim()) {
      e.preventDefault();
      const text = addingText.trim();
      setAddingText('');
      await createChecklistItem({ task_id: taskId, title: text });
      // Keep focus on the add input for quick sequential entry
      addInputRef.current?.focus();
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setAddingText('');
    }
  };

  const handleEnterOnItem = async () => {
    const item = await createChecklistItem({ task_id: taskId, title: '' });
    setAutoFocusId(item.id);
  };

  const handleBackspaceEmpty = async (id: string) => {
    await deleteChecklistItem(id, taskId);
  };

  const sorted = useMemo(() => [...items].sort((a, b) => a.sort_order - b.sort_order), [items]);
  const tabIndex = isExpanded === false ? -1 : 0;

  // Don't render if no items and not adding
  if (sorted.length === 0 && !isAdding) {
    return (
      <div className="mb-3">
        <button
          onClick={() => setIsAdding(true)}
          tabIndex={tabIndex}
          className="text-[13px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
        >
          + Add checklist item
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {sorted.map((item) => (
        <ChecklistItemRow
          key={item.id}
          item={item}
          taskId={taskId}
          tabIndex={tabIndex}
          onEnter={handleEnterOnItem}
          onBackspaceEmpty={handleBackspaceEmpty}
          autoFocus={autoFocusId === item.id}
        />
      ))}
      <div className="flex items-center gap-2 py-0.5">
        <Circle className="size-3.5 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
        <input
          ref={addInputRef}
          type="text"
          value={addingText}
          onChange={(e) => setAddingText(e.target.value)}
          onKeyDown={handleAddKeyDown}
          onFocus={() => setIsAdding(true)}
          onBlur={() => {
            if (!addingText.trim()) {
              setIsAdding(false);
            }
          }}
          tabIndex={tabIndex}
          placeholder="Add checklist item"
          className="flex-1 bg-transparent text-[13px] leading-snug text-foreground/80 placeholder:text-muted-foreground/30 outline-none min-w-0"
        />
      </div>
    </div>
  );
}

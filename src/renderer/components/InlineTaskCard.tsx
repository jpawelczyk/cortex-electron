import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Circle, Calendar, Flag, Layers, Cloud, Plus } from 'lucide-react';
import type { TaskStatus } from '@shared/types';
import { useStore } from '../stores';
import { DatePickerButton, type DatePickerAction } from './DatePickerButton';

export function InlineTaskCard() {
  const createTask = useStore((s) => s.createTask);
  const cancelInlineCreate = useStore((s) => s.cancelInlineCreate);
  const createChecklistItem = useStore((s) => s.createChecklistItem);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [whenDate, setWhenDate] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus>('inbox');
  const [checklistItems, setChecklistItems] = useState<{ key: number; title: string }[]>([]);
  const [nextKey, setNextKey] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef(title);
  const notesRef = useRef(notes);
  const whenDateRef = useRef(whenDate);
  const deadlineRef = useRef(deadline);
  const statusRef = useRef(status);
  const checklistRef = useRef(checklistItems);

  titleRef.current = title;
  notesRef.current = notes;
  whenDateRef.current = whenDate;
  deadlineRef.current = deadline;
  statusRef.current = status;
  checklistRef.current = checklistItems;

  const saveAndClose = useCallback(async () => {
    const trimmed = titleRef.current.trim();
    if (trimmed) {
      const input: { title: string; notes?: string; when_date?: string; deadline?: string; status?: TaskStatus } = { title: trimmed };
      if (notesRef.current.trim()) {
        input.notes = notesRef.current.trim();
      }
      if (whenDateRef.current) {
        input.when_date = whenDateRef.current;
      }
      if (deadlineRef.current) {
        input.deadline = deadlineRef.current;
      }
      if (statusRef.current !== 'inbox') {
        input.status = statusRef.current;
      }
      const task = await createTask(input);
      for (const item of checklistRef.current) {
        if (item.title.trim()) {
          await createChecklistItem({ task_id: task.id, title: item.title.trim() });
        }
      }
    }
    cancelInlineCreate();
  }, [createTask, cancelInlineCreate, createChecklistItem]);

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
        // Don't dismiss when clicking inside a Radix popover portal
        if ((e.target as HTMLElement).closest?.('[data-radix-popper-content-wrapper]')) {
          return;
        }
        saveAndClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [saveAndClose]);

  const handleAddChecklistItem = () => {
    const key = nextKey;
    setNextKey((k) => k + 1);
    setChecklistItems((items) => [...items, { key, title: '' }]);
  };

  const handleChecklistChange = (key: number, value: string) => {
    setChecklistItems((items) =>
      items.map((item) => (item.key === key ? { ...item, title: value } : item))
    );
  };

  const handleChecklistKeyDown = (e: KeyboardEvent<HTMLInputElement>, key: number, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newKey = nextKey;
      setNextKey((k) => k + 1);
      setChecklistItems((items) => {
        const newItems = [...items];
        newItems.splice(index + 1, 0, { key: newKey, title: '' });
        return newItems;
      });
    }
    if (e.key === 'Backspace' && checklistItems[index]?.title === '') {
      e.preventDefault();
      setChecklistItems((items) => items.filter((i) => i.key !== key));
    }
  };

  const whenDateActions: DatePickerAction[] = [
    {
      label: 'Anytime',
      icon: <Layers className="size-3" />,
      onClick: () => setStatus('anytime'),
      active: status === 'anytime',
    },
    {
      label: 'Someday',
      icon: <Cloud className="size-3" />,
      onClick: () => setStatus('someday'),
      active: status === 'someday',
    },
  ];

  const whenIcon =
    status === 'anytime' ? <Layers className="size-3.5" /> :
    status === 'someday' ? <Cloud className="size-3.5" /> :
    <Calendar className="size-3.5" />;

  return (
    <div
      ref={cardRef}
      data-testid="inline-task-card"
      className="bg-card border border-border rounded-xl shadow-sm my-2 animate-card-enter"
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
        <div className="flex items-center gap-0.5 shrink-0">
          <DatePickerButton
            value={whenDate}
            onChange={setWhenDate}
            icon={whenIcon}
            label="When date"
            actions={whenDateActions}
          />
          <DatePickerButton
            value={deadline}
            onChange={setDeadline}
            icon={<Flag className="size-3.5" />}
            label="Deadline"
          />
        </div>
      </div>

      {/* Local checklist */}
      <div style={{ paddingLeft: 46 }} className="pr-4">
        {checklistItems.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2 py-0.5">
            <Circle className="size-[14px] text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
            <input
              type="text"
              value={item.title}
              onChange={(e) => handleChecklistChange(item.key, e.target.value)}
              onKeyDown={(e) => handleChecklistKeyDown(e, item.key, index)}
              placeholder="Checklist item"
              className="flex-1 bg-transparent text-[13px] text-foreground outline-none min-w-0"
              autoFocus
            />
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddChecklistItem}
          className="flex items-center gap-2 py-1 text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
        >
          <Plus className="size-[14px]" />
          Add checklist item
        </button>
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

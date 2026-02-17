import { useState, useEffect, useRef, useCallback } from 'react';
import { Circle, CheckCircle2, Calendar, Flag } from 'lucide-react';
import type { Task } from '@shared/types';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

const DEBOUNCE_MS = 500;

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'text-red-500',
  P1: 'text-orange-500',
  P2: 'text-yellow-500',
  P3: 'text-blue-500',
};

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  isExpanded?: boolean;
}

export function TaskItem({ task, onComplete, onSelect, isSelected, isExpanded }: TaskItemProps) {
  const updateTask = useStore((s) => s.updateTask);
  const deselectTask = useStore((s) => s.deselectTask);

  const isCompleted = task.status === 'logbook';
  const cardRef = useRef<HTMLDivElement>(null);

  // Local state for debounced fields
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const taskIdRef = useRef(task.id);

  const saveTitle = useCallback(
    (value: string) => {
      if (value !== task.title) {
        updateTask(taskIdRef.current, { title: value });
      }
    },
    [task.title, updateTask],
  );

  const saveNotes = useCallback(
    (value: string) => {
      const oldNotes = task.notes ?? '';
      if (value !== oldNotes) {
        updateTask(taskIdRef.current, { notes: value });
      }
    },
    [task.notes, updateTask],
  );

  const {
    debouncedFn: debouncedSaveTitle,
    flush: flushTitle,
  } = useDebouncedCallback(saveTitle, DEBOUNCE_MS);

  const {
    debouncedFn: debouncedSaveNotes,
    flush: flushNotes,
  } = useDebouncedCallback(saveNotes, DEBOUNCE_MS);

  // Sync local state when task prop changes
  useEffect(() => {
    if (taskIdRef.current !== task.id) {
      flushTitle();
      flushNotes();
      taskIdRef.current = task.id;
    }
    setTitle(task.title);
    setNotes(task.notes ?? '');
  }, [task.id, task.title, task.notes, flushTitle, flushNotes]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      flushTitle();
      flushNotes();
    };
  }, [flushTitle, flushNotes]);

  // Click-outside handler
  useEffect(() => {
    if (!isExpanded) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        flushTitle();
        flushNotes();
        deselectTask();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isExpanded, flushTitle, flushNotes, deselectTask]);

  // Escape key handler
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        flushTitle();
        flushNotes();
        deselectTask();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, flushTitle, flushNotes, deselectTask]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSaveTitle(value);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    debouncedSaveNotes(value);
  };

  const handleWhenDateChange = (value: string) => {
    updateTask(task.id, { when_date: value || null });
  };

  const handleDeadlineChange = (value: string) => {
    updateTask(task.id, { deadline: value || null });
  };

  const handleRowClick = () => {
    if (!isExpanded) {
      onSelect?.(task.id);
    }
  };

  return (
    <div
      ref={cardRef}
      data-testid="task-item"
      onClick={handleRowClick}
      className={
        isExpanded
          ? 'bg-card border border-border rounded-xl shadow-sm my-2 p-2 cursor-default'
          : `group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-100 cursor-default ${
              isSelected ? 'bg-accent' : 'hover:bg-accent/40'
            }`
      }
    >
      {/* Title row */}
      <div className={isExpanded ? 'flex items-center gap-3 px-4 pt-3 pb-2' : 'contents'}>
        <button
          role="checkbox"
          aria-checked={isCompleted}
          onClick={(e) => {
            e.stopPropagation();
            onComplete(task.id);
          }}
          className="shrink-0 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          {isCompleted ? (
            <CheckCircle2 className="size-[18px] text-primary" strokeWidth={1.5} />
          ) : (
            <Circle
              className={`size-[18px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-100 ${
                task.priority ? PRIORITY_COLORS[task.priority] : ''
              }`}
              strokeWidth={1.5}
            />
          )}
        </button>

        {isExpanded ? (
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 bg-transparent text-[13px] leading-snug text-foreground font-medium outline-none min-w-0"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 text-[13px] leading-snug truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
          >
            {task.title}
          </span>
        )}

        {!isExpanded && task.priority && !isCompleted && (
          <span
            data-testid="priority-indicator"
            className={`text-[10px] font-medium tracking-wide ${PRIORITY_COLORS[task.priority]}`}
          >
            {task.priority}
          </span>
        )}

        {!isExpanded && task.when_date && (
          <span data-testid="when-date" className="text-[11px] text-primary/70 shrink-0">
            {formatDate(task.when_date)}
          </span>
        )}

        {!isExpanded && task.deadline && (
          <span data-testid="deadline-badge" className="text-[11px] text-muted-foreground shrink-0">
            {formatDate(task.deadline)}
          </span>
        )}
      </div>

      {/* Expandable section — always in DOM for CSS grid height animation */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pr-4 pt-1 pb-2" style={{ paddingLeft: 46 }}>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Notes"
              rows={1}
              tabIndex={isExpanded ? 0 : -1}
              className="w-full bg-transparent text-[13px] text-foreground/80 placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 px-2 pb-2">
            <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent/60 transition-colors cursor-pointer">
              <Calendar className="size-3.5" />
              <input
                type="date"
                aria-label="When date"
                value={task.when_date ?? ''}
                onChange={(e) => handleWhenDateChange(e.target.value)}
                tabIndex={isExpanded ? 0 : -1}
                className="sr-only"
              />
              <span>{task.when_date ? formatDate(task.when_date) : 'When'}</span>
            </label>

            <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent/60 transition-colors cursor-pointer">
              <Flag className="size-3.5" />
              <input
                type="date"
                aria-label="Deadline"
                value={task.deadline ?? ''}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                tabIndex={isExpanded ? 0 : -1}
                className="sr-only"
              />
              <span>{task.deadline ? formatDate(task.deadline) : 'Deadline'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

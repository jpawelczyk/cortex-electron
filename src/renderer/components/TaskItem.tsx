import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Circle, CheckCircle2, Calendar, Flag, Trash2, Check, X, Cloud, Layers } from 'lucide-react';
import type { Task } from '@shared/types';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { DatePickerButton, type DatePickerAction } from './DatePickerButton';
import { ChecklistList } from './ChecklistList';
import { cn } from '../lib/utils';

const DEBOUNCE_MS = 500;

function getDeadlineUrgency(deadline: string | null): string | undefined {
  if (!deadline) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline + 'T00:00:00');
  const diffDays = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'text-red-500 border-red-500/30 hover:bg-red-500/10';
  if (diffDays === 0) return 'text-red-500 hover:bg-red-500/10';
  if (diffDays === 1) return 'text-orange-500';
  return undefined;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'text-red-500',
  P1: 'text-orange-500',
  P2: 'text-yellow-500',
  P3: 'text-blue-500',
};

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  isExpanded?: boolean;
  isCompleted?: boolean;
}

export function TaskItem({ task, onComplete, onSelect, isSelected, isExpanded, isCompleted: isCompletedProp }: TaskItemProps) {
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const deselectTask = useStore((s) => s.deselectTask);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isCompleted = isCompletedProp ?? (task.status === 'logbook');
  const cardRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

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

  const autoResizeNotes = useCallback(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Auto-resize notes textarea when content or expansion changes
  useEffect(() => {
    if (isExpanded) autoResizeNotes();
  }, [isExpanded, notes, autoResizeNotes]);

  const handleDelete = useCallback(() => {
    flushTitle();
    flushNotes();
    deleteTask(task.id);
  }, [flushTitle, flushNotes, deleteTask, task.id]);

  // Click-outside handler
  useEffect(() => {
    if (!isExpanded) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        flushTitle();
        flushNotes();
        // If clicking another task, let its handler set the new selection
        // directly (avoids a layout shift that would swallow the click event)
        const clickedTask = (e.target as Element).closest?.('[data-testid="task-item"]');
        if (!clickedTask) {
          deselectTask();
        }
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isExpanded, flushTitle, flushNotes, deselectTask]);

  // Keyboard shortcuts for expanded card
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        flushTitle();
        flushNotes();
        deselectTask();
      }
      if (e.key === 'Backspace' && e.metaKey) {
        e.preventDefault();
        handleDelete();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, flushTitle, flushNotes, deselectTask, handleDelete]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSaveTitle(value);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    debouncedSaveNotes(value);
  };

  const handleWhenDateChange = (value: string | null) => {
    updateTask(task.id, { when_date: value });
  };

  const handleDeadlineChange = (value: string | null) => {
    updateTask(task.id, { deadline: value });
  };

  const whenDateActions: DatePickerAction[] = useMemo(() => [
    {
      label: 'Anytime',
      icon: <Layers className="size-3" />,
      onClick: () => updateTask(task.id, { status: 'anytime' }),
      active: task.status === 'anytime',
    },
    {
      label: 'Someday',
      icon: <Cloud className="size-3" />,
      onClick: () => updateTask(task.id, { status: 'someday' }),
      active: task.status === 'someday',
    },
  ], [task.id, updateTask]);

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
      className={cn(
        'rounded-xl cursor-default border',
        'transition-[background-color,border-color,box-shadow] duration-200 ease-out',
        isExpanded
          ? 'bg-card border-border shadow-sm my-2'
          : cn(
              'group border-transparent',
              isSelected ? 'bg-accent' : 'hover:bg-accent/40',
            ),
      )}
    >
      {/* Title row */}
      <div className="flex items-center gap-3 px-4 pt-2.5 pb-1.5">
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
            className={`flex-1 text-[13px] leading-snug truncate transition-[color,text-decoration-line,text-decoration-color] duration-300 ${isCompleted ? 'line-through text-muted-foreground decoration-muted-foreground' : 'text-foreground'}`}
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

        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span data-testid="when-date">
            <DatePickerButton
              value={task.when_date}
              onChange={handleWhenDateChange}
              icon={task.status === 'anytime' ? <Layers className="size-3.5" /> : task.status === 'someday' ? <Cloud className="size-3.5" /> : <Calendar className="size-3.5" />}
              label="When date"
              actions={whenDateActions}
            />
          </span>
          <span data-testid="deadline-badge">
            <DatePickerButton
              value={task.deadline}
              onChange={handleDeadlineChange}
              icon={<Flag className="size-3.5" />}
              label="Deadline"
              className={getDeadlineUrgency(task.deadline)}
            />
          </span>
        </div>
      </div>

      {/* Expandable section — always in DOM for CSS grid height animation */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="pr-4" style={{ paddingLeft: 46 }}>
            <ChecklistList taskId={task.id} isExpanded={isExpanded} />
            <div className="flex items-end gap-1 pb-3.5">
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Notes"
                rows={1}
                tabIndex={isExpanded ? 0 : -1}
                className="flex-1 bg-transparent text-[13px] text-foreground/80 placeholder:text-muted-foreground/40 outline-none resize-none leading-snug overflow-hidden min-w-0"
              />
              {confirmingDelete ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 shrink-0">
                  <span className="text-sm text-muted-foreground mr-1">Confirm?</span>
                  <button
                    aria-label="Confirm delete task"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                      setConfirmingDelete(false);
                    }}
                    className="p-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    aria-label="Cancel delete task"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingDelete(false);
                    }}
                    className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  aria-label="Delete task"
                  tabIndex={isExpanded ? 0 : -1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDelete(true);
                  }}
                  className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

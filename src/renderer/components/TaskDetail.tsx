import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import type { Task, TaskStatus } from '@shared/types';
import { useStore } from '../stores';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

const DEBOUNCE_MS = 500;

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'anytime', label: 'Anytime' },
  { value: 'someday', label: 'Someday' },
];

interface TaskDetailProps {
  task: Task;
}

export function TaskDetail({ task }: TaskDetailProps) {
  const updateTask = useStore((s) => s.updateTask);
  const deselectTask = useStore((s) => s.deselectTask);

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
    cancel: cancelTitle,
  } = useDebouncedCallback(saveTitle, DEBOUNCE_MS);

  const {
    debouncedFn: debouncedSaveNotes,
    flush: flushNotes,
    cancel: cancelNotes,
  } = useDebouncedCallback(saveNotes, DEBOUNCE_MS);

  // Reset local state when task changes; flush pending saves first
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

  const handleTitleChange = (value: string) => {
    setTitle(value);
    debouncedSaveTitle(value);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    debouncedSaveNotes(value);
  };

  const handleStatusChange = (value: string) => {
    updateTask(task.id, { status: value as TaskStatus });
  };

  const handleDeadlineChange = (value: string) => {
    updateTask(task.id, { deadline: value || null });
  };

  return (
    <div className="w-80 border-l border-border bg-card/50 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Details
        </h3>
        <button
          onClick={deselectTask}
          aria-label="Close"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label htmlFor="task-title" className="sr-only">Title</label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-transparent text-foreground text-sm font-medium px-2 py-1.5 rounded-md border border-transparent focus:border-border focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="task-notes" className="text-xs font-medium text-muted-foreground mb-1 block">
            Notes
          </label>
          <textarea
            id="task-notes"
            aria-label="Notes"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            rows={4}
            className="w-full bg-transparent text-foreground text-sm px-2 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Add notes..."
          />
        </div>

        <div>
          <label htmlFor="task-status" className="text-xs font-medium text-muted-foreground mb-1 block">
            Status
          </label>
          <select
            id="task-status"
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full bg-secondary text-foreground text-sm px-2 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-deadline" className="text-xs font-medium text-muted-foreground mb-1 block">
            Deadline
          </label>
          <input
            id="task-deadline"
            type="date"
            value={task.deadline ?? ''}
            onChange={(e) => handleDeadlineChange(e.target.value)}
            className="w-full bg-secondary text-foreground text-sm px-2 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

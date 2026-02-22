import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Inbox, AlertTriangle } from 'lucide-react';
import type { Task } from '@shared/types';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const SORT_DELAY_MS = 400;

function isCompletedToday(task: Task): boolean {
  if (!task.completed_at) return false;
  const completed = new Date(task.completed_at);
  const now = new Date();
  return (
    completed.getFullYear() === now.getFullYear() &&
    completed.getMonth() === now.getMonth() &&
    completed.getDate() === now.getDate()
  );
}

export function InboxView() {
  const tasks = useStore((s) => s.tasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const isInlineCreating = useStore((s) => s.isInlineCreating);

  // Toggle signal: which tasks are currently completed from the UI's perspective.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // Ordered settled list: newly settled tasks are prepended so they stay at
  // their current visual position (top of the settled section) and don't cause
  // a reorder of already-settled tasks.
  const [settledIds, setSettledIds] = useState<string[]>([]);
  // Filter signal: keeps logbook tasks visible during the async IPC window
  // after uncomplete (when completedIds no longer has the id but the store
  // hasn't updated to inbox yet).
  const everCompletedIds = useRef(new Set<string>());
  // Tracks all tasks whose checkbox was toggled in this session, so we can
  // distinguish "not interacted with" (defer to store) from "explicitly
  // unchecked" (override store).
  const interactedIds = useRef(new Set<string>());
  const sortTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = sortTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const today = getToday();

  const overdueTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        t.deadline &&
        t.deadline < today &&
        !['logbook', 'cancelled', 'someday'].includes(t.status) &&
        !t.deleted_at &&
        !t.completed_at,
    );
  }, [tasks, today]);

  const inboxTasks = useMemo(() => {
    const visible = tasks.filter(
      (t) =>
        (t.status === 'inbox' && !t.when_date) ||
        (t.status === 'logbook' &&
          (isCompletedToday(t) || everCompletedIds.current.has(t.id))),
    );
    return visible.sort((a, b) => {
      const aIdx = settledIds.indexOf(a.id);
      const bIdx = settledIds.indexOf(b.id);
      // A task is "settled" (sorted to bottom) if:
      // - It passed the sort delay after in-session completion, OR
      // - It's a logbook task loaded from the store (not completed in this session)
      const aSettled = aIdx >= 0 || (a.status === 'logbook' && !completedIds.has(a.id)) ? 1 : 0;
      const bSettled = bIdx >= 0 || (b.status === 'logbook' && !completedIds.has(b.id)) ? 1 : 0;
      if (aSettled !== bSettled) return aSettled - bSettled;
      if (aSettled && bSettled && aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      return 0;
    });
  }, [tasks, completedIds, settledIds]);

  // Merge session-level completedIds with store-loaded logbook tasks completed
  // today. Tasks not interacted with in this session inherit their visual state
  // from the store (status === 'logbook' → checked).
  const effectiveCompletedIds = useMemo(() => {
    const effective = new Set(completedIds);
    for (const t of tasks) {
      if (t.status === 'logbook' && isCompletedToday(t) && !interactedIds.current.has(t.id)) {
        effective.add(t.id);
      }
    }
    return effective;
  }, [tasks, completedIds]);

  const handleComplete = useCallback(
    (id: string) => {
      interactedIds.current.add(id);
      const task = tasks.find((t) => t.id === id);
      const isAlreadyDone = completedIds.has(id) || task?.status === 'logbook';

      if (isAlreadyDone) {
        // Uncomplete: restore to inbox
        updateTask(id, { status: 'inbox' });
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        const existing = sortTimers.current.get(id);
        if (existing) {
          clearTimeout(existing);
          sortTimers.current.delete(id);
        }
        setSettledIds((prev) => prev.filter((x) => x !== id));
      } else {
        // Complete
        updateTask(id, { status: 'logbook' });
        setCompletedIds((prev) => new Set(prev).add(id));
        everCompletedIds.current.add(id);
        const timer = setTimeout(() => {
          setSettledIds((prev) => [id, ...prev]);
          sortTimers.current.delete(id);
        }, SORT_DELAY_MS);
        sortTimers.current.set(id, timer);
      }
    },
    [tasks, completedIds, updateTask],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold text-foreground">Inbox</h2>
        </div>

        {overdueTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-red-500" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-red-500">Overdue</h3>
            </div>
            <TaskList
              tasks={overdueTasks}
              onCompleteTask={handleComplete}
              onSelectTask={selectTask}
              selectedTaskId={selectedTaskId}
              completedIds={effectiveCompletedIds}
            />
            {inboxTasks.length > 0 && (
              <div className="mt-6 mb-3">
                <h3 className="text-sm font-medium text-muted-foreground">Inbox</h3>
              </div>
            )}
          </>
        )}

        {isInlineCreating && <InlineTaskCard />}

        {!isInlineCreating && inboxTasks.length === 0 && overdueTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No tasks in your inbox</p>
          </div>
        ) : inboxTasks.length > 0 ? (
          <TaskList
            tasks={inboxTasks}
            onCompleteTask={handleComplete}
            onSelectTask={selectTask}
            selectedTaskId={selectedTaskId}
            completedIds={effectiveCompletedIds}
          />
        ) : null}
      </div>
    </div>
  );
}

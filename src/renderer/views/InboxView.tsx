import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Inbox, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';
import { filterTasksByContext } from '../lib/contextFilter';

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

const DISMISS_DELAY_MS = 2500;

export function InboxView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const isInlineCreating = useStore((s) => s.isInlineCreating);

  // Toggle signal: which tasks are currently completed from the UI's perspective.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Filter signal: keeps logbook tasks visible during the async IPC window
  // after uncomplete (when completedIds no longer has the id but the store
  // hasn't updated to inbox yet).
  const everCompletedIds = useRef(new Set<string>());
  // Tracks all tasks whose checkbox was toggled in this session, so we can
  // distinguish "not interacted with" (defer to store) from "explicitly
  // unchecked" (override store).
  const interactedIds = useRef(new Set<string>());
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const completedIdsRef = useRef(completedIds);
  completedIdsRef.current = completedIds;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    const timers = dismissTimers.current;
    const everCompleted = everCompletedIds.current;
    return () => {
      timers.forEach(clearTimeout);
      everCompleted.clear();
    };
  }, []);

  // Reconcile completedIds when tasks change externally (sync/agent completions).
  // Only removes tasks from completedIds if they've been externally un-completed
  // and the user hasn't interacted with them this session.
  // Adding to completedIds is handled by effectiveCompletedIds for display and
  // handleComplete for in-session completions.
  useEffect(() => {
    setCompletedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const task of tasks) {
        if (interactedIds.current.has(task.id)) continue;
        if (task.status !== 'logbook' && next.has(task.id)) {
          next.delete(task.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  const today = getToday();

  const overdueTasks = useMemo(() => {
    const overdue = tasks.filter(
      (t) =>
        t.deadline &&
        t.deadline < today &&
        !['logbook', 'cancelled', 'someday'].includes(t.status) &&
        !t.deleted_at &&
        !t.completed_at,
    );
    return filterTasksByContext(overdue, activeContextIds, projects);
  }, [tasks, today, activeContextIds, projects]);

  const inboxTasks = useMemo(() => {
    const visible = tasks.filter((t) => {
      if (dismissedIds.has(t.id)) return false;
      if (t.status === 'inbox' && !t.when_date) return true;
      if (t.status === 'logbook' && everCompletedIds.current.has(t.id)) return true;
      return false;
    });
    return filterTasksByContext(visible, activeContextIds, projects);
  }, [tasks, dismissedIds, activeContextIds, projects]);

  const handleComplete = useCallback(
    (id: string) => {
      interactedIds.current.add(id);
      const task = tasksRef.current.find((t) => t.id === id);
      const isAlreadyDone = completedIdsRef.current.has(id) || task?.status === 'logbook';

      if (isAlreadyDone) {
        // Uncomplete: restore to inbox
        updateTask(id, { status: 'inbox' });
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        const existing = dismissTimers.current.get(id);
        if (existing) {
          clearTimeout(existing);
          dismissTimers.current.delete(id);
        }
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        // Complete
        updateTask(id, { status: 'logbook' });
        setCompletedIds((prev) => new Set(prev).add(id));
        if (everCompletedIds.current.size >= 200) {
          const [oldest] = everCompletedIds.current;
          everCompletedIds.current.delete(oldest);
        }
        everCompletedIds.current.add(id);
        const timer = setTimeout(() => {
          setDismissedIds((prev) => new Set(prev).add(id));
          dismissTimers.current.delete(id);
        }, DISMISS_DELAY_MS);
        dismissTimers.current.set(id, timer);
      }
    },
    [updateTask],
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
              completedIds={completedIds}
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
            completedIds={completedIds}
          />
        ) : null}
      </div>
    </div>
  );
}

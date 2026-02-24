import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sun } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';
import { filterTasksByContext } from '../lib/contextFilter';

const DISMISS_DELAY_MS = 2500;
// Only animate logbook tasks completed within this window (handles sync/agent completions).
// Historical logbook tasks older than this are ignored to prevent them flashing in the UI.
const EXTERNAL_COMPLETION_THRESHOLD_MS = 5 * 60 * 1000;

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function TodayView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const isInlineCreating = useStore((s) => s.isInlineCreating);

  const today = getToday();

  // Toggle signal: which tasks are currently completed from the UI's perspective.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Filter signal: keeps logbook tasks visible during the async IPC window
  // after uncomplete (when completedIds no longer has the id but the store
  // hasn't updated to today yet).
  const everCompletedIds = useRef(new Set<string>());
  // Tracks tasks the user has directly clicked so external updates don't
  // override their local intent.
  const interactedIds = useRef(new Set<string>());
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const completedIdsRef = useRef(completedIds);
  completedIdsRef.current = completedIds;

  useEffect(() => {
    const timers = dismissTimers.current;
    const everCompleted = everCompletedIds.current;
    return () => {
      timers.forEach(clearTimeout);
      everCompleted.clear();
    };
  }, []);

  // Reconcile completedIds with actual task statuses for tasks the user hasn't
  // interacted with this session (handles external completions from sync/agents).
  useEffect(() => {
    const now = Date.now();
    setCompletedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const task of tasks) {
        if (interactedIds.current.has(task.id)) continue;
        if (task.status === 'logbook' && !next.has(task.id)) {
          // Skip historical logbook tasks — only animate recent external completions
          if (task.completed_at) {
            const age = now - new Date(task.completed_at).getTime();
            if (age > EXTERNAL_COMPLETION_THRESHOLD_MS) continue;
          }
          next.add(task.id);
          if (everCompletedIds.current.size >= 200) {
            const [oldest] = everCompletedIds.current;
            everCompletedIds.current.delete(oldest);
          }
          everCompletedIds.current.add(task.id);
          // Start dismiss timer for externally-completed task
          if (!dismissTimers.current.has(task.id)) {
            const timer = setTimeout(() => {
              setDismissedIds((p) => new Set(p).add(task.id));
              dismissTimers.current.delete(task.id);
            }, DISMISS_DELAY_MS);
            dismissTimers.current.set(task.id, timer);
          }
          changed = true;
        } else if (task.status !== 'logbook' && next.has(task.id)) {
          next.delete(task.id);
          // Clear dismiss state for externally un-completed task
          const existing = dismissTimers.current.get(task.id);
          if (existing) {
            clearTimeout(existing);
            dismissTimers.current.delete(task.id);
          }
          setDismissedIds((p) => {
            const n = new Set(p);
            n.delete(task.id);
            return n;
          });
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tasks]);

  const todayTasks = useMemo(() => {
    const visible = tasks.filter((t) => {
      if (dismissedIds.has(t.id)) return false;
      if (t.status === 'logbook' && everCompletedIds.current.has(t.id)) return true;
      if (t.status === 'logbook' || t.status === 'cancelled') return false;
      // Exclude overdue-by-deadline tasks — those belong in Inbox
      if (t.deadline && t.deadline < today) return false;
      return t.status === 'today' || t.when_date === today;
    });
    return filterTasksByContext(visible, activeContextIds, projects);
  }, [tasks, today, dismissedIds, activeContextIds, projects]);

  const handleComplete = useCallback(
    (id: string) => {
      interactedIds.current.add(id);
      if (completedIdsRef.current.has(id)) {
        // Uncomplete: restore to today
        updateTask(id, { status: 'today' });
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
          <h2 className="text-xl font-semibold text-foreground">Today</h2>
        </div>

        {isInlineCreating && <InlineTaskCard />}

        {todayTasks.length === 0 && !isInlineCreating ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Sun className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">Nothing scheduled for today</p>
          </div>
        ) : (
          <TaskList
            tasks={todayTasks}
            onCompleteTask={handleComplete}
            onSelectTask={selectTask}
            selectedTaskId={selectedTaskId}
            completedIds={completedIds}
          />
        )}
      </div>
    </div>
  );
}

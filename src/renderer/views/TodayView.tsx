import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sun } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { filterTasksByContext } from '../lib/contextFilter';
import { useLiveQuery } from '../hooks/useLiveQuery';

const SORT_DELAY_MS = 400;

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TodayView() {
  const { data: tasks } = useLiveQuery(() => window.cortex.tasks.list(), ['tasks']);
  const { data: projects } = useLiveQuery(() => window.cortex.projects.list(), ['projects']);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);

  const today = getToday();

  // Toggle signal: which tasks are currently completed from the UI's perspective.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // Ordered settled list: newly settled tasks are prepended so they stay at
  // their current visual position (top of the settled section) and don't cause
  // a reorder of already-settled tasks.
  const [settledIds, setSettledIds] = useState<string[]>([]);
  // Filter signal: keeps logbook tasks visible during the async IPC window
  // after uncomplete (when completedIds no longer has the id but the store
  // hasn't updated to today yet).
  const everCompletedIds = useRef(new Set<string>());
  const sortTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = sortTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const todayTasks = useMemo(() => {
    const visible = tasks.filter((t) => {
      if (t.status === 'logbook' && everCompletedIds.current.has(t.id)) return true;
      if (t.status === 'logbook' || t.status === 'cancelled') return false;
      // Exclude overdue-by-deadline tasks — those belong in Inbox
      if (t.deadline && t.deadline < today) return false;
      return t.status === 'today' || t.when_date === today;
    });
    const filtered = filterTasksByContext(visible, activeContextIds, projects);
    return filtered.sort((a, b) => {
      const aIdx = settledIds.indexOf(a.id);
      const bIdx = settledIds.indexOf(b.id);
      const aSettled = aIdx >= 0 ? 1 : 0;
      const bSettled = bIdx >= 0 ? 1 : 0;
      if (aSettled !== bSettled) return aSettled - bSettled;
      if (aSettled && bSettled) return aIdx - bIdx;
      return 0;
    });
  }, [tasks, today, settledIds, activeContextIds, projects]);

  const handleComplete = useCallback(
    (id: string) => {
      if (completedIds.has(id)) {
        // Uncomplete: restore to today
        updateTask(id, { status: 'today' });
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
    [completedIds, updateTask],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold text-foreground">Today</h2>
        </div>

        {todayTasks.length === 0 ? (
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

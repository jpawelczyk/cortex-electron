import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { filterTasksByContext } from '../lib/contextFilter';

const SORT_DELAY_MS = 400;

export function StaleView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [settledIds, setSettledIds] = useState<string[]>([]);
  const everCompletedIds = useRef(new Set<string>());
  const sortTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = sortTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const staleTasks = useMemo(() => {
    const visible = tasks.filter((t) => {
      if (t.status === 'logbook' && everCompletedIds.current.has(t.id)) return true;
      if (t.status === 'stale') return true;
      return false;
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
  }, [tasks, settledIds, activeContextIds, projects]);

  const handleComplete = useCallback(
    (id: string) => {
      if (completedIds.has(id)) {
        // Uncomplete: restore to stale
        updateTask(id, { status: 'stale' });
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
          <h2 className="text-xl font-semibold text-foreground">Stale</h2>
        </div>

        {staleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Clock className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No stale tasks — you're on track</p>
          </div>
        ) : (
          <TaskList
            tasks={staleTasks}
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

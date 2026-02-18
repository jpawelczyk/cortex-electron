import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sun } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';

const SORT_DELAY_MS = 400;

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TodayView() {
  const tasks = useStore((s) => s.tasks);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);

  const today = getToday();

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const sortTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    return () => sortTimers.current.forEach(clearTimeout);
  }, []);

  const todayTasks = useMemo(() => {
    const visible = tasks.filter((t) => {
      if (t.status === 'logbook' && completedIds.has(t.id)) return true;
      if (t.status === 'logbook' || t.status === 'cancelled') return false;
      return t.status === 'today' || t.when_date === today;
    });
    return visible.sort((a, b) => {
      const aSettled = settledIds.has(a.id) ? 1 : 0;
      const bSettled = settledIds.has(b.id) ? 1 : 0;
      return aSettled - bSettled;
    });
  }, [tasks, today, completedIds, settledIds]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleComplete = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      if (task.status === 'logbook') {
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
        setSettledIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        // Complete
        updateTask(id, { status: 'logbook' });
        setCompletedIds((prev) => new Set(prev).add(id));
        const timer = setTimeout(() => {
          setSettledIds((prev) => new Set(prev).add(id));
          sortTimers.current.delete(id);
        }, SORT_DELAY_MS);
        sortTimers.current.set(id, timer);
      }
    },
    [tasks, updateTask],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Today</h2>

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
          />
        )}
      </div>
    </div>
  );
}

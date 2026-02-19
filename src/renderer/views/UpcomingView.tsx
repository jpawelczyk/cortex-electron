import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import type { Task } from '@shared/types';

const SORT_DELAY_MS = 400;

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatUpcomingDate(dateStr: string): string {
  const today = new Date();
  const target = new Date(dateStr + 'T00:00:00');

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays >= 2 && diffDays <= 6) {
    return target.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return target.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function dateKeyForGrouping(whenDate: string): string {
  const today = getToday();
  if (whenDate <= today) return today;
  return whenDate;
}

interface DateGroup {
  label: string;
  key: string;
  tasks: Task[];
}

export function UpcomingView() {
  const tasks = useStore((s) => s.tasks);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [settledIds, setSettledIds] = useState<string[]>([]);
  const everCompletedIds = useRef(new Set<string>());
  const sortTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    return () => sortTimers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === 'logbook' && everCompletedIds.current.has(t.id)) return true;
      if (t.status === 'upcoming') return true;
      return false;
    });
  }, [tasks, completedIds]); // completedIds included as recalc trigger

  const groupedTasks = useMemo(() => {
    const groups: DateGroup[] = [];
    const seen = new Map<string, number>();

    // Sort tasks by when_date ascending first
    const sorted = [...upcomingTasks].sort((a, b) => {
      const aKey = a.when_date ? dateKeyForGrouping(a.when_date) : '9999-99-99';
      const bKey = b.when_date ? dateKeyForGrouping(b.when_date) : '9999-99-99';
      return aKey.localeCompare(bKey);
    });

    for (const task of sorted) {
      const key = task.when_date ? dateKeyForGrouping(task.when_date) : '9999-99-99';
      const idx = seen.get(key);
      if (idx !== undefined) {
        groups[idx].tasks.push(task);
      } else {
        seen.set(key, groups.length);
        groups.push({
          key,
          label: task.when_date ? formatUpcomingDate(task.when_date) : 'No Date',
          tasks: [task],
        });
      }
    }

    // Sort settled tasks to bottom within each group
    for (const group of groups) {
      group.tasks.sort((a, b) => {
        const aIdx = settledIds.indexOf(a.id);
        const bIdx = settledIds.indexOf(b.id);
        const aSettled = aIdx >= 0 ? 1 : 0;
        const bSettled = bIdx >= 0 ? 1 : 0;
        if (aSettled !== bSettled) return aSettled - bSettled;
        if (aSettled && bSettled) return aIdx - bIdx;
        return 0;
      });
    }

    return groups;
  }, [upcomingTasks, settledIds]);

  const handleComplete = useCallback(
    (id: string) => {
      if (completedIds.has(id)) {
        // Uncomplete: restore to upcoming
        updateTask(id, { status: 'upcoming' });
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
          <h2 className="text-xl font-semibold text-foreground">Upcoming</h2>
        </div>

        {groupedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Calendar className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">Nothing upcoming</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedTasks.map((group) => (
              <div key={group.key} data-testid="upcoming-date-group">
                <TaskList
                  title={group.label}
                  tasks={group.tasks}
                  onCompleteTask={handleComplete}
                  onSelectTask={selectTask}
                  selectedTaskId={selectedTaskId}
                  completedIds={completedIds}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

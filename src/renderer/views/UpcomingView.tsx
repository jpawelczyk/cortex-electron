import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';
import { filterTasksByContext } from '../lib/contextFilter';
import type { Task } from '@shared/types';

const DISMISS_DELAY_MS = 2500;

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatUpcomingDate(dateStr: string): string {
  const today = new Date();
  const target = parseISO(dateStr);
  const diffDays = differenceInCalendarDays(target, today);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays >= 2 && diffDays <= 6) {
    return format(target, 'EEEE');
  }
  return format(target, 'MMMM d, yyyy');
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
  const projects = useStore((s) => s.projects);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const isInlineCreating = useStore((s) => s.isInlineCreating);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const everCompletedIds = useRef(new Set<string>());
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const completedIdsRef = useRef(completedIds);
  completedIdsRef.current = completedIds;

  useEffect(() => {
    const timers = dismissTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const upcomingTasks = useMemo(() => {
    const today = getToday();
    const visible = tasks.filter((t) => {
      if (dismissedIds.has(t.id)) return false;
      if (t.status === 'logbook' && everCompletedIds.current.has(t.id)) return true;
      if (t.status === 'upcoming') {
        // Tasks whose when_date has arrived belong in Today view
        if (t.when_date && t.when_date <= today) return false;
        return true;
      }
      return false;
    });
    return filterTasksByContext(visible, activeContextIds, projects);
  }, [tasks, dismissedIds, activeContextIds, projects]);

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

    return groups;
  }, [upcomingTasks]);

  const handleComplete = useCallback(
    (id: string) => {
      if (completedIdsRef.current.has(id)) {
        // Uncomplete: restore to upcoming
        updateTask(id, { status: 'upcoming' });
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
          <h2 className="text-xl font-semibold text-foreground">Upcoming</h2>
        </div>

        {isInlineCreating && <InlineTaskCard />}

        {groupedTasks.length === 0 && !isInlineCreating ? (
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

import { useEffect, useMemo, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { filterTasksByContext } from '../lib/contextFilter';
import { sortByPriority } from '../lib/prioritySort';
import type { Task } from '@shared/types';

function formatCompletionDate(iso: string): string {
  const date = parseISO(iso);
  const diffDays = differenceInCalendarDays(new Date(), date);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return format(date, 'MMMM d, yyyy');
}

function dateKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd');
}

interface DateGroup {
  label: string;
  key: string;
  tasks: Task[];
}

export function LogbookView() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const logbookTasks = useMemo(() => {
    const visible = tasks.filter((t) => t.status === 'logbook' && t.completed_at);
    const filtered = filterTasksByContext(visible, activeContextIds, projects);
    return filtered.sort(
      (a, b) =>
        parseISO(b.completed_at!).getTime() -
        parseISO(a.completed_at!).getTime(),
    );
  }, [tasks, activeContextIds, projects]);

  const groupedTasks = useMemo(() => {
    const groups: DateGroup[] = [];
    const seen = new Map<string, number>();

    for (const task of logbookTasks) {
      const key = dateKey(task.completed_at!);
      const idx = seen.get(key);
      if (idx !== undefined) {
        groups[idx].tasks.push(task);
      } else {
        seen.set(key, groups.length);
        groups.push({
          key,
          label: formatCompletionDate(task.completed_at!),
          tasks: [task],
        });
      }
    }

    return groups.map((g) => ({ ...g, tasks: sortByPriority(g.tasks) }));
  }, [logbookTasks]);

  const allCompletedIds = useMemo(
    () => new Set(logbookTasks.map((t) => t.id)),
    [logbookTasks],
  );

  const handleUncomplete = useCallback(
    (id: string) => {
      updateTask(id, { status: 'inbox' });
    },
    [updateTask],
  );

  const count = logbookTasks.length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-semibold text-foreground">Logbook</h2>
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No completed tasks</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedTasks.map((group) => (
              <div key={group.key} data-testid="logbook-date-group">
                <TaskList
                  title={group.label}
                  tasks={group.tasks}
                  onCompleteTask={handleUncomplete}
                  onSelectTask={selectTask}
                  selectedTaskId={selectedTaskId}
                  completedIds={allCompletedIds}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

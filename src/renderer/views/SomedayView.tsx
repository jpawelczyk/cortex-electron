import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Cloud } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';
import { filterTasksByContext } from '../lib/contextFilter';

const DISMISS_DELAY_MS = 2500;

export function SomedayView() {
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

  const somedayTasks = useMemo(() => {
    const visible = tasks.filter((t) => {
      if (dismissedIds.has(t.id)) return false;
      if (t.status === 'logbook' && everCompletedIds.current.has(t.id)) return true;
      if (t.status === 'someday') return true;
      return false;
    });
    return filterTasksByContext(visible, activeContextIds, projects);
  }, [tasks, dismissedIds, activeContextIds, projects]);

  const handleComplete = useCallback(
    (id: string) => {
      if (completedIdsRef.current.has(id)) {
        // Uncomplete: restore to someday
        updateTask(id, { status: 'someday' });
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
          <h2 className="text-xl font-semibold text-foreground">Someday</h2>
        </div>

        {isInlineCreating && <InlineTaskCard />}

        {somedayTasks.length === 0 && !isInlineCreating ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Cloud className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No someday tasks</p>
          </div>
        ) : (
          <TaskList
            tasks={somedayTasks}
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

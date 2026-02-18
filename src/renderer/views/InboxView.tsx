import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Inbox } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';

const SORT_DELAY_MS = 400;

export function InboxView() {
  const tasks = useStore((s) => s.tasks);
  const fetchTasks = useStore((s) => s.fetchTasks);
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
  const sortTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    return () => sortTimers.current.forEach(clearTimeout);
  }, []);

  const inboxTasks = useMemo(() => {
    const visible = tasks.filter(
      (t) => t.status === 'inbox' || (t.status === 'logbook' && everCompletedIds.current.has(t.id)),
    );
    return visible.sort((a, b) => {
      const aIdx = settledIds.indexOf(a.id);
      const bIdx = settledIds.indexOf(b.id);
      const aSettled = aIdx >= 0 ? 1 : 0;
      const bSettled = bIdx >= 0 ? 1 : 0;
      if (aSettled !== bSettled) return aSettled - bSettled;
      if (aSettled && bSettled) return aIdx - bIdx;
      return 0;
    });
  }, [tasks, completedIds, settledIds]); // completedIds included as recalc trigger

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleComplete = useCallback(
    (id: string) => {
      if (completedIds.has(id)) {
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
    [completedIds, updateTask],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Inbox</h2>

        {isInlineCreating && <InlineTaskCard />}

        {!isInlineCreating && inboxTasks.length === 0 ? (
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

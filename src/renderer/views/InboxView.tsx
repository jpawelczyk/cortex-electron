import { useState, useEffect, useMemo, useCallback } from 'react';
import { Inbox } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { InlineTaskCard } from '../components/InlineTaskCard';

export function InboxView() {
  const tasks = useStore((s) => s.tasks);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const isInlineCreating = useStore((s) => s.isInlineCreating);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const inboxTasks = useMemo(() => {
    const visible = tasks.filter(
      (t) => t.status === 'inbox' || (t.status === 'logbook' && completedIds.has(t.id)),
    );
    // Sort: incomplete first (original order), completed at bottom
    return visible.sort((a, b) => {
      const aCompleted = a.status === 'logbook' ? 1 : 0;
      const bCompleted = b.status === 'logbook' ? 1 : 0;
      return aCompleted - bCompleted;
    });
  }, [tasks, completedIds]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleComplete = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      if (task.status === 'logbook') {
        // Uncomplete: restore to inbox
        updateTask(id, { status: 'inbox' });
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        // Complete
        updateTask(id, { status: 'logbook' });
        setCompletedIds((prev) => new Set(prev).add(id));
      }
    },
    [tasks, updateTask],
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
          />
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useMemo, type RefObject } from 'react';
import { Inbox } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';
import { TaskInput } from '../components/TaskInput';

interface InboxViewProps {
  taskInputRef?: RefObject<HTMLInputElement | null>;
}

export function InboxView({ taskInputRef }: InboxViewProps) {
  const tasks = useStore((s) => s.tasks);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const inboxTasks = useMemo(() => tasks.filter((t) => t.status === 'inbox'), [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleComplete = (id: string) => {
    updateTask(id, { status: 'logbook' });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <h2 className="text-xl font-semibold text-foreground mb-6">Inbox</h2>

        <div className="mb-4">
          <TaskInput ref={taskInputRef} />
        </div>

        {inboxTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">No tasks in your inbox</p>
          </div>
        ) : (
          <TaskList
            tasks={inboxTasks}
            onCompleteTask={handleComplete}
            onSelectTask={selectTask}
            selectedTaskId={selectedTaskId}
          />
        )}
      </div>
    </div>
  );
}

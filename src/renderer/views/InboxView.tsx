import { useEffect } from 'react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';

export function InboxView() {
  const inboxTasks = useStore((s) => s.getInboxTasks());
  const fetchTasks = useStore((s) => s.fetchTasks);
  const updateTask = useStore((s) => s.updateTask);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleComplete = (id: string) => {
    updateTask(id, { status: 'logbook' });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Inbox</h2>
      <TaskList tasks={inboxTasks} onCompleteTask={handleComplete} />
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import { Sun } from 'lucide-react';
import { useStore } from '../stores';
import { TaskList } from '../components/TaskList';

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

  const todayTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status === 'logbook' || t.status === 'cancelled') return false;
        return t.status === 'today' || t.when_date === today;
      }),
    [tasks, today],
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleComplete = (id: string) => {
    updateTask(id, { status: 'logbook' });
  };

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

import type { Task } from '@shared/types';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-500',
  P1: 'bg-orange-500',
  P2: 'bg-yellow-500',
  P3: 'bg-blue-500',
};

function formatDeadline(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
}

export function TaskItem({ task, onComplete }: TaskItemProps) {
  const isCompleted = task.status === 'logbook';

  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-100 hover:bg-accent/40">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={() => onComplete(task.id)}
        className="size-4 rounded-sm border-border accent-primary shrink-0 cursor-pointer"
      />

      <span
        className={`flex-1 text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
      >
        {task.title}
      </span>

      {task.priority && (
        <span
          data-testid="priority-indicator"
          className={`size-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`}
        />
      )}

      {task.deadline && (
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDeadline(task.deadline)}
        </span>
      )}
    </div>
  );
}

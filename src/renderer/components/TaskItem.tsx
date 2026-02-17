import { Circle, CheckCircle2 } from 'lucide-react';
import type { Task } from '@shared/types';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'text-red-500',
  P1: 'text-orange-500',
  P2: 'text-yellow-500',
  P3: 'text-blue-500',
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
    <div className="group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-100 hover:bg-accent/40 cursor-default">
      <button
        role="checkbox"
        aria-checked={isCompleted}
        onClick={() => onComplete(task.id)}
        className="shrink-0 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
      >
        {isCompleted ? (
          <CheckCircle2 className="size-[18px] text-primary" strokeWidth={1.5} />
        ) : (
          <Circle
            className={`size-[18px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-100 ${
              task.priority ? PRIORITY_COLORS[task.priority] : ''
            }`}
            strokeWidth={1.5}
          />
        )}
      </button>

      <span
        className={`flex-1 text-[13px] leading-snug truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
      >
        {task.title}
      </span>

      {task.priority && !isCompleted && (
        <span
          data-testid="priority-indicator"
          className={`text-[10px] font-medium tracking-wide ${PRIORITY_COLORS[task.priority]}`}
        >
          {task.priority}
        </span>
      )}

      {task.deadline && (
        <span className="text-[11px] text-muted-foreground shrink-0">
          {formatDeadline(task.deadline)}
        </span>
      )}
    </div>
  );
}

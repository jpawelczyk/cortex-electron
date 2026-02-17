import type { Task } from '@shared/types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  title?: string;
  onCompleteTask: (id: string) => void;
}

export function TaskList({ tasks, title, onCompleteTask }: TaskListProps) {
  return (
    <div>
      {title && (
        <div className="flex items-center gap-3 px-3 pb-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
          {tasks.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground/60">{tasks.length}</span>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="px-3 py-8 text-sm text-muted-foreground text-center">No tasks</p>
      ) : (
        <div className="flex flex-col">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onComplete={onCompleteTask} />
          ))}
        </div>
      )}
    </div>
  );
}

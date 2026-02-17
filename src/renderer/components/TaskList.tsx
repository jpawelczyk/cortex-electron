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
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {tasks.length > 0 && (
            <span className="text-xs text-muted-foreground">{tasks.length}</span>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="px-3 py-8 text-sm text-muted-foreground text-center">No tasks</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onComplete={onCompleteTask} />
          ))}
        </div>
      )}
    </div>
  );
}

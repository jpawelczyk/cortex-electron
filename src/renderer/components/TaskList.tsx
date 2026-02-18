import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '@shared/types';
import { TaskItem } from './TaskItem';

const taskVariants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

interface TaskListProps {
  tasks: Task[];
  title?: string;
  onCompleteTask: (id: string) => void;
  onSelectTask?: (id: string) => void;
  selectedTaskId?: string | null;
  completedIds?: Set<string>;
}

export function TaskList({ tasks, title, onCompleteTask, onSelectTask, selectedTaskId, completedIds }: TaskListProps) {
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
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                variants={taskVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              >
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={onCompleteTask}
                  onSelect={onSelectTask}
                  isSelected={selectedTaskId === task.id}
                  isExpanded={selectedTaskId === task.id}
                  isCompleted={completedIds?.has(task.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

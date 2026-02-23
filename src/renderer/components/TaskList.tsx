import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Task } from '@shared/types';
import { TaskItem } from './TaskItem';

const VIRTUAL_THRESHOLD = 50;
// Estimated row height in pixels for virtualizer
const ESTIMATED_ROW_HEIGHT = 52;

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

function AnimatedTaskList({
  tasks,
  onCompleteTask,
  onSelectTask,
  selectedTaskId,
  completedIds,
}: Omit<TaskListProps, 'title'>) {
  return (
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
  );
}

function VirtualTaskList({
  tasks,
  onCompleteTask,
  onSelectTask,
  selectedTaskId,
  completedIds,
}: Omit<TaskListProps, 'title'>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="overflow-auto max-h-[calc(100vh-200px)]">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const task = tasks[virtualItem.index];
          return (
            <div
              key={task.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
            >
              <TaskItem
                task={task}
                onComplete={onCompleteTask}
                onSelect={onSelectTask}
                isSelected={selectedTaskId === task.id}
                isExpanded={selectedTaskId === task.id}
                isCompleted={completedIds?.has(task.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TaskList({ tasks, title, onCompleteTask, onSelectTask, selectedTaskId, completedIds }: TaskListProps) {
  const useVirtual = tasks.length > VIRTUAL_THRESHOLD;

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
      ) : useVirtual ? (
        <VirtualTaskList
          tasks={tasks}
          onCompleteTask={onCompleteTask}
          onSelectTask={onSelectTask}
          selectedTaskId={selectedTaskId}
          completedIds={completedIds}
        />
      ) : (
        <AnimatedTaskList
          tasks={tasks}
          onCompleteTask={onCompleteTask}
          onSelectTask={onSelectTask}
          selectedTaskId={selectedTaskId}
          completedIds={completedIds}
        />
      )}
    </div>
  );
}

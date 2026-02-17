import { forwardRef, useState, type KeyboardEvent } from 'react';
import { useStore } from '../stores';

export const TaskInput = forwardRef<HTMLInputElement>(function TaskInput(_props, ref) {
  const [title, setTitle] = useState('');
  const createTask = useStore((s) => s.createTask);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = title.trim();
      if (!trimmed) return;
      createTask({ title: trimmed });
      setTitle('');
    }

    if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Add a task..."
      className="w-full px-3 py-2 text-[13px] bg-transparent border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
    />
  );
});

import { useEffect, useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { useStore } from '../stores';

export function TrashView() {
  const trashedTasks = useStore((s) => s.trashedTasks);
  const fetchTrashedTasks = useStore((s) => s.fetchTrashedTasks);
  const restoreTask = useStore((s) => s.restoreTask);
  const emptyTrash = useStore((s) => s.emptyTrash);

  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchTrashedTasks();
  }, [fetchTrashedTasks]);

  const count = trashedTasks.length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">Trash</h2>
            {count > 0 && (
              <span className="text-sm text-muted-foreground">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          {count > 0 && (
            <div className="flex items-center gap-3">
              {confirming && (
                <button
                  onClick={() => setConfirming(false)}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (confirming) {
                    emptyTrash();
                    setConfirming(false);
                  } else {
                    setConfirming(true);
                  }
                }}
                className="text-sm text-destructive hover:text-destructive/80 font-medium transition-colors"
              >
                {confirming ? 'Are you sure?' : 'Empty Trash'}
              </button>
            </div>
          )}
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Trash2 className="size-10 mb-3 opacity-30" strokeWidth={1.25} />
            <p className="text-sm">Trash is empty</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {trashedTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40 transition-colors"
              >
                <span className="flex-1 text-sm text-muted-foreground line-through truncate">
                  {task.title}
                </span>
                {task.deleted_at && (
                  <span className="text-xs text-muted-foreground/60 shrink-0">
                    {new Date(task.deleted_at).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => restoreTask(task.id)}
                  aria-label="Restore task"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-all"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

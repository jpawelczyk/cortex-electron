import { useEffect, useState } from 'react';
import { Trash2, RotateCcw, Check, X } from 'lucide-react';
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
              <span className="text-xs text-muted-foreground bg-accent rounded-full size-5 inline-flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          {count > 0 && (
            confirming ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1">
                <span className="text-sm text-muted-foreground mr-1">Confirm?</span>
                <button
                  aria-label="Confirm empty trash"
                  onClick={() => {
                    emptyTrash();
                    setConfirming(false);
                  }}
                  className="p-1 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  aria-label="Cancel empty trash"
                  onClick={() => setConfirming(false)}
                  className="p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                aria-label="Empty Trash"
                onClick={() => setConfirming(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            )
          )}
        </div>

        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Trash2 className="size-8 mb-3 opacity-30" strokeWidth={1.25} />
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
                <button
                  onClick={() => restoreTask(task.id)}
                  aria-label="Restore task"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-all"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                {task.deleted_at && (
                  <span className="text-xs text-muted-foreground/60 shrink-0">
                    {new Date(task.deleted_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

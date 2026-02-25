import { useState, useMemo } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useStore } from '../stores';
import { ICON_MAP, ICON_OPTIONS } from '../lib/icons';

const COLORS = [
  '#f97316',
  '#22c55e',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#eab308',
  '#ef4444',
  '#6366f1',
];

export function ContextSettings() {
  const contexts = useStore((s) => s.contexts);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const createContext = useStore((s) => s.createContext);
  const updateContext = useStore((s) => s.updateContext);
  const deleteContext = useStore((s) => s.deleteContext);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(COLORS[0]);
  const [editIcon, setEditIcon] = useState<string>(ICON_OPTIONS[0]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addColor, setAddColor] = useState<string>(COLORS[0]);
  const [addIcon, setAddIcon] = useState<string>(ICON_OPTIONS[0]);

  const deletingContext = useMemo(
    () => contexts.find((c) => c.id === deletingId),
    [contexts, deletingId],
  );

  const deleteItemCount = useMemo(() => {
    if (!deletingId) return 0;
    const taskCount = tasks.filter(
      (t) => t.context_id === deletingId && !t.deleted_at,
    ).length;
    const projectCount = projects.filter(
      (p) => p.context_id === deletingId && !p.deleted_at,
    ).length;
    return taskCount + projectCount;
  }, [deletingId, tasks, projects]);

  const startEdit = (ctx: { id: string; name: string; color: string | null; icon: string | null }) => {
    setEditingId(ctx.id);
    setEditName(ctx.name);
    setEditColor(ctx.color ?? COLORS[0]);
    setEditIcon(ctx.icon ?? ICON_OPTIONS[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateContext(editingId, {
      name: editName.trim(),
      color: editColor,
      icon: editIcon,
    });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!addName.trim()) return;
    await createContext({
      name: addName.trim(),
      color: addColor,
      icon: addIcon,
    });
    setAddName('');
    setAddColor(COLORS[0]);
    setAddIcon(ICON_OPTIONS[0]);
    setShowAddForm(false);
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    deleteContext(deletingId);
    setDeletingId(null);
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="space-y-0.5">
        {contexts.length === 0 && !showAddForm && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No contexts yet
          </p>
        )}

        {contexts.map((ctx) => {
          if (editingId === ctx.id) {
            return (
              <div key={ctx.id} className="space-y-3 p-3 rounded-lg bg-accent/40">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-md bg-background/60 border-0 ring-1 ring-white/10 focus:ring-primary/50 focus:outline-none transition-shadow"
                  autoFocus
                />
                <ColorPicker value={editColor} onChange={setEditColor} />
                <IconPicker value={editIcon} onChange={setEditIcon} />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="px-2.5 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          }

          if (deletingId === ctx.id) {
            return (
              <div
                key={ctx.id}
                className="p-3 rounded-lg bg-destructive/10 space-y-2"
              >
                <p className="text-sm">
                  Delete <strong>{deletingContext?.name}</strong>?{' '}
                  {deleteItemCount} items will lose their context.
                </p>
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-2.5 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-2.5 py-1 text-xs rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            );
          }

          const Icon = ctx.icon ? ICON_MAP[ctx.icon] : null;

          return (
            <div
              key={ctx.id}
              data-testid={`context-row-${ctx.id}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/40 group transition-colors"
            >
              <span
                data-testid={`settings-dot-${ctx.id}`}
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ctx.color ?? undefined }}
              />
              {Icon && <Icon className="size-4 text-muted-foreground" />}
              <span className="text-sm flex-1">{ctx.name}</span>
              <button
                onClick={() => startEdit(ctx)}
                className="p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent transition-all"
                aria-label="Edit"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => setDeletingId(ctx.id)}
                className="p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                aria-label="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {showAddForm ? (
        <div className="space-y-3 p-3 rounded-lg bg-accent/40">
          <input
            type="text"
            placeholder="Context name"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm rounded-md bg-background/60 border-0 ring-1 ring-white/10 focus:ring-primary/50 focus:outline-none transition-shadow"
            autoFocus
          />
          <ColorPicker value={addColor} onChange={setAddColor} />
          <IconPicker value={addIcon} onChange={setAddIcon} />
          <div className="flex gap-1.5 justify-end">
            <button
              onClick={() => {
                setShowAddForm(false);
                setAddName('');
                setAddColor(COLORS[0]);
                setAddIcon(ICON_OPTIONS[0]);
              }}
              className="px-2.5 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg transition-colors"
        >
          <Plus className="size-4" />
          Add context
        </button>
      )}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {COLORS.map((color) => (
        <button
          key={color}
          data-testid={`color-swatch-${color}`}
          onClick={() => onChange(color)}
          className={`size-5.5 rounded-full transition-all ${
            value === color ? 'ring-2 ring-offset-2 ring-offset-popover ring-white/60 scale-110' : 'hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {ICON_OPTIONS.map((name) => {
        const Icon = ICON_MAP[name];
        return (
          <button
            key={name}
            data-testid={`icon-option-${name}`}
            onClick={() => onChange(name)}
            className={`p-1.5 rounded-md transition-all ${
              value === name
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
            }`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

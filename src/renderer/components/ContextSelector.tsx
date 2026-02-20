import { useEffect } from 'react';
import { Briefcase, Home, FlaskConical, type LucideIcon } from 'lucide-react';
import { useStore } from '../stores';

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Home,
  FlaskConical,
};

export function ContextSelector() {
  const contexts = useStore((s) => s.contexts);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const toggleContext = useStore((s) => s.toggleContext);
  const fetchContexts = useStore((s) => s.fetchContexts);

  useEffect(() => {
    if (contexts.length === 0) {
      fetchContexts();
    }
  }, [contexts.length, fetchContexts]);

  if (contexts.length === 0) return null;

  const isFiltering = activeContextIds.length > 0;

  return (
    <div className="flex items-center gap-1.5">
      {contexts.map((ctx) => {
        const isActive = activeContextIds.includes(ctx.id);
        const Icon = ctx.icon ? ICON_MAP[ctx.icon] : null;
        const isEmoji = ctx.icon && !Icon;

        return (
          <button
            key={ctx.id}
            onClick={() => toggleContext(ctx.id)}
            aria-pressed={isFiltering && isActive}
            className={`no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              isFiltering && !isActive
                ? 'opacity-50 bg-transparent text-muted-foreground hover:opacity-75'
                : 'bg-accent/50 text-foreground hover:bg-accent'
            }`}
          >
            <span
              data-testid={`context-dot-${ctx.id}`}
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: ctx.color ?? undefined }}
            />
            {Icon && <Icon className="size-3.5" />}
            {isEmoji && <span data-testid={`context-icon-${ctx.id}`}>{ctx.icon}</span>}
            {ctx.name}
          </button>
        );
      })}
    </div>
  );
}

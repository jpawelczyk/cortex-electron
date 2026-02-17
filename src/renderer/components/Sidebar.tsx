import { Inbox, Sun, Calendar, Layers, Cloud, BookOpen } from 'lucide-react';

export type SidebarView = 'inbox' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'logbook';

interface TaskCounts {
  inbox: number;
  today: number;
  upcoming: number;
  anytime: number;
  someday: number;
  logbook: number;
}

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  taskCounts: TaskCounts;
}

const NAV_ITEMS: { view: SidebarView; label: string; icon: typeof Inbox }[] = [
  { view: 'inbox', label: 'Inbox', icon: Inbox },
  { view: 'today', label: 'Today', icon: Sun },
  { view: 'upcoming', label: 'Upcoming', icon: Calendar },
  { view: 'anytime', label: 'Anytime', icon: Layers },
  { view: 'someday', label: 'Someday', icon: Cloud },
  { view: 'logbook', label: 'Logbook', icon: BookOpen },
];

export function Sidebar({ activeView, onViewChange, taskCounts }: SidebarProps) {
  return (
    <nav className="flex flex-col gap-1 w-48 p-3 border-r border-border bg-surface/60 backdrop-blur-xl h-full">
      <div className="px-3 py-3 mb-2">
        <h1 className="text-lg font-semibold text-foreground">Cortex</h1>
      </div>

      {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
        const isActive = activeView === view;
        const count = taskCounts[view];

        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 w-full text-left ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {count > 0 && (
              <span className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

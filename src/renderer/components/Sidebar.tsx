import { Inbox, Sun, Calendar, Layers, Cloud, Clock, BookOpen, Trash2, FolderKanban, FileText, Settings } from 'lucide-react';

export type SidebarView = 'inbox' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'stale' | 'logbook' | 'trash' | 'projects' | 'notes';

interface TaskCounts {
  inbox: number;
  today: number;
  upcoming: number;
  anytime: number;
  someday: number;
  stale: number;
  logbook: number;
  trash: number;
}

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  taskCounts: TaskCounts;
}

type TaskView = keyof TaskCounts;

const NAV_ITEMS: { view: TaskView; label: string; icon: typeof Inbox }[] = [
  { view: 'inbox', label: 'Inbox', icon: Inbox },
  { view: 'today', label: 'Today', icon: Sun },
  { view: 'upcoming', label: 'Upcoming', icon: Calendar },
  { view: 'anytime', label: 'Anytime', icon: Layers },
  { view: 'someday', label: 'Someday', icon: Cloud },
  { view: 'stale', label: 'Stale', icon: Clock },
  { view: 'logbook', label: 'Logbook', icon: BookOpen },
  { view: 'trash', label: 'Trash', icon: Trash2 },
];

export function Sidebar({ activeView, onViewChange, taskCounts }: SidebarProps) {
  return (
    <nav className="drag-region flex flex-col w-52 border-r border-border bg-card backdrop-blur-xl h-full select-none">
      {/* Spacer — aligns with header border */}
      <div className="pt-12" />

      {/* Navigation */}
      <div className="no-drag flex flex-col gap-0.5 px-3 pt-2 flex-1">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          const isActive = activeView === view;
          const count = taskCounts[view];

          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150 w-full text-left cursor-default ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
              }`}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {count > 0 && view !== 'anytime' && view !== 'someday' && view !== 'logbook' && view !== 'trash' && (
                <span className={`text-xs tabular-nums ${isActive ? 'text-primary/70' : 'text-muted-foreground/70'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Separator */}
        <div className="my-2 border-t border-border" />

        {/* Projects */}
        <button
          onClick={() => onViewChange('projects')}
          className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150 w-full text-left cursor-default ${
            activeView === 'projects'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
          }`}
        >
          <FolderKanban className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">Projects</span>
        </button>

        {/* Notes */}
        <button
          onClick={() => onViewChange('notes')}
          className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150 w-full text-left cursor-default ${
            activeView === 'notes'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
          }`}
        >
          <FileText className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">Notes</span>
        </button>
      </div>

      {/* Bottom section */}
      <div className="no-drag px-3 py-3">
        <button
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </nav>
  );
}

import {
  Home, CalendarDays, FolderKanban, Inbox, Sun, Calendar, Layers, Cloud, Clock, BookOpen,
  Video, FileText, Users, Trash2, Settings,
} from 'lucide-react';

export type SidebarView = 'home' | 'daily' | 'projects' | 'inbox' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'stale' | 'logbook' | 'meetings' | 'notes' | 'stakeholders' | 'trash' | 'settings';

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

const NAV_ITEMS: { view: SidebarView; label: string; icon: typeof Inbox; count?: keyof TaskCounts }[] = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'daily', label: 'Daily', icon: CalendarDays },
  { view: 'projects', label: 'Projects', icon: FolderKanban },
  { view: 'inbox', label: 'Inbox', icon: Inbox, count: 'inbox' },
  { view: 'today', label: 'Today', icon: Sun, count: 'today' },
  { view: 'upcoming', label: 'Upcoming', icon: Calendar, count: 'upcoming' },
  { view: 'anytime', label: 'Anytime', icon: Layers },
  { view: 'someday', label: 'Someday', icon: Cloud },
  { view: 'stale', label: 'Stale', icon: Clock, count: 'stale' },
  { view: 'logbook', label: 'Logbook', icon: BookOpen },
  { view: 'meetings', label: 'Meetings', icon: Video },
  { view: 'notes', label: 'Notes', icon: FileText },
  { view: 'stakeholders', label: 'People', icon: Users },
];

export function Sidebar({ activeView, onViewChange, taskCounts }: SidebarProps) {
  return (
    <nav className="drag-region flex flex-col w-52 border-r border-border bg-card backdrop-blur-xl h-full select-none">
      <div className="pt-12" />

      <div className="no-drag flex flex-col gap-0.5 px-3 pt-2 flex-1">
        {NAV_ITEMS.map(({ view, label, icon: Icon, count }) => {
          const isActive = activeView === view;
          const countValue = count ? taskCounts[count] : 0;

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
              {count && countValue > 0 && (
                <span className={`text-xs tabular-nums ${isActive ? 'text-primary/70' : 'text-muted-foreground/70'}`}>
                  {countValue}
                </span>
              )}
            </button>
          );
        })}

        {/* Spacer pushes Trash to bottom */}
        <div className="flex-1" />

        {/* Trash */}
        <button
          onClick={() => onViewChange('trash')}
          className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150 w-full text-left cursor-default ${
            activeView === 'trash'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
          }`}
        >
          <Trash2 className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">Trash</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onViewChange('settings')}
          className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150 w-full text-left cursor-default mb-3 ${
            activeView === 'settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
          }`}
        >
          <Settings className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">Settings</span>
        </button>
      </div>
    </nav>
  );
}

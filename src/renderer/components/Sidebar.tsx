import {
  Home, CalendarDays, FolderKanban, Inbox, CheckSquare, BookOpen,
  Video, FileText, Users, Trash2, Settings,
} from 'lucide-react';

export type SidebarView = 'home' | 'daily' | 'projects' | 'inbox' | 'tasks' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'stale' | 'logbook' | 'meetings' | 'notes' | 'stakeholders' | 'trash' | 'settings';

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

type NavItem = { view: SidebarView; label: string; icon: typeof Inbox; count?: keyof TaskCounts };

const TASK_SUB_VIEWS: SidebarView[] = ['tasks', 'today', 'upcoming', 'anytime', 'someday', 'stale'];

const TOP_ITEMS: NavItem[] = [
  { view: 'inbox', label: 'Inbox', icon: Inbox, count: 'inbox' },
];

const MAIN_ITEMS: NavItem[] = [
  { view: 'home', label: 'Home', icon: Home },
  { view: 'daily', label: 'Daily', icon: CalendarDays },
  { view: 'projects', label: 'Projects', icon: FolderKanban },
  { view: 'tasks', label: 'Tasks', icon: CheckSquare },
  { view: 'meetings', label: 'Meetings', icon: Video },
  { view: 'notes', label: 'Notes', icon: FileText },
  { view: 'stakeholders', label: 'People', icon: Users },
];

const BOTTOM_ITEMS: NavItem[] = [
  { view: 'logbook', label: 'Logbook', icon: BookOpen },
  { view: 'trash', label: 'Trash', icon: Trash2 },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeView, onViewChange, taskCounts }: SidebarProps) {
  const isActive = (view: SidebarView) => {
    if (view === 'tasks') return TASK_SUB_VIEWS.includes(activeView);
    return activeView === view;
  };

  const renderItem = ({ view, label, icon: Icon, count }: NavItem) => {
    const active = isActive(view);
    const countValue = count ? taskCounts[count] : 0;

    return (
      <button
        key={view}
        onClick={() => onViewChange(view)}
        className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150 w-full text-left cursor-default ${
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
        }`}
      >
        <Icon className="size-4 shrink-0" strokeWidth={1.75} />
        <span className="flex-1">{label}</span>
        {count && countValue > 0 && (
          <span className={`text-xs tabular-nums ${active ? 'text-primary/70' : 'text-muted-foreground/70'}`}>
            {countValue}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="drag-region flex flex-col w-52 border-r border-border bg-card backdrop-blur-xl h-full select-none">
      <div className="pt-12" />

      <div className="no-drag flex flex-col px-3 pt-2 flex-1">
        {/* Top: Inbox */}
        <div className="flex flex-col gap-0.5">
          {TOP_ITEMS.map(renderItem)}
        </div>

        <div className="border-t border-border/50 my-2 mx-1" />

        {/* Middle: Main navigation */}
        <div className="flex flex-col gap-0.5">
          {MAIN_ITEMS.map(renderItem)}
        </div>

        {/* Spacer pushes bottom section down */}
        <div className="flex-1" />

        <div className="border-t border-border/50 my-2 mx-1" />

        {/* Bottom: Logbook, Trash, Settings */}
        <div className="flex flex-col gap-0.5 mb-3">
          {BOTTOM_ITEMS.map(renderItem)}
        </div>
      </div>
    </nav>
  );
}

import type { SidebarView } from '../components/Sidebar';
import { TodayView } from './TodayView';
import { UpcomingView } from './UpcomingView';
import { AnytimeView } from './AnytimeView';
import { SomedayView } from './SomedayView';
import { StaleView } from './StaleView';

interface TaskCounts {
  today: number;
  upcoming: number;
  anytime: number;
  someday: number;
  stale: number;
}

interface TasksViewProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  taskCounts: TaskCounts;
}

const TABS: { view: SidebarView; label: string; countKey?: keyof TaskCounts }[] = [
  { view: 'today', label: 'Today', countKey: 'today' },
  { view: 'upcoming', label: 'Upcoming', countKey: 'upcoming' },
  { view: 'anytime', label: 'Anytime' },
  { view: 'someday', label: 'Someday' },
  { view: 'stale', label: 'Stale', countKey: 'stale' },
];

export function TasksView({ activeView, onViewChange, taskCounts }: TasksViewProps) {
  const currentTab = activeView === 'tasks' ? 'today' : activeView;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-1 px-8 pt-6 pb-2">
        {TABS.map(({ view, label, countKey }) => {
          const isActive = currentTab === view;
          const count = countKey ? taskCounts[countKey] : 0;

          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`px-3 py-1 rounded-md text-[13px] font-medium transition-all duration-150 cursor-default ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
              }`}
            >
              {label}
              {countKey && count > 0 && (
                <span className={`ml-1.5 text-xs tabular-nums ${isActive ? 'text-primary/70' : 'text-muted-foreground/50'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {(currentTab === 'today') && <TodayView />}
      {currentTab === 'upcoming' && <UpcomingView />}
      {currentTab === 'anytime' && <AnytimeView />}
      {currentTab === 'someday' && <SomedayView />}
      {currentTab === 'stale' && <StaleView />}
    </div>
  );
}

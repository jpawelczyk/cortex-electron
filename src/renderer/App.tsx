import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { useStore } from './stores';
import { Sidebar, SidebarView } from './components/Sidebar';
import { InboxView } from './views/InboxView';
import { TodayView } from './views/TodayView';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const [activeView, setActiveView] = useState<SidebarView>('inbox');
  const tasks = useStore((s) => s.tasks);
  const deselectTask = useStore((s) => s.deselectTask);

  useKeyboardShortcuts({ setActiveView, deselectTask });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const taskCounts = useMemo(() => {
    const todayCount = tasks.filter((t) => {
      if (t.status === 'logbook' || t.status === 'cancelled') return false;
      return t.status === 'today' || t.when_date === today;
    }).length;

    return {
      inbox: tasks.filter((t) => t.status === 'inbox').length,
      today: todayCount,
      upcoming: tasks.filter((t) => t.status === 'upcoming').length,
      anytime: tasks.filter((t) => t.status === 'anytime').length,
      someday: tasks.filter((t) => t.status === 'someday').length,
      logbook: tasks.filter((t) => t.status === 'logbook').length,
    };
  }, [tasks, today]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        taskCounts={taskCounts}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-end gap-1 px-4 py-2 border-b border-border">
          <button
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Search className="size-5" />
          </button>
          <button
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-5" />
          </button>
        </header>

        {activeView === 'inbox' && <InboxView />}
        {activeView === 'today' && <TodayView />}
        {activeView !== 'inbox' && activeView !== 'today' && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">{activeView.charAt(0).toUpperCase() + activeView.slice(1)} — coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}

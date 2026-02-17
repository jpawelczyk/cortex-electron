import { useState, useMemo } from 'react';
import { useStore } from './stores';
import { Sidebar, SidebarView } from './components/Sidebar';
import { InboxView } from './views/InboxView';

export default function App() {
  const [activeView, setActiveView] = useState<SidebarView>('inbox');
  const tasks = useStore((s) => s.tasks);

  const taskCounts = useMemo(() => ({
    inbox: tasks.filter((t) => t.status === 'inbox').length,
    today: tasks.filter((t) => t.status === 'today').length,
    upcoming: tasks.filter((t) => t.status === 'upcoming').length,
    anytime: tasks.filter((t) => t.status === 'anytime').length,
    someday: tasks.filter((t) => t.status === 'someday').length,
    logbook: tasks.filter((t) => t.status === 'logbook').length,
  }), [tasks]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        taskCounts={taskCounts}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'inbox' && <InboxView />}
        {activeView !== 'inbox' && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">{activeView.charAt(0).toUpperCase() + activeView.slice(1)} view coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}

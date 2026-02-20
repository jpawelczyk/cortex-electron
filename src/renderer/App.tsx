import { useState, useMemo, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { ContextSelector } from './components/ContextSelector';
import { useStore } from './stores';
import { Sidebar, SidebarView } from './components/Sidebar';
import { InboxView } from './views/InboxView';
import { TodayView } from './views/TodayView';
import { TrashView } from './views/TrashView';
import { LogbookView } from './views/LogbookView';
import { UpcomingView } from './views/UpcomingView';
import { AnytimeView } from './views/AnytimeView';
import { SomedayView } from './views/SomedayView';
import { StaleView } from './views/StaleView';
import { ProjectsOverviewView } from './views/ProjectsOverviewView';
import { ProjectDetailView } from './views/ProjectDetailView';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

export default function App() {
  const [activeView, setActiveView] = useState<SidebarView>('inbox');
  const tasks = useStore((s) => s.tasks);
  const trashedTasks = useStore((s) => s.trashedTasks);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const fetchTrashedTasks = useStore((s) => s.fetchTrashedTasks);
  const deselectTask = useStore((s) => s.deselectTask);
  const startInlineCreate = useStore((s) => s.startInlineCreate);
  const startInlineProjectCreate = useStore((s) => s.startInlineProjectCreate);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const deselectProject = useStore((s) => s.deselectProject);

  const handleViewChange = (view: SidebarView) => {
    if (selectedProjectId) {
      deselectProject();
    }
    setActiveView(view);
  };

  useKeyboardShortcuts({ setActiveView: handleViewChange, deselectTask, startInlineCreate, startInlineProjectCreate, activeView, selectedProjectId });
  useGlobalShortcuts({ setActiveView: handleViewChange, startInlineCreate, startInlineProjectCreate, activeView, selectedProjectId });

  useEffect(() => {
    fetchTrashedTasks();
  }, [fetchTrashedTasks]);

  // Refresh tasks when stale check completes on window focus
  useEffect(() => {
    const cleanup = window.cortex.onStaleCheckComplete(() => {
      fetchTasks();
    });
    return cleanup;
  }, [fetchTasks]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const taskCounts = useMemo(() => {
    const overdueCount = tasks.filter(
      (t) =>
        t.deadline &&
        t.deadline < today &&
        !['logbook', 'cancelled', 'someday'].includes(t.status) &&
        !t.deleted_at &&
        !t.completed_at,
    ).length;

    const todayCount = tasks.filter((t) => {
      if (t.status === 'logbook' || t.status === 'cancelled') return false;
      if (t.deadline && t.deadline < today) return false;
      return t.status === 'today' || t.when_date === today;
    }).length;

    return {
      inbox: tasks.filter((t) => t.status === 'inbox' && !t.when_date).length + overdueCount,
      today: todayCount,
      upcoming: tasks.filter((t) => t.status === 'upcoming').length,
      anytime: tasks.filter((t) => t.status === 'anytime').length,
      someday: tasks.filter((t) => t.status === 'someday').length,
      stale: tasks.filter((t) => t.status === 'stale').length,
      logbook: tasks.filter((t) => t.status === 'logbook').length,
      trash: trashedTasks.length,
    };
  }, [tasks, trashedTasks, today]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        taskCounts={taskCounts}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="drag-region flex items-center justify-end gap-1 px-4 py-2 border-b border-border">
          <div className="no-drag mr-auto">
            <ContextSelector />
          </div>
          <button
            className="no-drag p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Search className="size-5" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (activeView === 'projects' && selectedProjectId) {
                startInlineCreate();
              } else if (activeView === 'projects') {
                startInlineProjectCreate();
              } else {
                setActiveView('inbox');
                startInlineCreate();
              }
            }}
            className="no-drag p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-5" />
          </button>
        </header>

        {activeView === 'inbox' && <InboxView />}
        {activeView === 'today' && <TodayView />}
        {activeView === 'upcoming' && <UpcomingView />}
        {activeView === 'anytime' && <AnytimeView />}
        {activeView === 'someday' && <SomedayView />}
        {activeView === 'stale' && <StaleView />}
        {activeView === 'logbook' && <LogbookView />}
        {activeView === 'trash' && <TrashView />}
        {activeView === 'projects' && !selectedProjectId && <ProjectsOverviewView />}
        {activeView === 'projects' && selectedProjectId && <ProjectDetailView projectId={selectedProjectId} />}
      </main>
    </div>
  );
}

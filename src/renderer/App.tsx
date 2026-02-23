import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Plus, Search, Settings } from 'lucide-react';
import { ContextSelector } from './components/ContextSelector';
import { ContextSettings } from './components/ContextSettings';
import { CommandPalette } from './components/CommandPalette';
import { useStore } from './stores';
import { filterTasksByContext } from './lib/contextFilter';
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
import { NotesOverviewView } from './views/NotesOverviewView';
import { NoteDetailView } from './views/NoteDetailView';
import { StakeholdersOverviewView } from './views/StakeholdersOverviewView';
import { StakeholderDetailView } from './views/StakeholderDetailView';
import { SettingsView } from './views/SettingsView';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { SignIn } from './views/auth/sign-in';
import { SignUp } from './views/auth/sign-up';
import type { Task } from '@shared/types';

export default function App() {
  const authSession = useStore((s) => s.authSession);
  const authLoading = useStore((s) => s.authLoading);
  const checkSession = useStore((s) => s.checkSession);
  const [authView, setAuthView] = useState<'sign-in' | 'sign-up'>('sign-in');

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Show loading screen while checking auth
  if (authLoading && !authSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show auth screens if no session
  if (!authSession) {
    if (authView === 'sign-up') {
      return <SignUp onSwitchToSignIn={() => setAuthView('sign-in')} />;
    }
    return <SignIn onSwitchToSignUp={() => setAuthView('sign-up')} />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [activeView, setActiveView] = useState<SidebarView>('inbox');
  const [contextSettingsOpen, setContextSettingsOpen] = useState(false);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const activeContextIds = useStore((s) => s.activeContextIds);
  const trashedTasks = useStore((s) => s.trashedTasks);
  const fetchTasks = useStore((s) => s.fetchTasks);
  const fetchTrashedTasks = useStore((s) => s.fetchTrashedTasks);
  const fetchProjects = useStore((s) => s.fetchProjects);
  const fetchContexts = useStore((s) => s.fetchContexts);
  const fetchNotes = useStore((s) => s.fetchNotes);
  const fetchStakeholders = useStore((s) => s.fetchStakeholders);
  const deselectTask = useStore((s) => s.deselectTask);
  const startInlineCreate = useStore((s) => s.startInlineCreate);
  const startInlineProjectCreate = useStore((s) => s.startInlineProjectCreate);
  const startInlineNoteCreate = useStore((s) => s.startInlineNoteCreate);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const deselectProject = useStore((s) => s.deselectProject);
  const selectedNoteId = useStore((s) => s.selectedNoteId);
  const deselectNote = useStore((s) => s.deselectNote);
  const selectedStakeholderId = useStore((s) => s.selectedStakeholderId);
  const deselectStakeholder = useStore((s) => s.deselectStakeholder);
  const selectStakeholder = useStore((s) => s.selectStakeholder);
  const openModal = useStore((s) => s.openModal);
  const selectTask = useStore((s) => s.selectTask);
  const selectProject = useStore((s) => s.selectProject);
  const selectNote = useStore((s) => s.selectNote);
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette);
  const openCommandPalette = useStore((s) => s.openCommandPalette);

  const handleViewChange = useCallback((view: SidebarView) => {
    if (selectedProjectId) {
      deselectProject();
    }
    if (selectedNoteId) {
      deselectNote();
    }
    if (selectedStakeholderId) {
      deselectStakeholder();
    }
    setActiveView(view);
  }, [deselectProject, deselectNote, deselectStakeholder, setActiveView, selectedProjectId, selectedNoteId, selectedStakeholderId]);

  const fetchTasksRef = useRef(fetchTasks);
  fetchTasksRef.current = fetchTasks;
  const fetchTrashedTasksRef = useRef(fetchTrashedTasks);
  fetchTrashedTasksRef.current = fetchTrashedTasks;
  const fetchProjectsRef = useRef(fetchProjects);
  fetchProjectsRef.current = fetchProjects;
  const fetchContextsRef = useRef(fetchContexts);
  fetchContextsRef.current = fetchContexts;
  const fetchNotesRef = useRef(fetchNotes);
  fetchNotesRef.current = fetchNotes;
  const fetchStakeholdersRef = useRef(fetchStakeholders);
  fetchStakeholdersRef.current = fetchStakeholders;
  const isFetchingRef = useRef(false);

  useKeyboardShortcuts({ setActiveView: handleViewChange, deselectTask, startInlineCreate, startInlineProjectCreate, startInlineNoteCreate, toggleCommandPalette, activeView, selectedProjectId });
  useGlobalShortcuts({ setActiveView: handleViewChange, startInlineCreate, startInlineProjectCreate, activeView, selectedProjectId });

  // Proactively load all data from local SQLite on mount.
  // This is instant (local DB) and ensures views never render empty after a reload.
  useEffect(() => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    fetchTasksRef.current();
    fetchTrashedTasksRef.current();
    fetchProjectsRef.current();
    fetchContextsRef.current();
    fetchNotesRef.current();
    fetchStakeholdersRef.current();
    isFetchingRef.current = false;
  }, []);

  // Auto-refresh stores when PowerSync detects table changes (sync or local writes)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingTables = new Set<string>();
    const cleanup = window.cortex.sync.onTablesUpdated((tables) => {
      tables.forEach((t) => pendingTables.add(t));
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (pendingTables.has('tasks')) {
          fetchTasksRef.current();
          fetchTrashedTasksRef.current();
        }
        if (pendingTables.has('projects')) fetchProjectsRef.current();
        if (pendingTables.has('contexts')) fetchContextsRef.current();
        if (pendingTables.has('notes')) fetchNotesRef.current();
        if (pendingTables.has('stakeholders')) fetchStakeholdersRef.current();
        if (pendingTables.has('project_stakeholders') || pendingTables.has('note_stakeholders')) {
          // Clear cached junction links so open detail views re-fetch
          useStore.setState({ projectStakeholderLinks: [], noteStakeholderLinks: [] });
        }
        pendingTables.clear();
      }, 100);
    });
    return () => { cleanup(); if (debounceTimer) clearTimeout(debounceTimer); };
  }, []);

  // Also refresh tasks when stale check completes on window focus
  useEffect(() => {
    const cleanup = window.cortex.onStaleCheckComplete(() => {
      fetchTasksRef.current();
    });
    return cleanup;
  }, []);

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const taskCounts = useMemo(() => {
    // Context-filtered tasks for counts that respect the active filter
    const filtered = filterTasksByContext(tasks, activeContextIds, projects);

    const overdueCount = filtered.filter(
      (t) =>
        t.deadline &&
        t.deadline < today &&
        !['logbook', 'cancelled', 'someday'].includes(t.status) &&
        !t.deleted_at &&
        !t.completed_at,
    ).length;

    const todayCount = filtered.filter((t) => {
      if (t.status === 'logbook' || t.status === 'cancelled') return false;
      if (t.deadline && t.deadline < today) return false;
      return t.status === 'today' || t.when_date === today;
    }).length;

    // Inbox is always unfiltered (per CONTEXTS.md — inbox tasks need triage regardless of context)
    const inboxCount = tasks.filter((t) => t.status === 'inbox' && !t.when_date).length;

    return {
      inbox: inboxCount + overdueCount,
      today: todayCount,
      upcoming: filtered.filter((t) => t.status === 'upcoming' && !(t.when_date && t.when_date <= today)).length,
      anytime: filtered.filter((t) => t.status === 'anytime').length,
      someday: filtered.filter((t) => t.status === 'someday').length,
      stale: filtered.filter((t) => t.status === 'stale').length,
      logbook: filtered.filter((t) => t.status === 'logbook').length,
      trash: trashedTasks.length,
    };
  }, [tasks, trashedTasks, today, activeContextIds, projects]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        taskCounts={taskCounts}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="drag-region flex items-center justify-end gap-1 px-4 py-2 border-b border-border">
          <div className="no-drag flex items-center gap-1">
            <ContextSelector />
            <button
              onClick={() => setContextSettingsOpen(true)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Manage contexts"
            >
              <Settings className="size-3.5" />
            </button>
          </div>
          <ContextSettings open={contextSettingsOpen} onOpenChange={setContextSettingsOpen} />
          <div className="w-2" />
          <button
            onClick={openCommandPalette}
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
              } else if (activeView === 'notes') {
                startInlineNoteCreate();
              } else if (activeView === 'stakeholders') {
                openModal('createStakeholder');
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
        {activeView === 'notes' && (
          selectedNoteId
            ? <NoteDetailView noteId={selectedNoteId} />
            : <NotesOverviewView />
        )}
        {activeView === 'stakeholders' && (
          selectedStakeholderId
            ? <StakeholderDetailView stakeholderId={selectedStakeholderId} />
            : <StakeholdersOverviewView />
        )}
        {activeView === 'settings' && <SettingsView />}
      </main>

      <CommandPalette
        onNavigateToTask={(task: Task) => {
          const viewMap: Record<string, SidebarView> = {
            inbox: 'inbox',
            today: 'today',
            upcoming: 'upcoming',
            anytime: 'anytime',
            someday: 'someday',
            stale: 'stale',
            logbook: 'logbook',
            cancelled: 'logbook',
          };
          const view = viewMap[task.status] || 'inbox';
          handleViewChange(view);
          selectTask(task.id);
        }}
        onNavigateToProject={(projectId: string) => {
          handleViewChange('projects');
          selectProject(projectId);
        }}
        onNavigateToNote={(noteId: string) => {
          handleViewChange('notes');
          selectNote(noteId);
        }}
        onNavigateToView={handleViewChange}
        onCreateTask={() => {
          handleViewChange('inbox');
          startInlineCreate();
        }}
        onCreateProject={() => {
          handleViewChange('projects');
          startInlineProjectCreate();
        }}
        onCreateNote={() => {
          handleViewChange('notes');
          startInlineNoteCreate();
        }}
      />
    </div>
  );
}

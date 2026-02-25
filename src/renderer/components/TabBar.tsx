import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useStore } from '../stores';
import { VIEW_META } from '../lib/viewMeta';

function useTabTitle(tabId: string): string {
  const tabs = useStore((s) => s.tabs);
  const projects = useStore((s) => s.projects);
  const notes = useStore((s) => s.notes);
  const meetings = useStore((s) => s.meetings);
  const stakeholders = useStore((s) => s.stakeholders);

  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return 'Home';

  const state = tab.history[tab.historyIndex];

  if (state.entityId && state.entityType) {
    switch (state.entityType) {
      case 'project': {
        const project = projects.find((p) => p.id === state.entityId);
        return project?.title || 'Project';
      }
      case 'note': {
        const note = notes.find((n) => n.id === state.entityId);
        return note?.title || 'Note';
      }
      case 'meeting': {
        const meeting = meetings.find((m) => m.id === state.entityId);
        return meeting?.title || 'Meeting';
      }
      case 'stakeholder': {
        const s = stakeholders.find((st) => st.id === state.entityId);
        return s?.name || 'Person';
      }
    }
  }

  return VIEW_META[state.view]?.label ?? 'Home';
}

function TabButton({ tabId }: { tabId: string }) {
  const activeTabId = useStore((s) => s.activeTabId);
  const tabs = useStore((s) => s.tabs);
  const switchTab = useStore((s) => s.switchTab);
  const closeTab = useStore((s) => s.closeTab);
  const title = useTabTitle(tabId);

  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return null;

  const isActive = activeTabId === tabId;
  const state = tab.history[tab.historyIndex];
  const meta = VIEW_META[state.view];
  const Icon = meta?.icon;

  return (
    <button
      onClick={() => switchTab(tabId)}
      onMouseDown={(e) => {
        // Middle-click to close
        if (e.button === 1) {
          e.preventDefault();
          closeTab(tabId);
        }
      }}
      className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-default max-w-[180px] ${
        isActive
          ? 'text-foreground bg-accent/60'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
      }`}
    >
      {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />}
      <span className="truncate">{title}</span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tabId);
        }}
        className={`ml-0.5 p-0.5 rounded hover:bg-accent shrink-0 ${
          isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
        }`}
      >
        <X className="size-3" />
      </span>
      {isActive && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}

export function TabBar() {
  const tabs = useStore((s) => s.tabs);
  const createTab = useStore((s) => s.createTab);
  const canGoBack = useStore((s) => s.canGoBack);
  const canGoForward = useStore((s) => s.canGoForward);
  const goBack = useStore((s) => s.goBack);
  const goForward = useStore((s) => s.goForward);

  const back = canGoBack();
  const forward = canGoForward();

  return (
    <div className="no-drag flex items-center gap-0.5">
      <button
        onClick={goBack}
        disabled={!back}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
        aria-label="Go back"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        onClick={goForward}
        disabled={!forward}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
        aria-label="Go forward"
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="w-1" />

      {tabs.map((tab) => (
        <TabButton key={tab.id} tabId={tab.id} />
      ))}

      <button
        onClick={() => createTab()}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="New tab"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

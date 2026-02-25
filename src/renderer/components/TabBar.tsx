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
  const isOnly = tabs.length === 1;
  const state = tab.history[tab.historyIndex];
  const meta = VIEW_META[state.view];
  const Icon = meta?.icon;

  return (
    <button
      onClick={() => switchTab(tabId)}
      onMouseDown={(e) => {
        if (e.button === 1 && !isOnly) {
          e.preventDefault();
          closeTab(tabId);
        }
      }}
      className={`group relative flex items-center gap-2 px-3 h-7 text-xs font-medium rounded-md transition-all duration-150 cursor-default max-w-[200px] min-w-0 ${
        isActive
          ? 'bg-primary/10 text-primary shadow-[0_0.5px_2px_0_rgba(0,0,0,0.15),inset_0_0.5px_0_0_rgba(255,255,255,0.03)]'
          : 'text-muted-foreground hover:text-foreground/80 hover:bg-accent/40'
      }`}
    >
      {Icon && <Icon className="size-3.5 shrink-0 opacity-70" strokeWidth={1.75} />}
      <span className="truncate select-none">{title}</span>
      {!isOnly && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tabId);
          }}
          className={`ml-auto -mr-0.5 p-0.5 rounded transition-all duration-100 shrink-0 ${
            isActive
              ? 'opacity-40 hover:opacity-100 hover:bg-foreground/10'
              : 'opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:!bg-foreground/10'
          }`}
        >
          <X className="size-3" />
        </span>
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
      {/* Navigation controls */}
      <div className="flex items-center">
        <button
          onClick={goBack}
          disabled={!back}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-20 disabled:pointer-events-none"
          aria-label="Go back"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        </button>
        <button
          onClick={goForward}
          disabled={!forward}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors disabled:opacity-20 disabled:pointer-events-none"
          aria-label="Go forward"
        >
          <ChevronRight className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-3.5 bg-border mx-1" />

      {/* Tabs */}
      <div className="flex items-center gap-0.5">
        {tabs.map((tab) => (
          <TabButton key={tab.id} tabId={tab.id} />
        ))}
      </div>

      {/* New tab */}
      <button
        onClick={() => createTab()}
        className="p-1 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/40 transition-colors ml-0.5"
        aria-label="New tab"
      >
        <Plus className="size-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

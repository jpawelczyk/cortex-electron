import { StateCreator } from 'zustand';
import type { SidebarView } from '../components/Sidebar';
import type { StoreState } from './index';

export interface TabState {
  view: SidebarView;
  entityId?: string;
  entityType?: 'project' | 'note' | 'meeting' | 'stakeholder';
}

export interface Tab {
  id: string;
  history: TabState[];
  historyIndex: number;
}

export interface TabsSlice {
  tabs: Tab[];
  activeTabId: string;

  createTab: (state?: TabState) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  navigateTab: (state: TabState) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  getActiveTabState: () => TabState;
}

function makeTab(state?: TabState): Tab {
  return {
    id: crypto.randomUUID(),
    history: [state ?? { view: 'home' }],
    historyIndex: 0,
  };
}

function syncEntitySelections(set: (state: Partial<StoreState>) => void, tabState: TabState) {
  const cleared: Partial<StoreState> = {
    selectedProjectId: null,
    selectedNoteId: null,
    selectedMeetingId: null,
    selectedStakeholderId: null,
  };

  if (tabState.entityId && tabState.entityType) {
    switch (tabState.entityType) {
      case 'project':
        cleared.selectedProjectId = tabState.entityId;
        break;
      case 'note':
        cleared.selectedNoteId = tabState.entityId;
        break;
      case 'meeting':
        cleared.selectedMeetingId = tabState.entityId;
        break;
      case 'stakeholder':
        cleared.selectedStakeholderId = tabState.entityId;
        break;
    }
  }

  set(cleared);
}

const defaultTab = makeTab();

export const createTabsSlice: StateCreator<StoreState, [], [], TabsSlice> = (set, get) => ({
  tabs: [defaultTab],
  activeTabId: defaultTab.id,

  createTab: (state) => {
    const newTab = makeTab(state);
    set((s) => ({
      tabs: [...s.tabs, newTab],
      activeTabId: newTab.id,
    }));
    syncEntitySelections(set, newTab.history[0]);
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      // Last tab — replace with new Home tab
      const newTab = makeTab();
      set({ tabs: [newTab], activeTabId: newTab.id });
      syncEntitySelections(set, newTab.history[0]);
      return;
    }

    const idx = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);

    if (activeTabId === tabId) {
      // Activate neighbor: prefer right, fallback left
      const newIdx = Math.min(idx, newTabs.length - 1);
      const newActive = newTabs[newIdx];
      set({ tabs: newTabs, activeTabId: newActive.id });
      syncEntitySelections(set, newActive.history[newActive.historyIndex]);
    } else {
      set({ tabs: newTabs });
    }
  },

  switchTab: (tabId) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    set({ activeTabId: tabId });
    syncEntitySelections(set, tab.history[tab.historyIndex]);
  },

  navigateTab: (state) => {
    const { tabs, activeTabId } = get();
    const tabIdx = tabs.findIndex((t) => t.id === activeTabId);
    if (tabIdx === -1) return;

    const tab = tabs[tabIdx];
    const currentState = tab.history[tab.historyIndex];

    // Don't push duplicate state
    if (
      currentState.view === state.view &&
      currentState.entityId === state.entityId &&
      currentState.entityType === state.entityType
    ) {
      return;
    }

    // Truncate forward history and push new state
    const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), state];
    const newTab: Tab = { ...tab, history: newHistory, historyIndex: newHistory.length - 1 };
    const newTabs = [...tabs];
    newTabs[tabIdx] = newTab;
    set({ tabs: newTabs });
    syncEntitySelections(set, state);
  },

  goBack: () => {
    const { tabs, activeTabId } = get();
    const tabIdx = tabs.findIndex((t) => t.id === activeTabId);
    if (tabIdx === -1) return;

    const tab = tabs[tabIdx];
    if (tab.historyIndex <= 0) return;

    const newIndex = tab.historyIndex - 1;
    const newTab: Tab = { ...tab, historyIndex: newIndex };
    const newTabs = [...tabs];
    newTabs[tabIdx] = newTab;
    set({ tabs: newTabs });
    syncEntitySelections(set, newTab.history[newIndex]);
  },

  goForward: () => {
    const { tabs, activeTabId } = get();
    const tabIdx = tabs.findIndex((t) => t.id === activeTabId);
    if (tabIdx === -1) return;

    const tab = tabs[tabIdx];
    if (tab.historyIndex >= tab.history.length - 1) return;

    const newIndex = tab.historyIndex + 1;
    const newTab: Tab = { ...tab, historyIndex: newIndex };
    const newTabs = [...tabs];
    newTabs[tabIdx] = newTab;
    set({ tabs: newTabs });
    syncEntitySelections(set, newTab.history[newIndex]);
  },

  canGoBack: () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab ? tab.historyIndex > 0 : false;
  },

  canGoForward: () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab ? tab.historyIndex < tab.history.length - 1 : false;
  },

  getActiveTabState: () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return { view: 'home' as SidebarView };
    return tab.history[tab.historyIndex];
  },
});

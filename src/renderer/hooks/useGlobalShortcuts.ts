import { useEffect } from 'react';
import type { SidebarView } from '../components/Sidebar';

interface GlobalShortcutDeps {
  setActiveView: (view: SidebarView) => void;
  startInlineCreate: () => void;
  startInlineProjectCreate: () => void;
  activeView: string;
  selectedProjectId?: string | null;
}

export function useGlobalShortcuts({
  setActiveView,
  startInlineCreate,
  startInlineProjectCreate,
  activeView,
  selectedProjectId,
}: GlobalShortcutDeps) {
  useEffect(() => {
    const unsubscribe = window.cortex.onFocusTaskInput(() => {
      if (activeView === 'projects' && selectedProjectId) {
        startInlineCreate();
      } else if (activeView === 'projects') {
        startInlineProjectCreate();
      } else {
        setActiveView('inbox');
        startInlineCreate();
      }
    });
    return unsubscribe;
  }, [setActiveView, startInlineCreate, startInlineProjectCreate, activeView, selectedProjectId]);
}

import { useEffect } from 'react';
import type { SidebarView } from '../components/Sidebar';

interface GlobalShortcutDeps {
  setActiveView: (view: SidebarView) => void;
  startInlineCreate: () => void;
  startInlineProjectCreate: () => void;
  activeView: string;
}

export function useGlobalShortcuts({
  setActiveView,
  startInlineCreate,
  startInlineProjectCreate,
  activeView,
}: GlobalShortcutDeps) {
  useEffect(() => {
    const unsubscribe = window.cortex.onFocusTaskInput(() => {
      if (activeView === 'projects') {
        startInlineProjectCreate();
      } else {
        setActiveView('inbox');
        startInlineCreate();
      }
    });
    return unsubscribe;
  }, [setActiveView, startInlineCreate, startInlineProjectCreate, activeView]);
}

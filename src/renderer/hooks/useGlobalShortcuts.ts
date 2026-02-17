import { useEffect } from 'react';
import type { SidebarView } from '../components/Sidebar';

interface GlobalShortcutDeps {
  setActiveView: (view: SidebarView) => void;
  startInlineCreate: () => void;
}

export function useGlobalShortcuts({
  setActiveView,
  startInlineCreate,
}: GlobalShortcutDeps) {
  useEffect(() => {
    const unsubscribe = window.cortex.onFocusTaskInput(() => {
      setActiveView('inbox');
      startInlineCreate();
    });
    return unsubscribe;
  }, [setActiveView, startInlineCreate]);
}

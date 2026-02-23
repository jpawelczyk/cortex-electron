import { useEffect, useRef } from 'react';
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
  const depsRef = useRef({ setActiveView, startInlineCreate, startInlineProjectCreate, activeView, selectedProjectId });
  depsRef.current = { setActiveView, startInlineCreate, startInlineProjectCreate, activeView, selectedProjectId };

  useEffect(() => {
    const unsubscribe = window.cortex.onFocusTaskInput(() => {
      const { setActiveView, startInlineCreate, startInlineProjectCreate, activeView, selectedProjectId } = depsRef.current;
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
  }, []); // register once
}

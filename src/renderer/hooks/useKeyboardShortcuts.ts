import { useEffect } from 'react';
import type { SidebarView } from '../components/Sidebar';

interface KeyboardShortcutDeps {
  setActiveView: (view: SidebarView) => void;
  deselectTask: () => void;
}

const VIEW_KEYS: Record<string, SidebarView> = {
  '1': 'inbox',
  '2': 'today',
  '3': 'upcoming',
};

export function useKeyboardShortcuts({
  setActiveView,
  deselectTask,
}: KeyboardShortcutDeps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);

      if (e.metaKey) {
        const view = VIEW_KEYS[e.key];
        if (view) {
          e.preventDefault();
          setActiveView(view);
          return;
        }

        if (e.key === ',') {
          e.preventDefault();
          // Settings — placeholder
          return;
        }
      }

      if (e.key === 'Escape' && !isTyping) {
        deselectTask();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveView, deselectTask]);
}

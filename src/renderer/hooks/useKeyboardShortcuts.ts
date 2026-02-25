import { useEffect, useRef } from 'react';
import type { SidebarView } from '../components/Sidebar';
import { useStore } from '../stores';

interface KeyboardShortcutDeps {
  setActiveView: (view: SidebarView) => void;
  deselectTask: () => void;
  performContextCreate: () => void;
  toggleCommandPalette: () => void;
}

const VIEW_KEYS: Record<string, SidebarView> = {
  '1': 'inbox',
  '2': 'today',
  '3': 'upcoming',
};

export function useKeyboardShortcuts({
  setActiveView,
  deselectTask,
  performContextCreate,
  toggleCommandPalette,
}: KeyboardShortcutDeps) {
  const createTab = useStore((s) => s.createTab);
  const closeTab = useStore((s) => s.closeTab);
  const goBack = useStore((s) => s.goBack);
  const goForward = useStore((s) => s.goForward);
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const switchTab = useStore((s) => s.switchTab);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);

      if (e.metaKey) {
        if (e.key === 'k') {
          e.preventDefault();
          toggleCommandPalette();
          return;
        }

        if (e.key === 't') {
          e.preventDefault();
          createTab();
          return;
        }

        if (e.key === 'w') {
          e.preventDefault();
          closeTab(activeTabIdRef.current);
          return;
        }

        if (e.key === '[') {
          e.preventDefault();
          goBack();
          return;
        }

        if (e.key === ']') {
          e.preventDefault();
          goForward();
          return;
        }

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

        if (e.key === 'n') {
          e.preventDefault();
          performContextCreate();
          return;
        }

      }

      // Ctrl+Tab / Ctrl+Shift+Tab to cycle tabs
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = tabsRef.current.findIndex((t) => t.id === activeTabIdRef.current);
        if (currentIdx === -1) return;
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + tabsRef.current.length) % tabsRef.current.length
          : (currentIdx + 1) % tabsRef.current.length;
        switchTab(tabsRef.current[nextIdx].id);
        return;
      }

      if (e.key === 'Escape' && !isTyping) {
        deselectTask();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveView, deselectTask, performContextCreate, toggleCommandPalette, createTab, closeTab, goBack, goForward, switchTab]);
}

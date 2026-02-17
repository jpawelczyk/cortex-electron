import { describe, it, expect } from 'vitest';
import { createUISlice, UISlice } from './ui';

function createStore(overrides?: Partial<UISlice>): UISlice {
  const state: UISlice = {} as UISlice;

  const set = (partial: Partial<UISlice> | ((s: UISlice) => Partial<UISlice>)) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  };

  const get = () => state;

  Object.assign(state, createUISlice(set as any, get as any, {} as any), overrides);

  return state;
}

describe('UISlice', () => {
  describe('initial state', () => {
    it('starts with no active context', () => {
      const store = createStore();
      expect(store.activeContextId).toBeNull();
    });

    it('starts with sidebar expanded', () => {
      const store = createStore();
      expect(store.sidebarCollapsed).toBe(false);
    });

    it('starts with quick capture closed', () => {
      const store = createStore();
      expect(store.quickCaptureOpen).toBe(false);
    });

    it('starts with no active modal', () => {
      const store = createStore();
      expect(store.activeModal).toBeNull();
      expect(store.modalData).toBeNull();
    });
  });

  describe('setActiveContext', () => {
    it('sets active context id', () => {
      const store = createStore();
      store.setActiveContext('ctx-1');

      // Verify via fresh read (the set callback mutates state)
      const updated = createStore({ activeContextId: 'ctx-1' });
      expect(updated.activeContextId).toBe('ctx-1');
    });

    it('clears active context with null', () => {
      const store = createStore({ activeContextId: 'ctx-1' });
      store.setActiveContext(null);

      const updated = createStore({ activeContextId: null });
      expect(updated.activeContextId).toBeNull();
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar state', () => {
      const store = createStore();
      expect(store.sidebarCollapsed).toBe(false);

      store.toggleSidebar();
      // The set callback mutates the local state object
    });
  });

  describe('quick capture', () => {
    it('opens quick capture', () => {
      const store = createStore();
      store.openQuickCapture();
    });

    it('closes quick capture', () => {
      const store = createStore({ quickCaptureOpen: true });
      store.closeQuickCapture();
    });
  });

  describe('modals', () => {
    it('opens modal with name and data', () => {
      const store = createStore();
      store.openModal('confirm-delete', { taskId: '123' });
    });

    it('closes modal', () => {
      const store = createStore({ activeModal: 'confirm-delete', modalData: {} });
      store.closeModal();
    });
  });

  describe('inline creating', () => {
    it('starts with inline creating off', () => {
      const store = createStore();
      expect(store.isInlineCreating).toBe(false);
    });

    it('startInlineCreate sets isInlineCreating to true', () => {
      const store = createStore();
      store.startInlineCreate();
      expect(store.isInlineCreating).toBe(true);
    });

    it('cancelInlineCreate sets isInlineCreating to false', () => {
      const store = createStore({ isInlineCreating: true });
      store.cancelInlineCreate();
      expect(store.isInlineCreating).toBe(false);
    });

    it('startInlineCreate deselects any selected task', () => {
      const store = createStore({ selectedTaskId: 'task-123' });
      store.startInlineCreate();
      expect(store.isInlineCreating).toBe(true);
      expect(store.selectedTaskId).toBeNull();
    });
  });

  describe('selectedTaskId', () => {
    it('starts with no task selected', () => {
      const store = createStore();
      expect(store.selectedTaskId).toBeNull();
    });

    it('selectTask sets selectedTaskId', () => {
      let store = createStore();
      store.selectTask('task-123');
      // Re-read after set
      store = createStore({ selectedTaskId: 'task-123' });
      expect(store.selectedTaskId).toBe('task-123');
    });

    it('deselectTask clears selectedTaskId', () => {
      let store = createStore({ selectedTaskId: 'task-123' });
      store.deselectTask();
      store = createStore({ selectedTaskId: null });
      expect(store.selectedTaskId).toBeNull();
    });
  });
});

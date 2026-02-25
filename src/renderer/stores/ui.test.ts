import { describe, it, expect, vi } from 'vitest';
import { createUISlice, UISlice } from './ui';

type SetFn = (partial: Partial<UISlice> | ((s: UISlice) => Partial<UISlice>)) => void;

function createStore(overrides?: Partial<UISlice>): UISlice & { _set: ReturnType<typeof vi.fn<SetFn>> } {
  const state = {} as UISlice & { _set: ReturnType<typeof vi.fn<SetFn>> };

  const set = vi.fn<SetFn>((partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, update);
  });

  const get = () => state;

  const creator = createUISlice as unknown as (
    set: SetFn,
    get: () => UISlice,
    api: Record<string, never>,
  ) => UISlice;
  Object.assign(state, creator(set, get, {}), overrides);
  state._set = set;

  return state;
}

describe('UISlice', () => {
  describe('inline creating', () => {
    it('startInlineCreate deselects any selected task', () => {
      const store = createStore({ selectedTaskId: 'task-123' });
      store.startInlineCreate();
      expect(store.isInlineCreating).toBe(true);
      expect(store.selectedTaskId).toBeNull();
    });

    it('startInlineCreate is a no-op when already creating', () => {
      const store = createStore({ isInlineCreating: true });
      store._set.mockClear();
      store.startInlineCreate();
      expect(store._set).not.toHaveBeenCalled();
    });

    it('startInlineProjectCreate is a no-op when already creating', () => {
      const store = createStore({ isInlineProjectCreating: true });
      store._set.mockClear();
      store.startInlineProjectCreate();
      expect(store._set).not.toHaveBeenCalled();
    });

    it('startInlineNoteCreate is a no-op when already creating', () => {
      const store = createStore({ isInlineNoteCreating: true });
      store._set.mockClear();
      store.startInlineNoteCreate();
      expect(store._set).not.toHaveBeenCalled();
    });
  });

  describe('command palette', () => {
    it('toggleCommandPalette toggles the value', () => {
      const store = createStore();
      expect(store.commandPaletteOpen).toBe(false);
      store.toggleCommandPalette();
      expect(store.commandPaletteOpen).toBe(true);
      store.toggleCommandPalette();
      expect(store.commandPaletteOpen).toBe(false);
    });
  });
});

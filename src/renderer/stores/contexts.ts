import { StateCreator } from 'zustand';
import type { Context, CreateContextInput, UpdateContextInput } from '../../shared/types';

export interface ContextSlice {
  contexts: Context[];
  contextsLoading: boolean;
  contextsError: string | null;
  activeContextIds: string[];

  fetchContexts: () => Promise<void>;
  createContext: (input: CreateContextInput) => Promise<Context>;
  updateContext: (id: string, input: UpdateContextInput) => Promise<Context>;
  deleteContext: (id: string) => Promise<void>;

  toggleContext: (id: string) => void;
  setActiveContexts: (ids: string[]) => void;
  clearContextFilter: () => void;

  getFilteredByContext: <T extends { context_id: string | null }>(items: T[]) => T[];
}

export const createContextSlice: StateCreator<ContextSlice> = (set, get) => ({
  contexts: [],
  contextsLoading: false,
  contextsError: null,
  activeContextIds: [],

  fetchContexts: async () => {
    set({ contextsLoading: true, contextsError: null });
    try {
      const contexts = await window.cortex.contexts.list() as Context[];
      set({ contexts, contextsLoading: false });
    } catch (err) {
      console.error('[ContextSlice] fetchContexts failed:', err);
      set({ contextsError: err instanceof Error ? err.message : 'Unknown error', contextsLoading: false });
    }
  },

  createContext: async (input) => {
    const context = await window.cortex.contexts.create(input) as Context;
    set((state) => ({ contexts: [...state.contexts, context] }));
    return context;
  },

  updateContext: async (id, input) => {
    const context = await window.cortex.contexts.update(id, input) as Context;
    set((state) => ({
      contexts: state.contexts.map((c) => (c.id === id ? context : c)),
    }));
    return context;
  },

  deleteContext: async (id) => {
    await window.cortex.contexts.delete(id);
    set((state) => ({
      contexts: state.contexts.filter((c) => c.id !== id),
    }));
  },

  toggleContext: (id) => {
    set((state) => {
      const has = state.activeContextIds.includes(id);
      return {
        activeContextIds: has
          ? state.activeContextIds.filter((cid) => cid !== id)
          : [...state.activeContextIds, id],
      };
    });
  },

  setActiveContexts: (ids) => set({ activeContextIds: ids }),

  clearContextFilter: () => set({ activeContextIds: [] }),

  getFilteredByContext: <T extends { context_id: string | null }>(items: T[]): T[] => {
    const { activeContextIds } = get();
    if (activeContextIds.length === 0) return items;
    return items.filter(
      (item) => item.context_id !== null && activeContextIds.includes(item.context_id),
    );
  },
});

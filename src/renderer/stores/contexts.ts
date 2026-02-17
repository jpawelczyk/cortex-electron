import { StateCreator } from 'zustand';
import type { Context, CreateContextInput, UpdateContextInput } from '../../shared/types';

export interface ContextSlice {
  contexts: Context[];
  contextsLoading: boolean;
  contextsError: string | null;

  fetchContexts: () => Promise<void>;
  createContext: (input: CreateContextInput) => Promise<Context>;
  updateContext: (id: string, input: UpdateContextInput) => Promise<Context>;
  deleteContext: (id: string) => Promise<void>;
}

export const createContextSlice: StateCreator<ContextSlice> = (set) => ({
  contexts: [],
  contextsLoading: false,
  contextsError: null,

  fetchContexts: async () => {
    set({ contextsLoading: true, contextsError: null });
    try {
      const contexts = await window.cortex.contexts.list() as Context[];
      set({ contexts, contextsLoading: false });
    } catch {
      set({ contextsError: 'Failed to fetch contexts', contextsLoading: false });
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
});

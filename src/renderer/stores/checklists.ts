import { StateCreator } from 'zustand';
import type { ChecklistItem, CreateChecklistItemInput, UpdateChecklistItemInput } from '../../shared/types';

export interface ChecklistSlice {
  checklistItems: Record<string, ChecklistItem[]>;
  checklistsLoading: Record<string, boolean>;

  fetchChecklistItems: (taskId: string) => Promise<void>;
  createChecklistItem: (input: CreateChecklistItemInput) => Promise<ChecklistItem>;
  updateChecklistItem: (id: string, taskId: string, input: UpdateChecklistItemInput) => Promise<ChecklistItem>;
  deleteChecklistItem: (id: string, taskId: string) => Promise<void>;
  reorderChecklistItems: (taskId: string, itemIds: string[]) => Promise<void>;
}

export const createChecklistSlice: StateCreator<ChecklistSlice> = (set, _get) => ({
  checklistItems: {},
  checklistsLoading: {},

  fetchChecklistItems: async (taskId) => {
    set((state) => ({
      checklistsLoading: { ...state.checklistsLoading, [taskId]: true },
    }));
    try {
      const items = await window.cortex.checklists.list(taskId) as ChecklistItem[];
      set((state) => ({
        checklistItems: { ...state.checklistItems, [taskId]: items },
        checklistsLoading: { ...state.checklistsLoading, [taskId]: false },
      }));
    } catch (err) {
      console.error('[ChecklistSlice] fetchChecklistItems failed:', err);
      set((state) => ({
        checklistsLoading: { ...state.checklistsLoading, [taskId]: false },
      }));
    }
  },

  createChecklistItem: async (input) => {
    const item = await window.cortex.checklists.create(input) as ChecklistItem;
    set((state) => {
      const existing = state.checklistItems[input.task_id] ?? [];
      return {
        checklistItems: {
          ...state.checklistItems,
          [input.task_id]: [...existing, item],
        },
      };
    });
    return item;
  },

  updateChecklistItem: async (id, taskId, input) => {
    const item = await window.cortex.checklists.update(id, input) as ChecklistItem;
    set((state) => ({
      checklistItems: {
        ...state.checklistItems,
        [taskId]: (state.checklistItems[taskId] ?? []).map((i) => (i.id === id ? item : i)),
      },
    }));
    return item;
  },

  deleteChecklistItem: async (id, taskId) => {
    await window.cortex.checklists.delete(id);
    set((state) => ({
      checklistItems: {
        ...state.checklistItems,
        [taskId]: (state.checklistItems[taskId] ?? []).filter((i) => i.id !== id),
      },
    }));
  },

  reorderChecklistItems: async (taskId, itemIds) => {
    await window.cortex.checklists.reorder(taskId, itemIds);
    set((state) => {
      const current = state.checklistItems[taskId] ?? [];
      const itemMap = new Map(current.map((i) => [i.id, i]));
      const reordered = itemIds
        .map((id, index) => {
          const item = itemMap.get(id);
          return item ? { ...item, sort_order: index } : undefined;
        })
        .filter((i): i is ChecklistItem => i !== undefined);
      return {
        checklistItems: {
          ...state.checklistItems,
          [taskId]: reordered,
        },
      };
    });
  },
});

import { StateCreator } from 'zustand';
import type { Stakeholder, CreateStakeholderInput, UpdateStakeholderInput } from '../../shared/types';

export interface StakeholderSlice {
  stakeholders: Stakeholder[];
  stakeholdersLoading: boolean;
  stakeholdersError: string | null;

  fetchStakeholders: () => Promise<void>;
  createStakeholder: (input: CreateStakeholderInput) => Promise<Stakeholder>;
  updateStakeholder: (id: string, input: UpdateStakeholderInput) => Promise<Stakeholder>;
  deleteStakeholder: (id: string) => Promise<void>;
}

export const createStakeholderSlice: StateCreator<StakeholderSlice> = (set) => ({
  stakeholders: [],
  stakeholdersLoading: false,
  stakeholdersError: null,

  fetchStakeholders: async () => {
    set({ stakeholdersLoading: true, stakeholdersError: null });
    try {
      const stakeholders = await window.cortex.stakeholders.list() as Stakeholder[];
      set({ stakeholders, stakeholdersLoading: false });
    } catch (err) {
      console.error('[StakeholderSlice] fetchStakeholders failed:', err);
      set({ stakeholdersError: err instanceof Error ? err.message : 'Unknown error', stakeholdersLoading: false });
    }
  },

  createStakeholder: async (input) => {
    try {
      const stakeholder = await window.cortex.stakeholders.create(input) as Stakeholder;
      set((state) => ({ stakeholders: [...state.stakeholders, stakeholder] }));
      return stakeholder;
    } catch (err) {
      console.error('[StakeholderSlice] createStakeholder failed:', err);
      set({ stakeholdersError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Stakeholder;
    }
  },

  updateStakeholder: async (id, input) => {
    try {
      const stakeholder = await window.cortex.stakeholders.update(id, input) as Stakeholder;
      set((state) => ({
        stakeholders: state.stakeholders.map((s) => (s.id === id ? stakeholder : s)),
      }));
      return stakeholder;
    } catch (err) {
      console.error('[StakeholderSlice] updateStakeholder failed:', err);
      set({ stakeholdersError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Stakeholder;
    }
  },

  deleteStakeholder: async (id) => {
    try {
      await window.cortex.stakeholders.delete(id);
      set((state) => ({
        stakeholders: state.stakeholders.filter((s) => s.id !== id),
      }));
    } catch (err) {
      console.error('[StakeholderSlice] deleteStakeholder failed:', err);
      set({ stakeholdersError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },
});

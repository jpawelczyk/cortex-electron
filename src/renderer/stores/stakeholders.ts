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
    } catch {
      set({ stakeholdersError: 'Failed to fetch stakeholders', stakeholdersLoading: false });
    }
  },

  createStakeholder: async (input) => {
    const stakeholder = await window.cortex.stakeholders.create(input) as Stakeholder;
    set((state) => ({ stakeholders: [...state.stakeholders, stakeholder] }));
    return stakeholder;
  },

  updateStakeholder: async (id, input) => {
    const stakeholder = await window.cortex.stakeholders.update(id, input) as Stakeholder;
    set((state) => ({
      stakeholders: state.stakeholders.map((s) => (s.id === id ? stakeholder : s)),
    }));
    return stakeholder;
  },

  deleteStakeholder: async (id) => {
    await window.cortex.stakeholders.delete(id);
    set((state) => ({
      stakeholders: state.stakeholders.filter((s) => s.id !== id),
    }));
  },
});

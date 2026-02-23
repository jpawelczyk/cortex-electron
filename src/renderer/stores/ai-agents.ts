import { StateCreator } from 'zustand';
import type { AIAgent } from '@shared/types';

export interface AIAgentSlice {
  agents: AIAgent[];
  agentsLoading: boolean;
  agentsError: string | null;

  fetchAgents: () => Promise<void>;
  createAgent: (name: string) => Promise<string>; // returns plain key
  revokeAgent: (id: string) => Promise<void>;
}

export const createAIAgentSlice: StateCreator<AIAgentSlice> = (set) => ({
  agents: [],
  agentsLoading: false,
  agentsError: null,

  fetchAgents: async () => {
    set({ agentsLoading: true, agentsError: null });
    try {
      const agents = await window.cortex.agents.list() as AIAgent[];
      set({ agents, agentsLoading: false });
    } catch (err) {
      console.error('[AIAgentSlice] fetchAgents failed:', err);
      set({ agentsError: err instanceof Error ? err.message : 'Unknown error', agentsLoading: false });
    }
  },

  createAgent: async (name: string) => {
    const result = await window.cortex.agents.create({ name }) as { agent: AIAgent; key: string };
    set((state) => ({ agents: [result.agent, ...state.agents] }));
    return result.key;
  },

  revokeAgent: async (id: string) => {
    await window.cortex.agents.revoke(id);
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, revoked_at: new Date().toISOString() } : a
      ),
    }));
  },
});

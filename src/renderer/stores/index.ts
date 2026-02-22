import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createTaskSlice, TaskSlice } from './tasks';
import { createProjectSlice, ProjectSlice } from './projects';
import { createContextSlice, ContextSlice } from './contexts';
import { createStakeholderSlice, StakeholderSlice } from './stakeholders';
import { createChecklistSlice, ChecklistSlice } from './checklists';
import { createUISlice, UISlice } from './ui';
import { createNoteSlice, NoteSlice } from './notes';
import { createAuthSlice, AuthSlice } from './auth';
import { createAIAgentSlice, AIAgentSlice } from './ai-agents';

export type StoreState = TaskSlice & ProjectSlice & ContextSlice & StakeholderSlice & ChecklistSlice & UISlice & NoteSlice & AuthSlice & AIAgentSlice;

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createTaskSlice(...a),
        ...createProjectSlice(...a),
        ...createContextSlice(...a),
        ...createStakeholderSlice(...a),
        ...createChecklistSlice(...a),
        ...createUISlice(...a),
        ...createNoteSlice(...a),
        ...createAuthSlice(...a),
        ...createAIAgentSlice(...a),
      }),
      {
        name: 'cortex-store',
        partialize: (state) => ({
          activeContextIds: state.activeContextIds,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
);

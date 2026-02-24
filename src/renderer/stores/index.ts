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
import { createProjectStakeholderSlice, ProjectStakeholderSlice } from './projectStakeholders';
import { createNoteStakeholderSlice, NoteStakeholderSlice } from './noteStakeholders';
import { createSettingsSlice, SettingsSlice } from './settings';
import { createMeetingSlice, MeetingSlice } from './meetings';
import { createMeetingAttendeeSlice, MeetingAttendeeSlice } from './meetingAttendees';

export type StoreState = TaskSlice & ProjectSlice & ContextSlice & StakeholderSlice & ChecklistSlice & UISlice & NoteSlice & AuthSlice & AIAgentSlice & ProjectStakeholderSlice & NoteStakeholderSlice & SettingsSlice & MeetingSlice & MeetingAttendeeSlice;

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
        ...createProjectStakeholderSlice(...a),
        ...createNoteStakeholderSlice(...a),
        ...createSettingsSlice(...a),
        ...createMeetingSlice(...a),
        ...createMeetingAttendeeSlice(...a),
      }),
      {
        name: 'cortex-store',
        partialize: (state) => ({
          activeContextIds: state.activeContextIds,
          sidebarCollapsed: state.sidebarCollapsed,
          userFirstName: state.userFirstName,
          userLastName: state.userLastName,
          weatherCity: state.weatherCity,
        }),
      }
    )
  )
);

import { StateCreator } from 'zustand';
import type { Meeting, CreateMeetingInput, UpdateMeetingInput } from '../../shared/types';

export interface MeetingSlice {
  meetings: Meeting[];
  meetingsLoading: boolean;
  meetingsError: string | null;
  selectedMeetingId: string | null;
  autoFocusMeetingTitle: boolean;

  fetchMeetings: () => Promise<void>;
  createMeeting: (input: CreateMeetingInput) => Promise<Meeting>;
  updateMeeting: (id: string, input: UpdateMeetingInput) => Promise<Meeting>;
  deleteMeeting: (id: string) => Promise<void>;

  selectMeeting: (id: string) => void;
  deselectMeeting: () => void;
  setAutoFocusMeetingTitle: (value: boolean) => void;
}

export const createMeetingSlice: StateCreator<MeetingSlice> = (set) => ({
  meetings: [],
  meetingsLoading: false,
  meetingsError: null,
  selectedMeetingId: null,
  autoFocusMeetingTitle: false,

  fetchMeetings: async () => {
    set({ meetingsLoading: true, meetingsError: null });
    try {
      const meetings = await window.cortex.meetings.list() as Meeting[];
      set({ meetings, meetingsLoading: false });
    } catch (err) {
      console.error('[MeetingSlice] fetchMeetings failed:', err);
      set({ meetingsError: err instanceof Error ? err.message : 'Unknown error', meetingsLoading: false });
    }
  },

  createMeeting: async (input) => {
    try {
      const meeting = await window.cortex.meetings.create(input) as Meeting;
      set((state) => ({ meetings: [...state.meetings, meeting] }));
      return meeting;
    } catch (err) {
      console.error('[MeetingSlice] createMeeting failed:', err);
      set({ meetingsError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Meeting;
    }
  },

  updateMeeting: async (id, input) => {
    try {
      const meeting = await window.cortex.meetings.update(id, input) as Meeting;
      set((state) => ({
        meetings: state.meetings.map((m) => (m.id === id ? meeting : m)),
      }));
      return meeting;
    } catch (err) {
      console.error('[MeetingSlice] updateMeeting failed:', err);
      set({ meetingsError: err instanceof Error ? err.message : 'Unknown error' });
      return null as unknown as Meeting;
    }
  },

  deleteMeeting: async (id) => {
    try {
      await window.cortex.meetings.delete(id);
      set((state) => ({
        meetings: state.meetings.filter((m) => m.id !== id),
      }));
    } catch (err) {
      console.error('[MeetingSlice] deleteMeeting failed:', err);
      set({ meetingsError: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  selectMeeting: (id) => set({ selectedMeetingId: id }),
  deselectMeeting: () => set({ selectedMeetingId: null }),
  setAutoFocusMeetingTitle: (value) => set({ autoFocusMeetingTitle: value }),
});

import { StateCreator } from 'zustand';

interface MeetingAttendeeLink {
  meeting_id: string;
  stakeholder_id: string;
}

export interface MeetingAttendeeSlice {
  meetingAttendeeLinks: MeetingAttendeeLink[];
  fetchMeetingAttendees: (meetingId: string) => Promise<void>;
  linkAttendee: (meetingId: string, stakeholderId: string) => Promise<void>;
  unlinkAttendee: (meetingId: string, stakeholderId: string) => Promise<void>;
}

export const createMeetingAttendeeSlice: StateCreator<MeetingAttendeeSlice> = (set) => ({
  meetingAttendeeLinks: [],

  fetchMeetingAttendees: async (meetingId) => {
    try {
      const links = await window.cortex.meetingAttendees.list(meetingId) as MeetingAttendeeLink[];
      set((state) => ({
        meetingAttendeeLinks: [
          ...state.meetingAttendeeLinks.filter(l => l.meeting_id !== meetingId),
          ...links,
        ],
      }));
    } catch (err) {
      console.error('[MeetingAttendeeSlice] fetchMeetingAttendees failed:', err);
    }
  },

  linkAttendee: async (meetingId, stakeholderId) => {
    try {
      const link = await window.cortex.meetingAttendees.link({ meeting_id: meetingId, stakeholder_id: stakeholderId }) as MeetingAttendeeLink;
      set((state) => ({
        meetingAttendeeLinks: [...state.meetingAttendeeLinks, link],
      }));
    } catch (err) {
      console.error('[MeetingAttendeeSlice] linkAttendee failed:', err);
    }
  },

  unlinkAttendee: async (meetingId, stakeholderId) => {
    try {
      await window.cortex.meetingAttendees.unlink({ meeting_id: meetingId, stakeholder_id: stakeholderId });
      set((state) => ({
        meetingAttendeeLinks: state.meetingAttendeeLinks.filter(
          l => !(l.meeting_id === meetingId && l.stakeholder_id === stakeholderId)
        ),
      }));
    } catch (err) {
      console.error('[MeetingAttendeeSlice] unlinkAttendee failed:', err);
    }
  },
});

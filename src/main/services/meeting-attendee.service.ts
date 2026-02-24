import type { MeetingAttendee } from '@shared/types';
import type { DbContext } from '../db/types';

export interface MeetingAttendeeService {
  listByMeeting(meetingId: string): Promise<MeetingAttendee[]>;
  listByStakeholder(stakeholderId: string): Promise<MeetingAttendee[]>;
  link(meetingId: string, stakeholderId: string): Promise<MeetingAttendee>;
  unlink(meetingId: string, stakeholderId: string): Promise<void>;
}

export function createMeetingAttendeeService(ctx: DbContext): MeetingAttendeeService {
  const { db } = ctx;

  return {
    async listByMeeting(meetingId: string): Promise<MeetingAttendee[]> {
      return db.getAll<MeetingAttendee>(
        'SELECT * FROM meeting_attendees WHERE meeting_id = ?',
        [meetingId]
      );
    },

    async listByStakeholder(stakeholderId: string): Promise<MeetingAttendee[]> {
      return db.getAll<MeetingAttendee>(
        'SELECT * FROM meeting_attendees WHERE stakeholder_id = ?',
        [stakeholderId]
      );
    },

    async link(meetingId: string, stakeholderId: string): Promise<MeetingAttendee> {
      await db.execute(
        'INSERT OR IGNORE INTO meeting_attendees (meeting_id, stakeholder_id) VALUES (?, ?)',
        [meetingId, stakeholderId]
      );
      return { meeting_id: meetingId, stakeholder_id: stakeholderId };
    },

    async unlink(meetingId: string, stakeholderId: string): Promise<void> {
      await db.execute(
        'DELETE FROM meeting_attendees WHERE meeting_id = ? AND stakeholder_id = ?',
        [meetingId, stakeholderId]
      );
    },
  };
}

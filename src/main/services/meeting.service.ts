import { v4 as uuid } from 'uuid';
import type { Meeting, CreateMeetingInput, UpdateMeetingInput } from '@shared/types';
import type { DbContext } from '../db/types';

export interface MeetingService {
  create(input: CreateMeetingInput): Promise<Meeting>;
  get(id: string): Promise<Meeting | null>;
  list(): Promise<Meeting[]>;
  update(id: string, input: UpdateMeetingInput): Promise<Meeting>;
  delete(id: string): Promise<void>;
}

function rowToMeeting(row: Record<string, unknown>): Meeting {
  return { ...row, is_all_day: !!row.is_all_day } as Meeting;
}

export function createMeetingService(ctx: DbContext): MeetingService {
  const { db } = ctx;

  return {
    async create(input: CreateMeetingInput): Promise<Meeting> {
      const id = uuid();
      const now = new Date().toISOString();

      const meeting: Meeting = {
        id,
        title: input.title,
        description: input.description ?? null,
        start_time: input.start_time,
        end_time: input.end_time ?? null,
        is_all_day: input.is_all_day ?? false,
        location: input.location ?? null,
        meeting_url: input.meeting_url ?? null,
        status: 'scheduled',
        context_id: input.context_id ?? null,
        project_id: input.project_id ?? null,
        notes: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };

      await db.execute(`
        INSERT INTO meetings (
          id, title, description, start_time, end_time, is_all_day,
          location, meeting_url, status, context_id, project_id, notes,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        meeting.id, meeting.title, meeting.description,
        meeting.start_time, meeting.end_time, meeting.is_all_day ? 1 : 0,
        meeting.location, meeting.meeting_url, meeting.status,
        meeting.context_id, meeting.project_id, meeting.notes,
        meeting.created_at, meeting.updated_at, meeting.deleted_at,
      ]);

      return meeting;
    },

    async get(id: string): Promise<Meeting | null> {
      const row = await db.getOptional<Record<string, unknown>>(
        'SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      return row ? rowToMeeting(row) : null;
    },

    async list(): Promise<Meeting[]> {
      const rows = await db.getAll<Record<string, unknown>>(
        'SELECT * FROM meetings WHERE deleted_at IS NULL ORDER BY start_time DESC'
      );
      return rows.map(rowToMeeting);
    },

    async update(id: string, input: UpdateMeetingInput): Promise<Meeting> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Meeting not found');
      }

      const now = new Date().toISOString();

      const updated: Meeting = {
        ...existing,
        ...input,
        updated_at: now,
      };

      await db.execute(`
        UPDATE meetings SET
          title = ?, description = ?, start_time = ?, end_time = ?,
          is_all_day = ?, location = ?, meeting_url = ?, status = ?,
          context_id = ?, project_id = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `, [
        updated.title, updated.description, updated.start_time, updated.end_time,
        updated.is_all_day ? 1 : 0, updated.location, updated.meeting_url, updated.status,
        updated.context_id, updated.project_id, updated.notes, updated.updated_at,
        id,
      ]);

      return updated;
    },

    async delete(id: string): Promise<void> {
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Meeting not found');
      }

      const now = new Date().toISOString();
      await db.execute(
        'UPDATE meetings SET deleted_at = ?, updated_at = ? WHERE id = ?',
        [now, now, id]
      );
    },
  };
}

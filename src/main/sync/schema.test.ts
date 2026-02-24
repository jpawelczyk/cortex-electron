import { describe, it, expect } from 'vitest';
import { AppSchema } from './schema';
import { Column, ColumnType } from '@powersync/common';

describe('AppSchema', () => {
  it('has exactly 13 tables', () => {
    const tableNames = Object.keys(AppSchema.props);
    expect(tableNames).toHaveLength(13);
  });

  it('includes all expected table names', () => {
    const tableNames = Object.keys(AppSchema.props);
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('contexts');
    expect(tableNames).toContain('project_headings');
    expect(tableNames).toContain('task_checklists');
    expect(tableNames).toContain('stakeholders');
    expect(tableNames).toContain('meetings');
    expect(tableNames).toContain('meeting_attendees');
    expect(tableNames).toContain('notes');
    expect(tableNames).toContain('note_stakeholders');
    expect(tableNames).toContain('project_stakeholders');
    expect(tableNames).toContain('daily_notes');
    expect(tableNames).toContain('ai_agents');
  });

  describe('tasks table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.tasks.columns;
      expect(cols).toHaveLength(21);
    });

    it('has TEXT columns for title, notes, status, when_date, deadline, project_id, heading_id, context_id, priority, created_at, updated_at, completed_at, deleted_at, permanently_deleted_at, stale_at', () => {
      const cols: Column[] = AppSchema.props.tasks.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['title', 'notes', 'status', 'when_date', 'deadline', 'project_id', 'heading_id', 'context_id', 'priority', 'created_at', 'updated_at', 'completed_at', 'deleted_at', 'permanently_deleted_at', 'stale_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });

    it('has INTEGER column for sort_order', () => {
      const cols: Column[] = AppSchema.props.tasks.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['sort_order'].type).toBe(ColumnType.INTEGER);
    });
  });

  describe('projects table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.projects.columns;
      expect(cols).toHaveLength(15);
    });

    it('has TEXT columns for title, description, status, context_id, created_at, updated_at, completed_at, deleted_at', () => {
      const cols: Column[] = AppSchema.props.projects.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['title', 'description', 'status', 'context_id', 'created_at', 'updated_at', 'completed_at', 'deleted_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });

    it('has INTEGER column for sort_order', () => {
      const cols: Column[] = AppSchema.props.projects.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['sort_order'].type).toBe(ColumnType.INTEGER);
    });
  });

  describe('contexts table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.contexts.columns;
      expect(cols).toHaveLength(11);
    });

    it('has TEXT columns for name, color, icon, created_at, updated_at, deleted_at', () => {
      const cols: Column[] = AppSchema.props.contexts.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['name', 'color', 'icon', 'created_at', 'updated_at', 'deleted_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });

    it('has INTEGER column for sort_order', () => {
      const cols: Column[] = AppSchema.props.contexts.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['sort_order'].type).toBe(ColumnType.INTEGER);
    });
  });

  describe('project_headings table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.project_headings.columns;
      expect(cols).toHaveLength(10);
    });

    it('has TEXT columns for project_id, title, created_at, updated_at, deleted_at', () => {
      const cols: Column[] = AppSchema.props.project_headings.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['project_id', 'title', 'created_at', 'updated_at', 'deleted_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });

    it('has INTEGER column for sort_order', () => {
      const cols: Column[] = AppSchema.props.project_headings.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['sort_order'].type).toBe(ColumnType.INTEGER);
    });
  });

  describe('task_checklists table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.task_checklists.columns;
      expect(cols).toHaveLength(11);
    });

    it('has TEXT columns for task_id, title, created_at, updated_at, deleted_at', () => {
      const cols: Column[] = AppSchema.props.task_checklists.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['task_id', 'title', 'created_at', 'updated_at', 'deleted_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });

    it('has INTEGER columns for is_done and sort_order', () => {
      const cols: Column[] = AppSchema.props.task_checklists.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['is_done'].type).toBe(ColumnType.INTEGER);
      expect(colMap['sort_order'].type).toBe(ColumnType.INTEGER);
    });
  });

  describe('stakeholders table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.stakeholders.columns;
      expect(cols).toHaveLength(14);
    });

    it('has TEXT columns for name, organization, role, email, phone, notes, avatar_url, created_at, updated_at, deleted_at', () => {
      const cols: Column[] = AppSchema.props.stakeholders.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['name', 'organization', 'role', 'email', 'phone', 'notes', 'avatar_url', 'created_at', 'updated_at', 'deleted_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });
  });

  describe('meetings table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.meetings.columns;
      expect(cols).toHaveLength(20);
    });

    it('has TEXT columns for title, description, start_time, end_time, context_id, project_id, notes, created_at, updated_at, deleted_at, audio_path', () => {
      const cols: Column[] = AppSchema.props.meetings.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['title', 'description', 'start_time', 'end_time', 'context_id', 'project_id', 'notes', 'created_at', 'updated_at', 'deleted_at', 'audio_path'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });

    it('has INTEGER column for is_all_day', () => {
      const cols: Column[] = AppSchema.props.meetings.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['is_all_day'].type).toBe(ColumnType.INTEGER);
    });

    it('has INTEGER column for recording_duration', () => {
      const cols: Column[] = AppSchema.props.meetings.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['recording_duration'].type).toBe(ColumnType.INTEGER);
    });
  });

  describe('meeting_attendees table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.meeting_attendees.columns;
      expect(cols).toHaveLength(4);
    });

    it('has TEXT columns for meeting_id and stakeholder_id', () => {
      const cols: Column[] = AppSchema.props.meeting_attendees.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['meeting_id'].type).toBe(ColumnType.TEXT);
      expect(colMap['stakeholder_id'].type).toBe(ColumnType.TEXT);
    });
  });

  describe('notes table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.notes.columns;
      expect(cols).toHaveLength(12);
    });

    it('has TEXT columns for title, content, context_id, project_id, created_at, updated_at, deleted_at', () => {
      const cols: Column[] = AppSchema.props.notes.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['title', 'content', 'context_id', 'project_id', 'created_at', 'updated_at', 'deleted_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });

    it('has INTEGER column for is_pinned', () => {
      const cols: Column[] = AppSchema.props.notes.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['is_pinned'].type).toBe(ColumnType.INTEGER);
    });
  });

  describe('note_stakeholders table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.note_stakeholders.columns;
      expect(cols).toHaveLength(4);
    });

    it('has TEXT columns for note_id and stakeholder_id', () => {
      const cols: Column[] = AppSchema.props.note_stakeholders.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      expect(colMap['note_id'].type).toBe(ColumnType.TEXT);
      expect(colMap['stakeholder_id'].type).toBe(ColumnType.TEXT);
    });
  });

  describe('daily_notes table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.daily_notes.columns;
      expect(cols).toHaveLength(8);
    });

    it('has TEXT columns for date, content, created_at, updated_at', () => {
      const cols: Column[] = AppSchema.props.daily_notes.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['date', 'content', 'created_at', 'updated_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });
  });

  describe('ai_agents table', () => {
    it('has the correct number of columns', () => {
      const cols: Column[] = AppSchema.props.ai_agents.columns;
      expect(cols).toHaveLength(6);
    });

    it('has TEXT columns for name, api_key_hash, permissions, last_used_at, created_at, revoked_at', () => {
      const cols: Column[] = AppSchema.props.ai_agents.columns;
      const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
      const textCols = ['name', 'api_key_hash', 'permissions', 'last_used_at', 'created_at', 'revoked_at'];
      for (const name of textCols) {
        expect(colMap[name], `${name} should be TEXT`).toBeDefined();
        expect(colMap[name].type).toBe(ColumnType.TEXT);
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  getEmbeddableText,
  contentHash,
  shouldChunk,
  prepareForEmbedding,
} from './content-extractor';
import type { Task, Note, Meeting, Project, Stakeholder } from '@shared/types';

// Minimal fixtures
const baseTask: Task = {
  id: 'task-1',
  title: 'Fix the bug',
  notes: null,
  status: 'inbox',
  when_date: null,
  deadline: null,
  project_id: null,
  heading_id: null,
  context_id: null,
  priority: null,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  completed_at: null,
  deleted_at: null,
  stale_at: null,
  assignee_id: null,
};

const baseNote: Note = {
  id: 'note-1',
  title: 'My Note',
  content: null,
  context_id: null,
  project_id: null,
  is_pinned: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
};

const baseMeeting: Meeting = {
  id: 'meeting-1',
  title: 'Team Sync',
  description: null,
  start_time: '2024-01-01T10:00:00Z',
  end_time: null,
  is_all_day: false,
  location: null,
  meeting_url: null,
  status: 'scheduled',
  context_id: null,
  project_id: null,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
};

const baseProject: Project = {
  id: 'project-1',
  title: 'Launch App',
  description: null,
  status: 'active',
  context_id: null,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  completed_at: null,
  deleted_at: null,
  owner_type: 'user',
  owner_stakeholder_id: null,
};

const baseStakeholder: Stakeholder = {
  id: 'stakeholder-1',
  name: 'Alice',
  organization: null,
  role: null,
  email: null,
  phone: null,
  notes: null,
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
};

describe('getEmbeddableText', () => {
  it('task: combines title + notes, skipping null notes', () => {
    const result = getEmbeddableText(baseTask, 'task');
    expect(result).toBe('Fix the bug');
  });

  it('task: includes notes when present', () => {
    const task: Task = { ...baseTask, notes: 'Some notes here' };
    const result = getEmbeddableText(task, 'task');
    expect(result).toBe('Fix the bug\n\nSome notes here');
  });

  it('note: combines title + content, skipping null content', () => {
    const result = getEmbeddableText(baseNote, 'note');
    expect(result).toBe('My Note');
  });

  it('note: includes content when present', () => {
    const note: Note = { ...baseNote, content: 'Note body text' };
    const result = getEmbeddableText(note, 'note');
    expect(result).toBe('My Note\n\nNote body text');
  });

  it('meeting: combines title + location + notes, skipping nulls', () => {
    const result = getEmbeddableText(baseMeeting, 'meeting');
    expect(result).toBe('Team Sync');
  });

  it('meeting: includes location and notes when present', () => {
    const meeting: Meeting = { ...baseMeeting, location: 'Conference Room A', notes: 'Discussed roadmap' };
    const result = getEmbeddableText(meeting, 'meeting');
    expect(result).toBe('Team Sync\n\nConference Room A\n\nDiscussed roadmap');
  });

  it('project: combines title + description, skipping null description', () => {
    const result = getEmbeddableText(baseProject, 'project');
    expect(result).toBe('Launch App');
  });

  it('project: includes description when present', () => {
    const project: Project = { ...baseProject, description: 'A new product launch' };
    const result = getEmbeddableText(project, 'project');
    expect(result).toBe('Launch App\n\nA new product launch');
  });

  it('stakeholder: combines name + organization + role + notes, skipping nulls', () => {
    const result = getEmbeddableText(baseStakeholder, 'stakeholder');
    expect(result).toBe('Alice');
  });

  it('stakeholder: includes all fields when present', () => {
    const stakeholder: Stakeholder = {
      ...baseStakeholder,
      organization: 'Acme Corp',
      role: 'Engineer',
      notes: 'Key contact',
    };
    const result = getEmbeddableText(stakeholder, 'stakeholder');
    expect(result).toBe('Alice\n\nAcme Corp\n\nEngineer\n\nKey contact');
  });

  it('strips HTML tags from rich text fields', () => {
    const task: Task = { ...baseTask, notes: '<p>Hello</p>' };
    const result = getEmbeddableText(task, 'task');
    expect(result).toBe('Fix the bug\n\nHello');
  });

  it('strips markdown bold formatting', () => {
    const note: Note = { ...baseNote, content: '**bold** text' };
    const result = getEmbeddableText(note, 'note');
    expect(result).toBe('My Note\n\nbold text');
  });

  it('strips markdown links', () => {
    const note: Note = { ...baseNote, content: '[link text](https://example.com)' };
    const result = getEmbeddableText(note, 'note');
    expect(result).toBe('My Note\n\nlink text');
  });

  it('joins fields with newline-newline separator', () => {
    const task: Task = { ...baseTask, notes: 'Notes content' };
    const result = getEmbeddableText(task, 'task');
    expect(result).toContain('\n\n');
    const parts = result.split('\n\n');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe('Fix the bug');
    expect(parts[1]).toBe('Notes content');
  });
});

describe('contentHash', () => {
  it('returns consistent SHA256 hex for same input', () => {
    const hash1 = contentHash('hello world');
    const hash2 = contentHash('hello world');
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different input', () => {
    const hash1 = contentHash('hello world');
    const hash2 = contentHash('goodbye world');
    expect(hash1).not.toBe(hash2);
  });

  it('returns 64-char hex string', () => {
    const hash = contentHash('some text');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('shouldChunk', () => {
  it('returns false for text <= 500 chars', () => {
    const text = 'a'.repeat(500);
    expect(shouldChunk(text)).toBe(false);
  });

  it('returns true for text > 500 chars', () => {
    const text = 'a'.repeat(501);
    expect(shouldChunk(text)).toBe(true);
  });
});

describe('prepareForEmbedding', () => {
  it('adds query: prefix when isQuery is true', () => {
    const result = prepareForEmbedding('search term', true);
    expect(result).toBe('query: search term');
  });

  it('adds passage: prefix when isQuery is false', () => {
    const result = prepareForEmbedding('document content', false);
    expect(result).toBe('passage: document content');
  });
});

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { priorityRank, sortByPriority } from './prioritySort';
import type { Task } from '@shared/types';

const fakeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test',
  notes: null,
  status: 'inbox',
  when_date: null,
  deadline: null,
  project_id: null,
  heading_id: null,
  context_id: null,
  priority: null,
  sort_order: 0,
  created_at: '2026-02-17T00:00:00.000Z',
  updated_at: '2026-02-17T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  stale_at: null,
  assignee_id: null,
  ...overrides,
});

describe('priorityRank', () => {
  it('ranks P1 as 0', () => expect(priorityRank('P1')).toBe(0));
  it('ranks P2 as 1', () => expect(priorityRank('P2')).toBe(1));
  it('ranks P3 as 2', () => expect(priorityRank('P3')).toBe(2));
  it('ranks null as 3', () => expect(priorityRank(null)).toBe(3));
});

describe('sortByPriority', () => {
  it('sorts P1 before P2 before P3 before null', () => {
    const tasks = [
      fakeTask({ id: 'a', priority: null }),
      fakeTask({ id: 'b', priority: 'P3' }),
      fakeTask({ id: 'c', priority: 'P1' }),
      fakeTask({ id: 'd', priority: 'P2' }),
    ];
    const sorted = sortByPriority(tasks);
    expect(sorted.map((t) => t.id)).toEqual(['c', 'd', 'b', 'a']);
  });

  it('preserves relative order for same priority (stable)', () => {
    const tasks = [
      fakeTask({ id: 'first', priority: 'P1' }),
      fakeTask({ id: 'second', priority: 'P1' }),
      fakeTask({ id: 'third', priority: 'P1' }),
    ];
    const sorted = sortByPriority(tasks);
    expect(sorted.map((t) => t.id)).toEqual(['first', 'second', 'third']);
  });

  it('does not mutate the original array', () => {
    const tasks = [
      fakeTask({ id: 'a', priority: 'P3' }),
      fakeTask({ id: 'b', priority: 'P1' }),
    ];
    const original = [...tasks];
    sortByPriority(tasks);
    expect(tasks).toEqual(original);
  });

  it('handles empty array', () => {
    expect(sortByPriority([])).toEqual([]);
  });

  it('handles all null priorities', () => {
    const tasks = [
      fakeTask({ id: 'a', priority: null }),
      fakeTask({ id: 'b', priority: null }),
    ];
    const sorted = sortByPriority(tasks);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

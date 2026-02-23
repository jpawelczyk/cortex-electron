import { describe, it, expect } from 'vitest';
import { getCreateAction } from './getCreateAction';

const TODAY = '2026-02-23';

describe('getCreateAction', () => {
  it('returns task with no defaults for inbox', () => {
    expect(
      getCreateAction({ activeView: 'inbox', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'task' });
  });

  it('returns task with when_date for today view', () => {
    expect(
      getCreateAction({ activeView: 'today', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'task', defaults: { when_date: TODAY } });
  });

  it('returns task with status upcoming for upcoming view', () => {
    expect(
      getCreateAction({ activeView: 'upcoming', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'task', defaults: { status: 'upcoming' } });
  });

  it('returns task with status anytime for anytime view', () => {
    expect(
      getCreateAction({ activeView: 'anytime', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'task', defaults: { status: 'anytime' } });
  });

  it('returns task with status someday for someday view', () => {
    expect(
      getCreateAction({ activeView: 'someday', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'task', defaults: { status: 'someday' } });
  });

  it('returns project when on projects view with no selection', () => {
    expect(
      getCreateAction({ activeView: 'projects', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'project' });
  });

  it('returns task with project_id when on projects view with selection', () => {
    expect(
      getCreateAction({ activeView: 'projects', selectedProjectId: 'proj-1', today: TODAY }),
    ).toEqual({ type: 'task', defaults: { project_id: 'proj-1' } });
  });

  it('returns note for notes view', () => {
    expect(
      getCreateAction({ activeView: 'notes', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'note' });
  });

  it('returns stakeholder for stakeholders view', () => {
    expect(
      getCreateAction({ activeView: 'stakeholders', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'stakeholder' });
  });

  it('returns none for stale view', () => {
    expect(
      getCreateAction({ activeView: 'stale', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'none' });
  });

  it('returns none for logbook view', () => {
    expect(
      getCreateAction({ activeView: 'logbook', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'none' });
  });

  it('returns none for trash view', () => {
    expect(
      getCreateAction({ activeView: 'trash', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'none' });
  });

  it('returns none for settings view', () => {
    expect(
      getCreateAction({ activeView: 'settings', selectedProjectId: null, today: TODAY }),
    ).toEqual({ type: 'none' });
  });
});

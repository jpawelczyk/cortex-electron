import type { TaskStatus } from '@shared/types';

export interface CreateActionInput {
  activeView: string;
  selectedProjectId: string | null;
  today: string;
}

export interface TaskDefaults {
  when_date?: string;
  status?: TaskStatus;
  project_id?: string;
}

export type CreateAction =
  | { type: 'task'; defaults?: TaskDefaults }
  | { type: 'project' }
  | { type: 'note' }
  | { type: 'stakeholder' }
  | { type: 'none' };

export function getCreateAction(input: CreateActionInput): CreateAction {
  const { activeView, selectedProjectId, today } = input;

  switch (activeView) {
    case 'inbox':
      return { type: 'task' };
    case 'today':
      return { type: 'task', defaults: { when_date: today } };
    case 'upcoming':
      return { type: 'task', defaults: { status: 'upcoming' } };
    case 'anytime':
      return { type: 'task', defaults: { status: 'anytime' } };
    case 'someday':
      return { type: 'task', defaults: { status: 'someday' } };
    case 'projects':
      if (selectedProjectId) {
        return { type: 'task', defaults: { project_id: selectedProjectId } };
      }
      return { type: 'project' };
    case 'notes':
      return { type: 'note' };
    case 'stakeholders':
      return { type: 'stakeholder' };
    default:
      return { type: 'none' };
  }
}

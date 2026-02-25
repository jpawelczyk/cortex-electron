// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ArchivedProjectsView } from './ArchivedProjectsView';

let mockProjects: Record<string, unknown>[] = [];
let mockTasks: Record<string, unknown>[] = [];
const mockUpdateProject = vi.fn();
const mockNavigateTab = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: mockProjects,
      tasks: mockTasks,
      updateProject: mockUpdateProject,
      navigateTab: mockNavigateTab,
      activeContextIds: [],
    };
    return selector(state);
  },
}));

const fakeProject = (overrides: Record<string, unknown> = {}) => ({
  id: 'proj-1',
  title: 'Test Project',
  description: null,
  status: 'archived',
  context_id: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-02-10T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  ...overrides,
});

const fakeTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Test task',
  notes: null,
  status: 'logbook',
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
  ...overrides,
});

describe('ArchivedProjectsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjects = [];
    mockTasks = [];
  });

  it('shows task count for each project', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Archived Project' }),
    ];
    mockTasks = [
      fakeTask({ id: 't1', project_id: 'p1', status: 'logbook' }),
      fakeTask({ id: 't2', project_id: 'p1', status: 'cancelled' }),
      fakeTask({ id: 't3', project_id: 'other', status: 'logbook' }),
    ];
    render(<ArchivedProjectsView />);

    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('shows singular "1 task" for single task', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Archived Project' }),
    ];
    mockTasks = [
      fakeTask({ id: 't1', project_id: 'p1', status: 'logbook' }),
    ];
    render(<ArchivedProjectsView />);

    expect(screen.getByText('1 task')).toBeInTheDocument();
  });

  it('restore action calls updateProject with status active', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Archived Project' }),
    ];
    render(<ArchivedProjectsView />);

    fireEvent.click(screen.getByLabelText('Restore project'));

    expect(mockUpdateProject).toHaveBeenCalledWith('p1', { status: 'active' });
  });

  it('restore button does not trigger card click', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Archived Project' }),
    ];
    render(<ArchivedProjectsView />);

    fireEvent.click(screen.getByLabelText('Restore project'));

    expect(mockNavigateTab).not.toHaveBeenCalled();
  });

  it('clicking a card navigates to project detail', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Archived Project' }),
    ];
    render(<ArchivedProjectsView />);

    fireEvent.click(screen.getByTestId('project-card'));

    expect(mockNavigateTab).toHaveBeenCalledWith({ view: 'projects', entityId: 'p1', entityType: 'project' });
  });

  it('sorts archived projects by updated_at descending', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Older', updated_at: '2026-01-01T00:00:00.000Z' }),
      fakeProject({ id: 'p2', title: 'Newer', updated_at: '2026-02-15T00:00:00.000Z' }),
    ];
    render(<ArchivedProjectsView />);

    const cards = screen.getAllByTestId('project-card');
    expect(cards[0]).toHaveTextContent('Newer');
    expect(cards[1]).toHaveTextContent('Older');
  });
});

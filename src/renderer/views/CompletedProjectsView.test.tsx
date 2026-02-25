// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CompletedProjectsView } from './CompletedProjectsView';

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
  status: 'completed',
  context_id: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-02-10T00:00:00.000Z',
  completed_at: '2026-02-10T00:00:00.000Z',
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

describe('CompletedProjectsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjects = [];
    mockTasks = [];
  });

  it('renders only completed projects', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done Project', status: 'completed' }),
      fakeProject({ id: 'p2', title: 'Active Project', status: 'active' }),
      fakeProject({ id: 'p3', title: 'Archived Project', status: 'archived' }),
    ];
    render(<CompletedProjectsView />);

    expect(screen.getByText('Done Project')).toBeInTheDocument();
    expect(screen.queryByText('Active Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived Project')).not.toBeInTheDocument();
  });

  it('does not render deleted projects', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Deleted Completed', status: 'completed', deleted_at: '2026-02-15T00:00:00.000Z' }),
    ];
    render(<CompletedProjectsView />);

    expect(screen.queryByText('Deleted Completed')).not.toBeInTheDocument();
  });

  it('renders empty state when no completed projects', () => {
    render(<CompletedProjectsView />);

    expect(screen.getByText('No completed projects')).toBeInTheDocument();
  });

  it('shows completion date on each card', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done', completed_at: '2026-02-10T00:00:00.000Z' }),
    ];
    render(<CompletedProjectsView />);

    expect(screen.getByText(/Feb 10, 2026/)).toBeInTheDocument();
  });

  it('falls back to updated_at when completed_at is null', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done', completed_at: null, updated_at: '2026-02-05T00:00:00.000Z' }),
    ];
    render(<CompletedProjectsView />);

    expect(screen.getByText(/Feb 5, 2026/)).toBeInTheDocument();
  });

  it('shows task count for each project', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done Project' }),
    ];
    mockTasks = [
      fakeTask({ id: 't1', project_id: 'p1', status: 'logbook' }),
      fakeTask({ id: 't2', project_id: 'p1', status: 'logbook' }),
      fakeTask({ id: 't3', project_id: 'other', status: 'logbook' }),
    ];
    render(<CompletedProjectsView />);

    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('shows singular "1 task" for single task', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done Project' }),
    ];
    mockTasks = [
      fakeTask({ id: 't1', project_id: 'p1', status: 'logbook' }),
    ];
    render(<CompletedProjectsView />);

    expect(screen.getByText('1 task')).toBeInTheDocument();
  });

  it('reopen action calls updateProject with status active', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done Project' }),
    ];
    render(<CompletedProjectsView />);

    fireEvent.click(screen.getByLabelText('Reopen project'));

    expect(mockUpdateProject).toHaveBeenCalledWith('p1', { status: 'active' });
  });

  it('reopen button does not trigger card click', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done Project' }),
    ];
    render(<CompletedProjectsView />);

    fireEvent.click(screen.getByLabelText('Reopen project'));

    expect(mockNavigateTab).not.toHaveBeenCalled();
  });

  it('clicking a card navigates to project detail', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Done Project' }),
    ];
    render(<CompletedProjectsView />);

    fireEvent.click(screen.getByTestId('project-card'));

    expect(mockNavigateTab).toHaveBeenCalledWith({ view: 'projects', entityId: 'p1', entityType: 'project' });
  });

  it('sorts completed projects by completion date descending', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Older', completed_at: '2026-01-01T00:00:00.000Z' }),
      fakeProject({ id: 'p2', title: 'Newer', completed_at: '2026-02-15T00:00:00.000Z' }),
    ];
    render(<CompletedProjectsView />);

    const cards = screen.getAllByTestId('project-card');
    expect(cards[0]).toHaveTextContent('Newer');
    expect(cards[1]).toHaveTextContent('Older');
  });
});

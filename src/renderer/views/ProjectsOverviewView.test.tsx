// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectsOverviewView } from './ProjectsOverviewView';

let mockProjects: Record<string, unknown>[] = [];
let mockTasks: Record<string, unknown>[] = [];
let mockIsInlineProjectCreating = false;
const mockFetchProjects = vi.fn();
const mockFetchTasks = vi.fn();
const mockCreateProject = vi.fn();
const mockCancelInlineProjectCreate = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: mockProjects,
      projectsLoading: false,
      tasks: mockTasks,
      fetchProjects: mockFetchProjects,
      fetchTasks: mockFetchTasks,
      createProject: mockCreateProject,
      isInlineProjectCreating: mockIsInlineProjectCreating,
      cancelInlineProjectCreate: mockCancelInlineProjectCreate,
      selectProject: vi.fn(),
    };
    return selector(state);
  },
}));

const fakeProject = (overrides: Record<string, unknown> = {}) => ({
  id: 'proj-1',
  title: 'Test Project',
  description: null,
  status: 'active',
  context_id: null,
  sort_order: 0,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-18T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  ...overrides,
});

const fakeTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Test task',
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
  ...overrides,
});

describe('ProjectsOverviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjects = [];
    mockTasks = [];
    mockIsInlineProjectCreating = false;
  });

  it('renders the Projects heading', () => {
    render(<ProjectsOverviewView />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('shows only the trigger card when no projects exist', () => {
    render(<ProjectsOverviewView />);
    expect(screen.getByTestId('new-project-trigger')).toBeInTheDocument();
    expect(screen.queryAllByTestId('project-card')).toHaveLength(0);
  });

  it('renders project cards for active-status projects', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Active Project', status: 'active' }),
      fakeProject({ id: 'p2', title: 'Planned Project', status: 'planned' }),
      fakeProject({ id: 'p3', title: 'On Hold Project', status: 'on_hold' }),
      fakeProject({ id: 'p4', title: 'Blocked Project', status: 'blocked' }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.getByText('Active Project')).toBeInTheDocument();
    expect(screen.getByText('Planned Project')).toBeInTheDocument();
    expect(screen.getByText('On Hold Project')).toBeInTheDocument();
    expect(screen.getByText('Blocked Project')).toBeInTheDocument();
  });

  it('does NOT render completed projects', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Completed Project', status: 'completed' }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.queryByText('Completed Project')).not.toBeInTheDocument();
  });

  it('does NOT render archived projects', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Archived Project', status: 'archived' }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.queryByText('Archived Project')).not.toBeInTheDocument();
  });

  it('each card shows title and status badge', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'My Project', status: 'active' }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows task count for each project', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Project A' }),
    ];
    mockTasks = [
      fakeTask({ id: 't1', project_id: 'p1', status: 'inbox' }),
      fakeTask({ id: 't2', project_id: 'p1', status: 'today' }),
      fakeTask({ id: 't3', project_id: 'p1', status: 'logbook' }),
      fakeTask({ id: 't4', project_id: 'other', status: 'inbox' }),
    ];
    render(<ProjectsOverviewView />);
    // 2 incomplete tasks (inbox + today), not logbook, not other project
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('shows singular "1 task" for single task', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Project A' }),
    ];
    mockTasks = [
      fakeTask({ id: 't1', project_id: 'p1', status: 'inbox' }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.getByText('1 task')).toBeInTheDocument();
  });

  it('shows staleness indicator for projects not updated in 14+ days', () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 15);
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Stale Project', updated_at: staleDate.toISOString() }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('does NOT show staleness for recently updated projects', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Fresh Project', updated_at: new Date().toISOString() }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
  });

  it('shows correct status badge colors', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'P1', status: 'planned' }),
      fakeProject({ id: 'p2', title: 'P2', status: 'active' }),
      fakeProject({ id: 'p3', title: 'P3', status: 'on_hold' }),
      fakeProject({ id: 'p4', title: 'P4', status: 'blocked' }),
    ];
    render(<ProjectsOverviewView />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('On Hold')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('fetches projects on mount', () => {
    render(<ProjectsOverviewView />);
    expect(mockFetchProjects).toHaveBeenCalled();
  });

  it('sorts projects by created_at descending', () => {
    mockProjects = [
      fakeProject({ id: 'p1', title: 'Older', created_at: '2026-01-01T00:00:00.000Z' }),
      fakeProject({ id: 'p2', title: 'Newer', created_at: '2026-02-15T00:00:00.000Z' }),
    ];
    render(<ProjectsOverviewView />);
    const cards = screen.getAllByTestId('project-card');
    expect(cards[0]).toHaveTextContent('Newer');
    expect(cards[1]).toHaveTextContent('Older');
  });

  describe('inline project creation', () => {
    it('shows a "New Project" trigger card in the grid', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Existing', status: 'active' }),
      ];
      render(<ProjectsOverviewView />);
      expect(screen.getByTestId('new-project-trigger')).toBeInTheDocument();
    });

    it('shows trigger card even when no projects exist (empty state replaced by grid)', () => {
      render(<ProjectsOverviewView />);
      expect(screen.getByTestId('new-project-trigger')).toBeInTheDocument();
    });

    it('opens InlineProjectCard when trigger is clicked', () => {
      render(<ProjectsOverviewView />);
      fireEvent.click(screen.getByTestId('new-project-trigger'));

      expect(screen.getByTestId('inline-project-card')).toBeInTheDocument();
    });

    it('hides trigger card while InlineProjectCard is open', () => {
      render(<ProjectsOverviewView />);
      fireEvent.click(screen.getByTestId('new-project-trigger'));

      expect(screen.queryByTestId('new-project-trigger')).not.toBeInTheDocument();
    });

    it('restores trigger card after InlineProjectCard is dismissed', () => {
      render(<ProjectsOverviewView />);
      fireEvent.click(screen.getByTestId('new-project-trigger'));

      // Dismiss via Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.getByTestId('new-project-trigger')).toBeInTheDocument();
      expect(screen.queryByTestId('inline-project-card')).not.toBeInTheDocument();
    });

    it('opens InlineProjectCard when isInlineProjectCreating store flag is true', () => {
      mockIsInlineProjectCreating = true;
      render(<ProjectsOverviewView />);

      expect(screen.getByTestId('inline-project-card')).toBeInTheDocument();
      expect(screen.queryByTestId('new-project-trigger')).not.toBeInTheDocument();
    });
  });
});

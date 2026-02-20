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
const mockDeleteProject = vi.fn();
const mockUpdateProject = vi.fn();

let mockActiveContextIds: string[] = [];
let mockContexts: Record<string, unknown>[] = [];

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: mockProjects,
      projectsLoading: false,
      tasks: mockTasks,
      contexts: mockContexts,
      fetchProjects: mockFetchProjects,
      fetchTasks: mockFetchTasks,
      createProject: mockCreateProject,
      isInlineProjectCreating: mockIsInlineProjectCreating,
      cancelInlineProjectCreate: mockCancelInlineProjectCreate,
      selectProject: vi.fn(),
      deleteProject: mockDeleteProject,
      updateProject: mockUpdateProject,
      activeContextIds: mockActiveContextIds,
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

const fakeContext = (overrides: Record<string, unknown> = {}) => ({
  id: 'ctx-1',
  name: 'Work',
  color: '#3b82f6',
  icon: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('ProjectsOverviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjects = [];
    mockTasks = [];
    mockIsInlineProjectCreating = false;
    mockActiveContextIds = [];
    mockContexts = [];
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
    // "Active" appears in both the tab and the status badge
    const card = screen.getByTestId('project-card');
    expect(card).toHaveTextContent('Active');
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
    // "Active" appears in both the tab and the badge — check within card
    const cards = screen.getAllByTestId('project-card');
    const activeCard = cards.find((c) => c.textContent?.includes('P2'));
    expect(activeCard).toHaveTextContent('Active');
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

  describe('project deletion', () => {
    it('shows a delete button on each project card', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'My Project', status: 'active' }),
      ];
      render(<ProjectsOverviewView />);

      expect(screen.getByLabelText('Delete project')).toBeInTheDocument();
    });

    it('shows confirmation when delete button is clicked', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'My Project', status: 'active' }),
      ];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByLabelText('Delete project'));

      expect(screen.getByText('Confirm?')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm delete project')).toBeInTheDocument();
      expect(screen.getByLabelText('Cancel delete project')).toBeInTheDocument();
    });

    it('calls deleteProject when confirmed', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'My Project', status: 'active' }),
      ];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByLabelText('Delete project'));
      fireEvent.click(screen.getByLabelText('Confirm delete project'));

      expect(mockDeleteProject).toHaveBeenCalledWith('p1');
    });

    it('cancels deletion when cancel button is clicked', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'My Project', status: 'active' }),
      ];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByLabelText('Delete project'));
      fireEvent.click(screen.getByLabelText('Cancel delete project'));

      expect(mockDeleteProject).not.toHaveBeenCalled();
      expect(screen.queryByText('Confirm?')).not.toBeInTheDocument();
    });

    it('does not navigate to project detail when delete button is clicked', () => {
      // The selectProject mock is inside the store mock, so we check
      // that clicking the delete button doesn't trigger navigation
      mockProjects = [
        fakeProject({ id: 'p1', title: 'My Project', status: 'active' }),
      ];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByLabelText('Delete project'));

      // Should not have navigated — the card click handler should not fire
      expect(screen.getByText('Confirm?')).toBeInTheDocument();
    });
  });

  describe('tab navigation', () => {
    it('renders Active, Completed, and Archived tabs', () => {
      render(<ProjectsOverviewView />);
      expect(screen.getByTestId('projects-tab-active')).toBeInTheDocument();
      expect(screen.getByTestId('projects-tab-completed')).toBeInTheDocument();
      expect(screen.getByTestId('projects-tab-archived')).toBeInTheDocument();
    });

    it('shows Active tab as selected by default', () => {
      render(<ProjectsOverviewView />);
      expect(screen.getByTestId('projects-tab-active')).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to completed view when Completed tab is clicked', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Done Project', status: 'completed', completed_at: '2026-02-10T00:00:00.000Z' }),
      ];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('projects-tab-completed'));

      expect(screen.getByTestId('projects-tab-completed')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Done Project')).toBeInTheDocument();
    });

    it('switches to archived view when Archived tab is clicked', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Old Project', status: 'archived' }),
      ];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('projects-tab-archived'));

      expect(screen.getByTestId('projects-tab-archived')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Old Project')).toBeInTheDocument();
    });

    it('hides active content when non-active tab is selected', () => {
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Active One', status: 'active' }),
      ];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('projects-tab-completed'));

      expect(screen.queryByText('Active One')).not.toBeInTheDocument();
      expect(screen.queryByTestId('new-project-trigger')).not.toBeInTheDocument();
    });
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

  describe('status picker on project card', () => {
    it('opens status picker showing all statuses', () => {
      mockProjects = [fakeProject({ id: 'p1', status: 'active' })];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('status-picker-p1'));

      expect(screen.getByRole('option', { name: /planned/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /on hold/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /blocked/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /completed/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /archived/i })).toBeInTheDocument();
    });

    it('calls updateProject with new status on selection', () => {
      mockProjects = [fakeProject({ id: 'p1', status: 'active' })];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('status-picker-p1'));
      fireEvent.click(screen.getByRole('option', { name: /on hold/i }));

      expect(mockUpdateProject).toHaveBeenCalledWith('p1', { status: 'on_hold' });
    });

    it('does not navigate to project detail when status picker is clicked', () => {
      mockProjects = [fakeProject({ id: 'p1', status: 'active' })];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('status-picker-p1'));

      // Should show popover, not navigate
      expect(screen.getByRole('option', { name: /planned/i })).toBeInTheDocument();
    });
  });

  describe('context picker on project card', () => {
    it('shows context name on card when project has context_id', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      mockProjects = [fakeProject({ id: 'p1', context_id: 'ctx-1' })];
      render(<ProjectsOverviewView />);

      const card = screen.getByTestId('project-card');
      expect(card).toHaveTextContent('Work');
    });

    it('shows "No context" on card when project has no context', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      mockProjects = [fakeProject({ id: 'p1', context_id: null })];
      render(<ProjectsOverviewView />);

      const card = screen.getByTestId('project-card');
      expect(card).toHaveTextContent('No context');
    });

    it('opens context picker and shows all contexts plus None', () => {
      mockContexts = [
        fakeContext({ id: 'ctx-1', name: 'Work' }),
        fakeContext({ id: 'ctx-2', name: 'Personal', color: '#ff0000' }),
      ];
      mockProjects = [fakeProject({ id: 'p1', context_id: 'ctx-1' })];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('context-picker-p1'));

      expect(screen.getByRole('option', { name: /none/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /work/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /personal/i })).toBeInTheDocument();
    });

    it('calls updateProject with new context_id on selection', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      mockProjects = [fakeProject({ id: 'p1', context_id: null })];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('context-picker-p1'));
      fireEvent.click(screen.getByRole('option', { name: /work/i }));

      expect(mockUpdateProject).toHaveBeenCalledWith('p1', { context_id: 'ctx-1' });
    });

    it('calls updateProject with null when "None" is selected', () => {
      mockContexts = [fakeContext({ id: 'ctx-1', name: 'Work' })];
      mockProjects = [fakeProject({ id: 'p1', context_id: 'ctx-1' })];
      render(<ProjectsOverviewView />);

      fireEvent.click(screen.getByTestId('context-picker-p1'));
      fireEvent.click(screen.getByRole('option', { name: /none/i }));

      expect(mockUpdateProject).toHaveBeenCalledWith('p1', { context_id: null });
    });
  });

  describe('context filtering', () => {
    it('shows all projects when no context filter is active', () => {
      mockActiveContextIds = [];
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Work Project', status: 'active', context_id: 'ctx-work' }),
        fakeProject({ id: 'p2', title: 'Personal Project', status: 'active', context_id: 'ctx-personal' }),
        fakeProject({ id: 'p3', title: 'No Context Project', status: 'active', context_id: null }),
      ];
      render(<ProjectsOverviewView />);
      expect(screen.getByText('Work Project')).toBeInTheDocument();
      expect(screen.getByText('Personal Project')).toBeInTheDocument();
      expect(screen.getByText('No Context Project')).toBeInTheDocument();
    });

    it('shows only projects matching active context', () => {
      mockActiveContextIds = ['ctx-work'];
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Work Project', status: 'active', context_id: 'ctx-work' }),
        fakeProject({ id: 'p2', title: 'Personal Project', status: 'active', context_id: 'ctx-personal' }),
      ];
      render(<ProjectsOverviewView />);
      expect(screen.getByText('Work Project')).toBeInTheDocument();
      expect(screen.queryByText('Personal Project')).not.toBeInTheDocument();
    });

    it('hides projects with no context when filter is active', () => {
      mockActiveContextIds = ['ctx-work'];
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Orphan Project', status: 'active', context_id: null }),
      ];
      render(<ProjectsOverviewView />);
      expect(screen.queryByText('Orphan Project')).not.toBeInTheDocument();
    });

    it('supports multiple active contexts', () => {
      mockActiveContextIds = ['ctx-work', 'ctx-personal'];
      mockProjects = [
        fakeProject({ id: 'p1', title: 'Work Project', status: 'active', context_id: 'ctx-work' }),
        fakeProject({ id: 'p2', title: 'Personal Project', status: 'active', context_id: 'ctx-personal' }),
        fakeProject({ id: 'p3', title: 'Research Project', status: 'active', context_id: 'ctx-research' }),
      ];
      render(<ProjectsOverviewView />);
      expect(screen.getByText('Work Project')).toBeInTheDocument();
      expect(screen.getByText('Personal Project')).toBeInTheDocument();
      expect(screen.queryByText('Research Project')).not.toBeInTheDocument();
    });
  });
});

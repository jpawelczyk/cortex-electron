// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TodayView } from './TodayView';

let mockTasks: Record<string, unknown>[] = [];
let mockProjects: Record<string, unknown>[] = [];
let mockActiveContextIds: string[] = [];
const mockUpdateTask = vi.fn();
const mockSelectTask = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      tasks: mockTasks,
      projects: mockProjects,
      updateTask: mockUpdateTask,
      selectTask: mockSelectTask,
      selectedTaskId: null,
      activeContextIds: mockActiveContextIds,
      checklistItems: {},
      checklistsLoading: {},
      fetchChecklistItems: vi.fn(),
      createChecklistItem: vi.fn(),
      deleteChecklistItem: vi.fn(),
      updateChecklistItem: vi.fn(),
      contexts: [],
      fetchProjects: vi.fn(),
      agents: [],
      fetchAgents: vi.fn(),
      authUser: null,
    };
    return selector(state);
  },
}));

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const TODAY = daysFromNow(0);
const TOMORROW = daysFromNow(1);

const fakeTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Test task',
  notes: null,
  status: 'today',
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

const fakeProject = (overrides: Record<string, unknown> = {}) => ({
  id: 'proj-1',
  title: 'Test project',
  description: null,
  status: 'active',
  context_id: null,
  sort_order: 0,
  created_at: '2026-02-17T00:00:00.000Z',
  updated_at: '2026-02-17T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  ...overrides,
});

describe('TodayView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
    mockProjects = [];
    mockActiveContextIds = [];
  });

  it('shows tasks with when_date=today regardless of status', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Scheduled today', status: 'anytime', when_date: TODAY }),
    ];
    render(<TodayView />);
    expect(screen.getByText('Scheduled today')).toBeInTheDocument();
  });

  it('excludes logbook tasks even if when_date=today', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Done task', status: 'logbook', when_date: TODAY }),
    ];
    render(<TodayView />);
    expect(screen.queryByText('Done task')).not.toBeInTheDocument();
  });

  it('does not show tasks with when_date in the future', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Tomorrow task', status: 'upcoming', when_date: TOMORROW }),
    ];
    render(<TodayView />);
    expect(screen.queryByText('Tomorrow task')).not.toBeInTheDocument();
  });

  it('excludes tasks with past deadline (overdue belongs in Inbox)', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Overdue', status: 'today', deadline: '2025-01-01' }),
    ];
    render(<TodayView />);
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('completes a task by setting status to logbook', () => {
    mockTasks = [fakeTask({ id: 'task-42', title: 'Complete me', status: 'today' })];
    render(<TodayView />);
    const checkbox = screen.getByRole('checkbox');
    act(() => { checkbox.click(); });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-42', { status: 'logbook' });
  });

  describe('completed tasks', () => {
    it('keeps a completed task visible in the list', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'today' })];
      const { rerender } = render(<TodayView />);

      act(() => { screen.getByRole('checkbox').click(); });
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      // Store updates: task is now logbook
      mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<TodayView />);

      expect(screen.getByText('Just completed')).toBeInTheDocument();
    });

    it('keeps completed task in place before sort delay', () => {
      vi.useFakeTimers();
      mockTasks = [
        fakeTask({ id: '1', title: 'First task', status: 'today' }),
        fakeTask({ id: '2', title: 'Second task', status: 'today' }),
      ];
      const { rerender } = render(<TodayView />);

      act(() => { screen.getAllByRole('checkbox')[0].click(); });

      mockTasks = [
        fakeTask({ id: '1', title: 'First task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Second task', status: 'today' }),
      ];
      rerender(<TodayView />);

      // Before delay: completed task stays in original position
      const itemsBefore = screen.getAllByTestId('task-item');
      expect(itemsBefore[0]).toHaveTextContent('First task');
      expect(itemsBefore[1]).toHaveTextContent('Second task');

      vi.useRealTimers();
    });

    it('dismisses completed task after delay', () => {
      vi.useFakeTimers();
      mockTasks = [fakeTask({ id: '1', title: 'Active task', status: 'today' })];
      const { rerender } = render(<TodayView />);

      act(() => { screen.getByRole('checkbox').click(); });

      mockTasks = [
        fakeTask({ id: '1', title: 'Done task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'New today task', status: 'today' }),
      ];
      rerender(<TodayView />);

      // Advance past dismiss delay
      act(() => { vi.advanceTimersByTime(2500); });

      const items = screen.getAllByTestId('task-item');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('New today task');

      vi.useRealTimers();
    });

    it('uncompletes a completed task back to today on checkbox click', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'today' })];
      const { rerender } = render(<TodayView />);

      act(() => { screen.getByRole('checkbox').click(); });
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<TodayView />);

      vi.clearAllMocks();
      act(() => { screen.getByRole('checkbox').click(); });
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'today' });
    });

    it('task stays visible during uncomplete (before store updates)', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Task A', status: 'today' }),
        fakeTask({ id: '2', title: 'Task B', status: 'today' }),
      ];
      const { rerender } = render(<TodayView />);

      // Complete both tasks
      act(() => { screen.getAllByRole('checkbox')[0].click(); });
      mockTasks = [
        fakeTask({ id: '1', title: 'Task A', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Task B', status: 'today' }),
      ];
      rerender(<TodayView />);

      act(() => { screen.getAllByRole('checkbox')[1].click(); });
      mockTasks = [
        fakeTask({ id: '1', title: 'Task A', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Task B', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
      ];
      rerender(<TodayView />);

      // Both visible
      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.getByText('Task B')).toBeInTheDocument();

      // Uncomplete Task A — store still shows logbook (async IPC pending)
      act(() => { screen.getAllByRole('checkbox')[0].click(); });
      rerender(<TodayView />);

      // Both tasks must still be visible (no brief disappearance)
      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.getByText('Task B')).toBeInTheDocument();
    });

    it('does not show logbook tasks that were not completed in this session', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Old completed', status: 'logbook', completed_at: '2026-01-01T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Today task', status: 'today' }),
      ];
      render(<TodayView />);

      expect(screen.queryByText('Old completed')).not.toBeInTheDocument();
      expect(screen.getByText('Today task')).toBeInTheDocument();
    });

    it('does not flash old logbook tasks when completing a task', () => {
      vi.useFakeTimers();
      mockTasks = [
        fakeTask({ id: '1', title: 'Old completed', status: 'logbook', completed_at: '2026-01-01T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Active task', status: 'today' }),
      ];
      const { rerender } = render(<TodayView />);

      // Complete the active task
      act(() => { screen.getByRole('checkbox').click(); });

      // Store updates: task 2 is now logbook
      mockTasks = [
        fakeTask({ id: '1', title: 'Old completed', status: 'logbook', completed_at: '2026-01-01T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Active task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
      ];
      rerender(<TodayView />);

      // Old logbook task should NOT appear even within the dismiss window
      expect(screen.queryByText('Old completed')).not.toBeInTheDocument();
      // Recently completed task should still be visible
      expect(screen.getByText('Active task')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('context filtering', () => {
    it('shows only tasks matching active context', () => {
      mockActiveContextIds = ['ctx-work'];
      mockTasks = [
        fakeTask({ id: '1', title: 'Work task', status: 'today', context_id: 'ctx-work' }),
        fakeTask({ id: '2', title: 'Personal task', status: 'today', context_id: 'ctx-personal' }),
      ];
      render(<TodayView />);
      expect(screen.getByText('Work task')).toBeInTheDocument();
      expect(screen.queryByText('Personal task')).not.toBeInTheDocument();
    });

    it('shows tasks inheriting context from project', () => {
      mockActiveContextIds = ['ctx-work'];
      mockProjects = [
        fakeProject({ id: 'proj-1', context_id: 'ctx-work' }),
      ];
      mockTasks = [
        fakeTask({ id: '1', title: 'Project task', status: 'today', project_id: 'proj-1', context_id: null }),
      ];
      render(<TodayView />);
      expect(screen.getByText('Project task')).toBeInTheDocument();
    });

    it('hides tasks with non-matching context', () => {
      mockActiveContextIds = ['ctx-work'];
      mockTasks = [
        fakeTask({ id: '1', title: 'Personal task', status: 'today', context_id: 'ctx-personal' }),
        fakeTask({ id: '2', title: 'No context task', status: 'today', context_id: null }),
      ];
      render(<TodayView />);
      expect(screen.queryByText('Personal task')).not.toBeInTheDocument();
      expect(screen.queryByText('No context task')).not.toBeInTheDocument();
    });

    it('supports multiple active contexts', () => {
      mockActiveContextIds = ['ctx-work', 'ctx-personal'];
      mockTasks = [
        fakeTask({ id: '1', title: 'Work task', status: 'today', context_id: 'ctx-work' }),
        fakeTask({ id: '2', title: 'Personal task', status: 'today', context_id: 'ctx-personal' }),
        fakeTask({ id: '3', title: 'Research task', status: 'today', context_id: 'ctx-research' }),
      ];
      render(<TodayView />);
      expect(screen.getByText('Work task')).toBeInTheDocument();
      expect(screen.getByText('Personal task')).toBeInTheDocument();
      expect(screen.queryByText('Research task')).not.toBeInTheDocument();
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TodayView } from './TodayView';

let mockTasks: any[] = [];
const mockFetchTasks = vi.fn();
const mockUpdateTask = vi.fn();
const mockSelectTask = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: any) => any) => {
    const state = {
      tasks: mockTasks,
      tasksLoading: false,
      fetchTasks: mockFetchTasks,
      updateTask: mockUpdateTask,
      selectTask: mockSelectTask,
      selectedTaskId: null,
    };
    return selector(state);
  },
}));

const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

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

describe('TodayView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
  });

  it('renders the Today heading', () => {
    render(<TodayView />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows empty state when no today tasks', () => {
    render(<TodayView />);
    expect(screen.getByText(/nothing scheduled for today/i)).toBeInTheDocument();
  });

  it('shows tasks with status=today', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Status today', status: 'today' })];
    render(<TodayView />);
    expect(screen.getByText('Status today')).toBeInTheDocument();
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

  it('excludes cancelled tasks even if when_date=today', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Cancelled task', status: 'cancelled', when_date: TODAY }),
    ];
    render(<TodayView />);
    expect(screen.queryByText('Cancelled task')).not.toBeInTheDocument();
  });

  it('does not show tasks with when_date in the future', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Tomorrow task', status: 'upcoming', when_date: TOMORROW }),
    ];
    render(<TodayView />);
    expect(screen.queryByText('Tomorrow task')).not.toBeInTheDocument();
  });

  it('completes a task by setting status to logbook', () => {
    mockTasks = [fakeTask({ id: 'task-42', title: 'Complete me', status: 'today' })];
    render(<TodayView />);
    const checkbox = screen.getByRole('checkbox');
    checkbox.click();
    expect(mockUpdateTask).toHaveBeenCalledWith('task-42', { status: 'logbook' });
  });

  describe('completed tasks', () => {
    it('keeps a completed task visible in the list', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'today' })];
      const { rerender } = render(<TodayView />);

      screen.getByRole('checkbox').click();
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      // Store updates: task is now logbook
      mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<TodayView />);

      expect(screen.getByText('Just completed')).toBeInTheDocument();
    });

    it('sorts completed tasks to the bottom', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Active task', status: 'today' })];
      const { rerender } = render(<TodayView />);

      screen.getByRole('checkbox').click();

      mockTasks = [
        fakeTask({ id: '1', title: 'Done task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'New today task', status: 'today' }),
      ];
      rerender(<TodayView />);

      const items = screen.getAllByTestId('task-item');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('New today task');
      expect(items[1]).toHaveTextContent('Done task');
    });

    it('uncompletes a completed task back to today on checkbox click', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'today' })];
      const { rerender } = render(<TodayView />);

      screen.getByRole('checkbox').click();
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<TodayView />);

      vi.clearAllMocks();
      screen.getByRole('checkbox').click();
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'today' });
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
  });
});

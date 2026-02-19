// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AnytimeView } from './AnytimeView';

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
      checklistItems: {},
      checklistsLoading: {},
      fetchChecklistItems: vi.fn(),
      createChecklistItem: vi.fn(),
      deleteChecklistItem: vi.fn(),
      updateChecklistItem: vi.fn(),
    };
    return selector(state);
  },
}));

const fakeTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Test task',
  notes: null,
  status: 'anytime',
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

describe('AnytimeView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
  });

  it('renders the Anytime heading', () => {
    render(<AnytimeView />);
    expect(screen.getByText('Anytime')).toBeInTheDocument();
  });

  it('shows empty state when no anytime tasks', () => {
    render(<AnytimeView />);
    expect(screen.getByText(/no anytime tasks/i)).toBeInTheDocument();
  });

  it('shows tasks with status=anytime', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Anytime task' })];
    render(<AnytimeView />);
    expect(screen.getByText('Anytime task')).toBeInTheDocument();
  });

  it('excludes tasks with other statuses', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Today task', status: 'today' }),
      fakeTask({ id: '2', title: 'Inbox task', status: 'inbox' }),
      fakeTask({ id: '3', title: 'Upcoming task', status: 'upcoming' }),
      fakeTask({ id: '4', title: 'Anytime task', status: 'anytime' }),
    ];
    render(<AnytimeView />);
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
    expect(screen.queryByText('Inbox task')).not.toBeInTheDocument();
    expect(screen.queryByText('Upcoming task')).not.toBeInTheDocument();
    expect(screen.getByText('Anytime task')).toBeInTheDocument();
  });

  it('completes a task by setting status to logbook', () => {
    mockTasks = [fakeTask({ id: 'task-42', title: 'Complete me' })];
    render(<AnytimeView />);
    const checkbox = screen.getByRole('checkbox');
    checkbox.click();
    expect(mockUpdateTask).toHaveBeenCalledWith('task-42', { status: 'logbook' });
  });

  describe('completed tasks', () => {
    it('keeps a completed task visible in the list', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Just completed' })];
      const { rerender } = render(<AnytimeView />);

      screen.getByRole('checkbox').click();
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      // Store updates: task is now logbook
      mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<AnytimeView />);

      expect(screen.getByText('Just completed')).toBeInTheDocument();
    });

    it('sorts completed tasks to the bottom after delay', () => {
      vi.useFakeTimers();
      mockTasks = [fakeTask({ id: '1', title: 'Active task' })];
      const { rerender } = render(<AnytimeView />);

      screen.getByRole('checkbox').click();

      mockTasks = [
        fakeTask({ id: '1', title: 'Done task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'New anytime task', status: 'anytime' }),
      ];
      rerender(<AnytimeView />);

      // Advance past sort delay
      act(() => { vi.advanceTimersByTime(400); });

      const items = screen.getAllByTestId('task-item');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('New anytime task');
      expect(items[1]).toHaveTextContent('Done task');

      vi.useRealTimers();
    });

    it('uncompletes a completed task back to anytime on checkbox click', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Task' })];
      const { rerender } = render(<AnytimeView />);

      screen.getByRole('checkbox').click();
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<AnytimeView />);

      vi.clearAllMocks();
      screen.getByRole('checkbox').click();
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'anytime' });
    });

    it('does not show logbook tasks that were not completed in this session', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Old completed', status: 'logbook', completed_at: '2026-01-01T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Anytime task', status: 'anytime' }),
      ];
      render(<AnytimeView />);

      expect(screen.queryByText('Old completed')).not.toBeInTheDocument();
      expect(screen.getByText('Anytime task')).toBeInTheDocument();
    });
  });
});

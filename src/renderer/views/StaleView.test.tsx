// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StaleView } from './StaleView';

let mockTasks: Record<string, unknown>[] = [];
const mockFetchTasks = vi.fn();
const mockUpdateTask = vi.fn();
const mockSelectTask = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
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
  status: 'stale',
  when_date: '2026-01-10',
  deadline: null,
  project_id: null,
  heading_id: null,
  context_id: null,
  priority: null,
  sort_order: 0,
  created_at: '2026-01-10T00:00:00.000Z',
  updated_at: '2026-02-17T00:00:00.000Z',
  completed_at: null,
  deleted_at: null,
  stale_at: '2026-02-15T00:00:00.000Z',
  ...overrides,
});

describe('StaleView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
  });

  it('renders the Stale heading', () => {
    render(<StaleView />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('shows empty state when no stale tasks', () => {
    render(<StaleView />);
    expect(screen.getByText(/no stale tasks/i)).toBeInTheDocument();
  });

  it('shows tasks with status=stale', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Stale task' })];
    render(<StaleView />);
    expect(screen.getByText('Stale task')).toBeInTheDocument();
  });

  it('does not show tasks with other statuses', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Today task', status: 'today' }),
      fakeTask({ id: '2', title: 'Inbox task', status: 'inbox' }),
      fakeTask({ id: '3', title: 'Stale task', status: 'stale' }),
    ];
    render(<StaleView />);
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
    expect(screen.queryByText('Inbox task')).not.toBeInTheDocument();
    expect(screen.getByText('Stale task')).toBeInTheDocument();
  });

  it('completes a stale task by setting status to logbook', () => {
    mockTasks = [fakeTask({ id: 'task-42', title: 'Complete me' })];
    render(<StaleView />);
    const checkbox = screen.getByRole('checkbox');
    checkbox.click();
    expect(mockUpdateTask).toHaveBeenCalledWith('task-42', { status: 'logbook' });
  });

  it('keeps a completed task visible after checkbox click', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Just completed' })];
    const { rerender } = render(<StaleView />);

    screen.getByRole('checkbox').click();
    expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

    mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
    rerender(<StaleView />);

    expect(screen.getByText('Just completed')).toBeInTheDocument();
  });

  it('sorts completed tasks to the bottom after delay', () => {
    vi.useFakeTimers();
    mockTasks = [fakeTask({ id: '1', title: 'Stale task' })];
    const { rerender } = render(<StaleView />);

    screen.getByRole('checkbox').click();

    mockTasks = [
      fakeTask({ id: '1', title: 'Done task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
      fakeTask({ id: '2', title: 'New stale task', status: 'stale' }),
    ];
    rerender(<StaleView />);

    act(() => { vi.advanceTimersByTime(400); });

    const items = screen.getAllByTestId('task-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('New stale task');
    expect(items[1]).toHaveTextContent('Done task');

    vi.useRealTimers();
  });
});

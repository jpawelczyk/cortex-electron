// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { UpcomingView } from './UpcomingView';

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
      projects: [],
      contexts: [],
      fetchProjects: vi.fn(),
    };
    return selector(state);
  },
}));

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const TODAY = daysFromNow(0);
const TOMORROW = daysFromNow(1);
const YESTERDAY = daysFromNow(-1);

const fakeTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Test task',
  notes: null,
  status: 'upcoming',
  when_date: TOMORROW,
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

describe('UpcomingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
  });

  it('renders the Upcoming heading', () => {
    render(<UpcomingView />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('shows empty state when no upcoming tasks', () => {
    render(<UpcomingView />);
    expect(screen.getByText(/nothing upcoming/i)).toBeInTheDocument();
  });

  it('shows tasks with status=upcoming', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Upcoming task' })];
    render(<UpcomingView />);
    expect(screen.getByText('Upcoming task')).toBeInTheDocument();
  });

  it('excludes tasks with other statuses', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Inbox task', status: 'inbox', when_date: null }),
      fakeTask({ id: '2', title: 'Today task', status: 'today', when_date: null }),
      fakeTask({ id: '3', title: 'Logbook task', status: 'logbook', when_date: TOMORROW }),
      fakeTask({ id: '4', title: 'Cancelled task', status: 'cancelled', when_date: TOMORROW }),
    ];
    render(<UpcomingView />);
    expect(screen.queryByText('Inbox task')).not.toBeInTheDocument();
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
    expect(screen.queryByText('Logbook task')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelled task')).not.toBeInTheDocument();
  });

  it('groups tasks by when_date with date headers', () => {
    const dayAfterTomorrow = daysFromNow(2);
    mockTasks = [
      fakeTask({ id: '1', title: 'Task A', when_date: TOMORROW }),
      fakeTask({ id: '2', title: 'Task B', when_date: dayAfterTomorrow }),
    ];
    render(<UpcomingView />);

    const groups = screen.getAllByTestId('upcoming-date-group');
    expect(groups).toHaveLength(2);
  });

  it('shows "Today" label for overdue tasks (past when_date)', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Overdue', when_date: YESTERDAY })];
    render(<UpcomingView />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows "Today" label for tasks with when_date=today', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Due today', when_date: TODAY })];
    render(<UpcomingView />);
    // "Upcoming" is the heading, "Today" is the group header
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows "Tomorrow" label for tomorrow tasks', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Due tomorrow', when_date: TOMORROW })];
    render(<UpcomingView />);
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  });

  it('shows day-of-week label for dates within this week (2-6 days out)', () => {
    const threeDaysOut = daysFromNow(3);
    const expectedDay = new Date(threeDaysOut).toLocaleDateString('en-US', { weekday: 'long' });
    mockTasks = [fakeTask({ id: '1', title: 'This week task', when_date: threeDaysOut })];
    render(<UpcomingView />);
    expect(screen.getByText(expectedDay)).toBeInTheDocument();
  });

  it('shows full date label for dates beyond this week', () => {
    const tenDaysOut = daysFromNow(10);
    const expected = new Date(tenDaysOut + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    mockTasks = [fakeTask({ id: '1', title: 'Far task', when_date: tenDaysOut })];
    render(<UpcomingView />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('orders groups chronologically (ascending, soonest first)', () => {
    const dayAfterTomorrow = daysFromNow(2);
    mockTasks = [
      fakeTask({ id: '2', title: 'Later task', when_date: dayAfterTomorrow }),
      fakeTask({ id: '1', title: 'Sooner task', when_date: TOMORROW }),
    ];
    render(<UpcomingView />);

    const groups = screen.getAllByTestId('upcoming-date-group');
    expect(groups[0]).toHaveTextContent('Tomorrow');
  });

  it('completes a task by setting status to logbook', () => {
    mockTasks = [fakeTask({ id: 'task-42', title: 'Complete me' })];
    render(<UpcomingView />);
    const checkbox = screen.getByRole('checkbox');
    act(() => { checkbox.click(); });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-42', { status: 'logbook' });
  });

  it('keeps a completed task visible in the list', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Just completed' })];
    const { rerender } = render(<UpcomingView />);

    act(() => { screen.getByRole('checkbox').click(); });
    expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

    // Store updates: task is now logbook
    mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
    rerender(<UpcomingView />);

    expect(screen.getByText('Just completed')).toBeInTheDocument();
  });

  it('keeps completed task in place before sort delay', () => {
    vi.useFakeTimers();
    mockTasks = [
      fakeTask({ id: '1', title: 'First task' }),
      fakeTask({ id: '2', title: 'Second task' }),
    ];
    const { rerender } = render(<UpcomingView />);

    act(() => { screen.getAllByRole('checkbox')[0].click(); });

    mockTasks = [
      fakeTask({ id: '1', title: 'First task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
      fakeTask({ id: '2', title: 'Second task' }),
    ];
    rerender(<UpcomingView />);

    // Before delay: completed task stays in original position
    const itemsBefore = screen.getAllByTestId('task-item');
    expect(itemsBefore[0]).toHaveTextContent('First task');
    expect(itemsBefore[1]).toHaveTextContent('Second task');

    vi.useRealTimers();
  });

  it('sorts completed tasks to the bottom of group after delay', () => {
    vi.useFakeTimers();
    mockTasks = [fakeTask({ id: '1', title: 'Active task' })];
    const { rerender } = render(<UpcomingView />);

    act(() => { screen.getByRole('checkbox').click(); });

    mockTasks = [
      fakeTask({ id: '1', title: 'Done task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
      fakeTask({ id: '2', title: 'New upcoming task' }),
    ];
    rerender(<UpcomingView />);

    // Advance past sort delay
    act(() => { vi.advanceTimersByTime(400); });

    const items = screen.getAllByTestId('task-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('New upcoming task');
    expect(items[1]).toHaveTextContent('Done task');

    vi.useRealTimers();
  });

  it('uncompletes a task back to upcoming', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Task' })];
    const { rerender } = render(<UpcomingView />);

    act(() => { screen.getByRole('checkbox').click(); });
    expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

    mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
    rerender(<UpcomingView />);

    vi.clearAllMocks();
    act(() => { screen.getByRole('checkbox').click(); });
    expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'upcoming' });
  });

  it('calls fetchTasks on mount', () => {
    render(<UpcomingView />);
    expect(mockFetchTasks).toHaveBeenCalled();
  });
});

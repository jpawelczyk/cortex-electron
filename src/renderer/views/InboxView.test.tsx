// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InboxView } from './InboxView';

// Mock the store
let mockTasks: Record<string, unknown>[] = [];
let mockIsInlineCreating = false;
const mockFetchTasks = vi.fn();
const mockUpdateTask = vi.fn();
const mockCreateTask = vi.fn();
const mockCancelInlineCreate = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      tasks: mockTasks,
      tasksLoading: false,
      fetchTasks: mockFetchTasks,
      updateTask: mockUpdateTask,
      createTask: mockCreateTask,
      isInlineCreating: mockIsInlineCreating,
      cancelInlineCreate: mockCancelInlineCreate,
      selectTask: vi.fn(),
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
      agents: [],
      fetchAgents: vi.fn(),
      authUser: null,
    };
    return selector(state);
  },
}));

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

describe('InboxView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
    mockIsInlineCreating = false;
  });

  it('renders the Inbox heading', () => {
    render(<InboxView />);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('shows empty state when no inbox tasks', () => {
    render(<InboxView />);
    expect(screen.getByText(/no tasks in your inbox/i)).toBeInTheDocument();
  });

  it('renders inbox tasks from the store', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Triage this' })];
    render(<InboxView />);
    expect(screen.getByText('Triage this')).toBeInTheDocument();
  });

  it('filters to only inbox tasks', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Inbox task', status: 'inbox' }),
      fakeTask({ id: '2', title: 'Today task', status: 'today' }),
    ];
    render(<InboxView />);
    expect(screen.getByText('Inbox task')).toBeInTheDocument();
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
  });

  it('excludes inbox tasks that have a when_date (already triaged)', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Untriaged', status: 'inbox', when_date: null }),
      fakeTask({ id: '2', title: 'Scheduled', status: 'inbox', when_date: '2026-02-19' }),
    ];
    render(<InboxView />);
    expect(screen.getByText('Untriaged')).toBeInTheDocument();
    expect(screen.queryByText('Scheduled')).not.toBeInTheDocument();
  });

  it('shows inline task card when isInlineCreating is true', () => {
    mockIsInlineCreating = true;
    render(<InboxView />);
    expect(screen.getByTestId('inline-task-card')).toBeInTheDocument();
  });

  it('does not show inline task card when isInlineCreating is false', () => {
    mockIsInlineCreating = false;
    render(<InboxView />);
    expect(screen.queryByTestId('inline-task-card')).not.toBeInTheDocument();
  });

  it('shows inline task card above existing tasks', () => {
    mockIsInlineCreating = true;
    mockTasks = [fakeTask({ id: '1', title: 'Existing task' })];
    render(<InboxView />);
    const card = screen.getByTestId('inline-task-card');
    const task = screen.getByText('Existing task');
    // Card should appear before the task in DOM order
    expect(card.compareDocumentPosition(task)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('hides empty state when inline card is shown', () => {
    mockIsInlineCreating = true;
    render(<InboxView />);
    expect(screen.queryByText(/no tasks in your inbox/i)).not.toBeInTheDocument();
  });

  describe('overdue by deadline', () => {
    it('shows tasks with past deadline in inbox', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Overdue task', status: 'today', deadline: '2025-01-01' }),
        fakeTask({ id: '2', title: 'Inbox task', status: 'inbox' }),
      ];
      render(<InboxView />);
      expect(screen.getByText('Overdue task')).toBeInTheDocument();
      expect(screen.getByText('Inbox task')).toBeInTheDocument();
    });

    it('shows Overdue section header', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Past due', status: 'today', deadline: '2025-01-01' }),
      ];
      render(<InboxView />);
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('overdue tasks appear above regular inbox tasks', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Regular inbox', status: 'inbox' }),
        fakeTask({ id: '2', title: 'Overdue task', status: 'today', deadline: '2025-01-01' }),
      ];
      render(<InboxView />);
      const overdueHeader = screen.getByText('Overdue');
      const inboxTask = screen.getByText('Regular inbox');
      expect(overdueHeader.compareDocumentPosition(inboxTask)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('someday tasks with past deadline do NOT appear as overdue', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Someday overdue', status: 'someday', deadline: '2025-01-01' }),
      ];
      render(<InboxView />);
      expect(screen.queryByText('Someday overdue')).not.toBeInTheDocument();
    });

    it('completed tasks do NOT appear as overdue', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Done overdue', status: 'logbook', deadline: '2025-01-01', completed_at: '2025-02-01T00:00:00.000Z' }),
      ];
      render(<InboxView />);
      expect(screen.queryByText('Done overdue')).not.toBeInTheDocument();
    });

    it('tasks with future deadline do NOT appear as overdue', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Future deadline', status: 'today', deadline: '2099-12-31' }),
      ];
      render(<InboxView />);
      expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
    });

    it('does not show Overdue header when no overdue tasks', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Regular inbox', status: 'inbox' }),
      ];
      render(<InboxView />);
      expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
    });
  });

  describe('completed tasks', () => {
    it('keeps a completed task visible in the list', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'inbox' })];
      const { rerender } = render(<InboxView />);

      // Simulate completing via checkbox
      const checkbox = screen.getByRole('checkbox');
      act(() => { checkbox.click(); });
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      // Store updates: task is now logbook
      mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<InboxView />);

      expect(screen.getByText('Just completed')).toBeInTheDocument();
    });

    it('keeps completed task in place before sort delay', () => {
      vi.useFakeTimers();
      mockTasks = [
        fakeTask({ id: '1', title: 'First task', status: 'inbox' }),
        fakeTask({ id: '2', title: 'Second task', status: 'inbox' }),
      ];
      const { rerender } = render(<InboxView />);

      // Complete the first task
      act(() => { screen.getAllByRole('checkbox')[0].click(); });

      mockTasks = [
        fakeTask({ id: '1', title: 'First task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Second task', status: 'inbox' }),
      ];
      rerender(<InboxView />);

      // Before delay: completed task stays in original position
      const itemsBefore = screen.getAllByTestId('task-item');
      expect(itemsBefore[0]).toHaveTextContent('First task');
      expect(itemsBefore[1]).toHaveTextContent('Second task');

      vi.useRealTimers();
    });

    it('sorts completed tasks to the bottom after delay', () => {
      vi.useFakeTimers();
      mockTasks = [fakeTask({ id: '1', title: 'Active task', status: 'inbox' })];
      const { rerender } = render(<InboxView />);

      // Complete the task
      act(() => { screen.getByRole('checkbox').click(); });

      // Store updates with completed task + a new inbox task
      mockTasks = [
        fakeTask({ id: '1', title: 'Done task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'New inbox task', status: 'inbox' }),
      ];
      rerender(<InboxView />);

      // Advance past sort delay
      act(() => { vi.advanceTimersByTime(400); });

      const items = screen.getAllByTestId('task-item');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('New inbox task');
      expect(items[1]).toHaveTextContent('Done task');

      vi.useRealTimers();
    });

    it('uncompletes a completed task back to inbox on checkbox click', () => {
      mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'inbox' })];
      const { rerender } = render(<InboxView />);

      // Complete
      act(() => { screen.getByRole('checkbox').click(); });
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

      // Store updates to logbook
      mockTasks = [fakeTask({ id: '1', title: 'Task', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
      rerender(<InboxView />);

      // Uncomplete
      vi.clearAllMocks();
      act(() => { screen.getByRole('checkbox').click(); });
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'inbox' });
    });

    it('task stays visible during uncomplete (before store updates)', () => {
      mockTasks = [
        fakeTask({ id: '1', title: 'Task A', status: 'inbox' }),
        fakeTask({ id: '2', title: 'Task B', status: 'inbox' }),
      ];
      const { rerender } = render(<InboxView />);

      // Complete both tasks
      act(() => { screen.getAllByRole('checkbox')[0].click(); });
      mockTasks = [
        fakeTask({ id: '1', title: 'Task A', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Task B', status: 'inbox' }),
      ];
      rerender(<InboxView />);

      act(() => { screen.getAllByRole('checkbox')[1].click(); });
      mockTasks = [
        fakeTask({ id: '1', title: 'Task A', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Task B', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' }),
      ];
      rerender(<InboxView />);

      // Both visible
      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.getByText('Task B')).toBeInTheDocument();

      // Uncomplete Task A — store still shows logbook (async IPC pending)
      act(() => { screen.getAllByRole('checkbox')[0].click(); });
      // Re-render WITHOUT changing mockTasks (simulates store not yet updated)
      rerender(<InboxView />);

      // Both tasks must still be visible (no brief disappearance)
      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.getByText('Task B')).toBeInTheDocument();
    });

    it('shows logbook tasks completed today on fresh mount', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-18T12:00:00'));

      mockTasks = [
        fakeTask({ id: '1', title: 'Done today', status: 'logbook', completed_at: '2026-02-18T10:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Inbox task', status: 'inbox' }),
      ];
      render(<InboxView />);

      expect(screen.getByText('Done today')).toBeInTheDocument();
      expect(screen.getByText('Inbox task')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('sorts tasks completed today to the bottom on fresh mount', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-18T12:00:00'));

      mockTasks = [
        fakeTask({ id: '1', title: 'Done today', status: 'logbook', completed_at: '2026-02-18T09:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Inbox task', status: 'inbox' }),
      ];
      render(<InboxView />);

      const items = screen.getAllByTestId('task-item');
      expect(items[0]).toHaveTextContent('Inbox task');
      expect(items[1]).toHaveTextContent('Done today');

      vi.useRealTimers();
    });

    it('does not show logbook tasks completed on previous days', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-18T12:00:00'));

      mockTasks = [
        fakeTask({ id: '1', title: 'Done yesterday', status: 'logbook', completed_at: '2026-02-17T10:00:00.000Z' }),
        fakeTask({ id: '2', title: 'Inbox task', status: 'inbox' }),
      ];
      render(<InboxView />);

      expect(screen.queryByText('Done yesterday')).not.toBeInTheDocument();
      expect(screen.getByText('Inbox task')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows store-loaded logbook task completed today with checked checkbox', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-18T12:00:00'));

      mockTasks = [
        fakeTask({ id: '1', title: 'Done today', status: 'logbook', completed_at: '2026-02-18T09:00:00.000Z' }),
      ];
      render(<InboxView />);

      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');

      vi.useRealTimers();
    });

    it('uncompletes a store-loaded logbook task on checkbox click', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-18T12:00:00'));

      mockTasks = [
        fakeTask({ id: '1', title: 'Done today', status: 'logbook', completed_at: '2026-02-18T09:00:00.000Z' }),
      ];
      render(<InboxView />);

      // Click checkbox on the already-completed task
      act(() => { screen.getByRole('checkbox').click(); });
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'inbox' });

      vi.useRealTimers();
    });
  });
});

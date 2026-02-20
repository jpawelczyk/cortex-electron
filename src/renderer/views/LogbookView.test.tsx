// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LogbookView } from './LogbookView';

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
  completed_at: '2026-02-18T12:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('LogbookView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
  });

  it('renders the Logbook heading', () => {
    render(<LogbookView />);
    expect(screen.getByText('Logbook')).toBeInTheDocument();
  });

  it('shows empty state when no logbook tasks', () => {
    render(<LogbookView />);
    expect(screen.getByText(/no completed tasks/i)).toBeInTheDocument();
  });

  it('shows logbook tasks and excludes non-logbook tasks', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Completed task' }),
      fakeTask({ id: '2', title: 'Inbox task', status: 'inbox', completed_at: null }),
      fakeTask({ id: '3', title: 'Today task', status: 'today', completed_at: null }),
    ];
    render(<LogbookView />);
    expect(screen.getByText('Completed task')).toBeInTheDocument();
    expect(screen.queryByText('Inbox task')).not.toBeInTheDocument();
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
  });

  it('groups tasks by completion date with correct headers', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const older = new Date(2026, 1, 10, 14, 0, 0); // Feb 10, 2026

    mockTasks = [
      fakeTask({ id: '1', title: 'Today task', completed_at: today.toISOString() }),
      fakeTask({ id: '2', title: 'Yesterday task', completed_at: yesterday.toISOString() }),
      fakeTask({ id: '3', title: 'Older task', completed_at: older.toISOString() }),
    ];
    render(<LogbookView />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('February 10, 2026')).toBeInTheDocument();
  });

  it('orders groups reverse-chronologically', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    mockTasks = [
      fakeTask({ id: '1', title: 'Yesterday task', completed_at: yesterday.toISOString() }),
      fakeTask({ id: '2', title: 'Today task', completed_at: today.toISOString() }),
    ];
    render(<LogbookView />);

    const groups = screen.getAllByTestId('logbook-date-group');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveTextContent('Today');
    expect(groups[1]).toHaveTextContent('Yesterday');
  });

  it('orders tasks within a group reverse-chronologically', () => {
    const earlier = '2026-02-18T08:00:00.000Z';
    const later = '2026-02-18T16:00:00.000Z';

    mockTasks = [
      fakeTask({ id: '1', title: 'Morning task', completed_at: earlier }),
      fakeTask({ id: '2', title: 'Afternoon task', completed_at: later }),
    ];
    render(<LogbookView />);

    const items = screen.getAllByTestId('task-item');
    expect(items[0]).toHaveTextContent('Afternoon task');
    expect(items[1]).toHaveTextContent('Morning task');
  });

  it('uncompletes a task by setting status to inbox', () => {
    mockTasks = [fakeTask({ id: 'task-42', title: 'Uncomplete me' })];
    render(<LogbookView />);
    const checkbox = screen.getByRole('checkbox');
    checkbox.click();
    expect(mockUpdateTask).toHaveBeenCalledWith('task-42', { status: 'inbox' });
  });

  it('renders all checkboxes as checked', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Task A' }),
      fakeTask({ id: '2', title: 'Task B' }),
    ];
    render(<LogbookView />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((cb) => {
      expect(cb).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('calls fetchTasks on mount', () => {
    render(<LogbookView />);
    expect(mockFetchTasks).toHaveBeenCalled();
  });

  it('excludes logbook tasks without completed_at', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Has date', completed_at: '2026-02-18T12:00:00.000Z' }),
      fakeTask({ id: '2', title: 'No date', completed_at: null }),
    ];
    render(<LogbookView />);
    expect(screen.getByText('Has date')).toBeInTheDocument();
    expect(screen.queryByText('No date')).not.toBeInTheDocument();
  });
});

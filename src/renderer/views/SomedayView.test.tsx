// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SomedayView } from './SomedayView';

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
  status: 'someday',
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

describe('SomedayView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks = [];
  });

  it('renders the Someday heading', () => {
    render(<SomedayView />);
    expect(screen.getByText('Someday')).toBeInTheDocument();
  });

  it('shows empty state when no someday tasks', () => {
    render(<SomedayView />);
    expect(screen.getByText(/no someday tasks/i)).toBeInTheDocument();
  });

  it('shows tasks with status=someday', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Someday task' })];
    render(<SomedayView />);
    expect(screen.getByText('Someday task')).toBeInTheDocument();
  });

  it('excludes tasks with other statuses', () => {
    mockTasks = [
      fakeTask({ id: '1', title: 'Today task', status: 'today' }),
      fakeTask({ id: '2', title: 'Inbox task', status: 'inbox' }),
      fakeTask({ id: '3', title: 'Someday task', status: 'someday' }),
    ];
    render(<SomedayView />);
    expect(screen.queryByText('Today task')).not.toBeInTheDocument();
    expect(screen.queryByText('Inbox task')).not.toBeInTheDocument();
    expect(screen.getByText('Someday task')).toBeInTheDocument();
  });

  it('completes a someday task by setting status to logbook', () => {
    mockTasks = [fakeTask({ id: 'task-42', title: 'Complete me' })];
    render(<SomedayView />);
    const checkbox = screen.getByRole('checkbox');
    act(() => { checkbox.click(); });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-42', { status: 'logbook' });
  });

  it('keeps a completed task visible after checkbox click', () => {
    mockTasks = [fakeTask({ id: '1', title: 'Just completed' })];
    const { rerender } = render(<SomedayView />);

    act(() => { screen.getByRole('checkbox').click(); });
    expect(mockUpdateTask).toHaveBeenCalledWith('1', { status: 'logbook' });

    mockTasks = [fakeTask({ id: '1', title: 'Just completed', status: 'logbook', completed_at: '2026-02-18T00:00:00.000Z' })];
    rerender(<SomedayView />);

    expect(screen.getByText('Just completed')).toBeInTheDocument();
  });

  it('shows empty state message', () => {
    render(<SomedayView />);
    expect(screen.getByText(/no someday tasks/i)).toBeInTheDocument();
  });
});

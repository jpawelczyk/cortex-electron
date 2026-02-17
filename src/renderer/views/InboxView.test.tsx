// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InboxView } from './InboxView';

// Mock the store
let mockTasks: any[] = [];
let mockIsInlineCreating = false;
const mockFetchTasks = vi.fn();
const mockUpdateTask = vi.fn();
const mockCreateTask = vi.fn();
const mockCancelInlineCreate = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: any) => any) => {
    const state = {
      tasks: mockTasks,
      tasksLoading: false,
      fetchTasks: mockFetchTasks,
      updateTask: mockUpdateTask,
      createTask: mockCreateTask,
      isInlineCreating: mockIsInlineCreating,
      cancelInlineCreate: mockCancelInlineCreate,
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
});

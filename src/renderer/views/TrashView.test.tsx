// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TrashView } from './TrashView';

// Mock the store
const mockStore: Record<string, unknown> = {
  trashedTasks: [],
  fetchTrashedTasks: vi.fn(),
  restoreTask: vi.fn(),
  emptyTrash: vi.fn(),
};

vi.mock('../stores', () => ({
  useStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

const fakeTask = (overrides = {}) => ({
  id: 'task-1',
  title: 'Deleted task',
  notes: null,
  status: 'inbox' as const,
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
  deleted_at: '2026-02-17T12:00:00.000Z',
  ...overrides,
});

describe('TrashView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.trashedTasks = [];
  });

  it('calls fetchTrashedTasks on mount', () => {
    render(<TrashView />);
    expect(mockStore.fetchTrashedTasks).toHaveBeenCalledOnce();
  });

  it('shows empty state when no trashed tasks', () => {
    render(<TrashView />);
    expect(screen.getByText('Trash is empty')).toBeInTheDocument();
  });

  it('renders trashed tasks', () => {
    mockStore.trashedTasks = [
      fakeTask({ id: '1', title: 'First deleted' }),
      fakeTask({ id: '2', title: 'Second deleted' }),
    ];
    render(<TrashView />);
    expect(screen.getByText('First deleted')).toBeInTheDocument();
    expect(screen.getByText('Second deleted')).toBeInTheDocument();
  });

  it('shows item count in header', () => {
    mockStore.trashedTasks = [fakeTask()];
    render(<TrashView />);
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('shows plural item count', () => {
    mockStore.trashedTasks = [
      fakeTask({ id: '1' }),
      fakeTask({ id: '2' }),
    ];
    render(<TrashView />);
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('shows Empty Trash button when items exist', () => {
    mockStore.trashedTasks = [fakeTask()];
    render(<TrashView />);
    expect(screen.getByLabelText('Empty Trash')).toBeInTheDocument();
  });

  it('does not show Empty Trash button when empty', () => {
    render(<TrashView />);
    expect(screen.queryByLabelText('Empty Trash')).not.toBeInTheDocument();
  });

  it('does not call emptyTrash on first click — shows confirmation', () => {
    mockStore.trashedTasks = [fakeTask()];
    render(<TrashView />);
    fireEvent.click(screen.getByLabelText('Empty Trash'));
    expect(mockStore.emptyTrash).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm empty trash')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel empty trash')).toBeInTheDocument();
  });

  it('calls emptyTrash when Yes clicked', () => {
    mockStore.trashedTasks = [fakeTask()];
    render(<TrashView />);
    fireEvent.click(screen.getByLabelText('Empty Trash'));
    fireEvent.click(screen.getByLabelText('Confirm empty trash'));
    expect(mockStore.emptyTrash).toHaveBeenCalledOnce();
  });

  it('resets confirmation when No clicked', () => {
    mockStore.trashedTasks = [fakeTask()];
    render(<TrashView />);
    fireEvent.click(screen.getByLabelText('Empty Trash'));
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Cancel empty trash'));
    expect(screen.getByLabelText('Empty Trash')).toBeInTheDocument();
    expect(screen.queryByText('Confirm?')).not.toBeInTheDocument();
  });

  it('calls restoreTask when restore button clicked', () => {
    mockStore.trashedTasks = [fakeTask({ id: 'task-1' })];
    render(<TrashView />);
    const restoreButton = screen.getByLabelText('Restore task');
    fireEvent.click(restoreButton);
    expect(mockStore.restoreTask).toHaveBeenCalledWith('task-1');
  });

  it('shows task title with strikethrough styling', () => {
    mockStore.trashedTasks = [fakeTask({ title: 'Struck task' })];
    render(<TrashView />);
    const title = screen.getByText('Struck task');
    expect(title).toHaveClass('line-through');
  });
});

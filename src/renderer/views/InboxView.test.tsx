// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InboxView } from './InboxView';

// Mock the store
const mockGetInboxTasks = vi.fn();
const mockFetchTasks = vi.fn();
const mockUpdateTask = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: any) => any) => {
    const state = {
      tasks: [],
      tasksLoading: false,
      getInboxTasks: mockGetInboxTasks,
      fetchTasks: mockFetchTasks,
      updateTask: mockUpdateTask,
    };
    return selector(state);
  },
}));

describe('InboxView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInboxTasks.mockReturnValue([]);
  });

  it('renders the Inbox heading', () => {
    render(<InboxView />);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('shows empty state when no inbox tasks', () => {
    mockGetInboxTasks.mockReturnValue([]);
    render(<InboxView />);
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });

  it('renders inbox tasks from the store', () => {
    mockGetInboxTasks.mockReturnValue([
      {
        id: '1',
        title: 'Triage this',
        status: 'inbox',
        notes: null,
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
      },
    ]);
    render(<InboxView />);
    expect(screen.getByText('Triage this')).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TaskList } from './TaskList';
import type { Task } from '@shared/types';

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      updateTask: vi.fn(),
      deselectTask: vi.fn(),
      deleteTask: vi.fn(),
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

const fakeTask = (overrides: Partial<Task> = {}): Task => ({
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
  stale_at: null,
  assignee_id: null,
  ...overrides,
});

describe('TaskList', () => {
  it('renders a list of tasks', () => {
    const tasks = [
      fakeTask({ id: '1', title: 'First task' }),
      fakeTask({ id: '2', title: 'Second task' }),
    ];
    render(<TaskList tasks={tasks} onCompleteTask={vi.fn()} />);
    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Second task')).toBeInTheDocument();
  });

  it('renders empty state when no tasks', () => {
    render(<TaskList tasks={[]} onCompleteTask={vi.fn()} />);
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });

  it('renders section title when provided', () => {
    render(<TaskList tasks={[]} title="Inbox" onCompleteTask={vi.fn()} />);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('renders task count', () => {
    const tasks = [
      fakeTask({ id: '1', title: 'One' }),
      fakeTask({ id: '2', title: 'Two' }),
      fakeTask({ id: '3', title: 'Three' }),
    ];
    render(<TaskList tasks={tasks} title="Inbox" onCompleteTask={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('uses animated list for 50 or fewer tasks', () => {
    const tasks = Array.from({ length: 50 }, (_, i) =>
      fakeTask({ id: `task-${i}`, title: `Task ${i}` }),
    );
    render(<TaskList tasks={tasks} onCompleteTask={vi.fn()} />);
    // All tasks rendered directly in the DOM (no virtual windowing)
    expect(screen.getByText('Task 0')).toBeInTheDocument();
    expect(screen.getByText('Task 49')).toBeInTheDocument();
  });

  it('uses virtual scrolling container for more than 50 tasks', () => {
    const tasks = Array.from({ length: 51 }, (_, i) =>
      fakeTask({ id: `task-${i}`, title: `Task ${i}` }),
    );
    const { container } = render(<TaskList tasks={tasks} onCompleteTask={vi.fn()} />);
    // Virtual list renders an overflow scroll container (not AnimatePresence)
    const scrollContainer = container.querySelector('.overflow-auto');
    expect(scrollContainer).toBeInTheDocument();
  });
});

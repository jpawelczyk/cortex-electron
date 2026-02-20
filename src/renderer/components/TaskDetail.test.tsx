// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskDetail } from './TaskDetail';
import type { Task, Project, Context } from '@shared/types';

const mockUpdateTask = vi.fn();
const mockDeselectTask = vi.fn();

const mockFetchChecklistItems = vi.fn();
const mockCreateChecklistItem = vi.fn();
const mockDeleteChecklistItem = vi.fn();

const mockFetchProjects = vi.fn();

let mockProjects: Project[] = [];
let mockContexts: Context[] = [];

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      updateTask: mockUpdateTask,
      deselectTask: mockDeselectTask,
      checklistItems: {},
      checklistsLoading: {},
      fetchChecklistItems: mockFetchChecklistItems,
      createChecklistItem: mockCreateChecklistItem,
      deleteChecklistItem: mockDeleteChecklistItem,
      projects: mockProjects,
      contexts: mockContexts,
      fetchProjects: mockFetchProjects,
    };
    return selector(state);
  },
}));

function makeTask(overrides?: Partial<Task>): Task {
  return {
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
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
    stale_at: null,
    ...overrides,
  };
}

describe('TaskDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the task title in an input', () => {
    render(<TaskDetail task={makeTask({ title: 'Buy groceries' })} />);

    const input = screen.getByDisplayValue('Buy groceries');
    expect(input).toBeDefined();
    expect(input.tagName).toBe('INPUT');
  });

  it('renders task notes in a textarea', () => {
    render(<TaskDetail task={makeTask({ notes: 'Remember oat milk' })} />);

    const textarea = screen.getByDisplayValue('Remember oat milk');
    expect(textarea).toBeDefined();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders empty textarea when notes is null', () => {
    render(<TaskDetail task={makeTask({ notes: null })} />);

    const textarea = screen.getByRole('textbox', { name: /notes/i });
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('renders the status dropdown with current status selected', () => {
    render(<TaskDetail task={makeTask({ status: 'today' })} />);

    const select = screen.getByDisplayValue('Today');
    expect(select).toBeDefined();
  });

  it('renders deadline input with current value', () => {
    render(<TaskDetail task={makeTask({ deadline: '2026-03-15' })} />);

    const input = screen.getByLabelText(/deadline/i);
    expect((input as HTMLInputElement).value).toBe('2026-03-15');
  });

  it('renders empty deadline input when deadline is null', () => {
    render(<TaskDetail task={makeTask({ deadline: null })} />);

    const input = screen.getByLabelText(/deadline/i);
    expect((input as HTMLInputElement).value).toBe('');
  });

  // --- Debounced auto-save tests ---

  it('does not save title immediately on typing', () => {
    render(<TaskDetail task={makeTask({ title: 'Original' })} />);

    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated title' } });

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('auto-saves title after debounce delay', () => {
    render(<TaskDetail task={makeTask({ title: 'Original' })} />);

    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated title' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Updated title' });
  });

  it('does not auto-save title when value unchanged', () => {
    render(<TaskDetail task={makeTask({ title: 'Same' })} />);

    const input = screen.getByDisplayValue('Same');
    fireEvent.change(input, { target: { value: 'Same' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('auto-saves notes after debounce delay', () => {
    render(<TaskDetail task={makeTask({ notes: 'Old notes' })} />);

    const textarea = screen.getByDisplayValue('Old notes');
    fireEvent.change(textarea, { target: { value: 'New notes' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { notes: 'New notes' });
  });

  it('coalesces rapid keystrokes into a single save', () => {
    render(<TaskDetail task={makeTask({ title: 'Original' })} />);

    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Up' } });

    vi.advanceTimersByTime(200);

    fireEvent.change(input, { target: { value: 'Updated' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Updated' });
  });

  it('flushes pending title save when task changes', () => {
    const { rerender } = render(
      <TaskDetail task={makeTask({ id: 'task-1', title: 'First' })} />
    );

    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: 'Edited' } });

    // Switch tasks before debounce fires
    rerender(
      <TaskDetail task={makeTask({ id: 'task-2', title: 'Second' })} />
    );

    // The pending save for task-1 should have been flushed
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Edited' });
  });

  it('flushes pending notes save when task changes', () => {
    const { rerender } = render(
      <TaskDetail task={makeTask({ id: 'task-1', notes: 'Original notes' })} />
    );

    const textarea = screen.getByDisplayValue('Original notes');
    fireEvent.change(textarea, { target: { value: 'Edited notes' } });

    rerender(
      <TaskDetail task={makeTask({ id: 'task-2', title: 'Second' })} />
    );

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { notes: 'Edited notes' });
  });

  it('flushes pending save on unmount', () => {
    const { unmount } = render(
      <TaskDetail task={makeTask({ title: 'Will unmount' })} />
    );

    const input = screen.getByDisplayValue('Will unmount');
    fireEvent.change(input, { target: { value: 'Edited before unmount' } });

    unmount();

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Edited before unmount' });
  });

  // --- Immediate save tests (unchanged) ---

  it('calls updateTask when status changes', () => {
    render(<TaskDetail task={makeTask({ status: 'inbox' })} />);

    const select = screen.getByDisplayValue('Inbox');
    fireEvent.change(select, { target: { value: 'today' } });

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'today' });
  });

  it('calls updateTask when deadline changes', () => {
    render(<TaskDetail task={makeTask()} />);

    const input = screen.getByLabelText(/deadline/i);
    fireEvent.change(input, { target: { value: '2026-04-01' } });

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { deadline: '2026-04-01' });
  });

  it('clears deadline when input is emptied', () => {
    render(<TaskDetail task={makeTask({ deadline: '2026-03-15' })} />);

    const input = screen.getByLabelText(/deadline/i);
    fireEvent.change(input, { target: { value: '' } });

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { deadline: null });
  });

  it('calls deselectTask when close button is clicked', () => {
    render(<TaskDetail task={makeTask()} />);

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    expect(mockDeselectTask).toHaveBeenCalled();
  });

  // --- When date tests ---

  it('renders when_date input with current value', () => {
    render(<TaskDetail task={makeTask({ when_date: '2026-03-10' })} />);

    const input = screen.getByLabelText(/when/i);
    expect((input as HTMLInputElement).value).toBe('2026-03-10');
  });

  it('renders empty when_date input when when_date is null', () => {
    render(<TaskDetail task={makeTask({ when_date: null })} />);

    const input = screen.getByLabelText(/when/i);
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('calls updateTask when when_date changes', () => {
    render(<TaskDetail task={makeTask()} />);

    const input = screen.getByLabelText(/when/i);
    fireEvent.change(input, { target: { value: '2026-04-01' } });

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { when_date: '2026-04-01' });
  });

  it('clears when_date when input is emptied', () => {
    render(<TaskDetail task={makeTask({ when_date: '2026-03-10' })} />);

    const input = screen.getByLabelText(/when/i);
    fireEvent.change(input, { target: { value: '' } });

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { when_date: null });
  });

  it('resets local state when task prop changes', () => {
    const { rerender } = render(
      <TaskDetail task={makeTask({ id: 'task-1', title: 'First' })} />
    );

    const input = screen.getByDisplayValue('First');
    fireEvent.change(input, { target: { value: 'Edited but not saved' } });

    rerender(
      <TaskDetail task={makeTask({ id: 'task-2', title: 'Second' })} />
    );

    expect(screen.getByDisplayValue('Second')).toBeDefined();
  });

  // --- Project picker tests ---

  describe('project picker', () => {
    function makeProject(overrides?: Partial<Project>): Project {
      return {
        id: 'proj-1',
        title: 'My Project',
        description: null,
        status: 'active',
        context_id: null,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        completed_at: null,
        deleted_at: null,
        ...overrides,
      };
    }

    function makeContext(overrides?: Partial<Context>): Context {
      return {
        id: 'ctx-1',
        name: 'Work',
        color: null,
        icon: null,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
        ...overrides,
      };
    }

    beforeEach(() => {
      mockProjects = [];
      mockContexts = [];
    });

    afterEach(() => {
      mockProjects = [];
      mockContexts = [];
    });

    it('renders "No project" when task.project_id is null', () => {
      render(<TaskDetail task={makeTask({ project_id: null })} />);

      const btn = screen.getByRole('button', { name: /project/i });
      expect(btn.textContent).toContain('No project');
    });

    it('renders project name when task has project_id', () => {
      mockProjects = [makeProject({ id: 'proj-1', title: 'Launch Campaign' })];

      render(<TaskDetail task={makeTask({ project_id: 'proj-1' })} />);

      expect(screen.getByText('Launch Campaign')).toBeDefined();
    });

    it('only shows active projects in picker (not completed/archived)', () => {
      mockProjects = [
        makeProject({ id: 'proj-active', title: 'Active Project', status: 'active' }),
        makeProject({ id: 'proj-done', title: 'Done Project', status: 'completed' }),
        makeProject({ id: 'proj-arch', title: 'Archived Project', status: 'archived' }),
      ];

      render(<TaskDetail task={makeTask()} />);

      const btn = screen.getByRole('button', { name: /project/i });
      fireEvent.click(btn);

      expect(screen.getByText('Active Project')).toBeDefined();
      expect(screen.queryByText('Done Project')).toBeNull();
      expect(screen.queryByText('Archived Project')).toBeNull();
    });

    it('opens popover on click', () => {
      mockProjects = [makeProject({ id: 'proj-1', title: 'My Project' })];

      render(<TaskDetail task={makeTask()} />);

      const btn = screen.getByRole('button', { name: /project/i });
      fireEvent.click(btn);

      expect(screen.getByRole('option', { name: /my project/i })).toBeDefined();
    });

    it('calls updateTask with new project_id on selection', () => {
      mockProjects = [makeProject({ id: 'proj-1', title: 'My Project' })];

      render(<TaskDetail task={makeTask({ project_id: null })} />);

      const btn = screen.getByRole('button', { name: /project/i });
      fireEvent.click(btn);

      const option = screen.getByRole('option', { name: /my project/i });
      fireEvent.click(option);

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { project_id: 'proj-1' });
    });

    it('calls updateTask with null when "None" selected', () => {
      mockProjects = [makeProject({ id: 'proj-1', title: 'My Project' })];

      render(<TaskDetail task={makeTask({ project_id: 'proj-1' })} />);

      const btn = screen.getByRole('button', { name: /project/i });
      fireEvent.click(btn);

      const noneOption = screen.getByRole('option', { name: /none/i });
      fireEvent.click(noneOption);

      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { project_id: null });
    });

    it('shows inherited context badge when project has context_id', () => {
      mockProjects = [makeProject({ id: 'proj-1', title: 'My Project', context_id: 'ctx-1' })];
      mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];

      render(<TaskDetail task={makeTask({ project_id: 'proj-1' })} />);

      expect(screen.getByText('Work')).toBeDefined();
    });

    it('calls fetchProjects on mount when projects empty', () => {
      mockProjects = [];

      render(<TaskDetail task={makeTask()} />);

      expect(mockFetchProjects).toHaveBeenCalled();
    });
  });
});

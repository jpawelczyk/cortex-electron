// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskDetail } from './TaskDetail';
import type { Task } from '@shared/types';

const mockUpdateTask = vi.fn();
const mockDeselectTask = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: any) => {
    const state = {
      updateTask: mockUpdateTask,
      deselectTask: mockDeselectTask,
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
    ...overrides,
  };
}

describe('TaskDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('calls updateTask on title blur with changed value', () => {
    render(<TaskDetail task={makeTask({ title: 'Original' })} />);

    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated title' } });
    fireEvent.blur(input);

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Updated title' });
  });

  it('does not call updateTask on title blur when value unchanged', () => {
    render(<TaskDetail task={makeTask({ title: 'Same' })} />);

    const input = screen.getByDisplayValue('Same');
    fireEvent.blur(input);

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('calls updateTask on notes blur with changed value', () => {
    render(<TaskDetail task={makeTask({ notes: 'Old notes' })} />);

    const textarea = screen.getByDisplayValue('Old notes');
    fireEvent.change(textarea, { target: { value: 'New notes' } });
    fireEvent.blur(textarea);

    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { notes: 'New notes' });
  });

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
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskDetail } from './TaskDetail';
import type { Task } from '@shared/types';

const mockUpdateTask = vi.fn();
const mockDeselectTask = vi.fn();

const mockFetchChecklistItems = vi.fn();
const mockCreateChecklistItem = vi.fn();
const mockDeleteChecklistItem = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: any) => {
    const state = {
      updateTask: mockUpdateTask,
      deselectTask: mockDeselectTask,
      checklistItems: {},
      checklistsLoading: {},
      fetchChecklistItems: mockFetchChecklistItems,
      createChecklistItem: mockCreateChecklistItem,
      deleteChecklistItem: mockDeleteChecklistItem,
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
});

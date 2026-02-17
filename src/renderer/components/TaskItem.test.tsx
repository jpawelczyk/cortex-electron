// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TaskItem } from './TaskItem';
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
  ...overrides,
});

describe('TaskItem (collapsed)', () => {
  it('renders task title', () => {
    render(<TaskItem task={fakeTask({ title: 'Buy groceries' })} onComplete={vi.fn()} />);
    expect(screen.getByText('Buy groceries')).toBeInTheDocument();
  });

  it('renders a checkbox', () => {
    render(<TaskItem task={fakeTask()} onComplete={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('calls onComplete with task id when checkbox is clicked', () => {
    const onComplete = vi.fn();
    render(<TaskItem task={fakeTask({ id: 'task-42' })} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onComplete).toHaveBeenCalledWith('task-42');
  });

  it('shows completed state for logbook tasks', () => {
    render(
      <TaskItem
        task={fakeTask({ status: 'logbook', completed_at: '2026-02-17T12:00:00Z' })}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('shows deadline when present', () => {
    render(
      <TaskItem task={fakeTask({ deadline: '2026-02-20' })} onComplete={vi.fn()} />
    );
    expect(screen.getByText('Feb 20')).toBeInTheDocument();
  });

  it('shows priority indicator when set', () => {
    render(<TaskItem task={fakeTask({ priority: 'P1' })} onComplete={vi.fn()} />);
    expect(screen.getByTestId('priority-indicator')).toBeInTheDocument();
  });

  it('does not show priority indicator when null', () => {
    render(<TaskItem task={fakeTask({ priority: null })} onComplete={vi.fn()} />);
    expect(screen.queryByTestId('priority-indicator')).not.toBeInTheDocument();
  });

  it('calls onSelect with task id when row is clicked', () => {
    const onSelect = vi.fn();
    render(
      <TaskItem task={fakeTask({ id: 'task-42' })} onComplete={vi.fn()} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByText('Test task'));
    expect(onSelect).toHaveBeenCalledWith('task-42');
  });

  it('shows when_date badge when set', () => {
    render(
      <TaskItem task={fakeTask({ when_date: '2026-03-10' })} onComplete={vi.fn()} />
    );
    expect(screen.getByText('Mar 10')).toBeInTheDocument();
  });

  it('does not show when_date badge when null', () => {
    render(
      <TaskItem task={fakeTask({ when_date: null })} onComplete={vi.fn()} />
    );
    expect(screen.queryByTestId('when-date')).not.toBeInTheDocument();
  });

  it('highlights as selected when isSelected is true', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isSelected />
    );
    const row = screen.getByText('Test task').closest('[data-testid="task-item"]');
    expect(row?.className).toContain('bg-accent');
  });
});

describe('TaskItem (expanded)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders editable title input when expanded', () => {
    render(
      <TaskItem task={fakeTask({ title: 'Editable task' })} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByDisplayValue('Editable task');
    expect(input.tagName).toBe('INPUT');
  });

  it('renders notes textarea when expanded', () => {
    render(
      <TaskItem task={fakeTask({ notes: 'Some notes' })} onComplete={vi.fn()} isExpanded />
    );
    const textarea = screen.getByDisplayValue('Some notes');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('renders empty notes textarea with placeholder when notes is null', () => {
    render(
      <TaskItem task={fakeTask({ notes: null })} onComplete={vi.fn()} isExpanded />
    );
    const textarea = screen.getByPlaceholderText('Add notes...');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('shows when-date input when expanded', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    expect(screen.getByLabelText('When date')).toBeInTheDocument();
  });

  it('shows deadline input when expanded', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    expect(screen.getByLabelText('Deadline')).toBeInTheDocument();
  });

  it('does not save title immediately on typing', () => {
    render(
      <TaskItem task={fakeTask({ title: 'Original' })} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated' } });
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('auto-saves title after debounce delay', () => {
    render(
      <TaskItem task={fakeTask({ title: 'Original' })} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Updated' } });
    vi.advanceTimersByTime(500);
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Updated' });
  });

  it('auto-saves notes after debounce delay', () => {
    render(
      <TaskItem task={fakeTask({ notes: 'Old' })} onComplete={vi.fn()} isExpanded />
    );
    const textarea = screen.getByDisplayValue('Old');
    fireEvent.change(textarea, { target: { value: 'New' } });
    vi.advanceTimersByTime(500);
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { notes: 'New' });
  });

  it('collapses on Escape key', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockDeselectTask).toHaveBeenCalled();
  });

  it('collapses on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(mockDeselectTask).toHaveBeenCalled();
  });

  it('does not collapse when clicking inside expanded card', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.mouseDown(screen.getByTestId('task-item'));
    expect(mockDeselectTask).not.toHaveBeenCalled();
  });

  it('flushes pending save on unmount', () => {
    const { unmount } = render(
      <TaskItem task={fakeTask({ title: 'Will close' })} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByDisplayValue('Will close');
    fireEvent.change(input, { target: { value: 'Edited' } });
    unmount();
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Edited' });
  });

  it('updates when_date immediately via input', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByLabelText('When date');
    fireEvent.change(input, { target: { value: '2026-04-01' } });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { when_date: '2026-04-01' });
  });

  it('updates deadline immediately via input', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByLabelText('Deadline');
    fireEvent.change(input, { target: { value: '2026-04-01' } });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { deadline: '2026-04-01' });
  });

  it('clears when_date when input is emptied', () => {
    render(
      <TaskItem task={fakeTask({ when_date: '2026-03-10' })} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByLabelText('When date');
    fireEvent.change(input, { target: { value: '' } });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { when_date: null });
  });

  it('clears deadline when input is emptied', () => {
    render(
      <TaskItem task={fakeTask({ deadline: '2026-03-10' })} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByLabelText('Deadline');
    fireEvent.change(input, { target: { value: '' } });
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { deadline: null });
  });
});

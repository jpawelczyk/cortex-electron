// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TaskItem } from './TaskItem';
import type { Task } from '@shared/types';

const mockUpdateTask = vi.fn();
const mockDeselectTask = vi.fn();
const mockDeleteTask = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: any) => {
    const state = {
      updateTask: mockUpdateTask,
      deselectTask: mockDeselectTask,
      deleteTask: mockDeleteTask,
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

  it('shows deadline badge when present', () => {
    render(
      <TaskItem task={fakeTask({ deadline: '2026-02-20' })} onComplete={vi.fn()} />
    );
    expect(screen.getByTestId('deadline-badge')).toHaveTextContent('Feb 20');
  });

  it('shows orange deadline when due tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00'));
    render(
      <TaskItem task={fakeTask({ deadline: '2026-02-20' })} onComplete={vi.fn()} />
    );
    expect(screen.getByTestId('deadline-badge').querySelector('.text-orange-500')).not.toBeNull();
    vi.useRealTimers();
  });

  it('shows red deadline when due today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00'));
    render(
      <TaskItem task={fakeTask({ deadline: '2026-02-19' })} onComplete={vi.fn()} />
    );
    const el = screen.getByTestId('deadline-badge').querySelector('.text-red-500');
    expect(el).not.toBeNull();
    expect(el).not.toHaveClass('border-red-500/30');
    vi.useRealTimers();
  });

  it('shows overdue styling with red border when deadline has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00'));
    render(
      <TaskItem task={fakeTask({ deadline: '2026-02-18' })} onComplete={vi.fn()} />
    );
    const badge = screen.getByTestId('deadline-badge');
    const el = badge.querySelector('.text-red-500');
    expect(el).not.toBeNull();
    expect(el).toHaveClass('border-red-500/30');
    vi.useRealTimers();
  });

  it('shows default deadline color when more than 1 day away', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-19T12:00:00'));
    render(
      <TaskItem task={fakeTask({ deadline: '2026-02-25' })} onComplete={vi.fn()} />
    );
    const badge = screen.getByTestId('deadline-badge');
    expect(badge.querySelector('.text-orange-500')).toBeNull();
    expect(badge.querySelector('.text-red-500')).toBeNull();
    vi.useRealTimers();
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
    expect(screen.getByTestId('when-date')).toHaveTextContent('Mar 10');
  });

  it('date picker buttons have fixed width only when value is set', () => {
    render(
      <TaskItem task={fakeTask({ when_date: null, deadline: '2026-12-25' })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    const deadlineButton = within(screen.getByTestId('deadline-badge')).getByRole('button');
    expect(whenButton).not.toHaveClass('w-[4.5rem]');
    expect(deadlineButton).toHaveClass('w-[4.5rem]');
  });

  it('shows when_date icon without text when null', () => {
    render(
      <TaskItem task={fakeTask({ when_date: null })} onComplete={vi.fn()} />
    );
    const badge = screen.getByTestId('when-date');
    expect(badge).toBeInTheDocument();
    // Button only contains the icon, no date text
    const button = within(badge).getByRole('button');
    expect(button.querySelector('span')).toBeNull();
  });

  it('does not expand when clicking date picker button', () => {
    const onSelect = vi.fn();
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} onSelect={onSelect} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('opens calendar popover when when-date button is clicked', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    // Calendar renders a grid (the month grid)
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('opens calendar popover when deadline button is clicked', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} />
    );
    const deadlineButton = within(screen.getByTestId('deadline-badge')).getByRole('button');
    fireEvent.click(deadlineButton);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('shows Someday and Anytime buttons in when-date popover', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    expect(screen.getByRole('button', { name: 'Someday' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anytime' })).toBeInTheDocument();
  });

  it('sets status to someday when Someday button is clicked in when-date popover', () => {
    render(
      <TaskItem task={fakeTask({ id: 'task-1' })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    fireEvent.click(screen.getByRole('button', { name: 'Someday' }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'someday' });
  });

  it('sets status to anytime when Anytime button is clicked in when-date popover', () => {
    render(
      <TaskItem task={fakeTask({ id: 'task-1' })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    fireEvent.click(screen.getByRole('button', { name: 'Anytime' }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'anytime' });
  });

  it('closes popover after clicking Someday', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    fireEvent.click(screen.getByRole('button', { name: 'Someday' }));
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('does NOT show Someday/Anytime buttons in deadline popover', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} />
    );
    const deadlineButton = within(screen.getByTestId('deadline-badge')).getByRole('button');
    fireEvent.click(deadlineButton);
    expect(screen.queryByRole('button', { name: 'Someday' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anytime' })).not.toBeInTheDocument();
  });

  it('shows clear button inside when_date popover when set', () => {
    render(
      <TaskItem task={fakeTask({ when_date: '2026-03-10' })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    expect(screen.getByLabelText('Clear when date')).toBeInTheDocument();
  });

  it('does not show clear button inside when_date popover when null', () => {
    render(
      <TaskItem task={fakeTask({ when_date: null })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    expect(screen.queryByLabelText('Clear when date')).not.toBeInTheDocument();
  });

  it('clears when_date when clear button in popover is clicked', () => {
    render(
      <TaskItem task={fakeTask({ when_date: '2026-03-10' })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    fireEvent.click(screen.getByLabelText('Clear when date'));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { when_date: null });
  });

  it('clears deadline when clear button in popover is clicked', () => {
    render(
      <TaskItem task={fakeTask({ deadline: '2026-03-20' })} onComplete={vi.fn()} />
    );
    const deadlineButton = within(screen.getByTestId('deadline-badge')).getByRole('button');
    fireEvent.click(deadlineButton);
    fireEvent.click(screen.getByLabelText('Clear deadline'));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { deadline: null });
  });

  it('highlights as selected when isSelected is true', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isSelected />
    );
    const row = screen.getByText('Test task').closest('[data-testid="task-item"]');
    expect(row?.className).toContain('bg-accent');
  });

  it('shows completed state when isCompleted prop is true regardless of task status', () => {
    render(
      <TaskItem task={fakeTask({ status: 'inbox' })} onComplete={vi.fn()} isCompleted />
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
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
    const textarea = screen.getByPlaceholderText('Notes');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('auto-grows notes textarea to fit content', () => {
    render(
      <TaskItem task={fakeTask({ notes: 'Line 1' })} onComplete={vi.fn()} isExpanded />
    );
    const textarea = screen.getByDisplayValue('Line 1') as HTMLTextAreaElement;
    // jsdom scrollHeight is 0, so auto-grow sets height to '0px'
    expect(textarea.style.height).toBe('0px');
    expect(textarea.className).toContain('overflow-hidden');
  });

  it('shows when-date button when expanded', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    expect(screen.getByLabelText('When date')).toBeInTheDocument();
  });

  it('shows deadline button when expanded', () => {
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

  it('updates when_date via calendar popover', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    const trigger = screen.getByLabelText('When date');
    fireEvent.click(trigger);
    // Find day 15 in the calendar and click it
    const grid = screen.getByRole('grid');
    const day15 = within(grid).getByText('15');
    fireEvent.click(day15);
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ when_date: expect.stringMatching(/^\d{4}-\d{2}-15$/) }));
  });

  it('updates deadline via calendar popover', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    const trigger = screen.getByLabelText('Deadline');
    fireEvent.click(trigger);
    const grid = screen.getByRole('grid');
    const day15 = within(grid).getByText('15');
    fireEvent.click(day15);
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({ deadline: expect.stringMatching(/^\d{4}-\d{2}-15$/) }));
  });

  it('shows trash button when expanded', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    expect(screen.getByLabelText('Delete task')).toBeInTheDocument();
  });

  it('does not show interactive trash button when collapsed', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} />
    );
    // The button exists in the DOM (for CSS grid animation) but has tabIndex -1
    const btn = screen.getByLabelText('Delete task');
    expect(btn).toHaveAttribute('tabindex', '-1');
  });

  it('does not call deleteTask on first click — shows confirmation', () => {
    render(
      <TaskItem task={fakeTask({ id: 'task-99' })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(mockDeleteTask).not.toHaveBeenCalled();
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm delete task')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel delete task')).toBeInTheDocument();
  });

  it('calls deleteTask when confirm button is clicked', () => {
    render(
      <TaskItem task={fakeTask({ id: 'task-99' })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByLabelText('Delete task'));
    fireEvent.click(screen.getByLabelText('Confirm delete task'));
    expect(mockDeleteTask).toHaveBeenCalledWith('task-99');
  });

  it('resets delete confirmation when cancel is clicked', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Cancel delete task'));
    expect(screen.getByLabelText('Delete task')).toBeInTheDocument();
    expect(screen.queryByText('Confirm?')).not.toBeInTheDocument();
  });

  it('flushes debounced saves before deleting', () => {
    render(
      <TaskItem task={fakeTask({ title: 'Original' })} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'Edited' } });
    // Don't advance timers — debounce has NOT fired yet

    fireEvent.click(screen.getByLabelText('Delete task'));
    fireEvent.click(screen.getByLabelText('Confirm delete task'));

    // The flush should have saved the pending title
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { title: 'Edited' });
    vi.advanceTimersByTime(150);
    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
  });

  it('deletes task on Cmd+Backspace when expanded', () => {
    render(
      <TaskItem task={fakeTask({ id: 'task-7' })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.keyDown(document, { key: 'Backspace', metaKey: true });
    vi.advanceTimersByTime(150);
    expect(mockDeleteTask).toHaveBeenCalledWith('task-7');
  });

  it('does not delete on Cmd+Backspace when collapsed', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} />
    );
    fireEvent.keyDown(document, { key: 'Backspace', metaKey: true });
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });
});

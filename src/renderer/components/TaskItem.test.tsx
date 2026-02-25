// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TaskItem } from './TaskItem';
import type { Task, Project, Context, AIAgent } from '@shared/types';

const mockUpdateTask = vi.fn();
const mockDeselectTask = vi.fn();
const mockDeleteTask = vi.fn();

const mockFetchChecklistItems = vi.fn();
const mockCreateChecklistItem = vi.fn();
const mockDeleteChecklistItem = vi.fn();
const mockUpdateChecklistItem = vi.fn();

const mockFetchProjects = vi.fn();
const mockFetchAgents = vi.fn();

let mockProjects: Project[] = [];
let mockContexts: Context[] = [];
let mockAgents: AIAgent[] = [];
let mockAuthUser: { id: string } | null = null;

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      updateTask: mockUpdateTask,
      deselectTask: mockDeselectTask,
      deleteTask: mockDeleteTask,
      checklistItems: {},
      checklistsLoading: {},
      fetchChecklistItems: mockFetchChecklistItems,
      createChecklistItem: mockCreateChecklistItem,
      deleteChecklistItem: mockDeleteChecklistItem,
      updateChecklistItem: mockUpdateChecklistItem,
      projects: mockProjects,
      contexts: mockContexts,
      fetchProjects: mockFetchProjects,
      agents: mockAgents,
      fetchAgents: mockFetchAgents,
      authUser: mockAuthUser,
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

describe('TaskItem (collapsed)', () => {
  it('calls onComplete with task id when checkbox is clicked', () => {
    const onComplete = vi.fn();
    render(<TaskItem task={fakeTask({ id: 'task-42' })} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onComplete).toHaveBeenCalledWith('task-42');
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

  it('shows icon only for when_date when status is anytime', () => {
    render(
      <TaskItem task={fakeTask({ status: 'anytime', when_date: null })} onComplete={vi.fn()} />
    );
    const button = within(screen.getByTestId('when-date')).getByRole('button');
    expect(button).not.toHaveTextContent('N/A');
    expect(button).toHaveAttribute('title', 'Anytime');
  });

  it('shows icon only for when_date when status is someday', () => {
    render(
      <TaskItem task={fakeTask({ status: 'someday', when_date: null })} onComplete={vi.fn()} />
    );
    const button = within(screen.getByTestId('when-date')).getByRole('button');
    expect(button).not.toHaveTextContent('N/A');
    expect(button).toHaveAttribute('title', 'Someday');
  });

  it('shows N/A label for when_date when null and status is not anytime/someday', () => {
    render(
      <TaskItem task={fakeTask({ status: 'inbox', when_date: null })} onComplete={vi.fn()} />
    );
    const button = within(screen.getByTestId('when-date')).getByRole('button');
    expect(button).toHaveTextContent('N/A');
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

  it('shows Anytime as active in popover when status is anytime', () => {
    render(
      <TaskItem task={fakeTask({ status: 'anytime' })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    const anytimeBtn = screen.getByRole('button', { name: 'Anytime' });
    const somedayBtn = screen.getByRole('button', { name: 'Someday' });
    expect(anytimeBtn).toHaveClass('text-foreground');
    expect(somedayBtn).not.toHaveClass('text-foreground');
  });

  it('shows Someday as active in popover when status is someday', () => {
    render(
      <TaskItem task={fakeTask({ status: 'someday' })} onComplete={vi.fn()} />
    );
    const whenButton = within(screen.getByTestId('when-date')).getByRole('button');
    fireEvent.click(whenButton);
    const somedayBtn = screen.getByRole('button', { name: 'Someday' });
    const anytimeBtn = screen.getByRole('button', { name: 'Anytime' });
    expect(somedayBtn).toHaveClass('text-foreground');
    expect(anytimeBtn).not.toHaveClass('text-foreground');
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

});


describe('TaskItem (expanded)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('does not save to wrong task when task switches before debounce fires', () => {
    // Simulate race: user edits Task A, then task prop switches to Task B before debounce fires
    const taskA = fakeTask({ id: 'task-a', title: 'Task A' });
    const taskB = fakeTask({ id: 'task-b', title: 'Task B' });
    const { rerender } = render(
      <TaskItem task={taskA} onComplete={vi.fn()} isExpanded />
    );
    const input = screen.getByDisplayValue('Task A');
    fireEvent.change(input, { target: { value: 'Task A edited' } });

    // Switch to task-b before debounce fires
    rerender(<TaskItem task={taskB} onComplete={vi.fn()} isExpanded />);

    // Advance timers — the stale debounce for task-a should NOT fire for task-b's id
    vi.advanceTimersByTime(500);

    // The flush on task switch should have saved to task-a, not task-b
    const calls = mockUpdateTask.mock.calls;
    const titleSaveToB = calls.find(([id, patch]) => id === 'task-b' && 'title' in patch);
    expect(titleSaveToB).toBeUndefined();
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

describe('TaskItem project picker (expanded)', () => {
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
      owner_type: 'user' as const,
      owner_stakeholder_id: null,
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
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockProjects = [];
    mockContexts = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    mockProjects = [];
    mockContexts = [];
  });

  it('only shows active projects in picker (not completed/archived)', () => {
    mockProjects = [
      makeProject({ id: 'proj-active', title: 'Active Project', status: 'active' }),
      makeProject({ id: 'proj-done', title: 'Done Project', status: 'completed' }),
      makeProject({ id: 'proj-arch', title: 'Archived Project', status: 'archived' }),
    ];
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /project/i }));
    expect(screen.getByText('Active Project')).toBeInTheDocument();
    expect(screen.queryByText('Done Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived Project')).not.toBeInTheDocument();
  });

  it('calls updateTask with new project_id on selection', () => {
    mockProjects = [makeProject({ id: 'proj-1', title: 'My Project' })];
    render(
      <TaskItem task={fakeTask({ project_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /project/i }));
    fireEvent.click(screen.getByRole('option', { name: /my project/i }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { project_id: 'proj-1' });
  });

  it('calls updateTask with null when "None" selected', () => {
    mockProjects = [makeProject({ id: 'proj-1', title: 'My Project' })];
    render(
      <TaskItem task={fakeTask({ project_id: 'proj-1' })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /project/i }));
    fireEvent.click(screen.getByRole('option', { name: /none/i }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { project_id: null });
  });

});

describe('TaskItem context picker (expanded)', () => {
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
      owner_type: 'user' as const,
      owner_stakeholder_id: null,
      ...overrides,
    };
  }

  function makeContext(overrides?: Partial<Context>): Context {
    return {
      id: 'ctx-1',
      name: 'Work',
      color: '#3b82f6',
      icon: null,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      deleted_at: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockProjects = [];
    mockContexts = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    mockProjects = [];
    mockContexts = [];
  });

  it('shows editable context picker with options when task has no project', () => {
    mockContexts = [
      makeContext({ id: 'ctx-1', name: 'Work' }),
      makeContext({ id: 'ctx-2', name: 'Personal' }),
    ];
    render(
      <TaskItem task={fakeTask({ project_id: null, context_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /context/i }));
    expect(screen.getByRole('option', { name: /work/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /personal/i })).toBeInTheDocument();
  });

  it('calls updateTask with context_id when selecting context', () => {
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(
      <TaskItem task={fakeTask({ project_id: null, context_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /context/i }));
    fireEvent.click(screen.getByRole('option', { name: /work/i }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { context_id: 'ctx-1' });
  });

  it('calls updateTask with null when "None" selected', () => {
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(
      <TaskItem task={fakeTask({ project_id: null, context_id: 'ctx-1' })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /context/i }));
    fireEvent.click(screen.getByRole('option', { name: /none/i }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { context_id: null });
  });

  it('shows read-only inherited context when project has context', () => {
    mockProjects = [makeProject({ id: 'proj-1', context_id: 'ctx-1' })];
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(
      <TaskItem task={fakeTask({ project_id: 'proj-1', context_id: null })} onComplete={vi.fn()} isExpanded />
    );
    // Should show inherited context name (non-editable)
    expect(screen.getAllByText('Work').length).toBeGreaterThanOrEqual(1);
    // Should NOT have a clickable context button
    expect(screen.queryByRole('button', { name: /context/i })).not.toBeInTheDocument();
  });

  it('shows editable picker when task has project without context', () => {
    mockProjects = [makeProject({ id: 'proj-1', context_id: null })];
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(
      <TaskItem task={fakeTask({ project_id: 'proj-1', context_id: null })} onComplete={vi.fn()} isExpanded />
    );
    expect(screen.getByRole('button', { name: /context/i })).toBeInTheDocument();
  });
});

describe('TaskItem assign-to-agent (expanded)', () => {
  function makeAgent(overrides?: Partial<AIAgent>): AIAgent {
    return {
      id: 'agent-1',
      name: 'Cortex Agent',
      permissions: { read: true, write: true },
      last_used_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      revoked_at: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockProjects = [];
    mockContexts = [];
    mockAgents = [];
    mockAuthUser = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    mockAgents = [];
    mockAuthUser = null;
  });

  it('shows dropdown with agents when clicked', () => {
    mockAgents = [
      makeAgent({ id: 'agent-1', name: 'Cortex Agent' }),
      makeAgent({ id: 'agent-2', name: 'Research Bot' }),
    ];
    render(
      <TaskItem task={fakeTask({ assignee_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /assign to agent/i }));
    expect(screen.getByRole('option', { name: /cortex agent/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /research bot/i })).toBeInTheDocument();
  });

  it('does not show revoked agents in dropdown', () => {
    mockAgents = [
      makeAgent({ id: 'agent-1', name: 'Active Agent', revoked_at: null }),
      makeAgent({ id: 'agent-2', name: 'Revoked Agent', revoked_at: '2026-02-01T00:00:00.000Z' }),
    ];
    render(
      <TaskItem task={fakeTask({ assignee_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /assign to agent/i }));
    expect(screen.getByRole('option', { name: /active agent/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /revoked agent/i })).not.toBeInTheDocument();
  });

  it('calls updateTask with agent id when selecting an agent', () => {
    mockAgents = [makeAgent({ id: 'agent-1', name: 'Cortex Agent' })];
    render(
      <TaskItem task={fakeTask({ assignee_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /assign to agent/i }));
    fireEvent.click(screen.getByRole('option', { name: /cortex agent/i }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { assignee_id: 'agent-1' });
  });

  it('shows "Remove agent" option when agent is assigned', () => {
    mockAgents = [makeAgent({ id: 'agent-1', name: 'Cortex Agent' })];
    render(
      <TaskItem task={fakeTask({ assignee_id: 'agent-1' })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /assign to agent/i }));
    expect(screen.getByRole('option', { name: /remove agent/i })).toBeInTheDocument();
  });

  it('does not show "Remove agent" when no agent is assigned', () => {
    mockAgents = [makeAgent({ id: 'agent-1', name: 'Cortex Agent' })];
    render(
      <TaskItem task={fakeTask({ assignee_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /assign to agent/i }));
    expect(screen.queryByRole('option', { name: /remove agent/i })).not.toBeInTheDocument();
  });

  it('calls updateTask with null when removing agent', () => {
    mockAgents = [makeAgent({ id: 'agent-1', name: 'Cortex Agent' })];
    render(
      <TaskItem task={fakeTask({ assignee_id: 'agent-1' })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /assign to agent/i }));
    fireEvent.click(screen.getByRole('option', { name: /remove agent/i }));
    expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { assignee_id: null });
  });

  it('shows "No agents available" when no active agents exist', () => {
    mockAgents = [];
    render(
      <TaskItem task={fakeTask({ assignee_id: null })} onComplete={vi.fn()} isExpanded />
    );
    fireEvent.click(screen.getByRole('button', { name: /assign to agent/i }));
    expect(screen.getByText('No agents available')).toBeInTheDocument();
  });

  it('does not fetch agents per-item (App.tsx handles bulk fetch)', () => {
    mockAgents = [];
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isExpanded />
    );
    expect(mockFetchAgents).not.toHaveBeenCalled();
  });
});

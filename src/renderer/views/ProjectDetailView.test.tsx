// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectDetailView } from './ProjectDetailView';
import type { Project, Task, Context } from '@shared/types';

const mockUpdateProject = vi.fn();
const mockDeselectProject = vi.fn();
const mockFetchProjects = vi.fn();
const mockCreateTask = vi.fn().mockResolvedValue({ id: 'new-task' });
const mockUpdateTask = vi.fn();
const mockSelectTask = vi.fn();
const mockCancelInlineCreate = vi.fn();
const mockStartInlineCreate = vi.fn();
const mockDeleteProject = vi.fn();

let mockProjects: Project[] = [];
let mockTasks: Task[] = [];
let mockContexts: Context[] = [];
let mockSelectedTaskId: string | null = null;
let mockIsInlineCreating = false;

// Mock DatePickerButton to avoid Calendar/Popover rendering issues in jsdom
vi.mock('../components/DatePickerButton', () => ({
  DatePickerButton: ({ label }: { label: string }) => (
    <button type="button" aria-label={label}>{label}</button>
  ),
}));

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      projects: mockProjects,
      tasks: mockTasks,
      contexts: mockContexts,
      updateProject: mockUpdateProject,
      deselectProject: mockDeselectProject,
      fetchProjects: mockFetchProjects,
      agents: [],
      fetchAgents: vi.fn(),
      authUser: null,
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      selectTask: mockSelectTask,
      selectedTaskId: mockSelectedTaskId,
      isInlineCreating: mockIsInlineCreating,
      startInlineCreate: mockStartInlineCreate,
      cancelInlineCreate: mockCancelInlineCreate,
      deleteProject: mockDeleteProject,
      createChecklistItem: vi.fn(),
      checklistItems: {},
      checklistsLoading: {},
      fetchChecklistItems: vi.fn(),
      deleteChecklistItem: vi.fn(),
      updateChecklistItem: vi.fn(),
    };
    return selector(state);
  },
}));

function makeProject(overrides?: Partial<Project>): Project {
  return {
    id: 'proj-1',
    title: 'Test Project',
    description: null,
    status: 'active',
    context_id: null,
    sort_order: 0,
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-18T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
    ...overrides,
  };
}

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
    created_at: '2026-02-17T00:00:00.000Z',
    updated_at: '2026-02-17T00:00:00.000Z',
    completed_at: null,
    deleted_at: null,
    stale_at: null,
    assignee_id: null,
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

describe('ProjectDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockProjects = [makeProject()];
    mockTasks = [];
    mockContexts = [];
    mockSelectedTaskId = null;
    mockIsInlineCreating = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Rendering ---

  it('renders the project title in an editable input', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    const input = screen.getByDisplayValue('Test Project');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('renders a description placeholder when description is null', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByPlaceholderText('Add a description...')).toBeInTheDocument();
  });

  it('renders the description when present', () => {
    mockProjects = [makeProject({ description: 'A detailed description' })];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByDisplayValue('A detailed description')).toBeInTheDocument();
  });

  it('renders the current status', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  // --- Context picker ---

  it('renders "No context" when project has no context', () => {
    mockProjects = [makeProject({ context_id: null })];
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByTestId('context-selector')).toHaveTextContent('No context');
  });

  it('renders context name when project has context_id', () => {
    mockProjects = [makeProject({ context_id: 'ctx-1' })];
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByTestId('context-selector')).toHaveTextContent('Work');
  });

  it('opens context picker and shows all contexts plus None option', () => {
    mockProjects = [makeProject({ context_id: 'ctx-1' })];
    mockContexts = [
      makeContext({ id: 'ctx-1', name: 'Work' }),
      makeContext({ id: 'ctx-2', name: 'Personal', color: '#ff0000' }),
    ];
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByTestId('context-selector'));

    expect(screen.getByRole('option', { name: /none/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /work/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /personal/i })).toBeInTheDocument();
  });

  it('calls updateProject with new context_id on selection', () => {
    mockProjects = [makeProject({ context_id: null })];
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByTestId('context-selector'));
    fireEvent.click(screen.getByRole('option', { name: /work/i }));

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { context_id: 'ctx-1' });
  });

  it('calls updateProject with null when "None" is selected', () => {
    mockProjects = [makeProject({ context_id: 'ctx-1' })];
    mockContexts = [makeContext({ id: 'ctx-1', name: 'Work' })];
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByTestId('context-selector'));
    fireEvent.click(screen.getByRole('option', { name: /none/i }));

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { context_id: null });
  });

  it('renders staleness indicator for stale projects', () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 15);
    mockProjects = [makeProject({ updated_at: staleDate.toISOString() })];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('does NOT render staleness indicator for fresh projects', () => {
    mockProjects = [makeProject({ updated_at: new Date().toISOString() })];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
  });

  // --- Back navigation ---

  it('renders a back button', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('clicking back button calls deselectProject', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(mockDeselectProject).toHaveBeenCalled();
  });

  // --- Debounced title editing ---

  it('does not save title immediately on typing', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    const input = screen.getByDisplayValue('Test Project');
    fireEvent.change(input, { target: { value: 'Updated title' } });

    expect(mockUpdateProject).not.toHaveBeenCalled();
  });

  it('auto-saves title after debounce delay', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    const input = screen.getByDisplayValue('Test Project');
    fireEvent.change(input, { target: { value: 'Updated title' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { title: 'Updated title' });
  });

  it('does not auto-save title when value is unchanged', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    const input = screen.getByDisplayValue('Test Project');
    fireEvent.change(input, { target: { value: 'Test Project' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateProject).not.toHaveBeenCalled();
  });

  it('coalesces rapid title keystrokes into a single save', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    const input = screen.getByDisplayValue('Test Project');
    fireEvent.change(input, { target: { value: 'Up' } });
    vi.advanceTimersByTime(200);
    fireEvent.change(input, { target: { value: 'Updated' } });
    vi.advanceTimersByTime(500);

    expect(mockUpdateProject).toHaveBeenCalledTimes(1);
    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { title: 'Updated' });
  });

  it('flushes pending title save on unmount', () => {
    const { unmount } = render(<ProjectDetailView projectId="proj-1" />);

    const input = screen.getByDisplayValue('Test Project');
    fireEvent.change(input, { target: { value: 'Edited before unmount' } });

    unmount();

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { title: 'Edited before unmount' });
  });

  // --- Debounced description editing ---

  it('auto-saves description after debounce delay', () => {
    mockProjects = [makeProject({ description: 'Old desc' })];
    render(<ProjectDetailView projectId="proj-1" />);

    const textarea = screen.getByDisplayValue('Old desc');
    fireEvent.change(textarea, { target: { value: 'New desc' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { description: 'New desc' });
  });

  it('saves null description when field is cleared', () => {
    mockProjects = [makeProject({ description: 'Some desc' })];
    render(<ProjectDetailView projectId="proj-1" />);

    const textarea = screen.getByDisplayValue('Some desc');
    fireEvent.change(textarea, { target: { value: '' } });

    vi.advanceTimersByTime(500);

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { description: null });
  });

  // --- Status selector ---

  it('renders all project statuses in selector', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    const btn = screen.getByTestId('status-selector');
    fireEvent.click(btn);

    expect(screen.getByRole('option', { name: /planned/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /on hold/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /blocked/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /completed/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /archived/i })).toBeInTheDocument();
  });

  it('changing status calls updateProject immediately', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    const btn = screen.getByTestId('status-selector');
    fireEvent.click(btn);

    fireEvent.click(screen.getByRole('option', { name: /on hold/i }));

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { status: 'on_hold' });
  });

  // --- Task list ---

  it('renders only tasks belonging to this project', () => {
    mockTasks = [
      makeTask({ id: 't1', title: 'Project task', project_id: 'proj-1', status: 'inbox' }),
      makeTask({ id: 't2', title: 'Other task', project_id: 'other-proj', status: 'inbox' }),
      makeTask({ id: 't3', title: 'No project task', project_id: null, status: 'inbox' }),
    ];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByText('Project task')).toBeInTheDocument();
    expect(screen.queryByText('Other task')).not.toBeInTheDocument();
    expect(screen.queryByText('No project task')).not.toBeInTheDocument();
  });

  it('shows empty state when project has no tasks', () => {
    mockTasks = [];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByText('No tasks in this project')).toBeInTheDocument();
  });

  it('empty state CTA triggers inline task creation', () => {
    mockTasks = [];
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByTestId('empty-state-cta'));
    expect(mockStartInlineCreate).toHaveBeenCalled();
  });

  it('includes logbook tasks in the project task list', () => {
    mockTasks = [
      makeTask({ id: 't1', title: 'Done task', project_id: 'proj-1', status: 'logbook' }),
      makeTask({ id: 't2', title: 'Active task', project_id: 'proj-1', status: 'inbox' }),
    ];
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByText('Done task')).toBeInTheDocument();
    expect(screen.getByText('Active task')).toBeInTheDocument();
  });

  // --- Inline task creation ---

  it('shows InlineTaskCard when isInlineCreating is true', () => {
    mockIsInlineCreating = true;
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByTestId('inline-task-card')).toBeInTheDocument();
  });

  it('does not show InlineTaskCard when isInlineCreating is false', () => {
    mockIsInlineCreating = false;
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.queryByTestId('inline-task-card')).not.toBeInTheDocument();
  });

  it('InlineTaskCard creates tasks with project_id', () => {
    mockIsInlineCreating = true;
    render(<ProjectDetailView projectId="proj-1" />);

    const input = screen.getByPlaceholderText('New task');
    fireEvent.change(input, { target: { value: 'Project task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Project task', project_id: 'proj-1' }),
    );
  });

  // --- Task completion UX ---

  it('marks task as logbook on completion', () => {
    mockTasks = [
      makeTask({ id: 't1', title: 'My task', project_id: 'proj-1', status: 'inbox' }),
    ];
    render(<ProjectDetailView projectId="proj-1" />);

    // TaskItem renders a checkbox — click it to complete
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockUpdateTask).toHaveBeenCalledWith('t1', { status: 'logbook' });
  });

  // --- Completion validation ---

  it('blocks completion when incomplete tasks exist', () => {
    mockTasks = [
      makeTask({ id: 't1', project_id: 'proj-1', status: 'inbox' }),
    ];
    render(<ProjectDetailView projectId="proj-1" />);

    const btn = screen.getByTestId('status-selector');
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('option', { name: /completed/i }));

    // Should show warning, NOT call updateProject with completed
    expect(mockUpdateProject).not.toHaveBeenCalledWith('proj-1', { status: 'completed' });
    expect(screen.getByText(/complete or move all tasks/i)).toBeInTheDocument();
  });

  it('allows completion when all tasks are in logbook or cancelled', () => {
    mockTasks = [
      makeTask({ id: 't1', project_id: 'proj-1', status: 'logbook' }),
      makeTask({ id: 't2', project_id: 'proj-1', status: 'cancelled' }),
    ];
    render(<ProjectDetailView projectId="proj-1" />);

    const btn = screen.getByTestId('status-selector');
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('option', { name: /completed/i }));

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { status: 'completed' });
  });

  it('allows completion when project has no tasks', () => {
    mockTasks = [];
    render(<ProjectDetailView projectId="proj-1" />);

    const btn = screen.getByTestId('status-selector');
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('option', { name: /completed/i }));

    expect(mockUpdateProject).toHaveBeenCalledWith('proj-1', { status: 'completed' });
  });

  it('dismisses completion warning when clicking away', () => {
    mockTasks = [
      makeTask({ id: 't1', project_id: 'proj-1', status: 'inbox' }),
    ];
    render(<ProjectDetailView projectId="proj-1" />);

    const btn = screen.getByTestId('status-selector');
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('option', { name: /completed/i }));

    expect(screen.getByText(/complete or move all tasks/i)).toBeInTheDocument();

    // Click the back button to dismiss (any other interaction)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText(/complete or move all tasks/i)).not.toBeInTheDocument();
  });

  // --- Project deletion ---

  it('renders a delete button', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    expect(screen.getByLabelText('Delete project')).toBeInTheDocument();
  });

  it('shows confirmation when delete button is clicked', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByLabelText('Delete project'));

    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm delete project')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel delete project')).toBeInTheDocument();
  });

  it('calls deleteProject and deselectProject when confirmed', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByLabelText('Delete project'));
    fireEvent.click(screen.getByLabelText('Confirm delete project'));

    expect(mockDeleteProject).toHaveBeenCalledWith('proj-1');
    expect(mockDeselectProject).toHaveBeenCalled();
  });

  it('cancels deletion when cancel button is clicked', () => {
    render(<ProjectDetailView projectId="proj-1" />);

    fireEvent.click(screen.getByLabelText('Delete project'));
    fireEvent.click(screen.getByLabelText('Cancel delete project'));

    expect(mockDeleteProject).not.toHaveBeenCalled();
    expect(screen.queryByText('Confirm?')).not.toBeInTheDocument();
  });

  // --- Not found ---

  it('renders not-found state when project does not exist', () => {
    mockProjects = [];
    render(<ProjectDetailView projectId="nonexistent" />);

    expect(screen.getByText(/project not found/i)).toBeInTheDocument();
  });
});

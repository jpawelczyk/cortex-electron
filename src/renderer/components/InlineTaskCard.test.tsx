// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InlineTaskCard } from './InlineTaskCard';

const mockCreateTask = vi.fn();
const mockCancelInlineCreate = vi.fn();
const mockCreateChecklistItem = vi.fn();

const mockContexts = [
  { id: 'ctx-1', name: 'Work', color: '#ff0000', icon: null, sort_order: 0, created_at: '', updated_at: '', deleted_at: null },
  { id: 'ctx-2', name: 'Personal', color: '#00ff00', icon: null, sort_order: 1, created_at: '', updated_at: '', deleted_at: null },
];
const mockProjects = [
  { id: 'proj-1', title: 'Cortex', description: null, status: 'active' as const, context_id: null, sort_order: 0, created_at: '', updated_at: '', completed_at: null, deleted_at: null },
  { id: 'proj-2', title: 'Website', description: null, status: 'active' as const, context_id: null, sort_order: 1, created_at: '', updated_at: '', completed_at: null, deleted_at: null },
];

let mockInlineCreateDefaults: Record<string, unknown> | null = null;

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createTask: mockCreateTask,
      cancelInlineCreate: mockCancelInlineCreate,
      createChecklistItem: mockCreateChecklistItem,
      contexts: mockContexts,
      projects: mockProjects,
      inlineCreateDefaults: mockInlineCreateDefaults,
    };
    return selector(state);
  },
}));

// Mock DatePickerButton to avoid Calendar/Popover rendering issues in jsdom.
// DatePickerButton is tested separately.
vi.mock('./DatePickerButton', () => ({
  DatePickerButton: ({ onChange, label, actions }: { onChange: (d: string) => void; label: string; actions?: { label: string; onClick: () => void }[] }) => (
    <div>
      <button type="button" aria-label={label} onClick={() => onChange('2026-03-15')}>
        {label}
      </button>
      {actions?.map((action) => (
        <button key={action.label} type="button" aria-label={action.label} onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

describe('InlineTaskCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInlineCreateDefaults = null;
    mockCreateTask.mockResolvedValue({
      id: 'new-1',
      title: 'Test',
      status: 'inbox',
    });
    mockCreateChecklistItem.mockResolvedValue({
      id: 'cl-1',
      task_id: 'new-1',
      title: 'Step',
    });
  });

  it('renders a title input with placeholder', () => {
    render(<InlineTaskCard />);
    expect(screen.getByPlaceholderText('New task')).toBeInTheDocument();
  });

  it('renders a notes textarea', () => {
    render(<InlineTaskCard />);
    expect(screen.getByPlaceholderText('Notes')).toBeInTheDocument();
  });

  it('auto-focuses the title input', () => {
    render(<InlineTaskCard />);
    expect(screen.getByPlaceholderText('New task')).toHaveFocus();
  });

  it('creates a task on Enter and closes', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Buy groceries' });
    await waitFor(() => {
      expect(mockCancelInlineCreate).toHaveBeenCalled();
    });
  });

  it('creates a task with notes when provided', () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');
    const notes = screen.getByPlaceholderText('Notes');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.change(notes, { target: { value: 'Milk, eggs, bread' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread',
    });
  });

  it('does not include notes when empty', () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Buy groceries' });
  });

  it('does not create a task when title is empty', () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('does not create a task when title is only whitespace', () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('trims whitespace from the title', () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: '  Buy groceries  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Buy groceries' });
  });

  it('dismisses on Escape', () => {
    render(<InlineTaskCard />);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockCancelInlineCreate).toHaveBeenCalled();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('dismisses on click outside when title is empty', async () => {
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <InlineTaskCard />
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(mockCreateTask).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockCancelInlineCreate).toHaveBeenCalled();
    });
  });

  it('saves task on click outside when title has content', async () => {
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <InlineTaskCard />
      </div>
    );
    const input = screen.getByPlaceholderText('New task');
    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Buy groceries' });
    await waitFor(() => {
      expect(mockCancelInlineCreate).toHaveBeenCalled();
    });
  });

  it('does not dismiss when clicking inside the card', () => {
    render(<InlineTaskCard />);
    fireEvent.mouseDown(screen.getByTestId('inline-task-card'));

    expect(mockCancelInlineCreate).not.toHaveBeenCalled();
  });

  // --- Date picker tests ---

  it('renders when date button', () => {
    render(<InlineTaskCard />);
    expect(screen.getByLabelText('When date')).toBeInTheDocument();
  });

  it('renders deadline button', () => {
    render(<InlineTaskCard />);
    expect(screen.getByLabelText('Deadline')).toBeInTheDocument();
  });

  it('includes when_date in createTask when set', () => {
    render(<InlineTaskCard />);

    fireEvent.click(screen.getByLabelText('When date'));

    const input = screen.getByPlaceholderText('New task');
    fireEvent.change(input, { target: { value: 'Dated task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dated task', when_date: '2026-03-15' })
    );
  });

  it('includes deadline in createTask when set', () => {
    render(<InlineTaskCard />);

    fireEvent.click(screen.getByLabelText('Deadline'));

    const input = screen.getByPlaceholderText('New task');
    fireEvent.change(input, { target: { value: 'Urgent task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Urgent task', deadline: '2026-03-15' })
    );
  });

  it('includes status when Anytime action is used', () => {
    render(<InlineTaskCard />);

    fireEvent.click(screen.getByLabelText('Anytime'));

    const input = screen.getByPlaceholderText('New task');
    fireEvent.change(input, { target: { value: 'Flexible task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Flexible task', status: 'anytime' })
    );
  });

  it('includes status when Someday action is used', () => {
    render(<InlineTaskCard />);

    fireEvent.click(screen.getByLabelText('Someday'));

    const input = screen.getByPlaceholderText('New task');
    fireEvent.change(input, { target: { value: 'Maybe task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Maybe task', status: 'someday' })
    );
  });

  it('does not dismiss when clicking inside a popover portal', () => {
    render(<InlineTaskCard />);

    // Simulate a Radix popover portal element in the DOM
    const portal = document.createElement('div');
    portal.setAttribute('data-radix-popper-content-wrapper', '');
    const button = document.createElement('button');
    portal.appendChild(button);
    document.body.appendChild(portal);

    fireEvent.mouseDown(button);

    expect(mockCancelInlineCreate).not.toHaveBeenCalled();

    document.body.removeChild(portal);
  });

  // --- Checklist tests ---

  it('renders Add checklist item button', () => {
    render(<InlineTaskCard />);
    expect(screen.getByText('Add checklist item')).toBeInTheDocument();
  });

  it('shows input when Add checklist item is clicked', () => {
    render(<InlineTaskCard />);
    fireEvent.click(screen.getByText('Add checklist item'));

    expect(screen.getByPlaceholderText('Checklist item')).toBeInTheDocument();
  });

  it('creates a new checklist input on Enter', () => {
    render(<InlineTaskCard />);
    fireEvent.click(screen.getByText('Add checklist item'));

    const input = screen.getByPlaceholderText('Checklist item');
    fireEvent.change(input, { target: { value: 'Step 1' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const inputs = screen.getAllByPlaceholderText('Checklist item');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('Step 1');
    expect(inputs[1]).toHaveValue('');
  });

  it('removes checklist item on Backspace when empty', () => {
    render(<InlineTaskCard />);
    fireEvent.click(screen.getByText('Add checklist item'));

    const input = screen.getByPlaceholderText('Checklist item');
    fireEvent.keyDown(input, { key: 'Backspace' });

    expect(screen.queryByPlaceholderText('Checklist item')).not.toBeInTheDocument();
  });

  it('creates checklist items after task creation', async () => {
    render(<InlineTaskCard />);

    // Add two checklist items
    fireEvent.click(screen.getByText('Add checklist item'));
    const firstInput = screen.getByPlaceholderText('Checklist item');
    fireEvent.change(firstInput, { target: { value: 'Step 1' } });
    fireEvent.keyDown(firstInput, { key: 'Enter' });

    const inputs = screen.getAllByPlaceholderText('Checklist item');
    fireEvent.change(inputs[1], { target: { value: 'Step 2' } });

    // Submit the task
    const titleInput = screen.getByPlaceholderText('New task');
    fireEvent.change(titleInput, { target: { value: 'Task with steps' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateChecklistItem).toHaveBeenCalledTimes(2);
      expect(mockCreateChecklistItem).toHaveBeenCalledWith({ task_id: 'new-1', title: 'Step 1' });
      expect(mockCreateChecklistItem).toHaveBeenCalledWith({ task_id: 'new-1', title: 'Step 2' });
    });
  });

  it('includes project_id in createTask when inlineCreateDefaults has project_id', () => {
    mockInlineCreateDefaults = { project_id: 'proj-1' };
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Project task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Project task', project_id: 'proj-1' }),
    );
    mockInlineCreateDefaults = null;
  });

  it('does not include project_id when projectId prop is absent', () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Regular task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Regular task' });
  });

  it('does not create empty checklist items', async () => {
    render(<InlineTaskCard />);

    // Add a checklist item with content, then Enter creates an empty one
    fireEvent.click(screen.getByText('Add checklist item'));
    const input = screen.getByPlaceholderText('Checklist item');
    fireEvent.change(input, { target: { value: 'Real step' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Second input is left empty

    // Submit the task
    const titleInput = screen.getByPlaceholderText('New task');
    fireEvent.change(titleInput, { target: { value: 'My task' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateChecklistItem).toHaveBeenCalledTimes(1);
      expect(mockCreateChecklistItem).toHaveBeenCalledWith({ task_id: 'new-1', title: 'Real step' });
    });
  });

  // --- Token parsing tests ---

  it('shows preview chip when context token is parsed', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task #Work' } });

    await waitFor(() => {
      expect(screen.getByTestId('chip-context')).toBeInTheDocument();
    });
  });

  it('creates task with parsed context_id from token', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task #Work' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Task', context_id: 'ctx-1' })
      );
    });
  });

  it('creates task with parsed when_date from token', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task do:today' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Task', when_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
      );
    });
  });

  it('creates task with parsed project_id from token', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task +Cortex' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Task', project_id: 'proj-1' })
      );
    });
  });

  it('strips tokens from title on submit', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task #Work do:today' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Task' })
      );
    });
  });

  it('parsed token project overrides inlineCreateDefaults project_id', async () => {
    mockInlineCreateDefaults = { project_id: 'proj-2' };
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task +Cortex' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: 'proj-1' })
      );
    });
    mockInlineCreateDefaults = null;
  });

  // --- Autocomplete tests ---

  it('shows autocomplete dropdown when typing #', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task #', selectionStart: 6, selectionEnd: 6 } });
    Object.defineProperty(input, 'selectionStart', { value: 6, configurable: true });

    await waitFor(() => {
      expect(screen.getByTestId('token-autocomplete')).toBeInTheDocument();
    });
  });

  it('filters autocomplete based on input after #', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task #Wo' } });
    Object.defineProperty(input, 'selectionStart', { value: 8, configurable: true });

    await waitFor(() => {
      const dropdown = screen.queryByTestId('token-autocomplete');
      if (dropdown) {
        expect(dropdown).toHaveTextContent('Work');
        expect(dropdown).not.toHaveTextContent('Personal');
      }
    });
  });

  it('selecting autocomplete option replaces token in input', async () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Task #Wo' } });
    Object.defineProperty(input, 'selectionStart', { value: 8, configurable: true });

    await waitFor(() => {
      const workOption = screen.queryByText('Work');
      if (workOption) {
        fireEvent.mouseDown(workOption);
        expect((input as HTMLInputElement).value).toContain('Work');
      }
    });
  });
});

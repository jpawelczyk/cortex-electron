// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { InlineTaskCard } from './InlineTaskCard';

const mockCreateTask = vi.fn();
const mockCancelInlineCreate = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createTask: mockCreateTask,
      cancelInlineCreate: mockCancelInlineCreate,
    };
    return selector(state);
  },
}));

describe('InlineTaskCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTask.mockResolvedValue({
      id: 'new-1',
      title: 'Test',
      status: 'inbox',
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

  it('creates a task on Enter and closes', () => {
    render(<InlineTaskCard />);
    const input = screen.getByPlaceholderText('New task');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Buy groceries' });
    expect(mockCancelInlineCreate).toHaveBeenCalled();
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

  it('dismisses on click outside when title is empty', () => {
    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <InlineTaskCard />
      </div>
    );
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockCancelInlineCreate).toHaveBeenCalled();
  });

  it('saves task on click outside when title has content', () => {
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
    expect(mockCancelInlineCreate).toHaveBeenCalled();
  });

  it('does not dismiss when clicking inside the card', () => {
    render(<InlineTaskCard />);
    fireEvent.mouseDown(screen.getByTestId('inline-task-card'));

    expect(mockCancelInlineCreate).not.toHaveBeenCalled();
  });
});

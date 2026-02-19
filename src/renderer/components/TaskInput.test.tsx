// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TaskInput } from './TaskInput';

const mockCreateTask = vi.fn();

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createTask: mockCreateTask,
    };
    return selector(state);
  },
}));

describe('TaskInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTask.mockResolvedValue({
      id: 'new-1',
      title: 'Test',
      status: 'inbox',
    });
  });

  it('renders an input with placeholder', () => {
    render(<TaskInput />);
    expect(screen.getByPlaceholderText('Add a task...')).toBeInTheDocument();
  });

  it('creates a task on Enter and clears input', () => {
    render(<TaskInput />);
    const input = screen.getByPlaceholderText('Add a task...');

    fireEvent.change(input, { target: { value: 'Buy groceries' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Buy groceries' });
    expect(input).toHaveValue('');
  });

  it('does not create a task when input is empty', () => {
    render(<TaskInput />);
    const input = screen.getByPlaceholderText('Add a task...');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('does not create a task when input is only whitespace', () => {
    render(<TaskInput />);
    const input = screen.getByPlaceholderText('Add a task...');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('trims whitespace from the title', () => {
    render(<TaskInput />);
    const input = screen.getByPlaceholderText('Add a task...');

    fireEvent.change(input, { target: { value: '  Buy groceries  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Buy groceries' });
  });

  it('blurs input on Escape', () => {
    render(<TaskInput />);
    const input = screen.getByPlaceholderText('Add a task...');

    input.focus();
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).not.toHaveFocus();
  });
});

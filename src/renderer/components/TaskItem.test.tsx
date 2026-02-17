// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TaskItem } from './TaskItem';
import type { Task } from '@shared/types';

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

describe('TaskItem', () => {
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

  it('highlights as selected when isSelected is true', () => {
    render(
      <TaskItem task={fakeTask()} onComplete={vi.fn()} isSelected />
    );
    const row = screen.getByText('Test task').closest('[data-testid="task-item"]');
    expect(row?.className).toContain('bg-accent');
  });
});

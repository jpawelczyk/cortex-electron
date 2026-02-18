// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  const defaultProps = {
    activeView: 'inbox' as const,
    onViewChange: vi.fn(),
    taskCounts: { inbox: 3, today: 1, upcoming: 5, anytime: 2, someday: 0, logbook: 10, trash: 4 },
  };

  it('renders navigation items', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Anytime')).toBeInTheDocument();
    expect(screen.getByText('Someday')).toBeInTheDocument();
    expect(screen.getByText('Logbook')).toBeInTheDocument();
  });

  it('highlights the active view', () => {
    render(<Sidebar {...defaultProps} activeView="inbox" />);
    const inboxItem = screen.getByText('Inbox').closest('button');
    expect(inboxItem).toHaveClass('text-primary');
  });

  it('calls onViewChange when a nav item is clicked', () => {
    const onViewChange = vi.fn();
    render(<Sidebar {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText('Today'));
    expect(onViewChange).toHaveBeenCalledWith('today');
  });

  it('shows task counts for each status', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument(); // inbox
    expect(screen.getByText('1')).toBeInTheDocument(); // today
    expect(screen.getByText('5')).toBeInTheDocument(); // upcoming
  });

  it('does not show count badge when count is 0', () => {
    render(<Sidebar {...defaultProps} taskCounts={{ ...defaultProps.taskCounts, someday: 0 }} />);
    const somedayItem = screen.getByText('Someday').closest('button');
    // "0" should not appear as a badge within the someday button
    expect(somedayItem).not.toHaveTextContent('0');
  });

  it('renders Trash nav item', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Trash')).toBeInTheDocument();
  });

  it('calls onViewChange with trash when Trash clicked', () => {
    const onViewChange = vi.fn();
    render(<Sidebar {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText('Trash'));
    expect(onViewChange).toHaveBeenCalledWith('trash');
  });

  it('does not show trash count badge', () => {
    render(<Sidebar {...defaultProps} />);
    const trashItem = screen.getByText('Trash').closest('button');
    expect(trashItem).not.toHaveTextContent('4');
  });
});

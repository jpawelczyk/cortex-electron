// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  const defaultProps = {
    activeView: 'inbox' as const,
    onViewChange: vi.fn(),
    taskCounts: { inbox: 3, today: 1, upcoming: 5, anytime: 2, someday: 0, stale: 0, logbook: 10, trash: 4 },
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

  it('does not show count for anytime', () => {
    render(<Sidebar {...defaultProps} taskCounts={{ ...defaultProps.taskCounts, anytime: 9 }} />);
    const anytimeItem = screen.getByText('Anytime').closest('button');
    expect(anytimeItem).not.toHaveTextContent('9');
  });

  it('does not show count for someday', () => {
    render(<Sidebar {...defaultProps} taskCounts={{ ...defaultProps.taskCounts, someday: 8 }} />);
    const somedayItem = screen.getByText('Someday').closest('button');
    expect(somedayItem).not.toHaveTextContent('8');
  });

  it('renders Stale nav item', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('calls onViewChange with stale when Stale clicked', () => {
    const onViewChange = vi.fn();
    render(<Sidebar {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText('Stale'));
    expect(onViewChange).toHaveBeenCalledWith('stale');
  });

  it('shows stale count when > 0', () => {
    render(<Sidebar {...defaultProps} taskCounts={{ ...defaultProps.taskCounts, stale: 7 }} />);
    expect(screen.getByText('7')).toBeInTheDocument();
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

  it('renders Projects nav item', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('calls onViewChange with projects when Projects clicked', () => {
    const onViewChange = vi.fn();
    render(<Sidebar {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText('Projects'));
    expect(onViewChange).toHaveBeenCalledWith('projects');
  });

  it('renders Projects after task views and before settings', () => {
    render(<Sidebar {...defaultProps} />);
    const trash = screen.getByText('Trash');
    const projects = screen.getByText('Projects');
    // Projects appears after Trash in DOM
    expect(trash.compareDocumentPosition(projects)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

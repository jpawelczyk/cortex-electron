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

  it('renders all navigation items', () => {
    render(<Sidebar {...defaultProps} />);
    const items = ['Home', 'Daily', 'Projects', 'Inbox', 'Today', 'Upcoming', 'Anytime', 'Someday', 'Stale', 'Logbook', 'Meetings', 'Notes', 'People', 'Trash'];
    items.forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
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

  it('calls onViewChange for all top-level items', () => {
    const onViewChange = vi.fn();
    render(<Sidebar {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText('Home'));
    expect(onViewChange).toHaveBeenCalledWith('home');
    fireEvent.click(screen.getByText('Daily'));
    expect(onViewChange).toHaveBeenCalledWith('daily');
    fireEvent.click(screen.getByText('Projects'));
    expect(onViewChange).toHaveBeenCalledWith('projects');
    fireEvent.click(screen.getByText('Meetings'));
    expect(onViewChange).toHaveBeenCalledWith('meetings');
    fireEvent.click(screen.getByText('Notes'));
    expect(onViewChange).toHaveBeenCalledWith('notes');
    fireEvent.click(screen.getByText('People'));
    expect(onViewChange).toHaveBeenCalledWith('stakeholders');
    fireEvent.click(screen.getByText('Trash'));
    expect(onViewChange).toHaveBeenCalledWith('trash');
  });

  it('shows counts for inbox, today, upcoming, stale', () => {
    render(<Sidebar {...defaultProps} taskCounts={{ ...defaultProps.taskCounts, stale: 7 }} />);
    expect(screen.getByText('3')).toBeInTheDocument(); // inbox
    expect(screen.getByText('1')).toBeInTheDocument(); // today
    expect(screen.getByText('5')).toBeInTheDocument(); // upcoming
    expect(screen.getByText('7')).toBeInTheDocument(); // stale
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

  it('does not show trash count badge', () => {
    render(<Sidebar {...defaultProps} />);
    const trashItem = screen.getByText('Trash').closest('button');
    expect(trashItem).not.toHaveTextContent('4');
  });

  it('renders Trash after People in DOM order', () => {
    render(<Sidebar {...defaultProps} />);
    const people = screen.getByText('People');
    const trash = screen.getByText('Trash');
    expect(people.compareDocumentPosition(trash)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

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
    const items = ['Inbox', 'Home', 'Daily', 'Projects', 'Tasks', 'Meetings', 'Notes', 'People', 'Logbook', 'Trash', 'Settings'];
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
    fireEvent.click(screen.getByText('Tasks'));
    expect(onViewChange).toHaveBeenCalledWith('tasks');
  });

  it('calls onViewChange for all items', () => {
    const onViewChange = vi.fn();
    render(<Sidebar {...defaultProps} onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText('Inbox'));
    expect(onViewChange).toHaveBeenCalledWith('inbox');
    fireEvent.click(screen.getByText('Home'));
    expect(onViewChange).toHaveBeenCalledWith('home');
    fireEvent.click(screen.getByText('Daily'));
    expect(onViewChange).toHaveBeenCalledWith('daily');
    fireEvent.click(screen.getByText('Projects'));
    expect(onViewChange).toHaveBeenCalledWith('projects');
    fireEvent.click(screen.getByText('Tasks'));
    expect(onViewChange).toHaveBeenCalledWith('tasks');
    fireEvent.click(screen.getByText('Meetings'));
    expect(onViewChange).toHaveBeenCalledWith('meetings');
    fireEvent.click(screen.getByText('Notes'));
    expect(onViewChange).toHaveBeenCalledWith('notes');
    fireEvent.click(screen.getByText('People'));
    expect(onViewChange).toHaveBeenCalledWith('stakeholders');
    fireEvent.click(screen.getByText('Logbook'));
    expect(onViewChange).toHaveBeenCalledWith('logbook');
    fireEvent.click(screen.getByText('Trash'));
    expect(onViewChange).toHaveBeenCalledWith('trash');
    fireEvent.click(screen.getByText('Settings'));
    expect(onViewChange).toHaveBeenCalledWith('settings');
  });

  it('shows count for inbox', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('highlights Tasks when a task sub-view is active', () => {
    render(<Sidebar {...defaultProps} activeView="today" />);
    const tasksItem = screen.getByText('Tasks').closest('button');
    expect(tasksItem).toHaveClass('text-primary');
  });

  it('renders sections in correct order: Inbox, divider, main nav, divider, bottom', () => {
    render(<Sidebar {...defaultProps} />);
    const inbox = screen.getByText('Inbox');
    const home = screen.getByText('Home');
    const settings = screen.getByText('Settings');
    expect(inbox.compareDocumentPosition(home)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(home.compareDocumentPosition(settings)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

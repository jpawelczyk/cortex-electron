// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock all sub-views to avoid their complex store dependencies
vi.mock('./TodayView', () => ({ TodayView: () => <div data-testid="today-view" /> }));
vi.mock('./UpcomingView', () => ({ UpcomingView: () => <div data-testid="upcoming-view" /> }));
vi.mock('./AnytimeView', () => ({ AnytimeView: () => <div data-testid="anytime-view" /> }));
vi.mock('./SomedayView', () => ({ SomedayView: () => <div data-testid="someday-view" /> }));
vi.mock('./StaleView', () => ({ StaleView: () => <div data-testid="stale-view" /> }));

import { TasksView } from './TasksView';

const defaultCounts = { today: 3, upcoming: 5, anytime: 0, someday: 0, stale: 2 };

describe('TasksView', () => {
  it('renders all tab labels', () => {
    render(<TasksView activeView="tasks" onViewChange={vi.fn()} taskCounts={defaultCounts} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Anytime')).toBeInTheDocument();
    expect(screen.getByText('Someday')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('defaults to today tab when activeView is "tasks"', () => {
    render(<TasksView activeView="tasks" onViewChange={vi.fn()} taskCounts={defaultCounts} />);
    expect(screen.getByTestId('today-view')).toBeInTheDocument();
    const todayTab = screen.getByText('Today').closest('button');
    expect(todayTab).toHaveClass('text-primary');
  });

  it('highlights the active tab based on activeView', () => {
    render(<TasksView activeView="upcoming" onViewChange={vi.fn()} taskCounts={defaultCounts} />);
    expect(screen.getByTestId('upcoming-view')).toBeInTheDocument();
    const upcomingTab = screen.getByText('Upcoming').closest('button');
    expect(upcomingTab).toHaveClass('text-primary');
  });

  it('calls onViewChange when a tab is clicked', () => {
    const onViewChange = vi.fn();
    render(<TasksView activeView="tasks" onViewChange={onViewChange} taskCounts={defaultCounts} />);
    fireEvent.click(screen.getByText('Anytime'));
    expect(onViewChange).toHaveBeenCalledWith('anytime');
  });

  it('shows counts for tabs that have them', () => {
    render(<TasksView activeView="tasks" onViewChange={vi.fn()} taskCounts={defaultCounts} />);
    // today: 3, upcoming: 5, stale: 2
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show zero counts', () => {
    render(<TasksView activeView="tasks" onViewChange={vi.fn()} taskCounts={defaultCounts} />);
    const anytimeTab = screen.getByText('Anytime').closest('button');
    expect(anytimeTab?.textContent).toBe('Anytime');
  });

  it('renders correct view for each tab', () => {
    const { rerender } = render(<TasksView activeView="stale" onViewChange={vi.fn()} taskCounts={defaultCounts} />);
    expect(screen.getByTestId('stale-view')).toBeInTheDocument();

    rerender(<TasksView activeView="someday" onViewChange={vi.fn()} taskCounts={defaultCounts} />);
    expect(screen.getByTestId('someday-view')).toBeInTheDocument();
  });
});

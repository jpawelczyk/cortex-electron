// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ContextSelector } from './ContextSelector';
import type { Context } from '@shared/types';

const mockToggleContext = vi.fn();
const mockFetchContexts = vi.fn();

let mockContexts: Context[] = [];
let mockActiveContextIds: string[] = [];

vi.mock('../stores', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      contexts: mockContexts,
      activeContextIds: mockActiveContextIds,
      toggleContext: mockToggleContext,
      fetchContexts: mockFetchContexts,
    };
    return selector(state);
  },
}));

const fakeContext = (overrides: Partial<Context> = {}): Context => ({
  id: 'ctx-1',
  name: 'Work',
  color: '#f97316',
  icon: 'Briefcase',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  deleted_at: null,
  ...overrides,
});

describe('ContextSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContexts = [];
    mockActiveContextIds = [];
  });

  it('clicking a button calls toggleContext with context id', () => {
    mockContexts = [fakeContext({ id: 'ctx-42' })];
    render(<ContextSelector />);
    fireEvent.click(screen.getByRole('button', { name: /Work/ }));
    expect(mockToggleContext).toHaveBeenCalledWith('ctx-42');
  });

  it('active contexts have aria-pressed true', () => {
    mockContexts = [
      fakeContext({ id: 'ctx-1', name: 'Work' }),
      fakeContext({ id: 'ctx-2', name: 'Personal' }),
    ];
    mockActiveContextIds = ['ctx-1'];
    render(<ContextSelector />);
    expect(screen.getByRole('button', { name: /Work/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Personal/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('inactive contexts have muted opacity', () => {
    mockContexts = [
      fakeContext({ id: 'ctx-1', name: 'Work' }),
      fakeContext({ id: 'ctx-2', name: 'Personal' }),
    ];
    mockActiveContextIds = ['ctx-1'];
    render(<ContextSelector />);
    const inactiveBtn = screen.getByRole('button', { name: /Personal/ });
    expect(inactiveBtn.className).toContain('opacity-50');
  });

  it('all buttons are full opacity when no filter is active (empty activeContextIds)', () => {
    mockContexts = [
      fakeContext({ id: 'ctx-1', name: 'Work' }),
      fakeContext({ id: 'ctx-2', name: 'Personal' }),
    ];
    mockActiveContextIds = [];
    render(<ContextSelector />);
    expect(screen.getByRole('button', { name: /Work/ }).className).not.toContain('opacity-50');
    expect(screen.getByRole('button', { name: /Personal/ }).className).not.toContain('opacity-50');
  });

  it('fetches contexts on mount if none loaded', () => {
    mockContexts = [];
    render(<ContextSelector />);
    expect(mockFetchContexts).toHaveBeenCalled();
  });

  it('does not fetch contexts on mount if already loaded', () => {
    mockContexts = [fakeContext()];
    render(<ContextSelector />);
    expect(mockFetchContexts).not.toHaveBeenCalled();
  });

  it('renders Lucide icon when icon is a known name', () => {
    mockContexts = [fakeContext({ icon: 'Briefcase' })];
    render(<ContextSelector />);
    const btn = screen.getByRole('button', { name: /Work/ });
    expect(btn.querySelector('.lucide-briefcase')).toBeInTheDocument();
  });

  it('renders emoji when icon is not a known Lucide name', () => {
    mockContexts = [fakeContext({ icon: '🔬' })];
    render(<ContextSelector />);
    expect(screen.getByText('🔬')).toBeInTheDocument();
  });

  it('renders no icon when icon is null', () => {
    mockContexts = [fakeContext({ icon: null })];
    render(<ContextSelector />);
    const btn = screen.getByRole('button', { name: /Work/ });
    expect(btn.querySelector('.lucide')).toBeNull();
    // Only dot + name, no emoji span
    expect(btn.querySelectorAll('[data-testid^="context-icon"]')).toHaveLength(0);
  });
});

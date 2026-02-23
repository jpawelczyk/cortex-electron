// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveQuery } from './useLiveQuery';

// Track registered listeners so tests can simulate IPC events
type TablesUpdatedCallback = (tables: string[]) => void;
let listeners: TablesUpdatedCallback[] = [];
let unsubscribeSpy: ReturnType<typeof vi.fn>;

const mockCortex = {
  sync: {
    onTablesUpdated: vi.fn((callback: TablesUpdatedCallback) => {
      listeners.push(callback);
      const unsub = () => {
        listeners = listeners.filter((l) => l !== callback);
        unsubscribeSpy();
      };
      return unsub;
    }),
  },
};

function emitTablesUpdated(tables: string[]) {
  listeners.forEach((cb) => cb(tables));
}

Object.defineProperty(window, 'cortex', { value: mockCortex, writable: true });

describe('useLiveQuery', () => {
  beforeEach(() => {
    listeners = [];
    unsubscribeSpy = vi.fn();
    mockCortex.sync.onTablesUpdated.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns loading state initially', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();

    // Let the initial fetch settle to avoid act() warnings
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('fetches data on mount and clears loading', async () => {
    const items = [{ id: '1', title: 'Test' }];
    const queryFn = vi.fn().mockResolvedValue(items);

    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(items);
    expect(result.current.error).toBeNull();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('subscribes to onTablesUpdated on mount', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    expect(mockCortex.sync.onTablesUpdated).toHaveBeenCalledTimes(1);
    expect(listeners).toHaveLength(1);

    // Let the initial fetch settle to avoid act() warnings
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('re-fetches when a matching table changes', async () => {
    const items1 = [{ id: '1' }];
    const items2 = [{ id: '1' }, { id: '2' }];
    const queryFn = vi.fn().mockResolvedValueOnce(items1).mockResolvedValueOnce(items2);

    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(items1);

    // Simulate table change event + wait for debounce
    act(() => {
      emitTablesUpdated(['tasks']);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(items2);
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-fetch when an unrelated table changes', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: '1' }]);

    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      emitTablesUpdated(['projects']);
    });

    // Wait a bit to ensure no refetch happens
    await new Promise((r) => setTimeout(r, 100));

    // Should still be 1 call (initial only)
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('handles query errors gracefully', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('DB error');
    expect(result.current.data).toEqual([]);
  });

  it('unsubscribes from IPC on unmount', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);

    const { unmount } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    await waitFor(() => expect(listeners).toHaveLength(1));

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalled();
    expect(listeners).toHaveLength(0);
  });

  it('debounces rapid table change events', async () => {
    vi.useFakeTimers();
    const queryFn = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks']));

    // Flush initial fetch
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.isLoading).toBe(false);
    queryFn.mockClear();

    // Fire multiple events rapidly
    act(() => {
      emitTablesUpdated(['tasks']);
      emitTablesUpdated(['tasks']);
      emitTablesUpdated(['tasks']);
    });

    // Before debounce settles, no refetch
    expect(queryFn).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(50); });

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('matches when any watched table is in the changed set', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);

    const { result } = renderHook(() => useLiveQuery(queryFn, ['tasks', 'projects']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    queryFn.mockClear();

    act(() => {
      emitTablesUpdated(['projects']);
    });

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from './useDebouncedCallback';

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the callback immediately', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.debouncedFn('hello');
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('calls the callback after the delay', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.debouncedFn('hello');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith('hello');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on subsequent calls — only the last fires', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.debouncedFn('a');
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.debouncedFn('b');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('b');
  });

  it('flush() fires the pending callback immediately', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.debouncedFn('flushed');
    });

    act(() => {
      result.current.flush();
    });

    expect(callback).toHaveBeenCalledWith('flushed');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('flush() does nothing when no call is pending', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.flush();
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancel() prevents the callback from firing', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.debouncedFn('cancelled');
    });

    act(() => {
      result.current.cancel();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('cancels pending timeout on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.debouncedFn('unmounted');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('uses the latest callback without resetting the timer', () => {
    let value = 'first';
    const callback = vi.fn(() => value);
    const { result, rerender } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current.debouncedFn();
    });

    value = 'second';
    rerender();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    // Callback should use latest closure value
    expect(callback.mock.results[0].value).toBe('second');
  });
});

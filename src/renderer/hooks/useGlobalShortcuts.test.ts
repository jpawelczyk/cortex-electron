// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalShortcuts } from './useGlobalShortcuts';

let capturedCallback: (() => void) | null = null;
const mockUnsubscribe = vi.fn();

beforeEach(() => {
  capturedCallback = null;
  mockUnsubscribe.mockClear();

  // Mock window.cortex.onFocusTaskInput
  Object.defineProperty(window, 'cortex', {
    value: {
      onFocusTaskInput: vi.fn((cb: () => void) => {
        capturedCallback = cb;
        return mockUnsubscribe;
      }),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).cortex;
});

describe('useGlobalShortcuts', () => {
  it('subscribes to onFocusTaskInput on mount', () => {
    const setActiveView = vi.fn();
    const startInlineCreate = vi.fn();
    const startInlineProjectCreate = vi.fn();

    renderHook(() => useGlobalShortcuts({ setActiveView, startInlineCreate, startInlineProjectCreate, activeView: 'inbox' }));

    expect(window.cortex.onFocusTaskInput).toHaveBeenCalledWith(expect.any(Function));
  });

  it('switches to inbox and opens inline create when triggered from non-project view', () => {
    const setActiveView = vi.fn();
    const startInlineCreate = vi.fn();
    const startInlineProjectCreate = vi.fn();

    renderHook(() => useGlobalShortcuts({ setActiveView, startInlineCreate, startInlineProjectCreate, activeView: 'inbox' }));

    capturedCallback!();

    expect(setActiveView).toHaveBeenCalledWith('inbox');
    expect(startInlineCreate).toHaveBeenCalled();
    expect(startInlineProjectCreate).not.toHaveBeenCalled();
  });

  it('starts inline project create when triggered from projects view', () => {
    const setActiveView = vi.fn();
    const startInlineCreate = vi.fn();
    const startInlineProjectCreate = vi.fn();

    renderHook(() => useGlobalShortcuts({ setActiveView, startInlineCreate, startInlineProjectCreate, activeView: 'projects' }));

    capturedCallback!();

    expect(startInlineProjectCreate).toHaveBeenCalled();
    expect(startInlineCreate).not.toHaveBeenCalled();
    expect(setActiveView).not.toHaveBeenCalled();
  });

  it('calls setActiveView before startInlineCreate', () => {
    const callOrder: string[] = [];
    const setActiveView = vi.fn(() => callOrder.push('setActiveView'));
    const startInlineCreate = vi.fn(() => callOrder.push('startInlineCreate'));
    const startInlineProjectCreate = vi.fn();

    renderHook(() => useGlobalShortcuts({ setActiveView, startInlineCreate, startInlineProjectCreate, activeView: 'inbox' }));
    capturedCallback!();

    expect(callOrder).toEqual(['setActiveView', 'startInlineCreate']);
  });

  it('unsubscribes on unmount', () => {
    const setActiveView = vi.fn();
    const startInlineCreate = vi.fn();
    const startInlineProjectCreate = vi.fn();

    const { unmount } = renderHook(() =>
      useGlobalShortcuts({ setActiveView, startInlineCreate, startInlineProjectCreate, activeView: 'inbox' })
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

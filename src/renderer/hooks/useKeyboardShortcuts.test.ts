// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function fireKey(key: string, opts: Partial<KeyboardEvent> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('useKeyboardShortcuts', () => {
  let setActiveView: ReturnType<typeof vi.fn>;
  let deselectTask: ReturnType<typeof vi.fn>;
  let startInlineCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setActiveView = vi.fn();
    deselectTask = vi.fn();
    startInlineCreate = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderShortcuts(activeView: string = 'inbox') {
    return renderHook(() =>
      useKeyboardShortcuts({ setActiveView, deselectTask, startInlineCreate, activeView })
    );
  }

  describe('Cmd+1/2/3 → switch views', () => {
    it('Cmd+1 switches to inbox', () => {
      renderShortcuts();
      fireKey('1', { metaKey: true });
      expect(setActiveView).toHaveBeenCalledWith('inbox');
    });

    it('Cmd+2 switches to today', () => {
      renderShortcuts();
      fireKey('2', { metaKey: true });
      expect(setActiveView).toHaveBeenCalledWith('today');
    });

    it('Cmd+3 switches to upcoming', () => {
      renderShortcuts();
      fireKey('3', { metaKey: true });
      expect(setActiveView).toHaveBeenCalledWith('upcoming');
    });
  });

  describe('Escape → close detail panel', () => {
    it('calls deselectTask', () => {
      renderShortcuts();
      fireKey('Escape');
      expect(deselectTask).toHaveBeenCalled();
    });

    it('does not call deselectTask when an input is focused', () => {
      renderShortcuts();
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireKey('Escape');
      expect(deselectTask).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('does not call deselectTask when a textarea is focused', () => {
      renderShortcuts();
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      fireKey('Escape');
      expect(deselectTask).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });
  });

  describe('Cmd+, → settings placeholder', () => {
    it('does not throw (placeholder)', () => {
      renderShortcuts();
      fireKey(',', { metaKey: true });
      // just verifying no crash — settings not implemented yet
    });
  });

  describe('Cmd+N → new task', () => {
    it('calls startInlineCreate on inbox view', () => {
      renderShortcuts('inbox');
      fireKey('n', { metaKey: true });
      expect(startInlineCreate).toHaveBeenCalled();
    });

    it('does not call startInlineCreate on other views', () => {
      renderShortcuts('today');
      fireKey('n', { metaKey: true });
      expect(startInlineCreate).not.toHaveBeenCalled();
    });
  });

  it('cleans up listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderShortcuts();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

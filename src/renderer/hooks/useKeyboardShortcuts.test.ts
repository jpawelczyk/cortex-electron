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
  let startInlineProjectCreate: ReturnType<typeof vi.fn>;
  let startInlineNoteCreate: ReturnType<typeof vi.fn>;
  let activeView: string;

  beforeEach(() => {
    setActiveView = vi.fn();
    deselectTask = vi.fn();
    startInlineCreate = vi.fn();
    startInlineProjectCreate = vi.fn();
    startInlineNoteCreate = vi.fn();
    activeView = 'inbox';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderShortcuts() {
    return renderHook(() =>
      useKeyboardShortcuts({ setActiveView, deselectTask, startInlineCreate, startInlineProjectCreate, startInlineNoteCreate, activeView })
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

  describe('Cmd+N → context-sensitive new item', () => {
    it('navigates to inbox and starts inline task create from non-project views', () => {
      activeView = 'inbox';
      renderShortcuts();
      fireKey('n', { metaKey: true });
      expect(setActiveView).toHaveBeenCalledWith('inbox');
      expect(startInlineCreate).toHaveBeenCalled();
      expect(startInlineProjectCreate).not.toHaveBeenCalled();
    });

    it('starts inline project create when on projects view', () => {
      activeView = 'projects';
      renderShortcuts();
      fireKey('n', { metaKey: true });
      expect(startInlineProjectCreate).toHaveBeenCalled();
      expect(startInlineCreate).not.toHaveBeenCalled();
      expect(setActiveView).not.toHaveBeenCalled();
    });

    it('starts inline note create when on notes view', () => {
      activeView = 'notes';
      renderShortcuts();
      fireKey('n', { metaKey: true });
      expect(startInlineNoteCreate).toHaveBeenCalled();
      expect(startInlineCreate).not.toHaveBeenCalled();
      expect(setActiveView).not.toHaveBeenCalled();
    });
  });

  it('cleans up listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderShortcuts();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

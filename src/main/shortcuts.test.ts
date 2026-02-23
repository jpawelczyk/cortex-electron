import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  globalShortcut: {
    register: vi.fn(),
    unregisterAll: vi.fn(),
  },
}));

import { globalShortcut } from 'electron';
import type { BrowserWindow } from 'electron';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts';

describe('Global shortcuts', () => {
  let mockWindow: {
    show: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: { send: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockWindow = {
      show: vi.fn(),
      focus: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: { send: vi.fn() },
    };
    vi.mocked(globalShortcut.register).mockClear();
    vi.mocked(globalShortcut.unregisterAll).mockClear();
  });

  it('registers CommandOrControl+Shift+Space', () => {
    registerGlobalShortcuts(mockWindow as unknown as BrowserWindow);
    expect(globalShortcut.register).toHaveBeenCalledWith(
      'CommandOrControl+Shift+Space',
      expect.any(Function),
    );
  });

  it('shortcut shows and focuses window', () => {
    registerGlobalShortcuts(mockWindow as unknown as BrowserWindow);
    const callback = vi.mocked(globalShortcut.register).mock.calls[0][1];
    callback();
    expect(mockWindow.show).toHaveBeenCalled();
    expect(mockWindow.focus).toHaveBeenCalled();
  });

  it('shortcut sends focus-task-input to renderer', () => {
    registerGlobalShortcuts(mockWindow as unknown as BrowserWindow);
    const callback = vi.mocked(globalShortcut.register).mock.calls[0][1];
    callback();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('focus-task-input');
  });

  it('unregisters all shortcuts', () => {
    unregisterGlobalShortcuts();
    expect(globalShortcut.unregisterAll).toHaveBeenCalled();
  });
});

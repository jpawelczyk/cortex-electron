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
    webContents: { send: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    mockWindow = {
      show: vi.fn(),
      focus: vi.fn(),
      webContents: { send: vi.fn() },
    };
    vi.mocked(globalShortcut.register).mockClear();
    vi.mocked(globalShortcut.unregisterAll).mockClear();
  });

  it.each([
    'CommandOrControl+Shift+Space',
    'CommandOrControl+Shift+N',
  ])('registers %s', (accelerator) => {
    registerGlobalShortcuts(mockWindow as unknown as BrowserWindow);
    expect(globalShortcut.register).toHaveBeenCalledWith(
      accelerator,
      expect.any(Function),
    );
  });

  it.each([0, 1])('shortcut %i shows and focuses window', (callIndex) => {
    registerGlobalShortcuts(mockWindow as unknown as BrowserWindow);
    const callback = vi.mocked(globalShortcut.register).mock.calls[callIndex][1];
    callback();
    expect(mockWindow.show).toHaveBeenCalled();
    expect(mockWindow.focus).toHaveBeenCalled();
  });

  it.each([0, 1])('shortcut %i sends focus-task-input to renderer', (callIndex) => {
    registerGlobalShortcuts(mockWindow as unknown as BrowserWindow);
    const callback = vi.mocked(globalShortcut.register).mock.calls[callIndex][1];
    callback();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('focus-task-input');
  });

  it('unregisters all shortcuts', () => {
    unregisterGlobalShortcuts();
    expect(globalShortcut.unregisterAll).toHaveBeenCalled();
  });
});

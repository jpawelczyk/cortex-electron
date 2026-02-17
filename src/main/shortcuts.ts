import { globalShortcut, type BrowserWindow } from 'electron';

export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('focus-task-input');
  });
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

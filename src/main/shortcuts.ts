import { globalShortcut, type BrowserWindow } from 'electron';

export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  const quickCapture = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('focus-task-input');
  };

  globalShortcut.register('CommandOrControl+Shift+Space', quickCapture);
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

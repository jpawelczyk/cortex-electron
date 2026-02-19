import { globalShortcut, type BrowserWindow } from 'electron';

export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  const quickCapture = () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('focus-task-input');
  };

  globalShortcut.register('CommandOrControl+Shift+Space', quickCapture);
  globalShortcut.register('CommandOrControl+Shift+N', quickCapture);
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}

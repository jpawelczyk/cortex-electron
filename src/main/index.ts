import 'dotenv/config';
import fixPath from 'fix-path';
import { app, BrowserWindow, desktopCapturer, dialog, ipcMain, nativeImage, net, protocol, session, shell } from 'electron';

// Ensure Electron inherits the user's shell PATH on macOS so that
// bundled CLI tools (ffmpeg, whisper-cpp) are discoverable.
fixPath();
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { initDatabase, closeDatabase, getPowerSyncDatabase } from './db/index.js';
import { registerHandlers } from './ipc/handlers.js';
import { registerAuthHandlers } from './ipc/auth.js';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcuts.js';
import { createTaskService } from './services/task.service.js';
import { seedDefaultContexts } from './services/context.service.js';
import { SupabaseConnector } from './sync/connector.js';
import { FileAuthStorage } from './sync/auth-storage.js';
import { getSyncConfig } from '../shared/config.js';
import { SearchService } from './search/search-service.js';
import { registerSearchHandlers } from './ipc/search-handlers.js';
import { createRecordingService, createTranscriptionService, createModelManager } from './recording/index.js';
import { registerRecordingHandlers } from './ipc/recording-handlers.js';
import { registerTranscriptionHandlers } from './ipc/transcription-handlers.js';
import type { DbContext } from './db/types.js';

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err instanceof Error ? err.message : String(err));
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.message : String(reason));
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Enable system audio loopback for screen capture on macOS.
// MacLoopbackAudioForScreenShare: master enable for loopback audio
// MacSckSystemAudioLoopbackOverride: use ScreenCaptureKit for loopback
// Disable MacCatapLoopbackAudioForScreenShare (CoreAudio Tap, default in Electron 39+)
// because it requires the separate "System Audio Recording Only" macOS permission.
// The SCK path uses the broader "Screen & System Audio Recording" permission instead.
// Must be set before app.whenReady().
app.commandLine.appendSwitch(
  'enable-features',
  'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride',
);
app.commandLine.appendSwitch(
  'disable-features',
  'MacCatapLoopbackAudioForScreenShare',
);

// Register custom protocol for serving local audio files to the sandboxed renderer.
// Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  { scheme: 'cortex-audio', privileges: { stream: true, supportFetchAPI: true } },
]);

// Ensure consistent userData path across dev and packaged builds
app.setName('cortex');

// Set dock icon (macOS) - works in dev mode
if (process.platform === 'darwin') {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'build', 'icon.png')
    : path.join(app.getAppPath(), 'build', 'icon.png');
  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      app.dock?.setIcon(icon);
    }
  } catch {
    // Icon not found, use default
  }
}

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let disposeTableWatcher: (() => void) | null = null;
let searchService: SearchService | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 680,
    minHeight: 400,
    backgroundColor: '#0a0a0a',
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Show window when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Focus existing window when second instance attempted
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  // Add Content Security Policy headers
  // In dev mode, Vite injects inline scripts for HMR and React's JSX preamble,
  // so we must allow 'unsafe-inline' for scripts. In production, we lock it down.
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self'";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; style-src 'self' 'unsafe-inline'; ${scriptSrc}; img-src 'self' data:; font-src 'self' data:; media-src 'self' cortex-audio:; connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com${isDev ? ' ws:' : ''};`,
        ],
      },
    });
  });

  // Serve local audio files via cortex-audio:// protocol.
  // The renderer sandbox blocks file:// URLs, so audio playback needs this.
  protocol.handle('cortex-audio', (request) => {
    const filePath = decodeURIComponent(request.url.slice('cortex-audio://'.length));
    const recordingsDir = path.join(app.getPath('userData'), 'recordings');
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(recordingsDir + path.sep) && resolved !== recordingsDir) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(resolved).href);
  });

  // Register auth handlers BEFORE initDatabase() — the renderer can show
  // the login form while the DB is still initialising (especially in prod
  // where Worker spawn from asar is slow). Auth handlers only need the
  // Supabase client, not the local DB.
  const syncConfig = getSyncConfig();
  if (syncConfig) {
    const authStorage = new FileAuthStorage(app.getPath('userData'));
    const connector = new SupabaseConnector(syncConfig, authStorage);
    registerAuthHandlers(connector);
  }
  ipcMain.handle('auth:is-configured', () => !!syncConfig);

  try {
    // Initialize database and register IPC handlers BEFORE creating the window.
    // This prevents the renderer from making IPC calls before handlers exist.
    const db = await initDatabase();
    const notifyRenderer = (tables: string[]) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('powersync:tables-updated', tables);
      }
    };
    registerHandlers(db, notifyRenderer, () => searchService);

    createWindow();
    registerGlobalShortcuts(mainWindow!);

    // Register display media handler so the renderer can capture system audio
    // via getDisplayMedia(). Without this, Electron kills the renderer (bad IPC).
    // audio: 'loopback' works on all platforms when the Chromium flags are enabled.
    let pendingSourceId: string | null = null;
    ipcMain.handle('recording:select-source', (_, sourceId: unknown) => {
      if (typeof sourceId === 'string' && sourceId.length > 0) {
        pendingSourceId = sourceId;
      }
    });
    mainWindow!.webContents.session.setDisplayMediaRequestHandler(async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        const source = pendingSourceId
          ? sources.find((s) => s.id === pendingSourceId) ?? sources[0]
          : sources[0];
        pendingSourceId = null;
        if (source) {
          callback({ video: source, audio: 'loopback' });
        } else {
          callback({});
        }
      } catch {
        pendingSourceId = null;
        callback({});
      }
    });

    ipcMain.handle('recording:open-system-prefs', () => {
      if (process.platform === 'darwin') {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        // In dev mode, reveal Electron.app in Finder so the user can drag it
        // into the Screen & System Audio Recording permission list.
        const appBundle = process.execPath.replace(/\.app\/Contents\/MacOS\/.+$/, '.app');
        if (appBundle.endsWith('.app')) {
          shell.showItemInFolder(appBundle);
        }
      }
    });

    const ctx: DbContext = { db };

    // Seed default contexts on first run
    seedDefaultContexts(ctx).catch(() => {});

    // Auto-purge trash items older than 30 days
    const taskService = createTaskService(ctx);
    taskService.purgeExpiredTrash(30).catch(() => {});

    // Mark stale tasks on startup
    taskService.markStaleTasks(5).catch(() => {});

    // Initialize recording service
    const recordingService = createRecordingService(app);
    registerRecordingHandlers(recordingService);

    // Initialize transcription service + model manager
    const modelsDir = path.join(app.getPath('userData'), 'whisper-models');
    const transcriptionService = createTranscriptionService(modelsDir);
    const modelManager = createModelManager(app);
    registerTranscriptionHandlers(transcriptionService, { db }, () => mainWindow, modelManager);

    // Initialize search service (non-blocking — model loads in background)
    searchService = new SearchService();
    registerSearchHandlers(searchService, db, () => mainWindow);
    searchService.initialize().catch((err) => {
      console.error('[Search] Failed to initialize:', err instanceof Error ? err.message : String(err));
    });

    // Watch for PowerSync table changes and notify the renderer
    const psDb = getPowerSyncDatabase();
    disposeTableWatcher = psDb.onChange(
      {
        onChange: (event) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('powersync:tables-updated', event.changedTables);
          }
        },
      },
      { throttleMs: 50 },
    );

    // Re-check stale tasks on window focus (handles long-running sessions)
    let lastStaleCheck = 0;
    mainWindow!.on('focus', () => {
      const now = Date.now();
      if (now - lastStaleCheck < 60_000) return;
      lastStaleCheck = now;
      taskService.markStaleTasks(5).then((count) => {
        if (count > 0) {
          mainWindow?.webContents.send('tasks:stale-check-complete');
        }
      }).catch(() => {});
    });
  } catch (err) {
    // Show the window even on DB failure so the user sees something
    if (!mainWindow) {
      createWindow();
    }
    dialog.showErrorBox(
      'Database initialization failed',
      `Cortex could not start its database.\n\n${err instanceof Error ? err.message : String(err)}`,
    );
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  disposeTableWatcher?.();
  unregisterGlobalShortcuts();
  searchService?.shutdown();
  closeDatabase().catch(() => {});
});

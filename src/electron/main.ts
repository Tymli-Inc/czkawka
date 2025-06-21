import { app as appBase, BrowserWindow, Tray } from 'electron';
import { initializeDatabase } from './database';
import { initializeWindowTracking } from './windowTracking';
import { setupProtocolHandling, setupDeepLinkHandlers } from './auth';
import { ensureSingleInstance, getTrayIconPath } from './utils';
import { createMainWindow } from './windowManager';
import { setupIpcHandlers } from './ipcHandlers';

interface AppExtended extends Electron.App {
  isQuiting: boolean;
}

const app = appBase as AppExtended;
app.isQuiting = false;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

if (!ensureSingleInstance()) {
  process.exit(0);
}

setupProtocolHandling();

app.whenReady().then(() => {
  try {
    const dbInitialized = initializeDatabase();
    if (!dbInitialized) {
      console.error('Failed to initialize database');
    }

    const windowTrackingInitialized = initializeWindowTracking();
    if (!windowTrackingInitialized) {
      console.error('Failed to initialize window tracking');
    }

    setupIpcHandlers();

    const { window, tray: appTray } = createMainWindow(app);
    mainWindow = window;
    tray = appTray;

    setupDeepLinkHandlers(mainWindow);

  } catch (error) {
    console.error('Error during app initialization:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const { window } = createMainWindow(app);
      mainWindow = window;
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
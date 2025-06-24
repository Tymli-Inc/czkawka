import AutoLaunch from 'electron-auto-launch';
import { app as appBase, BrowserWindow, Tray, shell } from 'electron';
import { initializeDatabase } from './database';
import { initializeWindowTracking } from './windowTracking';
import { setupProtocolHandling, setupDeepLinkHandlers } from './auth';
import { ensureSingleInstance, getTrayIconPath } from './utils';
import { createMainWindow } from './windowManager';
import { setupIpcHandlers } from './ipcHandlers';
import log from 'electron-log';
import path from 'path';

import './auth';

// Handle Squirrel events for Windows (must be before any app usage)
if (process.platform === 'win32') {
  const handleSquirrelEvent = (): boolean => {
    if (process.argv.length === 1) {
      return false;
    }

    const squirrelEvent = process.argv[1];
    
    switch (squirrelEvent) {
      case '--squirrel-install':
      case '--squirrel-updated':
        // Just exit gracefully for install/update events
        // The Start Menu shortcut will be created by the Squirrel config
        setTimeout(() => process.exit(0), 1000);
        return true;

      case '--squirrel-uninstall':
        // Clean up on uninstall
        setTimeout(() => process.exit(0), 1000);
        return true;

      case '--squirrel-obsolete':
        // This is called on the outgoing version during updates
        setTimeout(() => process.exit(0), 1000);
        return true;
    }

    return false;
  };
  if (handleSquirrelEvent()) {
    // Squirrel event handled, don't continue with normal app startup
    // The process.exit() calls in the handler will terminate the app
  }
}

interface AppExtended extends Electron.App {
    isQuiting: boolean;
}

const app = appBase as AppExtended;
app.isQuiting = false;

app.setName('Hourglass');

const hourglassAutoLauncher = new AutoLaunch({
  name: 'Hourglass',
  path: app.getPath('exe'), 
});

hourglassAutoLauncher.isEnabled().then((isEnabled) => {
  if (!isEnabled) {
    hourglassAutoLauncher.enable();
  }
});

export let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

if (!ensureSingleInstance()) {
    process.exit(0);
}

setupProtocolHandling();

// Add initial log on app start
log.info('Application starting: initializing main process');

app.whenReady().then(() => {
    log.info('Electron app is ready');
    try {
        const dbInitialized = initializeDatabase();
        if (!dbInitialized) {
            log.error('Failed to initialize database');
        }

        const { window, tray: appTray } = createMainWindow(app);
        mainWindow = window;
        tray = appTray;
        initializeWindowTracking();
        setupIpcHandlers();
        setupDeepLinkHandlers(mainWindow);
    } catch (error) {
        log.error('Error during app initialization:', error);
    }

    app.on('activate', () => {
        log.info('App activate event triggered');
        if (BrowserWindow.getAllWindows().length === 0) {
            const { window } = createMainWindow(app);
            mainWindow = window;
        }
    });
});

// Log when all windows are closed
app.on('window-all-closed', () => {
    log.info('All windows closed event');
    if (process.platform !== 'darwin') {
        app.quit();
        log.info('Application quitting');
    }
});
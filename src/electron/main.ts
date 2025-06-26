import squirrelStartup from 'electron-squirrel-startup';
import AutoLaunch from 'electron-auto-launch';
import { app as appBase, BrowserWindow, Tray, shell } from 'electron';
import { initializeDatabase } from './database';
import { getGroupedCategories, initializeWindowTracking } from './windowTracking';
import { setupProtocolHandling, setupDeepLinkHandlers } from './auth';
import { ensureSingleInstance, getTrayIconPath } from './utils';
import { createMainWindow } from './windowManager';
import { setupIpcHandlers } from './ipcHandlers';
import log from 'electron-log';
import path from 'path';

import './auth';

// Handle Squirrel events for Windows (must be before any app usage)
if (squirrelStartup) {
  appBase.quit();
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
  isHidden: true, // Start minimized to tray
});

// Ensure auto-launch is enabled and async
const setupAutoLaunch = async () => {
  try {
    const isEnabled = await hourglassAutoLauncher.isEnabled();
    if (!isEnabled) {
      await hourglassAutoLauncher.enable();
      log.info('Auto-launch enabled for Hourglass');
    } else {
      log.info('Auto-launch already enabled for Hourglass');
    }
  } catch (error) {
    log.error('Failed to setup auto-launch:', error);
  }
};

setupAutoLaunch();

export let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Single instance lock
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
        }        // Detect installation and manual launch scenarios
        const wasOpenedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin;
        const hasHiddenFlag = process.argv.includes('--hidden');
        const isFirstRun = !app.getPath('userData') || !require('fs').existsSync(require('path').join(app.getPath('userData'), 'appdata.sqlite'));
        
        // Show window on: first install, manual launch, or development
        const shouldStartHidden = (wasOpenedAtLogin || hasHiddenFlag) && !isFirstRun && app.isPackaged;

        log.info('Startup conditions:', { wasOpenedAtLogin, hasHiddenFlag, isFirstRun, isPackaged: app.isPackaged, shouldStartHidden });const { window, tray: appTray } = createMainWindow(app, shouldStartHidden);
        mainWindow = window;
        tray = appTray;

        log.info(shouldStartHidden ? 'App started hidden to system tray' : 'App started with visible window');

        initializeWindowTracking();
        setupIpcHandlers();
        setupDeepLinkHandlers(mainWindow);
        getGroupedCategories();
    } catch (error) {
        log.error('Error during app initialization:', error);
    }    app.on('activate', () => {
        log.info('App activate event triggered');
        if (BrowserWindow.getAllWindows().length === 0) {
            const { window } = createMainWindow(app, false); // Show window on manual activation
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
import squirrelStartup from 'electron-squirrel-startup';
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
import { setupAutoUpdate, cleanupAutoUpdater } from './autoUpdate';

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
    // Only enable auto-launch in production builds
    if (!app.isPackaged) {
      log.info('Development mode: skipping auto-launch setup');
      return;
    }

    log.info('Setting up auto-launch with path:', app.getPath('exe'));
    
    const isEnabled = await hourglassAutoLauncher.isEnabled();
    log.info('Current auto-launch status:', isEnabled);
    
    if (!isEnabled) {
      await hourglassAutoLauncher.enable();
      log.info('Auto-launch enabled for Hourglass');
      
      // Verify it was actually enabled
      const verifyEnabled = await hourglassAutoLauncher.isEnabled();
      log.info('Auto-launch verification:', verifyEnabled);
    } else {
      log.info('Auto-launch already enabled for Hourglass');
    }
  } catch (error) {
    log.error('Failed to setup auto-launch:', error);
    
    // Try alternative approach using app.setLoginItemSettings
    try {
      log.info('Trying alternative auto-launch method...');
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
        name: 'Hourglass'
      });
      log.info('Alternative auto-launch method applied');
    } catch (altError) {
      log.error('Alternative auto-launch method also failed:', altError);
    }
  }
};

// Setup auto-launch when app is ready
let autoLaunchSetup = false;

export let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// Single instance lock
if (!ensureSingleInstance()) {
    process.exit(0);
}

setupProtocolHandling();

// Add initial log on app start
log.info('Application starting: initializing main process');

app.whenReady().then(async () => {
    log.info('Electron app is ready');
    try {
        const dbInitialized = initializeDatabase();
        if (!dbInitialized) {
            log.error('Failed to initialize database');
        }
        
        // Setup auto-launch after app is ready
        if (!autoLaunchSetup) {
            await setupAutoLaunch();
            autoLaunchSetup = true;
        }
        
        // Detect installation and manual launch scenarios
        const loginItemSettings = app.getLoginItemSettings();
        const wasOpenedAtLogin = loginItemSettings.wasOpenedAtLogin;
        const hasHiddenFlag = process.argv.includes('--hidden');
        const isFirstRun = !app.getPath('userData') || !require('fs').existsSync(require('path').join(app.getPath('userData'), 'appdata.sqlite'));
        
        log.info('Login item settings:', loginItemSettings);
        log.info('Process arguments:', process.argv);
        
        // Show window on: first install, manual launch, or development
        // Hide window when: opened at login and not first run
        const shouldStartHidden = (wasOpenedAtLogin || hasHiddenFlag) && !isFirstRun && app.isPackaged;

        log.info('Startup conditions:', { 
          wasOpenedAtLogin, 
          hasHiddenFlag, 
          isFirstRun, 
          isPackaged: app.isPackaged, 
          shouldStartHidden,
          executableName: loginItemSettings.executableWillLaunchAtLogin,
          launchItems: loginItemSettings.launchItems
        });
        
        const { window, tray: appTray } = createMainWindow(app, shouldStartHidden);
        mainWindow = window;
        tray = appTray;

        log.info(shouldStartHidden ? 'App started hidden to system tray' : 'App started with visible window');

        // Initialize window tracking (includes URL tracking for browsers)
        initializeWindowTracking();
        setupIpcHandlers();
        setupDeepLinkHandlers(mainWindow);
        // Start auto-update check
        setupAutoUpdate(mainWindow);
        
        // Optional: Test URL tracking (enable for debugging)
        // import testUrlTracking from './urlTrackingTest';
        // testUrlTracking();
    } catch (error) {
        log.error('Error during app initialization:', error);
    }
    
    app.on('activate', () => {
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

app.on('before-quit', () => {
    log.info('App before-quit event');
    app.isQuiting = true;
    cleanupAutoUpdater();
});
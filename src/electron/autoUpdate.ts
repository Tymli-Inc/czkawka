import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import log from 'electron-log';

interface UpdateProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

let isUpdateInProgress = false;
let updateCheckInterval: NodeJS.Timeout | null = null;

// Development mode flag - set to true to test auto-updates in development
const ENABLE_DEV_UPDATES = false; // Change to true to test updates in development

export function setupAutoUpdate(mainWindow: BrowserWindow | null) {
  // Configure auto-updater for Vercel-hosted latest.yml (points to hourglass-latest-build releases)
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://hourglass-distribution.vercel.app',
    useMultipleRangeRequest: false
  });

  // Configure auto-updater settings
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true; // Automatically download updates like Discord
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;

  // Ensure the updater is properly initialized
  try {
    // Force the updater to use the correct app-update.yml
    const { app } = require('electron');
    const path = require('path');
    const appUpdateYmlPath = path.join(process.resourcesPath, 'app-update.yml');
    log.info('Looking for app-update.yml at:', appUpdateYmlPath);
  } catch (error) {
    log.warn('Could not locate app-update.yml, will use setFeedURL configuration');
  }

  // Enable development mode testing if flag is set
  if (ENABLE_DEV_UPDATES) {
    log.info('Auto-updater enabled for development testing');
    // This allows testing auto-updates in development mode
    Object.defineProperty(autoUpdater, 'isUpdaterActive', {
      get: () => true,
    });
  }

  // Set up event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'checking',
        message: 'Checking for updates...'
      });
    }
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    isUpdateInProgress = true;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'available',
        message: `Update available: v${info.version}`,
        version: info.version,
        releaseDate: info.releaseDate
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available. Current version:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'not-available',
        message: 'App is up to date',
        version: info.version
      });
    }
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    isUpdateInProgress = false;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'error',
        message: 'Update check failed',
        error: error.message
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj: UpdateProgress) => {
    const progressPercent = Math.round(progressObj.percent);
    const downloadSpeed = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2); // MB/s
    
    log.info(`Download progress: ${progressPercent}% (${downloadSpeed} MB/s)`);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'downloading',
        message: `Downloading update... ${progressPercent}%`,
        progress: progressPercent,
        speed: downloadSpeed,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded successfully:', info.version);
    isUpdateInProgress = false;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'downloaded',
        message: 'Update ready to install',
        version: info.version
      });

      // Show notification like Discord
      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'A new version of Hourglass has been downloaded.',
        detail: `Version ${info.version} is ready to install. The app will restart to apply the update.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      });

      if (response === 0) {
        // User chose to restart now
        log.info('User chose to install update now');
        setImmediate(() => {
          autoUpdater.quitAndInstall(false, true);
        });
      } else {
        // User chose to install later - will install on next app restart
        log.info('User chose to install update later');
      }
    } else {
      // No main window, just install the update
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // Check for updates immediately on startup with UI feedback
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'checking',
        message: 'Checking for updates on startup...'
      });
    }
    checkForUpdates();
  }, 2000); // Wait 2 seconds after app startup for better UX

  // Check for updates periodically (every 4 hours like Discord)
  updateCheckInterval = setInterval(() => {
    if (!isUpdateInProgress) {
      log.info('Periodic update check triggered');
      checkForUpdates();
    }
  }, 4 * 60 * 60 * 1000); // 4 hours
}

export function checkForUpdates(): void {
  if (isUpdateInProgress) {
    log.info('Update already in progress, skipping check');
    return;
  }

  try {
    log.info('Manually checking for updates');
    autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Failed to check for updates:', error);
  }
}

export function quitAndInstall(): void {
  try {
    log.info('Manually triggering quit and install');
    autoUpdater.quitAndInstall(false, true);
  } catch (error) {
    log.error('Failed to quit and install:', error);
  }
}

export function cleanupAutoUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

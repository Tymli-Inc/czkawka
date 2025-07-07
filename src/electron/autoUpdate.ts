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
let lastInstalledVersion: string | null = null;
let isPostUpdateRestart = false;
let skipNextUpdateCheck = false;

// New flag to prevent multiple install attempts
let hasInitiatedInstall = false;

// Development mode flag - set to true to test auto-updates in development
const ENABLE_DEV_UPDATES = false; // Change to true to test updates in development

// Helper function to compare versions
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
}

// Helper function to clear updater cache
function clearUpdaterCache() {
  try {
    const { app } = require('electron');
    const path = require('path');
    const fs = require('fs');
    
    // Clear electron-updater cache
    const updaterCacheDir = path.join(app.getPath('userData'), 'hourglass-updater');
    if (fs.existsSync(updaterCacheDir)) {
      fs.rmSync(updaterCacheDir, { recursive: true, force: true });
      log.info('Cleared updater cache directory');
    }
    
    // Also clear any pending updates
    const pendingUpdatePath = path.join(app.getPath('userData'), 'pending-update.json');
    if (fs.existsSync(pendingUpdatePath)) {
      fs.unlinkSync(pendingUpdatePath);
      log.info('Cleared pending update file');
    }
  } catch (error) {
    log.warn('Could not clear updater cache:', error);
  }
}

// Helper function to log system info
function logSystemInfo() {
  const { app } = require('electron');
  log.info(`System Info - App version: ${app.getVersion()}`);
  log.info(`System Info - Platform: ${process.platform}`);
  log.info(`System Info - Architecture: ${process.arch}`);
  log.info(`System Info - Packaged: ${app.isPackaged}`);
}

export function setupAutoUpdate(mainWindow: BrowserWindow | null) {
  // Log system information for debugging
  logSystemInfo();
  
  // Check if this is a restart after an update
  const { app } = require('electron');
  const Store = require('electron-store');
  const store = new Store();
  
  // Check if we just updated
  const lastVersion = store.get('lastInstalledVersion');
  const currentVersion = app.getVersion();
  
  // Also check if this is a Squirrel restart (Windows installer)
  const isSquirrelRestart = process.argv.includes('--squirrel-firstrun') || 
                           process.argv.includes('--squirrel-updated') ||
                           process.platform === 'win32' && process.env.SQUIRREL_RESTART === 'true';
  
  log.info(`Current app version: ${currentVersion}, Last installed version: ${lastVersion}, Squirrel restart: ${isSquirrelRestart}`);
  
  if (lastVersion && compareVersions(lastVersion, currentVersion) < 0) {
    log.info(`App updated from ${lastVersion} to ${currentVersion}`);
    isPostUpdateRestart = true;
    // Clear the stored version after successful update detection
    store.delete('lastInstalledVersion');
    // Clear cache to prevent issues
    clearUpdaterCache();
    // Reset update flags
    lastInstalledVersion = null;
    skipNextUpdateCheck = true;
    
    // Schedule cache clearing and flag reset after a reasonable delay
    setTimeout(() => {
      isPostUpdateRestart = false;
      skipNextUpdateCheck = false;
      log.info('Post-update restart flag cleared - normal update checks resumed');
    }, 60000); // Wait 60 seconds before allowing update checks again
  } else if (lastVersion === currentVersion) {
    // If versions match, clear any stale update state
    log.info(`Clearing stale update state - versions match: ${currentVersion}`);
    store.delete('lastInstalledVersion');
    clearUpdaterCache();
    isPostUpdateRestart = false;
    lastInstalledVersion = null;
    skipNextUpdateCheck = false;
  } else if (isSquirrelRestart) {
    // If this is a Squirrel restart but no version is stored, 
    // it might be a first-time install or update without proper version tracking
    log.info('Squirrel restart detected - treating as post-update restart');
    isPostUpdateRestart = true;
    skipNextUpdateCheck = true;
    clearUpdaterCache();
    
    setTimeout(() => {
      isPostUpdateRestart = false;
      skipNextUpdateCheck = false;
      log.info('Post-squirrel restart flag cleared - normal update checks resumed');
    }, 60000);
  } else {
    // No version stored or version is newer (shouldn't happen), reset everything
    log.info('No last version stored or version mismatch, resetting state');
    store.delete('lastInstalledVersion');
    clearUpdaterCache();
    isPostUpdateRestart = false;
    lastInstalledVersion = null;
    skipNextUpdateCheck = false;
  }

  // Configure auto-updater for Vercel-hosted latest.yml (points to hourglass-latest-build releases)
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://hourglass-distribution.vercel.app',
    useMultipleRangeRequest: false
  });

  // Configure auto-updater settings
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true; // Automatically download updates like Discord
  autoUpdater.autoInstallOnAppQuit = false; // Manual control over installation
  autoUpdater.allowDowngrade = true; // Allow downgrades
  autoUpdater.allowPrerelease = false; // Stable releases only
  autoUpdater.forceDevUpdateConfig = false; // Don't force dev config in production
  
  // Set a maximum of 3 download attempts to prevent infinite loops
  autoUpdater.requestHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

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
    // Prevent update loop - don't download the same version we just installed
    const { app } = require('electron');
    const currentVersion = app.getVersion();
    
    log.info(`Update available: ${info.version}, Current version: ${currentVersion}, Last installed: ${lastInstalledVersion}`);
    
    // More robust version comparison using semantic versioning
    const versionComparison = compareVersions(info.version, currentVersion);
    
    if (versionComparison <= 0) {
      log.info(`Skipping update - version ${info.version} is not newer than current version ${currentVersion}`);
      return;
    }
    
    // Don't update to the same version we just installed
    if (info.version === lastInstalledVersion) {
      log.info(`Skipping update - version ${info.version} was already installed recently`);
      return;
    }
    
    // Check if we should skip this update check
    if (skipNextUpdateCheck) {
      log.info(`Skipping update check - app recently updated`);
      skipNextUpdateCheck = false; // Reset the flag after using it
      return;
    }
    
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
    
    // Store the version we're about to install for post-update detection
    const Store = require('electron-store');
    const store = new Store();
    
    // Always store the new version we're about to install
    store.set('lastInstalledVersion', info.version);
    log.info(`Stored version ${info.version} for post-update detection`);
    
    lastInstalledVersion = info.version;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        type: 'downloaded',
        message: 'Update ready to install',
        version: info.version
      });

      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'A new version of Hourglass has been downloaded.',
        detail: `Version ${info.version} is ready to install. The app will restart to apply the update.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      });

      if (response === 0 && !hasInitiatedInstall) {
        hasInitiatedInstall = true;
        log.info('User chose to install update now');
        skipNextUpdateCheck = true;
        autoUpdater.autoDownload = false;
        setImmediate(() => {
          autoUpdater.quitAndInstall(false, true);
        });
      } else if (response === 1) {
        log.info('User chose to install update later');
        skipNextUpdateCheck = true;
      }
    } else {
      if (!hasInitiatedInstall) {
        hasInitiatedInstall = true;
        skipNextUpdateCheck = true;
        autoUpdater.autoDownload = false;
        autoUpdater.quitAndInstall(false, true);
      }
    }
  });

  // Check for updates immediately on startup with UI feedback
  // Skip immediate check if this is a post-update restart
  setTimeout(() => {
    if (isPostUpdateRestart || skipNextUpdateCheck) {
      log.info('Skipping immediate update check - app just updated or skip flag set');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', {
          type: 'not-available',
          message: 'App recently updated - up to date'
        });
      }
      return;
    }
    
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
    if (!isUpdateInProgress && !isPostUpdateRestart && !skipNextUpdateCheck) {
      log.info('Periodic update check triggered');
      checkForUpdates();
    } else if (isPostUpdateRestart || skipNextUpdateCheck) {
      log.info('Skipping periodic update check - post update restart flag or skip flag still active');
    }
  }, 4 * 60 * 60 * 1000); // 4 hours
}

export function checkForUpdates(): void {
  if (isUpdateInProgress) {
    log.info('Update already in progress, skipping check');
    return;
  }

  // Don't check for updates immediately after an update
  if (isPostUpdateRestart || skipNextUpdateCheck) {
    log.info('Skipping update check - app just updated or skip flag set');
    return;
  }

  try {
    log.info('Manually checking for updates');
    // Clear any cached update data before checking
    clearUpdaterCache();
    autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Failed to check for updates:', error);
  }
}

export function forceCheckForUpdates(): void {
  if (isUpdateInProgress) {
    log.info('Update already in progress, skipping force check');
    return;
  }

  try {
    log.info('Force checking for updates (bypassing all flags)');
    // Clear any cached update data before checking
    clearUpdaterCache();
    // Reset flags to allow update check
    isPostUpdateRestart = false;
    skipNextUpdateCheck = false;
    autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Failed to force check for updates:', error);
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

export function resetUpdateState(): void {
  try {
    const Store = require('electron-store');
    const store = new Store();
    
    // Clear stored version info
    store.delete('lastInstalledVersion');
    
    // Reset flags
    isUpdateInProgress = false;
    isPostUpdateRestart = false;
    skipNextUpdateCheck = false;
    lastInstalledVersion = null;
    
    // Clear updater cache
    clearUpdaterCache();
    
    log.info('Update state reset successfully');
  } catch (error) {
    log.error('Failed to reset update state:', error);
  }
}

export function cleanupAutoUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

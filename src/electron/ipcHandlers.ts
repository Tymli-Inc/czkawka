import { ipcMain, BrowserWindow } from 'electron';
import { getCurrentActiveWindow, getActiveWindows, compileWindowData, getTrackingTimes, getIdleEvents, getIdleStatistics, getCurrentIdleStatus, setIdleThreshold } from './windowTracking';
import {clearUserToken, getLoginStatus, getUserToken, handleLogin, storeUserToken, getUserData} from './auth';
import { checkForUpdates, quitAndInstall } from './autoUpdate';
import log from 'electron-log';

export function setupIpcHandlers() {
  ipcMain.handle('get-active-windows', () => {
    return getActiveWindows();
  });

  ipcMain.handle('get-active-window', async () => {
    return await getCurrentActiveWindow();
  });
  ipcMain.handle('compile-data', async (event, days?: number) => {
    try {
      return compileWindowData(days);
    } catch (error) {
      log.error('Error compiling data:', error);
      return {
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
      };
    }
  });

  ipcMain.handle('get-tracking-times', async (event, days?: number) => {
    try {
      return getTrackingTimes(days);
    } catch (error) {
      log.error('Error getting tracking times:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
        data: []
      };
    }
  });

  ipcMain.handle('get-idle-events', async (event, days?: number) => {
    try {
      return getIdleEvents(days);
    } catch (error) {
      log.error('Error getting idle events:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
        data: []
      };
    }
  });

  ipcMain.handle('get-idle-statistics', async (event, days?: number) => {
    try {
      return getIdleStatistics(days);
    } catch (error) {
      log.error('Error getting idle statistics:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
        data: null
      };
    }
  });

  ipcMain.handle('get-current-idle-status', () => {
    try {
      return getCurrentIdleStatus();
    } catch (error) {
      log.error('Error getting current idle status:', error);
      return {
        isIdle: false,
        idleStartTime: null,
        idleDuration: 0,
        lastActiveTime: Date.now(),
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error)
      };
    }
  });

  ipcMain.handle('set-idle-threshold', async (event, thresholdMs: number) => {
    try {
      return setIdleThreshold(thresholdMs);
    } catch (error) {
      log.error('Error setting idle threshold:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error)
      };
    }
  });

  ipcMain.handle('login', () => {
    handleLogin();
  });

  ipcMain.handle('store-user-token', (event, userData: any) => {
    return storeUserToken(userData);
  });

  ipcMain.handle('get-user-token', () => {
    return getUserToken()
  });

  ipcMain.handle('clear-user-token', () => {
    return clearUserToken()
  });
  ipcMain.handle('get-login-status', () => {
    return getLoginStatus()
  });

  ipcMain.handle('get-user-data', () => {
    return getUserData();
  });

  ipcMain.handle('window-minimize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.minimize();
    }
  });

  ipcMain.handle('window-maximize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle('window-close', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.close();
    }
  });

  ipcMain.handle('window-is-maximized', () => {
    const window = BrowserWindow.getFocusedWindow();
    return window ? window.isMaximized() : false;
  });

  // Auto-update handlers
  ipcMain.handle('check-for-updates', () => {
    log.info('Manual update check requested from renderer');
    checkForUpdates();
    return { success: true, message: 'Update check initiated' };
  });

  ipcMain.handle('install-update', () => {
    log.info('Manual update install requested from renderer');
    quitAndInstall();
    return { success: true, message: 'Update installation initiated' };
  });
}
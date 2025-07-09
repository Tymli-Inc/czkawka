import { ipcMain, BrowserWindow, app } from 'electron';
import { getGroupedCategories, getCurrentActiveWindow, getActiveWindows, compileWindowData, getTrackingTimes, getIdleEvents, getIdleStatistics, getCurrentIdleStatus, setIdleThreshold, getTimelineStats, getDailyCategoryBreakdown, getTopAppsForDate, startActiveWindowTracking, stopActiveWindowTracking, toggleWindowTracking, getWindowTrackingStatus } from './windowTracking';
import {clearUserToken, getLoginStatus, getUserToken, handleLogin, storeUserToken, getUserData} from './auth';
import { checkForUpdates, quitAndInstall, resetUpdateState, forceCheckForUpdates } from './autoUpdate';
import CategoryManager from './categoryManager';
import log from 'electron-log';
import type { UserData } from '../types/electronAPI';

// Window tracking toggle state
let isWindowTrackingEnabled = true;

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

  ipcMain.handle('store-user-token', (event, userData: UserData) => {
    return storeUserToken(userData);
  });

  ipcMain.handle('get-user-token', () => {
    return getUserToken()
  });

  ipcMain.handle('get-grouped-categories', (event, days?: number) => {
    try {
      return getGroupedCategories(days);
    } catch (error) {
      log.error('Error getting grouped categories:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
        data: []
      };
    }
  });

  ipcMain.handle('get-timeline-stats', (event, dateString: string) => {
    try {
      const targetDate = new Date(dateString);
      return getTimelineStats(targetDate);
    } catch (error) {
      log.error('Error getting timeline stats:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
        data: null
      };
    }
  });

  ipcMain.handle('get-daily-category-breakdown', (event, timestamp: number) => {
    try {
      return getDailyCategoryBreakdown(timestamp);
    } catch (error) {
      log.error('Error getting daily category breakdown:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
        data: []
      };
    }
  });

  ipcMain.handle('get-top-apps-for-date', (event, timestamp: number) => {
    try {
      return getTopAppsForDate(timestamp);
    } catch (error) {
      log.error('Error getting top apps for date:', error);
      return {
        success: false,
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
        data: []
      };
    }
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

  ipcMain.handle('force-check-for-updates', () => {
    log.info('Force update check requested from renderer');
    forceCheckForUpdates();
    return { success: true, message: 'Force update check initiated' };
  });

  ipcMain.handle('install-update', () => {
    log.info('Manual update install requested from renderer');
    quitAndInstall();
    return { success: true, message: 'Update installation initiated' };
  });

  ipcMain.handle('reset-update-state', () => {
    return resetUpdateState();
  });

  // Window tracking handlers
  ipcMain.handle('toggle-window-tracking', () => {
    return toggleWindowTracking();
  });

  ipcMain.handle('get-window-tracking-status', () => {
    return getWindowTrackingStatus();
  });

  // App info handlers
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Category management handlers
  ipcMain.handle('get-app-categories', async () => {
    try {
      log.info('IPC: Getting app categories');
      const categoryManager = CategoryManager.getInstance();
      const categories = categoryManager.getFinalCategories();
      return {
        success: true,
        data: categories
      };
    } catch (error) {
      log.error('IPC: Failed to get app categories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('get-detected-apps', async () => {
    try {
      log.info('IPC: Getting detected apps');
      const categoryManager = CategoryManager.getInstance();
      const detectedApps = categoryManager.getDetectedApps();
      return {
        success: true,
        data: detectedApps
      };
    } catch (error) {
      log.error('IPC: Failed to get detected apps:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('get-user-category-settings', async () => {
    try {
      log.info('IPC: Getting user category settings');
      const categoryManager = CategoryManager.getInstance();
      const settings = categoryManager.getUserSettings();
      return {
        success: true,
        data: settings
      };
    } catch (error) {
      log.error('IPC: Failed to get user category settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('create-custom-category', async (event, name: string, description: string, color: string) => {
    try {
      log.info('IPC: Creating custom category', { name, description, color });
      const categoryManager = CategoryManager.getInstance();
      const result = categoryManager.createCustomCategory(name, description, color);
      return result;
    } catch (error) {
      log.error('IPC: Failed to create custom category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('update-custom-category', async (event, id: string, name: string, description: string, color: string) => {
    try {
      log.info('IPC: Updating custom category', { id, name, description, color });
      const categoryManager = CategoryManager.getInstance();
      const success = categoryManager.updateCustomCategory(id, name, description, color);
      return {
        success,
        message: success ? 'Custom category updated successfully' : 'Failed to update custom category'
      };
    } catch (error) {
      log.error('IPC: Failed to update custom category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('delete-custom-category', async (event, id: string) => {
    try {
      log.info('IPC: Deleting custom category', { id });
      const categoryManager = CategoryManager.getInstance();
      const success = categoryManager.deleteCustomCategory(id);
      return {
        success,
        message: success ? 'Custom category deleted successfully' : 'Failed to delete custom category'
      };
    } catch (error) {
      log.error('IPC: Failed to delete custom category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('assign-app-to-category', async (event, appName: string, categoryId: string) => {
    try {
      log.info('IPC: Assigning app to category', { appName, categoryId });
      const categoryManager = CategoryManager.getInstance();
      const success = categoryManager.assignAppToCategory(appName, categoryId);
      return {
        success,
        message: success ? 'App assigned to category successfully' : 'Failed to assign app to category'
      };
    } catch (error) {
      log.error('IPC: Failed to assign app to category:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('remove-app-category-assignment', async (event, appName: string) => {
    try {
      log.info('IPC: Removing app category assignment', { appName });
      const categoryManager = CategoryManager.getInstance();
      const success = categoryManager.removeAppCategoryAssignment(appName);
      return {
        success,
        message: success ? 'App category assignment removed successfully' : 'Failed to remove app category assignment'
      };
    } catch (error) {
      log.error('IPC: Failed to remove app category assignment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('reset-categories-to-defaults', async () => {
    try {
      log.info('IPC: Resetting categories to defaults');
      const categoryManager = CategoryManager.getInstance();
      const success = categoryManager.resetToDefaults();
      return {
        success,
        message: success ? 'Categories reset to defaults successfully' : 'Failed to reset categories to defaults'
      };
    } catch (error) {
      log.error('IPC: Failed to reset categories to defaults:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}
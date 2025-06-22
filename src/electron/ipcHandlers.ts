import { ipcMain, BrowserWindow } from 'electron';
import {  } from './database';
import { getCurrentActiveWindow, getActiveWindows, compileWindowData } from './windowTracking';
import {clearUserToken, getLoginStatus, getUserToken, handleLogin, storeUserToken, getUserData} from './auth';

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
      console.error('Error compiling data:', error);
      return {
        error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
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
}
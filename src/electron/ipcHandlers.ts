import { ipcMain } from 'electron';
import {  } from './database';
import { getCurrentActiveWindow, getActiveWindows, compileWindowData } from './windowTracking';
import {clearUserToken, getLoginStatus, getUserToken, handleLogin, storeUserToken} from './auth';

export function setupIpcHandlers() {
  ipcMain.handle('get-active-windows', () => {
    return getActiveWindows();
  });

  ipcMain.handle('get-active-window', async () => {
    return await getCurrentActiveWindow();
  });

  ipcMain.handle('compile-data', async () => {
    try {
      return compileWindowData();
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
}
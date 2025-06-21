import { ipcMain } from 'electron';
import { saveActiveWindowData, getActiveWindows, compileWindowData } from './database';
import { getCurrentActiveWindow, getMemoryStore } from './windowTracking';
import { handleLogin } from './auth';

export function setupIpcHandlers() {
  ipcMain.handle('save-active-window', (event, windowData) => {
    const memoryStore = getMemoryStore();
    const currentWindow = memoryStore.get('currentWindow');
    return saveActiveWindowData(windowData, currentWindow);
  });

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
}
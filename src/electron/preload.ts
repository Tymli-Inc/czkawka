import { contextBridge, ipcRenderer } from 'electron';
import type { 
  ElectronAPI, 
  UserData,
  ActiveWindow, 
  WindowHistoryEntry, 
  CompileDataResponse 
} from '../types/electronAPI';

contextBridge.exposeInMainWorld('electronAPI', {
  getActiveWindow: async (): Promise<any> => {
    return await ipcRenderer.invoke('get-active-window');
  },

  getActiveWindows: async () => {
    return await ipcRenderer.invoke('get-active-windows');
  },
  getTrackingTimes: async (days?: number) => {
    return await ipcRenderer.invoke('get-tracking-times', days);
  },
  compileData: async (days?: number) => {
    return await ipcRenderer.invoke('compile-data', days);
  },
  getGroupedCategories: async (days?: number) => {
    return await ipcRenderer.invoke('get-grouped-categories', days);
  },
  login: async (): Promise<void> => {
    return await ipcRenderer.invoke('login');
  },

  onAuthSuccess: (callback: (userData: UserData) => void) => {
    ipcRenderer.on('auth-success', (_, userData) => callback(userData));
  },

  onAuthFailure: (callback: () => void) => {
    ipcRenderer.on('auth-fail', (_) => callback());
  },

  onAuthLogout: (callback: () => void) => {
    ipcRenderer.on('auth-logout', (_) => callback());
  },

  removeAuthListener: () => {
    ipcRenderer.removeAllListeners('auth-success');
  },
  // Token management APIs
  storeUserToken: async (userData: UserData): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('store-user-token', userData);
  },

  getUserToken: async (): Promise<{ userData: UserData | null; isLoggedIn: boolean }> => {
    return await ipcRenderer.invoke('get-user-token');
  },

  getUserData: async (): Promise<{ userData: UserData | null; success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('get-user-data');
  },

  clearUserToken: async (): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('clear-user-token');
  },
  getLoginStatus: async (): Promise<{ isLoggedIn: boolean }> => {
    return await ipcRenderer.invoke('get-login-status');
  },

  // Window control APIs
  windowMinimize: async (): Promise<void> => {
    return await ipcRenderer.invoke('window-minimize');
  },

  windowMaximize: async (): Promise<void> => {
    return await ipcRenderer.invoke('window-maximize');
  },

  windowClose: async (): Promise<void> => {
    return await ipcRenderer.invoke('window-close');
  },
  windowIsMaximized: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('window-is-maximized');
  },

  onWindowMaximized: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window-maximized', (_, isMaximized) => callback(isMaximized));
  },

  removeWindowListener: () => {
    ipcRenderer.removeAllListeners('window-maximized');
  },

  // Idle detection APIs
  getIdleEvents: async (days?: number) => {
    return await ipcRenderer.invoke('get-idle-events', days);
  },

  getIdleStatistics: async (days?: number) => {
    return await ipcRenderer.invoke('get-idle-statistics', days);
  },

  getCurrentIdleStatus: async () => {
    return await ipcRenderer.invoke('get-current-idle-status');
  },

  setIdleThreshold: async (thresholdMs: number) => {
    return await ipcRenderer.invoke('set-idle-threshold', thresholdMs);
  }
} as ElectronAPI);

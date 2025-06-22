import { contextBridge, ipcRenderer } from 'electron';

interface ActiveWindowData {
  // Define the structure of windowData as needed, for example:
  // title: string;
  // id: number;
  [key: string]: any;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  picture?: string;
  [key: string]: any;
}

interface ElectronAPI {
  getActiveWindow: () => Promise<any>;
  saveActiveWindow: (windowData: ActiveWindowData) => Promise<any>;
  getActiveWindows: () => Promise<any>;
  compileData: (days?: number) => Promise<any>;
  login: () => Promise<void>;
  onAuthSuccess: (callback: (userData: UserData) => void) => void;
  onAuthFailure: (callback: () => void) => void;
  onAuthLogout: (callback: () => void) => void;
  removeAuthListener: () => void;  // Token management APIs
  storeUserToken: (userData: UserData) => Promise<{ success: boolean; error?: string }>;
  getUserToken: () => Promise<{ userData: UserData | null; isLoggedIn: boolean }>;
  getUserData: () => Promise<{ userData: UserData | null; success: boolean; error?: string }>;
  clearUserToken: () => Promise<{ success: boolean; error?: string }>;
  getLoginStatus: () => Promise<{ isLoggedIn: boolean }>;
  // Window control APIs
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
  removeWindowListener: () => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getActiveWindow: async (): Promise<any> => {
    return await ipcRenderer.invoke('get-active-window');
  },

  getActiveWindows: async () => {
    return await ipcRenderer.invoke('get-active-windows');
  },
  compileData: async (days?: number) => {
    return await ipcRenderer.invoke('compile-data', days);
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
  }
} as ElectronAPI);

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
  compileData: () => Promise<any>;
  login: () => Promise<void>;
  onAuthSuccess: (callback: (userData: UserData) => void) => void;
  removeAuthListener: () => void;  // Token management APIs
  storeUserToken: (userData: UserData) => Promise<{ success: boolean; error?: string }>;
  getUserToken: () => Promise<{ userData: UserData | null; isLoggedIn: boolean }>;
  clearUserToken: () => Promise<{ success: boolean; error?: string }>;
  getLoginStatus: () => Promise<{ isLoggedIn: boolean }>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getActiveWindow: async (): Promise<any> => {
    return await ipcRenderer.invoke('get-active-window');
  },
  saveActiveWindow: async (windowData: ActiveWindowData): Promise<any> => {
    return await ipcRenderer.invoke('save-active-window', windowData);
  },

  getActiveWindows: async () => {
    return await ipcRenderer.invoke('get-active-windows');
  },

  compileData: async () => {
    return await ipcRenderer.invoke('compile-data');
  },

  login: async (): Promise<void> => {
    return await ipcRenderer.invoke('login');
  },

  onAuthSuccess: (callback: (userData: UserData) => void) => {
    ipcRenderer.on('auth-success', (_, userData) => callback(userData));
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

  clearUserToken: async (): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('clear-user-token');
  },

  getLoginStatus: async (): Promise<{ isLoggedIn: boolean }> => {
    return await ipcRenderer.invoke('get-login-status');
  }
} as ElectronAPI);

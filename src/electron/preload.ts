import { contextBridge, ipcRenderer } from 'electron';

interface ActiveWindowData {
  // Define the structure of windowData as needed, for example:
  // title: string;
  // id: number;
  [key: string]: any;
}

interface ElectronAPI {
  getActiveWindow: () => Promise<any>;
  saveActiveWindow: (windowData: ActiveWindowData) => Promise<any>;
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
  }
} as ElectronAPI);

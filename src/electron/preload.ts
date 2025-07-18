import { contextBridge, ipcRenderer } from 'electron';
import type { CompileDataResponse, ActiveWindow, WindowHistoryEntry } from '../types/windowTracking';

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
  getActiveWindow: () => Promise<ActiveWindow | null>;
  getActiveWindows: () => Promise<WindowHistoryEntry[]>;
  compileData: (days?: number) => Promise<CompileDataResponse>;
  login: () => Promise<void>;
  onAuthSuccess: (callback: (userData: any) => void) => void;
  onAuthFailure: (callback: () => void) => void;
  onAuthLogout: (callback: () => void) => void;
  removeAuthListener: () => void;
  storeUserToken: (userData: any) => Promise<{ success: boolean; error?: string }>;
  getUserToken: () => Promise<{ userData: any | null; isLoggedIn: boolean }>;
  getUserData: () => Promise<{ userData: any | null; success: boolean; error?: string }>;
  clearUserToken: () => Promise<{ success: boolean; error?: string }>;
  getLoginStatus: () => Promise<{ isLoggedIn: boolean }>;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
  removeWindowListener: () => void;
  getTrackingTimes: (days?: number) => Promise<{ success: boolean; data: any[]; error?: string }>;
  // Idle detection APIs
  getIdleEvents: (days?: number) => Promise<{ success: boolean; data: any[]; error?: string }>;
  getIdleStatistics: (days?: number) => Promise<{ success: boolean; data: any; error?: string }>;
  getCurrentIdleStatus: () => Promise<{ isIdle: boolean; idleStartTime: number | null; idleDuration: number; lastActiveTime: number; idleThreshold: number; error?: string }>;
  setIdleThreshold: (thresholdMs: number) => Promise<{ success: boolean; message?: string; oldThreshold?: number; newThreshold?: number; error?: string }>;
  // Window tracking APIs
  toggleWindowTracking: () => Promise<boolean>;
  getWindowTrackingStatus: () => Promise<boolean>;
  onTrackingStatusChanged: (callback: (enabled: boolean) => void) => void;
  removeTrackingStatusListener: () => void;
  // Auto-update APIs
  checkForUpdates: () => Promise<{ success: boolean; message: string }>;
  forceCheckForUpdates: () => Promise<{ success: boolean; message: string }>;
  installUpdate: () => Promise<{ success: boolean; message: string }>;
  resetUpdateState: () => Promise<{ success: boolean; message: string }>;
  onUpdateStatus: (callback: (status: any) => void) => void;
  removeUpdateListener: () => void;
  // App info APIs
  getAppVersion: () => Promise<string>;
  // Questionnaire APIs
  checkUserInfoAvailable: (userId: string) => Promise<{ available: boolean; success: boolean; error?: string }>;
  storeUserInfo: (userInfo: any) => Promise<{ success: boolean; error?: string }>;
  fetchUserInfo: (userId: string) => Promise<{ data: any; success: boolean; error?: string }>;
  getUserInfoLocal: () => Promise<any>;
  onShowQuestionnaire: (callback: (data: { userId: string; userName: string }) => void) => void;
  removeQuestionnaireListener: () => void;
  // Focus Mode APIs
  startFocusMode: () => Promise<{ success: boolean; message: string }>;
  endFocusMode: () => Promise<{ success: boolean; message: string }>;
  toggleFocusMode: () => Promise<{ success: boolean }>;
  getFocusModeStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
  updateFocusModeSettings: (settings: any) => Promise<{ success: boolean; message: string }>;
  getFocusModeSettings: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getFocusModeHistory: (days?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getFocusModeJobRoles: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
  createTestFocusSession: () => Promise<{ success: boolean; message?: string }>;
  startFocusModeWithDuration: (duration: number, title: string) => Promise<{ success: boolean; message?: string }>;
  cancelFocusMode: () => Promise<{ success: boolean; message?: string }>;
  onFocusModeStarted: (callback: (data: any) => void) => void;
  onFocusModeEnded: (callback: (data: any) => void) => void;
  onFocusDistraction: (callback: (data: any) => void) => void;
  onFocusSettingsUpdated: (callback: (data: any) => void) => void;
  removeFocusModeListeners: () => void;
  getFocusModeShortcut: () => Promise<string>; // New method to get the active focus mode shortcut
};

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
  getDailyCategoryBreakdown: async (timestamp: number) => {
    return await ipcRenderer.invoke('get-daily-category-breakdown', timestamp);
  },
  getTopAppsForDate: async (timestamp: number) => {
    return await ipcRenderer.invoke('get-top-apps-for-date', timestamp);
  },
  getTimelineStats: async (dateString: string) => {
    return await ipcRenderer.invoke('get-timeline-stats', dateString);
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
  },

  // Window tracking APIs
  toggleWindowTracking: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('toggle-window-tracking');
  },
  getWindowTrackingStatus: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('get-window-tracking-status');
  },
  onTrackingStatusChanged: (callback: (enabled: boolean) => void) => {
    ipcRenderer.on('tracking-status-changed', (_, enabled) => callback(enabled));
  },
  removeTrackingStatusListener: () => {
    ipcRenderer.removeAllListeners('tracking-status-changed');
  },

  // Auto-update APIs
  checkForUpdates: async () => {
    return await ipcRenderer.invoke('check-for-updates');
  },

  forceCheckForUpdates: async () => {
    return await ipcRenderer.invoke('force-check-for-updates');
  },

  installUpdate: async () => {
    return await ipcRenderer.invoke('install-update');
  },

  resetUpdateState: async () => {
    return await ipcRenderer.invoke('reset-update-state');
  },

  onUpdateStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('update-status', (_, status) => callback(status));
  },

  removeUpdateListener: () => {
    ipcRenderer.removeAllListeners('update-status');
    ipcRenderer.removeAllListeners('update-downloaded');
  },

  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update-downloaded', () => callback());
  },

  // App info APIs
  getAppVersion: async (): Promise<string> => {
    return await ipcRenderer.invoke('get-app-version');
  },

  // Category management APIs
  getAppCategories: async () => {
    return await ipcRenderer.invoke('get-app-categories');
  },

  getDetectedApps: async () => {
    return await ipcRenderer.invoke('get-detected-apps');
  },

  getUserCategorySettings: async () => {
    return await ipcRenderer.invoke('get-user-category-settings');
  },

  createCustomCategory: async (name: string, description: string, color: string) => {
    return await ipcRenderer.invoke('create-custom-category', name, description, color);
  },

  updateCustomCategory: async (id: string, name: string, description: string, color: string) => {
    return await ipcRenderer.invoke('update-custom-category', id, name, description, color);
  },

  deleteCustomCategory: async (id: string) => {
    return await ipcRenderer.invoke('delete-custom-category', id);
  },

  assignAppToCategory: async (appName: string, categoryId: string) => {
    return await ipcRenderer.invoke('assign-app-to-category', appName, categoryId);
  },

  removeAppCategoryAssignment: async (appName: string) => {
    return await ipcRenderer.invoke('remove-app-category-assignment', appName);
  },

  resetCategoriesToDefaults: async () => {
    return await ipcRenderer.invoke('reset-categories-to-defaults');
  },

  // Questionnaire APIs
  checkUserInfoAvailable: async (userId: string) => {
    return await ipcRenderer.invoke('check-user-info-available', userId);
  },

  storeUserInfo: async (userInfo: any) => {
    return await ipcRenderer.invoke('store-user-info', userInfo);
  },

  fetchUserInfo: async (userId: string) => {
    return await ipcRenderer.invoke('fetch-user-info', userId);
  },

  getUserInfoLocal: async () => {
    return await ipcRenderer.invoke('get-user-info-local');
  },

  onShowQuestionnaire: (callback: (data: { userId: string; userName: string }) => void) => {
    ipcRenderer.on('show-questionnaire', (_, data) => callback(data));
  },

  removeQuestionnaireListener: () => {
    ipcRenderer.removeAllListeners('show-questionnaire');
  },

  // Focus Mode APIs
  startFocusMode: async () => {
    return await ipcRenderer.invoke('start-focus-mode');
  },

  endFocusMode: async () => {
    return await ipcRenderer.invoke('end-focus-mode');
  },

  toggleFocusMode: async () => {
    return await ipcRenderer.invoke('toggle-focus-mode');
  },

  getFocusModeStatus: async () => {
    return await ipcRenderer.invoke('get-focus-mode-status');
  },

  updateFocusModeSettings: async (settings: any) => {
    return await ipcRenderer.invoke('update-focus-mode-settings', settings);
  },

  getFocusModeSettings: async () => {
    return await ipcRenderer.invoke('get-focus-mode-settings');
  },

  createTestFocusSession: async () => {
    return await ipcRenderer.invoke('create-test-focus-session');
  },

  startFocusModeWithDuration: async (duration: number, title: string) => {
    return await ipcRenderer.invoke('start-focus-mode-with-duration', duration, title);
  },

  cancelFocusMode: async () => {
    return await ipcRenderer.invoke('cancel-focus-mode');
  },

  getFocusModeHistory: async (days?: number) => {
    return await ipcRenderer.invoke('get-focus-mode-history', days);
  },

  getFocusModeJobRoles: async () => {
    return await ipcRenderer.invoke('get-focus-mode-job-roles');
  },

  onFocusModeStarted: (callback: (data: any) => void) => {
    ipcRenderer.on('focus-mode-started', (_, data) => callback(data));
  },

  onFocusModeEnded: (callback: (data: any) => void) => {
    ipcRenderer.on('focus-mode-ended', (_, data) => callback(data));
  },

  onFocusDistraction: (callback: (data: any) => void) => {
    ipcRenderer.on('focus-distraction-detected', (_, data) => callback(data));
  },

  onFocusSettingsUpdated: (callback: (data: any) => void) => {
    ipcRenderer.on('focus-settings-updated', (_, data) => callback(data));
  },

  removeFocusModeListeners: () => {
    ipcRenderer.removeAllListeners('focus-mode-started');
    ipcRenderer.removeAllListeners('focus-mode-ended');
    ipcRenderer.removeAllListeners('focus-distraction-detected');
    ipcRenderer.removeAllListeners('focus-settings-updated');
  },

  getFocusModeShortcut: async () => {
    return await ipcRenderer.invoke('get-focus-mode-shortcut');
  },
} as ElectronAPI);

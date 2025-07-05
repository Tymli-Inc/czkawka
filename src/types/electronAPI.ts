import type { 
  CompileDataResponse, 
  ActiveWindow, 
  WindowHistoryEntry,
  AppData,
  CategoryData,
  WindowRecord,
  TrackingSession,
  GroupedCategoryData
} from './windowTracking';

// Re-export types from windowTracking for convenience  
export type { 
  CompileDataResponse, 
  ActiveWindow, 
  WindowHistoryEntry,
  AppData,
  CategoryData,
  WindowRecord,
  TrackingSession
} from './windowTracking';

// Core data types
export interface UserData {
  id: string;
  email: string;
  name: string;
  picture?: string;
  [key: string]: any;
}

// Response types for various API calls
export interface SuccessResponse {
  success: boolean;
  error?: string;
}

export interface DataResponse<T> extends SuccessResponse {
  data: T;
}

export interface UserTokenResponse {
  userData: UserData | null;
  isLoggedIn: boolean;
}

export interface UserDataResponse extends SuccessResponse {
  userData: UserData | null;
}

export interface LoginStatusResponse {
  isLoggedIn: boolean;
}

export interface IdleStatusResponse {
  isIdle: boolean;
  idleStartTime: number | null;
  idleDuration: number;
  lastActiveTime: number;
  idleThreshold: number;
  error?: string;
}

export interface IdleThresholdResponse extends SuccessResponse {
  message?: string;
  oldThreshold?: number;
  newThreshold?: number;
}

// Main ElectronAPI interface
export interface ElectronAPI {
  // Window tracking APIs
  getActiveWindow: () => Promise<ActiveWindow | null>;
  getActiveWindows: () => Promise<WindowHistoryEntry[]>;
  compileData: (days?: number) => Promise<CompileDataResponse>;
  
  // Authentication APIs
  login: () => Promise<void>;
  onAuthSuccess: (callback: (userData: UserData) => void) => void;
  onAuthFailure: (callback: () => void) => void;
  onAuthLogout: (callback: () => void) => void;
  removeAuthListener: () => void;
  
  // User token management APIs
  storeUserToken: (userData: UserData) => Promise<SuccessResponse>;
  getUserToken: () => Promise<UserTokenResponse>;
  getUserData: () => Promise<UserDataResponse>;
  clearUserToken: () => Promise<SuccessResponse>;
  getLoginStatus: () => Promise<LoginStatusResponse>;
  
  // Window control APIs
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
  removeWindowListener: () => void;
  
  // Data retrieval APIs
  getTrackingTimes: (days?: number) => Promise<DataResponse<any[]>>;
  getGroupedCategories: (days?: number) => Promise<DataResponse<GroupedCategoryData[]>>;
  getIdleEvents: (days?: number) => Promise<DataResponse<any[]>>;
  getIdleStatistics: (days?: number) => Promise<DataResponse<any>>;
  getCurrentIdleStatus: () => Promise<IdleStatusResponse>;
  setIdleThreshold: (thresholdMs: number) => Promise<IdleThresholdResponse>;

  // Auto-update APIs
  checkForUpdates: () => Promise<SuccessResponse>;
  installUpdate: () => Promise<SuccessResponse>;
}

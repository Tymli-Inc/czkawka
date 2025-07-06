import type { 
  CompileDataResponse, 
  ActiveWindow, 
  WindowHistoryEntry,
  AppData,
  CategoryData,
  WindowRecord,
  TrackingSession,
  GroupedCategoryData,
  DailyCategoryBreakdown,
  DailyCategoryBreakdownResponse,
  TopAppForDate,
  TopAppsForDateResponse
} from './windowTracking';

// Re-export types from windowTracking for convenience  
export type { 
  CompileDataResponse, 
  ActiveWindow, 
  WindowHistoryEntry,
  AppData,
  CategoryData,
  WindowRecord,
  TrackingSession,
  GroupedCategoryData,
  DailyCategoryBreakdown,
  DailyCategoryBreakdownResponse,
  TopAppForDate,
  TopAppsForDateResponse
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

export interface TimelineStatsResponse extends SuccessResponse {
  data: {
    totalActiveTime: number;
    sessionsCount: number;
    applicationsCount: number;
    categoriesCount: number;
    date: string;
  } | null;
}

// Main ElectronAPI interface
export interface ElectronAPI {
  // Window tracking APIs
  /** Get the currently active/focused window title and info */
  getActiveWindow: () => Promise<ActiveWindow | null>;
  /** Get history of all tracked windows with their session times */
  getActiveWindows: () => Promise<WindowHistoryEntry[]>;
  /** Compile and categorize window data for analytics (default: 7 days) */
  compileData: (days?: number) => Promise<CompileDataResponse>;
  
  // Authentication APIs
  /** Open Google OAuth login in browser */
  login: () => Promise<void>;
  /** Listen for successful authentication events */
  onAuthSuccess: (callback: (userData: UserData) => void) => void;
  /** Listen for authentication failure events */
  onAuthFailure: (callback: () => void) => void;
  /** Listen for logout events */
  onAuthLogout: (callback: () => void) => void;
  /** Remove all authentication event listeners */
  removeAuthListener: () => void;
  
  // User token management APIs
  /** Store user authentication data in electron-store */
  storeUserToken: (userData: UserData) => Promise<SuccessResponse>;
  /** Get stored user token and login status from electron-store */
  getUserToken: () => Promise<UserTokenResponse>;
  /** Get user data with success status (similar to getUserToken but different format) */
  getUserData: () => Promise<UserDataResponse>;
  /** Clear stored user token and logout */
  clearUserToken: () => Promise<SuccessResponse>;
  /** Check if user is currently logged in */
  getLoginStatus: () => Promise<LoginStatusResponse>;
  
  // Window control APIs
  /** Minimize the application window */
  windowMinimize: () => Promise<void>;
  /** Toggle maximize/restore the application window */
  windowMaximize: () => Promise<void>;
  /** Close the application window */
  windowClose: () => Promise<void>;
  /** Check if the window is currently maximized */
  windowIsMaximized: () => Promise<boolean>;
  /** Listen for window maximize/restore events */
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
  /** Remove window state event listeners */
  removeWindowListener: () => void;
  
  // Data retrieval APIs
  /** Get tracking session times for specified days (returns raw session data) */
  getTrackingTimes: (days?: number) => Promise<DataResponse<any[]>>;
  /** Get categorized app data grouped by categories for specified days */
  getGroupedCategories: (days?: number) => Promise<DataResponse<GroupedCategoryData[]>>;
  /** Get daily category breakdown for a specific timestamp showing time spent in each category */
  getDailyCategoryBreakdown: (timestamp: number) => Promise<DailyCategoryBreakdownResponse>;
  /** Get top 5 apps for a specific date with their usage time, category, and color */
  getTopAppsForDate: (timestamp: number) => Promise<TopAppsForDateResponse>;
  /** Get timeline statistics for a specific date (active time, sessions, apps, categories) */
  getTimelineStats: (dateString: string) => Promise<TimelineStatsResponse>;
  /** Get idle/away events (when user was inactive) for specified days */
  getIdleEvents: (days?: number) => Promise<DataResponse<any[]>>;
  /** Get idle time statistics (total idle time, average, etc.) for specified days */
  getIdleStatistics: (days?: number) => Promise<DataResponse<any>>;
  /** Get current idle status (is user currently idle, for how long, etc.) */
  getCurrentIdleStatus: () => Promise<IdleStatusResponse>;
  /** Set the idle threshold in milliseconds (how long before user is considered idle) */
  setIdleThreshold: (thresholdMs: number) => Promise<IdleThresholdResponse>;
  
  // Auto-update APIs
  /** Check for available application updates */
  checkForUpdates: () => Promise<{ success: boolean; message: string }>;
  /** Download and install available updates (will restart the app) */
  installUpdate: () => Promise<{ success: boolean; message: string }>;
  /** Listen for update status events (checking, available, downloaded, etc.) */
  onUpdateStatus: (callback: (status: any) => void) => void;
  /** Remove all update status event listeners */
  removeUpdateListener: () => void;
}

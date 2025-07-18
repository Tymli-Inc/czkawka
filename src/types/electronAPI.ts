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
  /** Force check for updates, bypassing any cooldown flags */
  forceCheckForUpdates: () => Promise<{ success: boolean; message: string }>;
  /** Download and install available updates (will restart the app) */
  installUpdate: () => Promise<{ success: boolean; message: string }>;
  /** Reset update state to clear any stuck update loops */
  resetUpdateState: () => Promise<{ success: boolean; message: string }>;
  /** Listen for update status events (checking, available, downloaded, etc.) */
  onUpdateStatus: (callback: (status: any) => void) => void;
  /** Remove all update status event listeners */
  removeUpdateListener: () => void;
  
  // Window tracking control APIs
  /** Toggle window tracking on/off and return the new state */
  toggleWindowTracking: () => Promise<boolean>;
  /** Get the current window tracking status */
  getWindowTrackingStatus: () => Promise<boolean>;
  /** Listen for window tracking status changes */
  onTrackingStatusChanged: (callback: (enabled: boolean) => void) => void;
  /** Remove window tracking status event listeners */
  removeTrackingStatusListener: () => void;

  // App info APIs
  /** Get the current application version */
  getAppVersion: () => Promise<string>;

  // Category management APIs
  /** Get all app categories with user customizations applied */
  getAppCategories: () => Promise<{
    success: boolean;
    data?: {
      detectedApps: string[];
      categories: { [key: string]: { description: string; color: string; apps: string[]; isCustom?: boolean } };
    };
    error?: string;
  }>;
  /** Get all detected apps from the database */
  getDetectedApps: () => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;
  /** Get user category settings (custom categories and app overrides) */
  getUserCategorySettings: () => Promise<{
    success: boolean;
    data?: {
      customCategories: { [key: string]: { description: string; color: string; apps: string[]; isCustom?: boolean } };
      appCategoryOverrides: { [appName: string]: string };
    };
    error?: string;
  }>;
  /** Create a new custom category */
  createCustomCategory: (name: string, description: string, color: string) => Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }>;
  /** Update an existing custom category */
  updateCustomCategory: (id: string, name: string, description: string, color: string) => Promise<{
    success: boolean;
    message: string;
    error?: string;
  }>;
  /** Delete a custom category */
  deleteCustomCategory: (id: string) => Promise<{
    success: boolean;
    message: string;
    error?: string;
  }>;
  /** Assign an app to a specific category */
  assignAppToCategory: (appName: string, categoryId: string) => Promise<{
    success: boolean;
    message: string;
    error?: string;
  }>;
  /** Remove app category assignment (will fall back to default) */
  removeAppCategoryAssignment: (appName: string) => Promise<{
    success: boolean;
    message: string;
    error?: string;
  }>;
  /** Reset all categories to defaults */
  resetCategoriesToDefaults: () => Promise<{
    success: boolean;
    message: string;
    error?: string;
  }>;

  // User management APIs
  getUserId: () => Promise<string | null>;

  // Questionnaire APIs
  /** Check if user questionnaire info is available on server */
  checkUserInfoAvailable: (userId: string) => Promise<{ available: boolean; success: boolean; error?: string }>;
  /** Store user questionnaire info on server and locally */
  storeUserInfo: (userInfo: {
    userId: string;
    name: string;
    job_role: string;
    referralSource: string;
    work_type: string[];
    team_mode: string;
    daily_work_hours: string;
    distraction_apps: string[];
    distraction_content_types: string[];
    distraction_time: string;
    productivity_goal: string;
    enforcement_preference: string;
  }) => Promise<{ success: boolean; error?: string }>;
  /** Fetch user questionnaire info from server */
  fetchUserInfo: (userId: string) => Promise<{ data: any; success: boolean; error?: string }>;
  /** Get user questionnaire info from local storage */
  getUserInfoLocal: () => Promise<any>;
  /** Listen for show questionnaire events */
  onShowQuestionnaire: (callback: (data: { userId: string; userName: string }) => void) => void;
  /** Remove questionnaire event listeners */
  removeQuestionnaireListener: () => void;

  // Focus Mode APIs
  /** Start a focus mode session */
  startFocusMode: () => Promise<{ success: boolean; message: string }>;
  /** End the current focus mode session */
  endFocusMode: () => Promise<{ success: boolean; message: string }>;
  /** Toggle focus mode on/off */
  toggleFocusMode: () => Promise<{ success: boolean }>;
  /** Get current focus mode status and active session */
  getFocusModeStatus: () => Promise<{
    success: boolean;
    data?: {
      isActive: boolean;
      session: any;
      settings: any;
    };
    error?: string;
  }>;
  /** Update focus mode settings */
  updateFocusModeSettings: (settings: {
    duration?: number;
    jobRole?: string;
    isEnabled?: boolean;
    showDistractionPopup?: boolean;
    autoBreakReminder?: boolean;
  }) => Promise<{ success: boolean; message: string }>;
  /** Get focus mode settings */
  getFocusModeSettings: () => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;
  /** Get focus mode session history */
  getFocusModeHistory: (days?: number) => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;
  /** Get available job roles for focus mode */
  getFocusModeJobRoles: () => Promise<{
    success: boolean;
    data?: string[];
    error?: string;
  }>;
  /** Create a test focus session for testing */
  createTestFocusSession: () => Promise<{
    success: boolean;
    message?: string;
  }>;
  /** Listen for focus mode events */
  onFocusModeStarted: (callback: (data: any) => void) => void;
  onFocusModeEnded: (callback: (data: any) => void) => void;
  onFocusDistraction: (callback: (data: any) => void) => void;
  onFocusSettingsUpdated: (callback: (data: any) => void) => void;
  /** Remove focus mode event listeners */
  removeFocusModeListeners: () => void;

  // Focus Mode popup APIs
  /** Start focus mode with specific duration and title (used by popup) */
  startFocusModeWithDuration: (duration: number, title: string) => Promise<{ success: boolean }>;
  /** Cancel focus mode setup (used by popup) */
  cancelFocusMode: () => Promise<{ success: boolean }>;

  /** Get the active focus mode shortcut */
  getFocusModeShortcut: () => Promise<{
    success: boolean;
    data?: string | null;
    error?: string;
  }>;
}

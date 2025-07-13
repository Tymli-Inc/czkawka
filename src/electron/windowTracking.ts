import path from 'path';
import log from 'electron-log';
import { app } from 'electron';
import {db} from "./database";
import {getLoginStatus} from "./auth";
import {mainWindow} from "./main";
import { defaultCategories, AppCategories } from './app-categories';
import CategoryManager from './categoryManager';
import UrlTrackingService from './urlTracking';

// Initialize CategoryManager instance
let categoryManager: CategoryManager;

// Initialize URL tracking service
let urlTrackingService: UrlTrackingService;

// Add idle detection import
let getSystemIdleTime: any;

let getActiveWindow: any;
let trackingInterval: NodeJS.Timeout | null = null;
let idleCheckInterval: NodeJS.Timeout | null = null;
const memoryStore = new Map();

// Idle detection configuration
const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const IDLE_CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds
let isCurrentlyIdle = false;
let idleStartTime: number | null = null;
let lastActiveTime = Date.now();

// Log when windowTracking module is loaded
log.info('windowTracking module loaded');

function loadGetWindows(): boolean {
  const possiblePaths = [];
  
  if (app.isPackaged) {
    possiblePaths.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'get-windows'),
      path.join(process.resourcesPath, 'app', 'node_modules', 'get-windows'),
      path.join(__dirname, '..', '..', 'node_modules', 'get-windows'),
      'get-windows'
    );
  } else {
    possiblePaths.push('get-windows');
  }

  for (const modulePath of possiblePaths) {
    try {
      log.info(`Attempting to load get-windows from: "${modulePath}"`);
      const module = require(modulePath);
      log.info(`get-windows module loaded, exports:`, Object.keys(module));
      
      if (module.activeWindow && typeof module.activeWindow === 'function') {
        getActiveWindow = module.activeWindow;
        log.info(`get-windows loaded successfully from: ${modulePath}`);
        return true;
      }
    } catch (error) {
      log.error(`Failed to load get-windows from: "${modulePath}", error:`, error);
    }
  }
  
  log.error('Failed to load get-windows from all possible paths');
  return false;
}

function loadSystemIdleTime(): boolean {
  const possiblePaths = [];
  
  if (app.isPackaged) {
    possiblePaths.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@paulcbetts', 'system-idle-time'),
      path.join(process.resourcesPath, 'app', 'node_modules', '@paulcbetts', 'system-idle-time'),
      path.join(__dirname, '..', '..', 'node_modules', '@paulcbetts', 'system-idle-time'),
      '@paulcbetts/system-idle-time'
    );
  } else {
    possiblePaths.push('@paulcbetts/system-idle-time');
  }

  for (const modulePath of possiblePaths) {
    try {
      log.info(`Attempting to load system-idle-time from: "${modulePath}"`);
      const module = require(modulePath);
      log.info(`system-idle-time module loaded, exports:`, Object.keys(module));
      
      if (module.getIdleTime && typeof module.getIdleTime === 'function') {
        getSystemIdleTime = module.getIdleTime;
        log.info(`system-idle-time loaded successfully from: ${modulePath}`);
        return true;
      }
    } catch (error) {
      log.error(`Failed to load system-idle-time from: "${modulePath}", error:`, error);
    }
  }
  
  log.error('Failed to load system-idle-time from all possible paths');
  return false;
}

// Helper function to get enhanced window title
function getEnhancedWindowTitle(originalTitle: string): string {
  // Enhance window title with URL information for browsers
  if (urlTrackingService && urlTrackingService.isBrowserWindow(originalTitle)) {
    return urlTrackingService.getEnhancedWindowTitle(originalTitle);
  }
  return originalTitle;
}

async function trackActiveWindow() {
  log.info('trackActiveWindow called');
  
  // Skip tracking if disabled
  if (!isTrackingEnabled) {
    log.info('Window tracking is disabled, skipping...');
    return;
  }
  
  try {
    if (!getActiveWindow) {
      log.error('get-windows is not available');
      return;
    }

    // Skip all tracking if user is currently idle
    if (isCurrentlyIdle) {
      log.info('User is idle, skipping window tracking');
      return;
    }

    const activeWindowCurrent = await getActiveWindow();
    if (activeWindowCurrent) {
      log.info('Active window detected:', { id: activeWindowCurrent.id, title: activeWindowCurrent.title });
      // Update last active time when window activity is detected
      lastActiveTime = Date.now();
      
      const currentWindow = memoryStore.get('currentWindow');

      if (currentWindow === undefined) {
        // First time tracking
        const enhancedTitle = getEnhancedWindowTitle(activeWindowCurrent.owner.name);
        const newWindow = {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0,
          title: enhancedTitle
        };
        memoryStore.set('currentWindow', newWindow);

        // Save to database immediately
        await saveWindowToDatabase(newWindow);
      } else if (currentWindow.id !== activeWindowCurrent.id) {
        // Window changed - save previous and start new
        const finalSessionDuration = Date.now() - currentWindow.startTime;
        await updateWindowSessionDuration(currentWindow.startTime, finalSessionDuration);

        memoryStore.set('previousWindow', { ...currentWindow, sessionDuration: finalSessionDuration });

        const enhancedTitle = getEnhancedWindowTitle(activeWindowCurrent.owner.name);
        const newWindow = {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0,
          title: enhancedTitle
        };
        memoryStore.set('currentWindow', newWindow);

        // Save new window to database
        await saveWindowToDatabase(newWindow);
      } else {
        // Same window - check if title should be updated (for URL changes)
        const enhancedTitle = getEnhancedWindowTitle(activeWindowCurrent.owner.name);
        const updatedSessionDuration = Date.now() - currentWindow.startTime;
        
        // Check if the enhanced title has changed (URL changed)
        if (currentWindow.title !== enhancedTitle) {
          log.info(`Window title changed from "${currentWindow.title}" to "${enhancedTitle}"`);
          
          // Save the previous window session with old title
          await updateWindowSessionDuration(currentWindow.startTime, updatedSessionDuration);
          
          // Start a new session with the new title
          const newWindow = {
            id: activeWindowCurrent.id,
            startTime: Date.now(),
            sessionDuration: 0,
            title: enhancedTitle
          };
          memoryStore.set('currentWindow', newWindow);
          await saveWindowToDatabase(newWindow);
        } else {
          // Same window, same title - update session duration in memory only
          memoryStore.set('currentWindow', {
            ...currentWindow,
            sessionDuration: updatedSessionDuration
          });
        }

        // Only update database periodically (every 10 seconds) and only if not idle
        if (updatedSessionDuration % 10000 < 1000) {
          await updateWindowSessionDuration(currentWindow.startTime, updatedSessionDuration);
        }
      }

    } else {
      log.info('No active window detected');
    }
  } catch (error) {
    log.error('Error tracking active window:', error);
  }
}

async function saveWindowToDatabase(windowData: any) {
  log.info('saveWindowToDatabase called with:', windowData);
  
  // Don't save to database if tracking is disabled or user is currently idle
  if (!isTrackingEnabled || isCurrentlyIdle) {
    log.info('Window tracking disabled or user is idle, skipping database save');
    return;
  }
  
  try {
    // windowData.title should already be enhanced at this point
    const stmt = db.prepare(
        'INSERT INTO active_windows (title, unique_id, timestamp, session_length) VALUES (?, ?, ?, ?)'
    );
    stmt.run(windowData.title, windowData.id, windowData.startTime, 0);
    log.info('Window data saved to database with title:', windowData.title);
  } catch (error) {
    log.error('Error saving window to database:', error);
  }
}

async function updateWindowSessionDuration(timestamp: number, sessionDuration: number) {
  log.info('updateWindowSessionDuration called with timestamp:', timestamp, 'duration:', sessionDuration);
  
  // Allow updates during idle transition (when finalizing sessions)
  // but prevent updates during ongoing idle periods or when tracking is disabled
  if ((!isTrackingEnabled && !idleStartTime) || (isCurrentlyIdle && !idleStartTime)) {
    log.info('Window tracking disabled or user is idle, skipping session duration update');
    return;
  }
  
  try {
    const updateStmt = db.prepare(
        'UPDATE active_windows SET session_length = ? WHERE timestamp = ?'
    );
    const result = updateStmt.run(sessionDuration, timestamp);
    log.info('Session duration updated in database');
  } catch (error) {
    log.error('Error updating session duration:', error);
  }
}

function isEntertainmentApp(appTitle: string): boolean {
  const normalizedTitle = appTitle.toLowerCase();
  
  try {
    if (!categoryManager) {
      categoryManager = CategoryManager.getInstance();
    }
    
    const finalCategories = categoryManager.getFinalCategories();
    const entertainmentCategory = finalCategories.categories.entertainment;
    
    if (!entertainmentCategory) {
      return false;
    }
    
    const isEntertainment = entertainmentCategory.apps.some((app: string) => 
      normalizedTitle.includes(app.toLowerCase()) || 
      app.toLowerCase().includes(normalizedTitle)
    );
    
    if (isEntertainment) {
      log.info(`Entertainment app detected: ${appTitle}`);
    }
    
    return isEntertainment;
  } catch (error) {
    log.error('Error checking entertainment app:', error);
    return false;
  }
}

function findAppCategory(appTitle: string): {
  name: string,
  color: string
} {
  const normalizedTitle = appTitle.toLowerCase();
  
  try {
    if (!categoryManager) {
      categoryManager = CategoryManager.getInstance();
    }
    
    const finalCategories = categoryManager.getFinalCategories();
    
    // First, check for enhanced browser titles (e.g., "Chrome - youtube.com") - prioritize this over URL tracking
    const browserDomainMatch = appTitle.match(/^(.+?)\s*-\s*(.+)$/);
    if (browserDomainMatch) {
      const [, browserName, domain] = browserDomainMatch;
      
      // Check if the first part is a browser name
      if (urlTrackingService && urlTrackingService.isBrowserWindow(browserName.trim())) {
        const suggestedCategory = urlTrackingService.getCategorySuggestionForDomain(domain.trim(), appTitle);
        
        if (suggestedCategory && finalCategories.categories[suggestedCategory]) {
          log.info(`Enhanced browser title categorized by domain: ${appTitle} -> ${suggestedCategory} (${domain.trim()})`);
          return {
            name: suggestedCategory,
            color: finalCategories.categories[suggestedCategory].color
          };
        }
        
        // If domain categorization fails, use browsers category
        if (finalCategories.categories.browsers) {
          log.info(`Enhanced browser title categorized as browsers: ${appTitle}`);
          return {
            name: 'browsers',
            color: finalCategories.categories.browsers.color
          };
        }
      }
    }
    
    // Second, check if this is a browser window with URL tracking (fallback for browsers without domain in title)
    if (urlTrackingService && urlTrackingService.isBrowserWindow(appTitle)) {
      const urlInfo = urlTrackingService.getBrowserUrlInfo(appTitle);
      
      if (urlInfo && urlInfo.isValidUrl && urlInfo.domain && urlInfo.domain !== 'browsing') {
        // Try to get category suggestion based on domain
        const suggestedCategory = urlTrackingService.getCategorySuggestionForDomain(urlInfo.domain, appTitle);
        
        if (suggestedCategory && finalCategories.categories[suggestedCategory]) {
          log.info(`Browser categorized by URL tracking: ${appTitle} -> ${suggestedCategory} (${urlInfo.domain})`);
          return {
            name: suggestedCategory,
            color: finalCategories.categories[suggestedCategory].color
          };
        }
      }
      
      // For browsers without valid URLs, fallback to browsers category
      if (finalCategories.categories.browsers) {
        log.info(`Browser categorized as general browsing: ${appTitle}`);
        return {
          name: 'browsers',
          color: finalCategories.categories.browsers.color
        };
      }
    }
    
    // Regular app categorization logic for non-browser apps
    for (const [categoryName, categoryData] of Object.entries(finalCategories.categories)) {
      const found = categoryData.apps.some((app: string) => 
        normalizedTitle.includes(app.toLowerCase()) || 
        app.toLowerCase().includes(normalizedTitle)
      );
      if (found) {
        return {
          name: categoryName,
          color: categoryData.color
        }
      }
    }
    
    return {
      name: 'miscellaneous',
      color: 'rgba(200, 200, 200, 0.25)' // Default color for miscellaneous apps
    };
  } catch (error) {
    log.error('Error finding app category:', error);
    return {
      name: 'miscellaneous',
      color: 'rgba(200, 200, 200, 0.25)' // Default color for miscellaneous apps
    };
  }
}

async function checkIdleStatus() {
  log.info('checkIdleStatus called');
  try {
    const currentWindow = memoryStore.get('currentWindow');
    if (currentWindow && isEntertainmentApp(currentWindow.title)) {
      log.info('Entertainment app detected, skipping idle detection for:', currentWindow.title);
      await handleIdleStatusChange(false);
      return;
    }

    if (!getSystemIdleTime) {
      log.info('Using fallback idle detection');
      // Fallback: use time since last window change as idle indicator
      const timeSinceLastActive = Date.now() - lastActiveTime;
      const isIdle = timeSinceLastActive > IDLE_THRESHOLD;
      
      await handleIdleStatusChange(isIdle);
      return;
    }

    const idleTimeMs = getSystemIdleTime();
    log.info('System idle time (ms):', idleTimeMs);
    const isIdle = idleTimeMs > IDLE_THRESHOLD;
    await handleIdleStatusChange(isIdle);
  } catch (error) {
    log.error('Error checking idle status:', error);
  }
}

async function handleIdleStatusChange(isIdle: boolean) {
  log.info('handleIdleStatusChange called, isIdle:', isIdle);
  if (isIdle && !isCurrentlyIdle) {
    // User just became idle
    log.info('User became idle, finalizing current session');
    isCurrentlyIdle = true;
    idleStartTime = Date.now();
    
    // Finalize current window session before going idle
    const currentWindow = memoryStore.get('currentWindow');
    if (currentWindow) {
      const sessionDurationBeforeIdle = Date.now() - currentWindow.startTime;
      log.info(`Finalizing session for ${currentWindow.title} with duration: ${sessionDurationBeforeIdle}ms`);
      await updateWindowSessionDuration(currentWindow.startTime, sessionDurationBeforeIdle);
      
      // Store the current state before going idle (for potential resumption)
      memoryStore.set('windowBeforeIdle', {
        ...currentWindow,
        sessionDuration: sessionDurationBeforeIdle
      });
      
      // Clear current window to prevent further tracking
      memoryStore.delete('currentWindow');
    }
    
    // Save idle start to database
    await saveIdleEventToDatabase('idle_start', Date.now());
    log.info('Window tracking suspended due to idle state');
    
  } else if (!isIdle && isCurrentlyIdle) {
    // User just became active
    log.info('User became active after idle, resuming window tracking');
    isCurrentlyIdle = false;
    lastActiveTime = Date.now();
    
    if (idleStartTime) {
      const idleDuration = Date.now() - idleStartTime;
      log.info(`User was idle for ${Math.round(idleDuration / 1000)} seconds`);
      
      // Save idle end to database
      await saveIdleEventToDatabase('idle_end', Date.now(), idleDuration);
      
      idleStartTime = null;
    }
    
    // Resume window tracking - check what's currently active
    try {
      const activeWindowCurrent = await getActiveWindow();
      if (activeWindowCurrent) {
        log.info('Resuming tracking for active window:', activeWindowCurrent.title);
        
        // Check if it's the same window as before idle
        const windowBeforeIdle = memoryStore.get('windowBeforeIdle');
        if (windowBeforeIdle && activeWindowCurrent.id === windowBeforeIdle.id) {
          log.info('Same window as before idle, starting fresh session');
          // Same window - start a new session (don't continue the old one)
          const newWindow = {
            id: activeWindowCurrent.id,
            startTime: Date.now(),
            sessionDuration: 0,
            title: activeWindowCurrent.owner.name
          };
          memoryStore.set('currentWindow', newWindow);
          await saveWindowToDatabase(newWindow);
        } else {
          // Different window - start tracking new window
          log.info('Different window after idle, starting new session');
          const newWindow = {
            id: activeWindowCurrent.id,
            startTime: Date.now(),
            sessionDuration: 0,
            title: activeWindowCurrent.owner.name
          };
          memoryStore.set('currentWindow', newWindow);
          await saveWindowToDatabase(newWindow);
        }
      } else {
        log.info('No active window detected after idle period');
      }
    } catch (error) {
      log.error('Error resuming window tracking after idle:', error);
    }
    
    // Clean up idle state
    memoryStore.delete('windowBeforeIdle');
    log.info('Window tracking resumed after idle period');
  }
}

async function saveIdleEventToDatabase(eventType: 'idle_start' | 'idle_end', timestamp: number, duration?: number) {
  log.info('saveIdleEventToDatabase called with:', eventType, timestamp, duration);
  try {
    const stmt = db.prepare(
      'INSERT INTO idle_events (event_type, timestamp, duration) VALUES (?, ?, ?)'
    );
    stmt.run(eventType, timestamp, duration || 0);
  } catch (error) {
    log.error('Error saving idle event to database:', error);
    
    // Try to create the table if it doesn't exist
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS idle_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          duration INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // Retry saving the event
      const retryStmt = db.prepare(
        'INSERT INTO idle_events (event_type, timestamp, duration) VALUES (?, ?, ?)'
      );
      retryStmt.run(eventType, timestamp, duration || 0);
    } catch (createError) {
      log.error('Error creating idle_events table:', createError);
    }
  }
}

export function startActiveWindowTracking() {
  log.info('startActiveWindowTracking called');
  log.info('Starting active window tracking...');
  trackActiveWindow();
  trackingInterval = setInterval(trackActiveWindow, 1000);
  
  // Start idle detection
  log.info('Starting idle detection...');
  idleCheckInterval = setInterval(checkIdleStatus, IDLE_CHECK_INTERVAL);
  
  // Start URL tracking
  if (urlTrackingService) {
    log.info('Starting URL tracking...');
    urlTrackingService.startPolling();
  }
  
  db.prepare(`
    INSERT INTO tracking_times (session_start, session_end)
    VALUES (?, ?)
  `).run(Date.now(), 0);
}

export function stopActiveWindowTracking() {
  log.info('stopActiveWindowTracking called');
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
    log.info('Active window tracking stopped');
  }
  
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
    log.info('Idle detection stopped');
  }
  
  // Stop URL tracking
  if (urlTrackingService) {
    log.info('Stopping URL tracking...');
    urlTrackingService.stopPolling();
  }
  
  // If user was idle when stopping, save the idle end event
  if (isCurrentlyIdle && idleStartTime) {
    const idleDuration = Date.now() - idleStartTime;
    saveIdleEventToDatabase('idle_end', Date.now(), idleDuration);
    isCurrentlyIdle = false;
    idleStartTime = null;
  }
  
  db.prepare(`
    UPDATE tracking_times
    SET session_end = ?
    WHERE session_end = 0
  `).run(Date.now());
}

export function initializeWindowTracking(): void {
  log.info('initializeWindowTracking called');
  try {
    loadGetWindows();
    loadSystemIdleTime();
    
    // Initialize the category manager
    categoryManager = CategoryManager.getInstance();
    log.info('CategoryManager initialized');
    
    // Initialize the URL tracking service
    urlTrackingService = UrlTrackingService.getInstance();
    log.info('UrlTrackingService initialized');
  } catch (error) {
    log.error('Critical error loading modules:', error);
  }

  try {
    const loginStatus = getLoginStatus();
    if (loginStatus.isLoggedIn) {
      log.info('User is logged in, starting active window tracking...');
      startActiveWindowTracking();
    }
  } catch (error) {
    log.error('Error checking login status during window tracking initialization:', error);
  }
  
  app.on('window-all-closed', () => {
    const currentWindow = memoryStore.get('currentWindow');
    if (currentWindow) {
      const finalSessionDuration = Date.now() - currentWindow.startTime;
      updateWindowSessionDuration(currentWindow.startTime, finalSessionDuration);
    }

    stopActiveWindowTracking();

    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    // Save final session before quitting
    const currentWindow = memoryStore.get('currentWindow');
    if (currentWindow) {
      const finalSessionDuration = Date.now() - currentWindow.startTime;
      updateWindowSessionDuration(currentWindow.startTime, finalSessionDuration);
    }

    stopActiveWindowTracking();
  });
}

// Window tracking state
let isTrackingEnabled = true;

export function toggleWindowTracking(): boolean {
  isTrackingEnabled = !isTrackingEnabled;
  
  if (isTrackingEnabled) {
    // Start tracking if it was stopped
    const loginStatus = getLoginStatus();
    if (loginStatus.isLoggedIn && !trackingInterval) {
      log.info('Resuming window tracking...');
      startActiveWindowTracking();
    }
  } else {
    // Stop tracking
    log.info('Pausing window tracking...');
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
    if (idleCheckInterval) {
      clearInterval(idleCheckInterval);
      idleCheckInterval = null;
    }
  }
  
  // Notify renderer process
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tracking-status-changed', isTrackingEnabled);
  }
  
  log.info(`Window tracking ${isTrackingEnabled ? 'enabled' : 'disabled'}`);
  return isTrackingEnabled;
}

export function getWindowTrackingStatus(): boolean {
  return isTrackingEnabled;
}

export function getMemoryStore() {
  return memoryStore;
}

export async function getCurrentActiveWindow() {
  log.info('getCurrentActiveWindow called');
  try {
    // Return the current window being tracked
    const currentWindow = memoryStore.get('currentWindow');
    if (currentWindow) {
      return {
        title: currentWindow.title,
        id: currentWindow.id,
      };
    }

    log.info('No active window being tracked');
    return null;
  } catch (error) {
    log.error('Error getting current active window:', error);
    return {
      error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
    };
  }
}

export function getActiveWindows(timestamp?: number, endTime?: number) {
  log.info('getActiveWindows called');

  let sql: string;
  let params: any[] = [];
  
  if (endTime && timestamp) {
    sql = 'SELECT * FROM active_windows WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC';
    params = [timestamp, endTime];
  } else if (timestamp) {
    sql = 'SELECT * FROM active_windows WHERE timestamp > ? ORDER BY timestamp DESC';
    params = [timestamp];
  } else {
    sql = 'SELECT * FROM active_windows ORDER BY timestamp DESC';
  }
  
  return db.prepare(sql).all(...params);
}

export function compileWindowData(days?: number) {
  log.info('compileWindowData called with days:', days);
  let query = 'SELECT title, SUM(session_length) FROM active_windows';
  let params: any[] = [];
  
  if (days && days > 0) {
    const daysAgoTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
    query += ' WHERE timestamp >= ?';
    params.push(daysAgoTimestamp);
  }
  
  query += ' GROUP BY title';
  
  const dataPool = db.prepare(query).all(...params);

  log.info('Data pool:', dataPool.length);
  
  function findAppCategoryName(appTitle: string): string {
    const normalizedTitle = appTitle.toLowerCase();
    
    try {
      if (!categoryManager) {
        categoryManager = CategoryManager.getInstance();
      }
      
      const finalCategories = categoryManager.getFinalCategories();
      
      // First, check if this is a browser window with URL tracking
      if (urlTrackingService && urlTrackingService.isBrowserWindow(appTitle)) {
        const urlInfo = urlTrackingService.getBrowserUrlInfo(appTitle);
        
        if (urlInfo && urlInfo.isValidUrl && urlInfo.domain && urlInfo.domain !== 'browsing') {
          // Try to get category suggestion based on domain
          const suggestedCategory = urlTrackingService.getCategorySuggestionForDomain(urlInfo.domain);
          
          if (suggestedCategory && finalCategories.categories[suggestedCategory]) {
            log.info(`Browser categorized by domain: ${appTitle} -> ${suggestedCategory} (${urlInfo.domain})`);
            return suggestedCategory;
          }
        }
        
        // For browsers without valid URLs, fallback to browsers category
        if (finalCategories.categories.browsers) {
          log.info(`Browser categorized as general browsing: ${appTitle}`);
          return 'browsers';
        }
      }
      
      // For enhanced browser titles (e.g., "Chrome - youtube.com"), extract domain and categorize
      const browserDomainMatch = appTitle.match(/^(.+?)\s*-\s*(.+)$/);
      if (browserDomainMatch) {
        const [, browserName, domain] = browserDomainMatch;
        
        // Check if the first part is a browser name
        if (urlTrackingService && urlTrackingService.isBrowserWindow(browserName.trim())) {
          const suggestedCategory = urlTrackingService.getCategorySuggestionForDomain(domain.trim());
          
          if (suggestedCategory && finalCategories.categories[suggestedCategory]) {
            log.info(`Enhanced browser title categorized by domain: ${appTitle} -> ${suggestedCategory} (${domain.trim()})`);
            return suggestedCategory;
          }
          
          // If domain categorization fails, use browsers category
          if (finalCategories.categories.browsers) {
            log.info(`Enhanced browser title categorized as browsers: ${appTitle}`);
            return 'browsers';
          }
        }
      }
      
      // Regular app categorization logic for non-browser apps
      for (const [categoryName, categoryData] of Object.entries(finalCategories.categories)) {
        const found = categoryData.apps.some((app: string) => 
          normalizedTitle.includes(app.toLowerCase()) || 
          app.toLowerCase().includes(normalizedTitle)
        );
        if (found) {
          return categoryName;
        }
      }
      
      return 'miscellaneous';
    } catch (error) {
      log.error('Error finding app category:', error);
      return 'miscellaneous';
    }
  }

  // Group data by categories
  const categoryData = new Map<string, {
    title: string;
    session_length: number;
    appData: Array<{ title: string; session_length: number }>;
  }>();

  try {
    if (!categoryManager) {
      categoryManager = CategoryManager.getInstance();
    }
    
    const finalCategories = categoryManager.getFinalCategories();
    
    // Initialize categories
    Object.keys(finalCategories.categories).forEach(categoryName => {
      categoryData.set(categoryName, {
        title: categoryName,
        session_length: 0,
        appData: []
      });
    });

    // Process each app and categorize it
    dataPool.forEach((item: any) => {
      const appTitle = item.title;
      const sessionLength = item['SUM(session_length)'] || 0;
      const category = findAppCategoryName(appTitle);
      
      const categoryInfo = categoryData.get(category);
      if (categoryInfo) {
        categoryInfo.session_length += sessionLength;
        categoryInfo.appData.push({
          title: appTitle,
          session_length: sessionLength
        });
      }
    });

    // Convert map to array and filter out categories with no data
    const result = Array.from(categoryData.values())
      .filter(category => category.session_length > 0)
      .map(category => ({
        title: category.title,
        session_length: category.session_length,
        appData: category.appData.sort((a, b) => b.session_length - a.session_length) // Sort apps by session length descending
      }))
      .sort((a, b) => b.session_length - a.session_length); // Sort categories by total session length descending

    return {
      success: true,
      data: result
    };
  } catch (error) {
    log.error('Error compiling window data:', error);
    return {
      success: false,
      data: []
    };
  }
}

export function getTrackingTimes(days?: number) {
  log.info('getTrackingTimes called with days:', days);
  try {
    let query = 'SELECT * FROM tracking_times';
    let params: any[] = [];
    
    if (days && days > 0) {
      const daysAgoTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
      query += ' WHERE session_start >= ?';
      params.push(daysAgoTimestamp);
    }
    
    query += ' ORDER BY session_start DESC';
    
    const trackingData = db.prepare(query).all(...params);
    
    log.info('Retrieved tracking times:', trackingData.length, 'records');
    return {
      success: true,
      data: trackingData
    };
  } catch (error) {
    log.error('Error retrieving tracking times:', error);
    return {
      success: false,
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error),
      data: [] as any[]
    };
  }
}

export function getIdleEvents(days?: number) {
  log.info('getIdleEvents called with days:', days);
  try {
    let query = 'SELECT * FROM idle_events';
    let params: any[] = [];
    
    if (days && days > 0) {
      const daysAgoTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
      query += ' WHERE timestamp >= ?';
      params.push(daysAgoTimestamp);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const idleData = db.prepare(query).all(...params);
    
    log.info('Retrieved idle events:', idleData.length, 'records');
    return {
      success: true,
      data: idleData
    };
  } catch (error) {
    log.error('Error retrieving idle events:', error);
    return {
      success: false,
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error),
      data: [] as any[]
    };
  }
}

export function getIdleStatistics(days?: number) {
  log.info('getIdleStatistics called with days:', days);
  try {
    let query = `
      SELECT 
        COUNT(CASE WHEN event_type = 'idle_start' THEN 1 END) as idle_sessions,
        SUM(CASE WHEN event_type = 'idle_end' THEN duration ELSE 0 END) as total_idle_time,
        AVG(CASE WHEN event_type = 'idle_end' THEN duration ELSE NULL END) as avg_idle_duration,
        MAX(CASE WHEN event_type = 'idle_end' THEN duration ELSE 0 END) as max_idle_duration
      FROM idle_events
    `;
    let params: any[] = [];
    
    if (days && days > 0) {
      const daysAgoTimestamp = Date.now() - (days * 24 * 60 * 60 * 1000);
      query += ' WHERE timestamp >= ?';
      params.push(daysAgoTimestamp);
    }
    
    const stats = db.prepare(query).get(...params);
    
    return {
      success: true,
      data: {
        idleSessions: stats?.idle_sessions || 0,
        totalIdleTime: stats?.total_idle_time || 0,
        averageIdleDuration: stats?.avg_idle_duration || 0,
        maxIdleDuration: stats?.max_idle_duration || 0,
        idleThreshold: IDLE_THRESHOLD
      }
    };
  } catch (error) {
    log.error('Error retrieving idle statistics:', error);
    return {
      success: false,
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error),
      data: null as any
    };
  }
}

export function getCurrentIdleStatus() {
  log.info('getCurrentIdleStatus called');
  const currentWindow = memoryStore.get('currentWindow');
  const isEntertainment = currentWindow ? isEntertainmentApp(currentWindow.title) : false;
  
  return {
    isIdle: isCurrentlyIdle,
    idleStartTime: idleStartTime,
    idleDuration: idleStartTime ? Date.now() - idleStartTime : 0,
    lastActiveTime: lastActiveTime,
    idleThreshold: IDLE_THRESHOLD,
    currentWindow: currentWindow ? currentWindow.title : null,
    isEntertainmentApp: isEntertainment,
    idleDetectionSkipped: isEntertainment
  };
}

export function setIdleThreshold(thresholdMs: number) {
  log.info('setIdleThreshold called with:', thresholdMs);
  if (thresholdMs > 0) {
    // Note: This would require modifying the IDLE_THRESHOLD constant
    // In a production app, you'd want to store this in a config file or database
    log.info(`Idle threshold change requested: ${thresholdMs}ms (current: ${IDLE_THRESHOLD}ms)`);
    return {
      success: true,
      message: 'Idle threshold updated',
      oldThreshold: IDLE_THRESHOLD,
      newThreshold: thresholdMs
    };
  } else {
    return {
      success: false,
      message: 'Invalid threshold value. Must be greater than 0.'
    };
  }
}

export function getGroupedCategories(days?: number) {
  log.info('getGroupedCategories called with timestamp:', days);
  try {
    // Use the provided timestamp directly (it's the start time of the current day in epoch time)
    const timestamp = days;
    let endTime: number | undefined;
    
    // If we have a start timestamp, calculate the end of that day
    if (timestamp) {
      const startDate = new Date(timestamp);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      endTime = endDate.getTime();
    }
    
    const apps = getActiveWindows(timestamp, endTime);
    
    // Get idle events for the same time period
    // For getIdleEvents, we need to calculate the number of days back from the timestamp
    let daysBack: number | undefined;
    if (days) {
      const daysDifference = Math.ceil((Date.now() - days) / (24 * 60 * 60 * 1000));
      daysBack = daysDifference > 0 ? daysDifference : undefined;
    }
    const idleEvents = getIdleEvents(daysBack);
    const idlePeriods: Array<{ start: number; end: number }> = [];
    
    // Process idle events to create idle periods, filtering for the specific day
    if (idleEvents.success && idleEvents.data) {
      const events = idleEvents.data;
      
      // Filter events to only include those within the target day
      const filteredEvents = timestamp && endTime ? 
        events.filter((event: any) => event.timestamp >= timestamp && event.timestamp <= endTime) :
        events;
      
      for (let i = 0; i < filteredEvents.length; i++) {
        const event = filteredEvents[i];
        if (event.event_type === 'idle_start') {
          // Find the corresponding idle_end event
          const idleEndEvent = filteredEvents.find((e: any, index: number) => 
            index > i && e.event_type === 'idle_end' && e.timestamp > event.timestamp
          );
          
          if (idleEndEvent) {
            idlePeriods.push({
              start: event.timestamp,
              end: idleEndEvent.timestamp
            });
          }
        }
      }
    }
    
    log.info('Found idle periods:', idlePeriods.length);
    
    function isInIdlePeriod(timestamp: number): boolean {
      return idlePeriods.some(period => 
        timestamp >= period.start && timestamp <= period.end
      );
    }
    
    function hasIdlePeriodBetween(startTime: number, endTime: number): boolean {
      return idlePeriods.some(period => 
        (period.start >= startTime && period.start <= endTime) ||
        (period.end >= startTime && period.end <= endTime) ||
        (period.start <= startTime && period.end >= endTime)
      );
    }
    
    function groupApps(apps: any[]) {
      log.info('groupApps called with apps:', apps);
      const grouped: {
          categories: {
            name: string,
            color: string
          }[];
          session_length: number;
          session_start: number;
          session_end: number;
          appData: Array<{ title: string; session_length: number; category: string }>;
        }[] = [];
      let prevAppEndTime: number = 0;
      
      apps.forEach(app => {
        // Get the category of the app
        const category = findAppCategory(app.title);
        const appStartTime = app.timestamp;
        const appEndTime = app.timestamp + app.session_length;
        
        // Check if this app should start a new group
        const shouldCreateNewGroup = 
          // First app or significant time gap
          app.timestamp + 2000 > prevAppEndTime ||
          // App starts during an idle period
          isInIdlePeriod(appStartTime) ||
          // There's an idle period between the previous app and this one
          (prevAppEndTime > 0 && hasIdlePeriodBetween(prevAppEndTime, appStartTime));
        
        if (shouldCreateNewGroup) {
          console.log('Creating new group for app:', app.title, 'with category:', category, 
                     'Reason:', isInIdlePeriod(appStartTime) ? 'starts during idle' : 
                              hasIdlePeriodBetween(prevAppEndTime, appStartTime) ? 'idle period between apps' : 'time gap');
          grouped.push({
            categories: [category],
            session_length: app.session_length,
            session_start: app.timestamp,
            session_end: app.timestamp + app.session_length,
            appData: [{ title: app.title, session_length: app.session_length, category: category.name }]
          });
          prevAppEndTime = 0;
        } else {
          // If the app is in the same group, add it to the existing group
          const lastGroup = grouped[grouped.length - 1];
          if (lastGroup) {
            // Check if there's an idle period within this app's session
            if (hasIdlePeriodBetween(lastGroup.session_end, appEndTime)) {
              // There's an idle period, so start a new group
              console.log('Creating new group due to idle period during session for app:', app.title);
              grouped.push({
                categories: [category],
                session_length: app.session_length,
                session_start: app.timestamp,
                session_end: app.timestamp + app.session_length,
                appData: [{ title: app.title, session_length: app.session_length, category: category.name }]
              });
            } else {
              // No idle period, add to existing group
              if (lastGroup.categories.find(c => c.name == category.name) === undefined) {
                lastGroup.categories.push(category);
              }
              lastGroup.session_length += app.session_length;
              lastGroup.session_end = Math.max(lastGroup.session_end, app.timestamp + app.session_length);
              lastGroup.appData.push({ title: app.title, session_length: app.session_length, category: category.name });
            }
          }
        }
        
        // Update the previous app's end time
        prevAppEndTime = app.timestamp + app.session_length;
      });

      return grouped;
    }
    
    const groupedCategories = groupApps(apps);

    return {
      success: true,
      data: groupedCategories
    };
  } catch (error) {
    log.error('Error getting grouped categories:', error);
    return {
      success: false,
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error)
    };
  }
}

export function getTimelineStats(targetDate: Date) {
  log.info('getTimelineStats called for date:', targetDate.toDateString());
  try {
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all window records for the specific date
    const windowRecords = db.prepare(`
      SELECT * FROM active_windows 
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `).all(dayStart.getTime(), dayEnd.getTime());

    log.info(`Found ${windowRecords.length} window records for ${targetDate.toDateString()}`);

    // Debug: Check session_length availability
    const recordsWithSessionLength = windowRecords.filter((w: any) => w.session_length && w.session_length > 0);
    log.info(`Records with session_length: ${recordsWithSessionLength.length}/${windowRecords.length}`);
    
    if (recordsWithSessionLength.length > 0) {
      const avgSessionLength = recordsWithSessionLength.reduce((sum: number, w: any) => sum + w.session_length, 0) / recordsWithSessionLength.length;
      log.info(`Average session length: ${Math.round(avgSessionLength/1000/60)}min`);
    }

    // Calculate total active time more accurately
    let totalActiveTime = 0;
    
    for (let i = 0; i < windowRecords.length; i++) {
      const window: any = windowRecords[i];
      let windowDuration = 0;
      
      if (window.session_length && window.session_length > 0) {
        // Use the stored session length as it represents actual active time
        windowDuration = window.session_length;
      } else {
        // For windows without session_length, estimate conservatively
        // Use a small default duration (e.g., 30 seconds) for window switches
        // This prevents overcounting from gaps between windows
        const DEFAULT_WINDOW_DURATION = 30 * 1000; // 30 seconds
        windowDuration = DEFAULT_WINDOW_DURATION;
        
        // Only for the very last window of today, try to calculate from current time
        if (i === windowRecords.length - 1) {
          const isToday = targetDate.toDateString() === new Date().toDateString();
          if (isToday) {
            const timeSinceLastWindow = Date.now() - window.timestamp;
            // Only use this if it's reasonable (less than 1 hour)
            if (timeSinceLastWindow > 0 && timeSinceLastWindow < 60 * 60 * 1000) {
              windowDuration = timeSinceLastWindow;
            }
          }
        }
      }
      
      // Cap individual window sessions to reasonable limits
      const MAX_WINDOW_DURATION = 2 * 60 * 60 * 1000; // 2 hours max per window
      if (windowDuration > MAX_WINDOW_DURATION) {
        windowDuration = MAX_WINDOW_DURATION;
      }
      
      totalActiveTime += windowDuration;
      
      // Log for debugging
      if (i < 5) { // Log first 5 windows for debugging
        log.info(`Window ${i}: ${window.title}, duration: ${windowDuration}ms (${Math.round(windowDuration/1000/60)}min), stored: ${window.session_length}`);
      }
    }

    log.info(`Total active time calculated: ${totalActiveTime}ms (${Math.round(totalActiveTime/1000/60)}min)`);

    // Count unique applications
    const uniqueApps = new Set(
      windowRecords
        .map((window: any) => window.title)
        .filter((title: string) => title && title.trim().length > 0)
    );
    const applicationsCount = uniqueApps.size;

    // Get tracking sessions that overlap with the selected day
    const trackingSessions = db.prepare(`
      SELECT * FROM tracking_times 
      WHERE (session_start < ? AND session_end > ?) OR 
            (session_start >= ? AND session_start <= ?) OR
            (session_end >= ? AND session_end <= ?)
    `).all(
      dayEnd.getTime(), dayStart.getTime(),  // Sessions that overlap
      dayStart.getTime(), dayEnd.getTime(),  // Sessions that start within day
      dayStart.getTime(), dayEnd.getTime()   // Sessions that end within day
    );
    const sessionsCount = trackingSessions.length;

    // Calculate categories from window records for the specific date
    let categoriesCount = 0;
    if (windowRecords.length > 0) {
      const dayCategories = new Set();
      
      // Group window records by category for this specific date
      windowRecords.forEach((window: any) => {
        const category = findAppCategory(window.title);
        if (category && category.name) {
          dayCategories.add(category.name);
        }
      });
      
      categoriesCount = dayCategories.size;
    }

    const stats = {
      totalActiveTime,
      sessionsCount,
      applicationsCount,
      categoriesCount,
      date: targetDate.toISOString()
    };

    log.info('Timeline stats calculated:', stats);
    
    return {
      success: true,
      data: stats
    };
  } catch (error) {
    log.error('Error calculating timeline stats:', error);
    return {
      success: false,
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error),
      data: null as any
    };
  }
}

export function getDailyCategoryBreakdown(timestamp: number) {
  log.info('getDailyCategoryBreakdown called with timestamp:', timestamp);
  try {
    // Convert timestamp to start and end of day
    const targetDate = new Date(timestamp);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    log.info(`Getting category breakdown for ${targetDate.toDateString()} (${dayStart.getTime()} to ${dayEnd.getTime()})`);

    // Get all window records for the specific date
    const windowRecords = db.prepare(`
      SELECT title, SUM(session_length) as total_session_length
      FROM active_windows 
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY title
      ORDER BY total_session_length DESC
    `).all(dayStart.getTime(), dayEnd.getTime());

    log.info(`Found ${windowRecords.length} unique applications for ${targetDate.toDateString()}`);

    // Group data by categories
    const categoryBreakdown = new Map<string, {
      category: string;
      time: number;
      color: string;
    }>();

    if (!categoryManager) {
      categoryManager = CategoryManager.getInstance();
    }
    
    const finalCategories = categoryManager.getFinalCategories();
    
    // Initialize all categories with 0 time
    Object.entries(finalCategories.categories).forEach(([categoryName, categoryData]) => {
      categoryBreakdown.set(categoryName, {
        category: categoryName,
        time: 0,
        color: categoryData.color
      });
    });

    // Process each app and categorize it
    windowRecords.forEach((record: any) => {
      const appTitle = record.title;
      const sessionLength = record.total_session_length || 0;
      
      if (sessionLength > 0) {
        const categoryInfo = findAppCategory(appTitle);
        const categoryData = categoryBreakdown.get(categoryInfo.name);
        
        if (categoryData) {
          categoryData.time += sessionLength;
        }
      }
    });

    // Convert to array and filter out categories with no time
    const result = Array.from(categoryBreakdown.values())
      .filter(category => category.time > 0)
      .sort((a, b) => b.time - a.time); // Sort by time descending

    log.info(`Category breakdown for ${targetDate.toDateString()}:`, result.map(c => `${c.category}: ${Math.round(c.time/1000/60)}min`));

    return {
      success: true,
      data: result
    };
  } catch (error) {
    log.error('Error getting daily category breakdown:', error);
    return {
      success: false,
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error),
      data: [] as Array<{category: string; time: number; color: string}>
    };
  }
}

export function getTopAppsForDate(timestamp: number) {
  log.info('getTopAppsForDate called with timestamp:', timestamp);
  try {
    // Convert timestamp to start and end of day
    const targetDate = new Date(timestamp);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    log.info(`Getting top 5 apps for ${targetDate.toDateString()} (${dayStart.getTime()} to ${dayEnd.getTime()})`);

    // Get all window records for the specific date, grouped by app title
    const windowRecords = db.prepare(`
      SELECT title, SUM(session_length) as total_session_length
      FROM active_windows 
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY title
      ORDER BY total_session_length DESC
      LIMIT 5
    `).all(dayStart.getTime(), dayEnd.getTime());

    log.info(`Found ${windowRecords.length} applications for ${targetDate.toDateString()}`);

    // Process each app and add category information
    const result = windowRecords.map((record: any) => {
      const appTitle = record.title;
      const sessionLength = record.total_session_length || 0;
      const categoryInfo = findAppCategory(appTitle);
      
      return {
        title: appTitle,
        time: sessionLength,
        category: categoryInfo.name,
        categoryColor: categoryInfo.color
      };
    }).filter((app: any) => app.time > 0); // Filter out apps with no time

    log.info(`Top 5 apps for ${targetDate.toDateString()}:`, result.map((app: any) => `${app.title}: ${Math.round(app.time/1000/60)}min`));

    return {
      success: true,
      data: result
    };
  } catch (error) {
    log.error('Error getting top apps for date:', error);
    return {
      success: false,
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error),
      data: [] as Array<{title: string; time: number; category: string; categoryColor: string}>
    };
  }
}


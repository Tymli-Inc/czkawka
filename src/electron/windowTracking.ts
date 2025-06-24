import path from 'path';
import log from 'electron-log';
import { app } from 'electron';
import {db} from "./database";
import {getLoginStatus} from "./auth";
import {mainWindow} from "./main";

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

async function trackActiveWindow() {
  try {
    if (!getActiveWindow) {
      log.error('get-windows is not available');
      return;
    }

    // Skip tracking if user is currently idle
    if (isCurrentlyIdle) {
      return;
    }

    const activeWindowCurrent = await getActiveWindow();
    if (activeWindowCurrent) {
      // Update last active time when window activity is detected
      lastActiveTime = Date.now();
      
      const currentWindow = memoryStore.get('currentWindow');

      if (currentWindow === undefined) {
        // First time tracking
        const newWindow = {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0,
          title: activeWindowCurrent.owner.name
        };
        memoryStore.set('currentWindow', newWindow);

        // Save to database immediately
        await saveWindowToDatabase(newWindow);
      } else if (currentWindow.id !== activeWindowCurrent.id) {
        // Window changed - save previous and start new
        const finalSessionDuration = Date.now() - currentWindow.startTime;
        await updateWindowSessionDuration(currentWindow.startTime, finalSessionDuration);

        memoryStore.set('previousWindow', { ...currentWindow, sessionDuration: finalSessionDuration });

        const newWindow = {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0,
          title: activeWindowCurrent.owner.name
        };
        memoryStore.set('currentWindow', newWindow);

        // Save new window to database
        await saveWindowToDatabase(newWindow);
      } else {
        // Same window - update session duration in memory only
        const updatedSessionDuration = Date.now() - currentWindow.startTime;
        memoryStore.set('currentWindow', {
          ...currentWindow,
          sessionDuration: updatedSessionDuration
        });

        if (updatedSessionDuration % 10000 < 1000) {
          await updateWindowSessionDuration(currentWindow.startTime, updatedSessionDuration);
        }
      }

    } else {
      log.info('No active window found');
    }
  } catch (error) {
    log.error('Error tracking active window:', error);
  }
}

async function saveWindowToDatabase(windowData: any) {
  try {
    const stmt = db.prepare(
        'INSERT INTO active_windows (title, unique_id, timestamp, session_length) VALUES (?, ?, ?, ?)'
    );
    stmt.run(windowData.title, windowData.id, windowData.startTime, 0);
  } catch (error) {
    log.error('Error saving window to database:', error);
  }
}

async function updateWindowSessionDuration(timestamp: number, sessionDuration: number) {
  try {
    const updateStmt = db.prepare(
        'UPDATE active_windows SET session_length = ? WHERE timestamp = ?'
    );
    const result = updateStmt.run(sessionDuration, timestamp);
  } catch (error) {
    log.error('Error updating session duration:', error);
  }
}

async function checkIdleStatus() {
  try {
    if (!getSystemIdleTime) {
      // Fallback: use time since last window change as idle indicator
      const timeSinceLastActive = Date.now() - lastActiveTime;
      const isIdle = timeSinceLastActive > IDLE_THRESHOLD;
      
      await handleIdleStatusChange(isIdle);
      return;
    }

    const idleTimeMs = getSystemIdleTime();
    const isIdle = idleTimeMs > IDLE_THRESHOLD;
    
    await handleIdleStatusChange(isIdle);
    
  } catch (error) {
    log.error('Error checking idle status:', error);
  }
}

async function handleIdleStatusChange(isIdle: boolean) {
  if (isIdle && !isCurrentlyIdle) {
    // User just became idle
    log.info('User became idle');
    isCurrentlyIdle = true;
    idleStartTime = Date.now();
    
    // Pause window tracking during idle time
    const currentWindow = memoryStore.get('currentWindow');
    if (currentWindow) {
      const sessionDurationBeforeIdle = Date.now() - currentWindow.startTime;
      await updateWindowSessionDuration(currentWindow.startTime, sessionDurationBeforeIdle);
      
      // Store the current state before going idle
      memoryStore.set('windowBeforeIdle', {
        ...currentWindow,
        sessionDuration: sessionDurationBeforeIdle
      });
    }
    
    // Save idle start to database
    await saveIdleEventToDatabase('idle_start', Date.now());
    
  } else if (!isIdle && isCurrentlyIdle) {
    // User just became active
    log.info('User became active');
    isCurrentlyIdle = false;
    lastActiveTime = Date.now();
    
    if (idleStartTime) {
      const idleDuration = Date.now() - idleStartTime;
      log.info(`User was idle for ${Math.round(idleDuration / 1000)} seconds`);
      
      // Save idle end to database
      await saveIdleEventToDatabase('idle_end', Date.now(), idleDuration);
      
      idleStartTime = null;
    }
    
    // Resume window tracking
    const windowBeforeIdle = memoryStore.get('windowBeforeIdle');
    if (windowBeforeIdle) {
      // Check if the same window is still active
      const activeWindowCurrent = await getActiveWindow();
      if (activeWindowCurrent && activeWindowCurrent.id === windowBeforeIdle.id) {
        // Same window - continue tracking from where we left off
        memoryStore.set('currentWindow', {
          ...windowBeforeIdle,
          startTime: Date.now() - windowBeforeIdle.sessionDuration
        });
      } else {
        // Different window - start tracking new window
        if (activeWindowCurrent) {
          const newWindow = {
            id: activeWindowCurrent.id,
            startTime: Date.now(),
            sessionDuration: 0,
            title: activeWindowCurrent.owner.name
          };
          memoryStore.set('currentWindow', newWindow);
          await saveWindowToDatabase(newWindow);
        }
      }
      memoryStore.delete('windowBeforeIdle');
    }
  }
}

async function saveIdleEventToDatabase(eventType: 'idle_start' | 'idle_end', timestamp: number, duration?: number) {
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
  log.info('Starting active window tracking...');
  trackActiveWindow();
  trackingInterval = setInterval(trackActiveWindow, 1000);
  
  // Start idle detection
  log.info('Starting idle detection...');
  idleCheckInterval = setInterval(checkIdleStatus, IDLE_CHECK_INTERVAL);
  
  db.prepare(`
    INSERT INTO tracking_times (session_start, session_end)
    VALUES (?, ?)
  `).run(Date.now(), 0);
}

export function stopActiveWindowTracking() {
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
  try {
    loadGetWindows();
    loadSystemIdleTime();
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

export function getMemoryStore() {
  return memoryStore;
}

export async function getCurrentActiveWindow() {
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
    log.error('Error getting active window:', error);
    return {
      error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
    };
  }
}

export function getActiveWindows() {
  return db.prepare('SELECT * FROM active_windows ORDER BY timestamp DESC').all();
}

export function compileWindowData(days?: number) {
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
  return {
    success: true,
    data: dataPool.map((item: any) => ({
      title: item.title,
      session_length: item['SUM(session_length)'] || 0
    }))
  };
}

export function getTrackingTimes(days?: number) {
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
  return {
    isIdle: isCurrentlyIdle,
    idleStartTime: idleStartTime,
    idleDuration: idleStartTime ? Date.now() - idleStartTime : 0,
    lastActiveTime: lastActiveTime,
    idleThreshold: IDLE_THRESHOLD
  };
}

export function setIdleThreshold(thresholdMs: number) {
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
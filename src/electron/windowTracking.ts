import path from 'path';
import log from 'electron-log';
import { app } from 'electron';
import {db} from "./database";

let getActiveWindow: any;
const memoryStore = new Map();

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

export function initializeWindowTracking(): void {
  try {
    loadGetWindows();
  } catch (error) {
    console.error('Critical error loading get-windows module:', error);
  }

  let trackingInterval: NodeJS.Timeout | null = null;

  function startActiveWindowTracking() {
    console.log('Starting active window tracking...');

    trackActiveWindow();

    trackingInterval = setInterval(trackActiveWindow, 1000);
  }

  function stopActiveWindowTracking() {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
      console.log('Active window tracking stopped');
    }
  }

  async function trackActiveWindow() {
    try {
      if (!getActiveWindow) {
        console.error('get-windows is not available');
        return;
      }

      const activeWindowCurrent = await getActiveWindow();
      if (activeWindowCurrent) {
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
          const finalSessionDuration = currentWindow.sessionDuration + (Date.now() - currentWindow.startTime);
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
          // Same window - update session duration
          const updatedSessionDuration = Date.now() - currentWindow.startTime;
          memoryStore.set('currentWindow', {
            ...currentWindow,
            sessionDuration: updatedSessionDuration
          });

          // Update database every tracking cycle
          await updateWindowSessionDuration(currentWindow.startTime, updatedSessionDuration);
        }

      } else {
        console.log('No active window found');
      }
    } catch (error) {
      console.error('Error tracking active window:', error);
    }
  }
  async function saveWindowToDatabase(windowData: any) {
    try {
      const stmt = db.prepare(
          'INSERT INTO active_windows (title, unique_id, timestamp, session_length) VALUES (?, ?, ?, ?)'
      );
      stmt.run(windowData.title, windowData.id, windowData.startTime, 0);
    } catch (error) {
      console.error('Error saving window to database:', error);
    }
  }

  async function updateWindowSessionDuration(timestamp: number, sessionDuration: number) {
    try {
      const updateStmt = db.prepare(
          'UPDATE active_windows SET session_length = ? WHERE timestamp = ?'
      );
      const result = updateStmt.run(sessionDuration, timestamp);
    } catch (error) {
      console.error('Error updating session duration:', error);
    }
  }

  startActiveWindowTracking()

  app.on('window-all-closed', () => {
    const currentWindow = memoryStore.get('currentWindow');
    if (currentWindow) {
      const finalSessionDuration = currentWindow.sessionDuration + (Date.now() - currentWindow.startTime);
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
      const finalSessionDuration = currentWindow.sessionDuration + (Date.now() - currentWindow.startTime);
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

    console.log('No active window being tracked');
    return null;
  } catch (error) {
    console.error('Error getting active window:', error);
    return {
      error: typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error),
    };
  }
}

export function getActiveWindows() {
  return db.prepare('SELECT * FROM active_windows ORDER BY timestamp DESC LIMIT 100').all();
}

export function compileWindowData() {
  const dataPool = db.prepare('SELECT title, SUM(session_length) FROM active_windows GROUP BY title').all();

  console.log('Data pool:', dataPool);
  return {
    success: true,
    data: dataPool.map((item: any) => ({
      title: item.title,
      session_length: item['SUM(session_length)'] || 0
    }))
  };
}
import path from 'path';
import log from 'electron-log';
import { app } from 'electron';

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

export function initializeWindowTracking(): boolean {
  try {
    return loadGetWindows();
  } catch (error) {
    console.error('Critical error loading get-windows module:', error);
    return false;
  }
}

export function getMemoryStore() {
  return memoryStore;
}

export async function getCurrentActiveWindow() {
  try {
    if (!getActiveWindow) {
      console.error('get-windows is not available');
      return { error: 'get-windows module not available' + '. Path used:' + process.resourcesPath };
    }

    const activeWindowCurrent = await getActiveWindow();
    if (activeWindowCurrent) {
      const currentWindow = memoryStore.get('currentWindow');
      
      if (currentWindow === undefined) {
        memoryStore.set('currentWindow', {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0
        });
      }
      
      if (currentWindow && currentWindow.id !== activeWindowCurrent.id) {
        memoryStore.set('previousWindow', currentWindow);
        memoryStore.set('currentWindow', {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0
        });
      } else if (currentWindow) {
        memoryStore.set('currentWindow', {
          ...currentWindow,
          sessionDuration: currentWindow.sessionDuration + (Date.now() - currentWindow.startTime)
        });
      }

      console.log('Current window ID stored:', memoryStore.get('currentWindow'));
      console.log('Previous window ID stored:', memoryStore.get('previousWindow'));
      console.log('Active window found:', activeWindowCurrent);
      
      return {
        title: activeWindowCurrent.owner.name,
        id: activeWindowCurrent.id,
        owner: activeWindowCurrent.owner,
        addititionalData: activeWindowCurrent.title
      };
    }
    
    console.log('No active window found');
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
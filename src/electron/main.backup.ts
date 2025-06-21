import path from 'path';
import log from 'electron-log';
import Store from 'electron-store';
import App = Electron.App;
interface AppExtended extends App {
    isQuiting: boolean;
}
import { app as appBase, BrowserWindow, ipcMain, Tray, Menu, shell } from 'electron';
import { IncomingMessage } from 'http';
const app = appBase as AppExtended;
app.isQuiting = false;

// Set app name for consistent user data directory
app.setName('Hourglass');

// Declare store variable - will be initialized after app is ready
let store: any;

let getActiveWindow: any;
let BetterSqlite3: any;

const memoryStore = new Map();

function loadGetWindows() {
  const possiblePaths = [];
  
  if (app.isPackaged) {
    // In packaged mode, look in app.asar.unpacked first
    possiblePaths.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'get-windows'),
      path.join(process.resourcesPath, 'app', 'node_modules', 'get-windows'),
      path.join(__dirname, '..', '..', 'node_modules', 'get-windows'),
      'get-windows'
    );
  } else {
    // In development, use regular require
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

function loadBetterSqlite3() {
  const possiblePaths = [];
  
  if (app.isPackaged) {
    // In packaged mode, look in app.asar.unpacked first
    possiblePaths.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3'),
      path.join(process.resourcesPath, 'app', 'node_modules', 'better-sqlite3'),
      path.join(__dirname, '..', '..', 'node_modules', 'better-sqlite3'),
      'better-sqlite3'
    );
  } else {
    // In development, use regular require
    possiblePaths.push('better-sqlite3');
  }

  for (const modulePath of possiblePaths) {
    try {
      log.info(`Attempting to load better-sqlite3 from: "${modulePath}"`);
      const module = require(modulePath);
      log.info(`better-sqlite3 module loaded successfully`);
      
      if (typeof module === 'function') {
        BetterSqlite3 = module;
        log.info(`better-sqlite3 loaded successfully from: ${modulePath}`);
        return true;
      }
    } catch (error) {
      log.error(`Failed to load better-sqlite3 from: "${modulePath}", error:`, error);
    }
  }
  
  log.error('Failed to load better-sqlite3 from all possible paths');
  return false;
}

function getTrayIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets','icons', 'tray.png');
  } else {
    return path.join(__dirname, '..','..', 'assets','icons', 'tray.png');
  }
}
try {
  loadGetWindows();
  loadBetterSqlite3();
} catch (error) {
  console.error('Critical error loading modules:', error);
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let db: any;
let tray: Tray | null = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load either login page or React app based on login state
  const isLoggedIn = store?.get('isLoggedIn');
  if (!isLoggedIn) {
    // Render static login page
    mainWindow.loadFile(path.join(app.getAppPath(), 'login.html'));
  } else {
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }
  });

  tray = new Tray(getTrayIconPath());
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
        mainWindow.setSkipTaskbar(false);
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Hourglass');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
    mainWindow.setSkipTaskbar(false);
  });
}

app.whenReady().then(() => {  // Initialize electron-store after app is ready
  try {    store = new Store({
      name: 'user-tokens',
      defaults: {
        userData: null,
        isLoggedIn: false
      }
    });
    
    // Log store path for debugging
    console.log('Electron Store path:', store.path);
    console.log('Initial store contents:', store.store);
  } catch (error) {
    console.error('Failed to initialize electron-store:', error);
  }
  
  try {
    const dbPath = path.join(app.getPath('userData'), 'appdata.sqlite');
    console.log('DB Path:', dbPath);
    if (!BetterSqlite3) {
      throw new Error('better-sqlite3 module not available');
    }

    db = new BetterSqlite3(dbPath);
    db.prepare(`
     CREATE TABLE IF NOT EXISTS active_windows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        unique_id INTEGER,
        timestamp INTEGER,
        session_length INTEGER DEFAULT 0
      )
    `).run();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
  ipcMain.handle('save-active-window', (event, windowData) => {
    // This handler is now mainly for manual saves from the renderer
    // Most saving is handled automatically by the tracking system
    console.log('Manual save requested for window:', windowData.title);
    return { success: true };
  });
  ipcMain.handle('get-active-windows', () => {
    return db.prepare('SELECT * FROM active_windows ORDER BY timestamp DESC LIMIT 100').all();
  });
  // Token management IPC handlers - moved inside app.whenReady()
  ipcMain.handle('store-user-token', (event, userData: any) => {
    try {
        if (!store) {
            throw new Error('Store not initialized');
        }        store.set('userData', userData);
        store.set('isLoggedIn', true);
        log.info('User data stored successfully');
        console.log('Store contents after saving:', store.store);
        
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL!==undefined && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
            mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        } else {
            const prodPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
            mainWindow.loadFile(prodPath);
        }
        return { success: true };
    } catch (error: any) {
        log.error('Failed to store user data:', error);
        return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-user-token', () => {
    try {
        if (!store) {
            throw new Error('Store not initialized');
        }
        const userData = store.get('userData') as any;
        const isLoggedIn = store.get('isLoggedIn', false) as boolean;
        console.log('Retrieved from store - userData exists:', !!userData, 'isLoggedIn:', isLoggedIn);
        return { userData, isLoggedIn };
    } catch (error: any) {
        log.error('Failed to get user data:', error);
        return { userData: null, isLoggedIn: false };
    }
  });

  ipcMain.handle('clear-user-token', () => {
    try {
        if (!store) {
            throw new Error('Store not initialized');
        }
        store.set('userData', null);
        store.set('isLoggedIn', false);
        log.info('User data cleared successfully');
        console.log('Store contents after clearing:', store.store);
        mainWindow.loadFile(path.join(app.getAppPath(), 'login.html'));
        return { success: true };
    } catch (error: any) {
        log.error('Failed to clear user data:', error);
        return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-login-status', () => {
    try {
        if (!store) {
            throw new Error('Store not initialized');
        }
        const isLoggedIn = store.get('isLoggedIn', false) as boolean;
        return { isLoggedIn };
    } catch (error: any) {
        log.error('Failed to get login status:', error);
        return { isLoggedIn: false };
    }
  });

  createWindow();
  
  // Start tracking active windows automatically
  startActiveWindowTracking();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


ipcMain.handle('get-active-window', async () => {
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
});

ipcMain.handle('compile-data', async () => {
  try {
     const dataPool = db.prepare('SELECT title, SUM(session_length) FROM active_windows GROUP BY title').all();

     console.log('Data pool:', dataPool);
     return {
       success: true,
       data: dataPool.map((item: any) => {
            return {
            title: item.title,
            session_length: item['SUM(session_length)'] || 0
            };
       })
     }
  } catch (error) {
    console.error('Error compiling data:', error);
    return {
      error: typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error),
    };
  }
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    app.quit();
}

const protocol = 'hourglass';
if (app.isPackaged) {
    app.setAsDefaultProtocolClient(protocol);
} else {
    app.setAsDefaultProtocolClient(protocol, process.execPath, [path.resolve(process.argv[1])]);
}

let deeplinkUrl: string | null = null;

app.on('second-instance', (event, argv) => {
    const urlArg = argv.find(arg => arg.startsWith('hourglass://'));
    if (urlArg) {
        deeplinkUrl = urlArg;
        handleDeepLink(urlArg);
        mainWindow?.show();
        mainWindow?.focus();
    }
});

app.on('open-url', (event, urlStr) => {
    event.preventDefault();
    deeplinkUrl = urlStr;
    handleDeepLink(urlStr);
    mainWindow?.show();
    mainWindow?.focus();
});

// Function to exchange code for token and send user data to renderer
function handleDeepLink(urlStr: string) {
    try {
        const urlObj = new URL(urlStr);
        const code = urlObj.searchParams.get('code');
        console.log('Received deep link URL:', urlStr);
        if (code) {
            const { net } = require('electron');
            
            const authUrl = app.isPackaged 
                ? 'https://hourglass-auth.onrender.com/auth/token'
                : 'http://localhost:3000/auth/token';
            
            const request = net.request({
                method: 'POST',
                url: authUrl,
                headers: { 'Content-Type': 'application/json' }
            });
            request.on('response', (response: IncomingMessage) => {
                let body = '';
                response.on('data', (chunk: Buffer) => {
                    body += chunk.toString();
                });
                response.on('end', () => {
                    const userData = JSON.parse(body);
                    if (mainWindow) {
                        mainWindow.webContents.send('auth-success', userData);
                    }
                });
                console.log('Response received from token endpoint:', body);
            });
            request.write(JSON.stringify({ code, redirect_uri: 'hourglass://' }));
            request.end();
        }
    } catch (err) {
        console.error('Failed to handle deep link', err);
    }  
}  

ipcMain.handle('login', () => {
    // Use different URLs based on environment
    const authUrl = app.isPackaged 
        ? 'https://hourglass-auth.onrender.com/auth/google'
        : 'http://localhost:3000/auth/google';
    
    shell.openExternal(authUrl);
});

app.on('window-all-closed', () => {
  // Save final session before quitting
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

let trackingInterval: NodeJS.Timeout | null = null;

// Function to start automatic tracking
function startActiveWindowTracking() {
  console.log('Starting active window tracking...');
  
  // Initial fetch
  trackActiveWindow();
  
  // Set up interval to track every 5 seconds
  trackingInterval = setInterval(trackActiveWindow, 1000);
}

// Function to stop tracking
function stopActiveWindowTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
    console.log('Active window tracking stopped');
  }
}

// Main tracking function
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

// Helper function to save window to database
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

// Alternative store initialization with explicit path (if needed)
  /*
  const userDataPath = app.getPath('userData');
  store = new Store({
    name: 'user-tokens',
    cwd: userDataPath,
    defaults: {
      userData: null,
      isLoggedIn: false
    },
    serialize: JSON.stringify,
    deserialize: JSON.parse
  });
  */

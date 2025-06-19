import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import log from 'electron-log';
import { c } from 'vite/dist/node/types.d-aGj9QkWt';

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

  // In development, use the Vite dev server
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  try {
    // ✅ Init DB first
    const dbPath = path.join(app.getPath('userData'), 'appdata.sqlite');
    console.log('DB Path:', dbPath);
    
    // Use dynamically loaded better-sqlite3
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
    
    const stmt = db.prepare(
      'INSERT INTO active_windows (title, unique_id, timestamp) VALUES (?, ?, ?)'
    );
    stmt.run(windowData.title, windowData.unique_id, Date.now());
    return { success: true };
  });

  ipcMain.handle('get-active-windows', () => {
    return db.prepare('SELECT * FROM active_windows ORDER BY timestamp DESC LIMIT 100').all();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


ipcMain.handle('get-active-window', async () => {
  try {
    if (!getActiveWindow) {
      console.error('get-windows is not available');
      return { error: 'get-windows module not available' + '. Path used:' + process.resourcesPath };
    }

    const activeWindowCurrent = await getActiveWindow();
    if (activeWindowCurrent) {
      console.log('Active window found:', activeWindowCurrent.title);
      const currentWindow = memoryStore.get('currentWindow');
      if(currentWindow !== activeWindowCurrent.id) {
        memoryStore.set('previousWindow', currentWindow);
      }
      
      memoryStore.set('currentWindow', activeWindowCurrent.id);
      console.log('Current window ID stored:', activeWindowCurrent.id);
      console.log('Previous window ID stored:', memoryStore.get('previousWindow'));
      return {
        
        title: activeWindowCurrent.owner.name,
        id: activeWindowCurrent.id,
        owner: activeWindowCurrent.owner
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
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

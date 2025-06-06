import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import log from 'electron-log';
let getActiveWindow: any;

function loadGetWindows() {
  if (app.isPackaged) {
    const alternativePaths = [
      "get-windows",
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'get-windows'),
      path.join(process.resourcesPath, 'get-windows'),
      path.join(process.resourcesPath, 'get-windows', "index.js"),
      path.join(process.resourcesPath, 'get-windows', "lib", "index.js"),
    ];

    for (const modulePath of alternativePaths) {
      try {
        log.info(`Attempting to load from: "${modulePath}"`);
        const module = eval('require')(modulePath);
        log.info(`Module loaded, exports:`, Object.keys(module));
        
        if (module.activeWindow && typeof module.activeWindow === 'function') {
          getActiveWindow = module.activeWindow;
          log.info(`get-windows loaded successfully from: ${modulePath}`);
          return true;
        }
      } catch (error) {
        log.error(`Failed to load get-windows from: "${modulePath}", error:`, error);
      }
    }
  } else {
    try {
      console.log(`Attempting to load from: "get-windows"`);
      const module = require("get-windows");
      console.log(`Module loaded, exports:`, Object.keys(module));
      
      if (module.activeWindow && typeof module.activeWindow === 'function') {
        getActiveWindow = module.activeWindow;
        console.log(`get-windows loaded successfully from: get-windows`);
        return true;
      } else {
        console.log(`activeWindow not found in expected format`);
        console.log(`Available properties:`, Object.keys(module));
      }
    } catch (error) {
      console.log(`Failed to load get-windows from: "get-windows", error:`, error);
    }
  }
  
  console.error('Failed to load get-windows from all possible paths');
  return false;
}

try {
  loadGetWindows();
} catch (error) {
  console.error('Critical error loading get-windows:', error);
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;
// let db: any;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  /*
  try {
    // ✅ Init DB first
    const dbPath = path.join(app.getPath('userData'), 'appdata.sqlite');
    console.log('DB Path:', dbPath);
    
    // Explicitly try to require better-sqlite3
    const BetterSqlite3 = require('better-sqlite3');
    db = new BetterSqlite3(dbPath);
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS active_windows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        unique_id INTEGER,
        timestamp INTEGER
      )
    `).run();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
  */
  /*
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
  */

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
      return {
        title: activeWindowCurrent.title,
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

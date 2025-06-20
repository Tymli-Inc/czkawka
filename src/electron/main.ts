import path from 'path';
import log from 'electron-log';
import App = Electron.App;
interface AppExtended extends App {
    isQuiting: boolean;
}
import { app as appBase, BrowserWindow, ipcMain, Tray, Menu, shell } from 'electron';
import { IncomingMessage } from 'http';
import { c } from 'vite/dist/node/types.d-aGj9QkWt';
const app = appBase as AppExtended;
app.isQuiting = false;

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
console.log(getTrayIconPath());
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
    const updateStmt = db.prepare(
        'UPDATE active_windows SET session_length = ? WHERE timestamp = ?'
    );
    const currentWindow = memoryStore.get('currentWindow');
    let updateOut = null;
    if (currentWindow) {
      updateOut = updateStmt.run(currentWindow.sessionDuration, currentWindow.startTime);
      console.log('Updated session length for window:', currentWindow.startTime);
    }
    console.log(updateOut)
    if (updateOut && updateOut.changes === 0) {
      console.log('No rows updated, inserting new window data');
      const stmt = db.prepare(
          'INSERT INTO active_windows (title, unique_id, timestamp) VALUES (?, ?, ?)'
      );
      const out = stmt.run(windowData.title, windowData.unique_id, currentWindow.startTime);
    }
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
      const currentWindow = memoryStore.get('currentWindow');
      if(currentWindow === undefined) {
        memoryStore.set('currentWindow', {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0
        });
      }
      if(currentWindow.id !== activeWindowCurrent.id) {
        memoryStore.set('previousWindow', currentWindow);
        memoryStore.set('currentWindow', {
          id: activeWindowCurrent.id,
          startTime: Date.now(),
          sessionDuration: 0
        });
      } else {
        memoryStore.set('currentWindow', {
          ...currentWindow,
            sessionDuration: currentWindow.sessionDuration + (Date.now() - currentWindow.startTime)
        });
      }
      

      console.log('Current window ID stored:', memoryStore.get('currentWindow'));
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
            
            // Use different URLs based on environment
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

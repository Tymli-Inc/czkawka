
import path from 'path';
import log from 'electron-log';
import { app } from 'electron';

let BetterSqlite3: any;
let db: any;

function loadBetterSqlite3(): boolean {
  const possiblePaths = [];
  
  if (app.isPackaged) {
    possiblePaths.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'better-sqlite3'),
      path.join(process.resourcesPath, 'app', 'node_modules', 'better-sqlite3'),
      path.join(__dirname, '..', '..', 'node_modules', 'better-sqlite3'),
      'better-sqlite3'
    );
  } else {
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

export function initializeDatabase(): boolean {
  try {
    if (!loadBetterSqlite3()) {
      throw new Error('better-sqlite3 module not available');
    }

    const dbPath = path.join(app.getPath('userData'), 'appdata.sqlite');
    console.log('DB Path:', dbPath);
    
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
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

export function getDatabase() {
  return db;
}

export function saveActiveWindowData(windowData: any, currentWindow: any): { success: boolean } {
  const updateStmt = db.prepare(
    'UPDATE active_windows SET session_length = ? WHERE timestamp = ?'
  );
  
  let updateOut = null;
  if (currentWindow) {
    updateOut = updateStmt.run(currentWindow.sessionDuration, currentWindow.startTime);
    console.log('Updated session length for window:', currentWindow.startTime);
  }
  
  console.log(updateOut);
  if (updateOut && updateOut.changes === 0) {
    console.log('No rows updated, inserting new window data');
    const stmt = db.prepare(
      'INSERT INTO active_windows (title, unique_id, timestamp) VALUES (?, ?, ?)'
    );
    const out = stmt.run(windowData.title, windowData.unique_id, currentWindow.startTime);
    console.log('Inserted new window data:', out);
  }
  
  return { success: true };
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
import path from 'path';
import log from 'electron-log';
import { app } from 'electron';
import { getUserToken } from './auth';
let BetterSqlite3: any;
const fs = require('fs');

export let db: any;

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
  log.info('Initializing database...');
  const { userData, isLoggedIn } = getUserToken();
  if (!isLoggedIn || !userData) {
    log.error('User is not logged in or user data is missing, skipping database initialization');
    return false;
  }
  log.info('User is logged in, proceeding with database initialization');

  try {
    if (!loadBetterSqlite3()) {
      throw new Error('better-sqlite3 module not available');
    }

    const userDataDir = path.join(app.getPath('userData'), `userdata-${userData.id}`);
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
      log.info(`Created user data directory: ${userDataDir}`);
    }

    const dbPath = path.join(app.getPath('userData'), `userdata-${userData.id}`, 'appdata.sqlite');
    log.info('DB Path:', dbPath);
    
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
    db.prepare(`
     CREATE TABLE IF NOT EXISTS tracking_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_start INTEGER DEFAULT 0, 
        session_end INTEGER DEFAULT 0
      )
    `).run();

    const lastActiveWindow = db.prepare('SELECT timestamp FROM active_windows ORDER BY timestamp DESC LIMIT 1').get();
    if (lastActiveWindow && lastActiveWindow.timestamp) {
      db.prepare('UPDATE tracking_times SET session_end = ? WHERE session_end = 0').run(lastActiveWindow.timestamp);
      log.info('Updated tracking_times with last active window timestamp:', lastActiveWindow.timestamp);
    } else {
      log.info('No active windows found, skipping update of tracking_times');
    }
    log.info('Database initialized successfully');
    return true;
  } catch (error) {
    log.error('Database initialization error:', error);
    return false;
  }
}

export function getDatabase() {
  return db;
}
import path from 'path';
import log from 'electron-log';
import { app } from 'electron';
import { getUserToken } from './auth';
let BetterSqlite3: any;
const fs = require('fs');

export let db: any;

// Log when database module is loaded
log.info('Database module loaded');

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
    
    db.prepare(`
      CREATE TABLE IF NOT EXISTS idle_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        duration INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Focus mode tables with proper migration logic
    try {
      // Check if focus_sessions table exists and has the required columns
      const focusSessionsTableInfo = db.prepare("PRAGMA table_info(focus_sessions)").all();
      const hasJobRoleColumn = focusSessionsTableInfo.some((col: any) => col.name === 'job_role');
      const hasTitleColumn = focusSessionsTableInfo.some((col: any) => col.name === 'title');
      
      if (focusSessionsTableInfo.length > 0 && (!hasJobRoleColumn || !hasTitleColumn)) {
        // Table exists but missing required columns, recreate it
        log.info('Focus mode tables exist but are missing required columns, recreating...');
        db.prepare('DROP TABLE IF EXISTS focus_sessions').run();
        db.prepare('DROP TABLE IF EXISTS focus_settings').run();
        db.prepare('DROP TABLE IF EXISTS focus_distractions').run();
      }

      // Create focus_sessions table
      db.prepare(`
        CREATE TABLE IF NOT EXISTS focus_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          duration INTEGER NOT NULL,
          job_role TEXT NOT NULL,
          title TEXT,
          is_active BOOLEAN DEFAULT 1,
          distraction_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Create focus_settings table
      db.prepare(`
        CREATE TABLE IF NOT EXISTS focus_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          duration INTEGER DEFAULT 45,
          is_enabled BOOLEAN DEFAULT 0,
          show_distraction_popup BOOLEAN DEFAULT 1,
          auto_break_reminder BOOLEAN DEFAULT 1,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Create focus_distractions table
      db.prepare(`
        CREATE TABLE IF NOT EXISTS focus_distractions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          app_name TEXT NOT NULL,
          category TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          duration INTEGER DEFAULT 0,
          FOREIGN KEY (session_id) REFERENCES focus_sessions (id)
        )
      `).run();

      log.info('Focus mode database tables created successfully');
    } catch (error) {
      log.error('Error creating focus mode tables:', error);
      
      // If there's still an error, force recreate all tables
      try {
        log.info('Force recreating focus mode tables...');
        db.prepare('DROP TABLE IF EXISTS focus_distractions').run();
        db.prepare('DROP TABLE IF EXISTS focus_sessions').run();
        db.prepare('DROP TABLE IF EXISTS focus_settings').run();
        
        // Recreate tables with correct schema
        db.prepare(`
          CREATE TABLE focus_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            duration INTEGER NOT NULL,
            job_role TEXT NOT NULL,
            title TEXT,
            is_active BOOLEAN DEFAULT 1,
            distraction_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        db.prepare(`
          CREATE TABLE focus_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            duration INTEGER DEFAULT 45,
            is_enabled BOOLEAN DEFAULT 0,
            show_distraction_popup BOOLEAN DEFAULT 1,
            auto_break_reminder BOOLEAN DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        db.prepare(`
          CREATE TABLE focus_distractions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            app_name TEXT NOT NULL,
            category TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            duration INTEGER DEFAULT 0,
            FOREIGN KEY (session_id) REFERENCES focus_sessions (id)
          )
        `).run();

        log.info('Focus mode tables force recreated successfully');
      } catch (recreateError) {
        log.error('Failed to recreate focus mode tables:', recreateError);
      }
    }
    
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
  log.info('getDatabase called');
  return db;
}
import { BrowserWindow, dialog, globalShortcut, ipcMain, shell, app } from 'electron';
import { db } from './database';
import CategoryManager from './categoryManager';
import { mainWindow } from './main';
import log from 'electron-log';
import { getUserInfoLocal } from './questionnaire';
import * as path from 'path';
import * as fs from 'fs';

// Helper function to get asset path for both dev and prod
function getAssetPath(filename: string): string {
  if (app.isPackaged) {
    // In production, assets are in resources/assets
    return path.join(process.resourcesPath, 'assets', filename);
  } else {
    // In development, assets are in the assets folder
    return path.join(__dirname, '..', '..', 'assets', filename);
  }
}

// Helper function to load HTML file and replace placeholders
function loadHtmlTemplate(filename: string, replacements: Record<string, string> = {}): string {
  try {
    const filePath = getAssetPath(filename);
    let html = fs.readFileSync(filePath, 'utf-8');
    
    // Replace placeholders
    Object.entries(replacements).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    
    return html;
  } catch (error) {
    log.error(`Failed to load HTML template ${filename}:`, error);
    // Fallback to minimal HTML
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Focus Mode</title></head>
      <body>
        <p>Failed to load template. Please check your installation.</p>
        <button onclick="window.close()">Close</button>
      </body>
      </html>
    `;
  }
}

// Job role configuration for non-focus categories
const JOB_ROLE_NON_FOCUS_CATEGORIES = {
  "Accountant": [
    "code", "design", "entertainment", "hiring", "marketing_messaging", 
    "product", "social_media", "workout", "video_conferencing", "writing",
    "customer_support", "utility", "shopping"
  ],
  "Analyst": [
    "code", "design", "entertainment", "hiring", "marketing_messaging", 
    "workout", "writing", "customer_support", "utility", "shopping",
    "social_media"
  ],
  "Artist": [
    "code", "finance", "hiring", "customer_support", "sales", 
    "admin", "workout", "video_conferencing", "utility", "shopping",
    "task_management", "social_media", "entertainment"
  ],
  "Business owner": [
    "code", "design", "entertainment", "workout", "writing", 
    "utility", "research", "customer_support", "shopping", "social_media"
  ],
  "Consultant": [
    "code", "design", "entertainment", "hiring", "workout", 
    "utility", "shopping", "customer_support", "social_media"
  ],
  "Content creator": [
    "code", "finance", "hiring", "admin", "customer_support", 
    "utility", "workout", "task_management", "shopping", "social_media", "entertainment"
  ],
  "Designer": [
    "code", "finance", "hiring", "customer_support", "sales", 
    "admin", "workout", "utility", "shopping", "video_conferencing", "social_media", "entertainment"
  ],
  "Doctor": [
    "code", "design", "entertainment", "marketing_messaging", 
    "social_media", "shopping", "workout", "utility", "hiring",
    "sales"
  ],
  "Engineer": [
    "design", "finance", "hiring", "marketing_messaging", 
    "customer_support", "sales", "workout", "writing", "shopping", "social_media", "entertainment"
  ],
  "Executive": [
    "code", "design", "entertainment", "utility", "workout", 
    "writing", "shopping", "customer_support", "social_media"
  ],
  "Founder": [
    "code", "design", "entertainment", "utility", "workout", 
    "writing", "shopping", "customer_support", "social_media"
  ],
  "Lawyer": [
    "code", "design", "entertainment", "marketing_messaging", 
    "social_media", "workout", "utility", "shopping", "customer_support",
    "hiring"
  ],
  "Manager": [
    "code", "design", "entertainment", "utility", "workout", 
    "writing", "shopping", "customer_support", "social_media"
  ],
  "Product manager": [
    "code", "design", "finance", "entertainment", "workout", 
    "utility", "writing", "shopping", "customer_support", "social_media"
  ],
  "Researcher": [
    "design", "finance", "hiring", "marketing_messaging", 
    "customer_support", "sales", "workout", "utility", "shopping",
    "social_media", "entertainment"
  ],
  "Sales": [
    "code", "design", "entertainment", "admin", "utility", 
    "workout", "writing", "research", "shopping", "social_media"
  ],
  "Software developer": [
    "design", "finance", "hiring", "marketing_messaging", 
    "customer_support", "sales", "workout", "writing", "shopping",
    "social_media", "entertainment"
  ],
  "Student": [
    "hiring", "customer_support", "sales", "marketing_messaging", 
    "admin", "utility", "workout", "finance", "shopping", "social_media", "entertainment"
  ],
  "Teacher": [
    "code", "design", "finance", "hiring", "customer_support", 
    "sales", "marketing_messaging", "utility", "workout", "shopping", "social_media", "entertainment"
  ],
  "Trader": [
    "code", "design", "entertainment", "hiring", "customer_support", 
    "marketing_messaging", "workout", "utility", "writing", "shopping", "social_media"
  ],
  "Video editor": [
    "code", "finance", "hiring", "customer_support", "sales", 
    "admin", "workout", "utility", "shopping", "task_management", "social_media", "entertainment"
  ],
  "Writer": [
    "code", "design", "finance", "hiring", "customer_support", 
    "admin", "workout", "utility", "shopping", "video_conferencing", "social_media", "entertainment"
  ]
};

interface FocusSession {
  id?: number;
  startTime: number;
  endTime: number;
  duration: number;
  jobRole: string;
  isActive: boolean;
  distractionCount: number;
  createdAt: string;
  title?: string;
}

interface FocusSettings {
  duration: number;
  isEnabled: boolean;
  showDistractionPopup: boolean;
  autoBreakReminder: boolean;
}

class FocusModeManager {
  private focusSession: FocusSession | null = null;
  private focusTimer: NodeJS.Timeout | null = null;
  private settings: FocusSettings = {
    duration: 45,
    isEnabled: false,
    showDistractionPopup: true,
    autoBreakReminder: true
  };
  private distractionPopup: BrowserWindow | null = null;
  private durationPopup: BrowserWindow | null = null;
  private isWindowTrackingActive = false;
  private windowTrackingInterval: NodeJS.Timeout | null = null;
  private activeShortcut: string | null = null;
  
  // Add these new properties for distraction cooldown
  private lastDistractionTime: number | null = null;
  private lastDistractionApp: string | null = null;
  private lastCheckedApp: string | null = null; // Track the last app we checked to prevent spam
  private sessionDistractionAlerts: Set<string> = new Set(); // Track apps we've already alerted about in this session

  constructor() {
  }

  private getUserJobRole(): string {
    try {
      const userInfo = getUserInfoLocal();
      log.info('Focus mode: Getting user job role from questionnaire:', userInfo);
      if (userInfo && userInfo.job_role) {
        log.info('Focus mode: Job role found:', userInfo.job_role);
        return userInfo.job_role;
      }
    } catch (error) {
      log.error('Failed to get user job role from questionnaire:', error);
    }
    // Default fallback
    log.info('Focus mode: Using default job role: Software developer');
    return 'Software developer';
  }

  private initializeFocusDatabase(): void {
    if (!db) {
      log.error('Database not initialized, skipping focus mode database setup');
      return;
    }

    try {
      // Focus mode tables are now created in database.ts during main initialization
      log.info('Focus mode database tables should be initialized by main database setup');
    } catch (error) {
      log.error('Failed to initialize focus mode database:', error);
    }
  }

  private loadSettings(): void {
    if (!db) return;

    try {
      const settingsRow = db.prepare('SELECT * FROM focus_settings ORDER BY id DESC LIMIT 1').get();
      if (settingsRow) {
        this.settings = {
          duration: settingsRow.duration,
          isEnabled: Boolean(settingsRow.is_enabled),
          showDistractionPopup: Boolean(settingsRow.show_distraction_popup),
          autoBreakReminder: Boolean(settingsRow.auto_break_reminder)
        };
      }
    } catch (error) {
      log.error('Failed to load focus settings:', error);
    }
  }

  private saveSettings(): void {
    if (!db) return;

    try {
      db.prepare(`
        INSERT OR REPLACE INTO focus_settings 
        (id, duration, is_enabled, show_distraction_popup, auto_break_reminder, updated_at)
        VALUES (1, ?, ?, ?, ?, datetime('now'))
      `).run(
        this.settings.duration,
        this.settings.isEnabled ? 1 : 0,
        this.settings.showDistractionPopup ? 1 : 0,
        this.settings.autoBreakReminder ? 1 : 0
      );
    } catch (error) {
      log.error('Failed to save focus settings:', error);
    }
  }

  public initialize(): void {
    this.initializeFocusDatabase();
    this.loadSettings();
    this.setupGlobalShortcuts();
    
    // Log settings to verify they're loaded correctly
    log.info('Focus mode initialized with settings:', this.settings);
    log.info('Focus mode initialized with job role:', this.getUserJobRole());
    log.info('Focus mode manager initialized');
  }

  private setupGlobalShortcuts(): void {
    // Register Ctrl+Shift+F shortcut for focus mode (avoiding conflicts with browser's Ctrl+F)
    try {
      const shortcut = 'CommandOrControl+Shift+F';
      const registered = globalShortcut.register(shortcut, () => {
        log.info('Focus mode: Ctrl+Shift+F shortcut pressed, isEnabled:', this.settings.isEnabled);
        // Use setImmediate to avoid blocking the main thread
        setImmediate(() => {
          this.toggleFocusMode();
        });
      });
      
      if (registered) {
        this.activeShortcut = 'Ctrl+Shift+F';
        log.info('Focus mode global shortcuts registered successfully');
      } else {
        log.warn('Failed to register global shortcut - may already be in use');
        // Try alternative shortcut
        const altShortcut = 'CommandOrControl+Alt+F';
        const altRegistered = globalShortcut.register(altShortcut, () => {
          log.info('Focus mode: Ctrl+Alt+F shortcut pressed (fallback)');
          // Use setImmediate to avoid blocking the main thread
          setImmediate(() => {
            this.toggleFocusMode();
          });
        });
        
        if (altRegistered) {
          this.activeShortcut = 'Ctrl+Alt+F';
          log.info('Focus mode alternative shortcut registered: Ctrl+Alt+F');
        } else {
          this.activeShortcut = null;
          log.error('Failed to register any focus mode shortcuts');
        }
      }
    } catch (error) {
      this.activeShortcut = null;
      log.error('Failed to register global shortcuts:', error);
    }
  }

  public getActiveShortcut(): string | null {
    return this.activeShortcut;
  }

  public async startFocusMode(): Promise<{ success: boolean; message: string }> {
    log.info('🚀 STARTING FOCUS MODE');
    
    if (this.focusSession && this.focusSession.isActive) {
      log.warn('⚠️ Focus mode already active, cancelling start');
      return { success: false, message: 'Focus mode is already active' };
    }

    try {
      // Log current configuration
      const currentJobRole = this.getUserJobRole();
      log.info(`👤 Current job role: ${currentJobRole}`);
      log.info(`⚙️ Distraction popup enabled: ${this.settings.showDistractionPopup}`);
      log.info(`� Auto break reminder: ${this.settings.autoBreakReminder}`);
      
      // Show duration selection popup
      const result = await this.showDurationSelectionPopup();
      if (!result) {
        log.info('❌ Focus mode cancelled by user');
        return { success: false, message: 'Focus mode cancelled' };
      }

      const selectedDuration = Number(result.duration);
      const sessionTitle = result.title;
      const startTime = Date.now();
      
      log.info(`📅 Starting focus session: "${sessionTitle}" for ${selectedDuration} minutes`);
      log.info(`🕐 Start time: ${new Date(startTime).toLocaleString()}`);
      
      // Continue with the rest of the method...
      const durationMs = selectedDuration * 60 * 1000;
      const sessionJobRole = this.getUserJobRole();
      
      const sessionId = db.prepare(`
        INSERT INTO focus_sessions (start_time, duration, job_role, title, is_active, distraction_count)
        VALUES (?, ?, ?, ?, 1, 0)
      `).run(startTime, durationMs, sessionJobRole, sessionTitle).lastInsertRowid;

      this.focusSession = {
        id: sessionId as number,
        startTime,
        endTime: startTime + durationMs,
        duration: durationMs,
        jobRole: sessionJobRole,
        isActive: true,
        distractionCount: 0,
        createdAt: new Date().toISOString(),
        title: sessionTitle
      };

      // Clear session-specific tracking for new session
      this.sessionDistractionAlerts.clear();
      this.lastCheckedApp = null;
      this.lastDistractionTime = null;
      this.lastDistractionApp = null;
      log.info('🔄 Cleared session tracking for new focus session');

      // Start focus timer
      this.focusTimer = setTimeout(() => {
        this.endFocusSession();
        this.showBreakReminder();
      }, durationMs);

      // Start window tracking for distractions
      this.startWindowTracking();

      // Notify UI
      if (mainWindow) {
        mainWindow.webContents.send('focus-mode-started', {
          session: this.focusSession,
          settings: this.settings
        });
      }

      log.info('Focus mode started:', this.focusSession);
      return { success: true, message: `Focus mode started for ${selectedDuration} minutes${sessionTitle ? ` - ${sessionTitle}` : ''}` };
    } catch (error) {
      log.error('Error starting focus mode:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async startFocusModeWithDuration(duration: number, title: string): Promise<{ success: boolean; message: string }> {
    try {
      log.info('Starting focus mode with duration:', duration, 'minutes, title:', title);
      
      // Check if already active
      if (this.focusSession && this.focusSession.isActive) {
        return { success: false, message: 'Focus mode is already active' };
      }

      // Start the focus session
      const durationMs = duration * 60 * 1000;
      const startTime = Date.now();
      const jobRole = this.getUserJobRole();
      
      const sessionId = db.prepare(`
        INSERT INTO focus_sessions (start_time, duration, job_role, title, is_active, distraction_count)
        VALUES (?, ?, ?, ?, 1, 0)
      `).run(startTime, durationMs, jobRole, title).lastInsertRowid;

      this.focusSession = {
        id: sessionId as number,
        startTime,
        endTime: startTime + durationMs,
        duration: durationMs,
        jobRole: jobRole,
        isActive: true,
        distractionCount: 0,
        createdAt: new Date().toISOString(),
        title: title || `${jobRole} Focus Session`
      };

      // Clear session-specific tracking for new session
      this.sessionDistractionAlerts.clear();
      this.lastCheckedApp = null;
      this.lastDistractionTime = null;
      this.lastDistractionApp = null;
      log.info('🔄 Cleared session tracking for new focus session');

      // Start focus timer
      this.focusTimer = setTimeout(() => {
        this.endFocusSession();
        this.showBreakReminder();
      }, durationMs);

      // Start window tracking for distractions
      this.startWindowTracking();

      // Notify UI
      if (mainWindow) {
        mainWindow.webContents.send('focus-mode-started', {
          session: this.focusSession,
          settings: this.settings
        });
      }

      log.info('Focus mode started successfully');
      return { success: true, message: `Focus mode started for ${duration} minutes${title ? ` - ${title}` : ''}` };
    } catch (error) {
      log.error('Failed to start focus mode:', error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  public async endFocusMode(): Promise<{ success: boolean; message: string }> {
    if (!this.focusSession || !this.focusSession.isActive) {
      return { success: false, message: 'No active focus session' };
    }

    try {
      this.endFocusSession();
      return { success: true, message: 'Focus mode ended successfully' };
    } catch (error) {
      log.error('Failed to end focus mode:', error);
      return { success: false, message: 'Failed to end focus mode' };
    }
  }

  private endFocusSession(): void {
    if (!this.focusSession) return;

    const endTime = Date.now();
    const actualDuration = endTime - this.focusSession.startTime;

    log.info('Ending focus session:', this.focusSession.id);

    // Close any open distraction popup
    if (this.distractionPopup && !this.distractionPopup.isDestroyed()) {
      log.info('🗑️ Closing distraction popup due to focus session end');
      this.distractionPopup.close();
      this.distractionPopup = null;
    }

    // Update database
    if (db) {
      db.prepare(`
        UPDATE focus_sessions 
        SET end_time = ?, is_active = 0, duration = ?
        WHERE id = ?
      `).run(endTime, actualDuration, this.focusSession.id);
    }

    // Clear timer
    if (this.focusTimer) {
      clearTimeout(this.focusTimer);
      this.focusTimer = null;
    }

    // Stop window tracking
    this.stopWindowTracking();

    // Store session info before clearing
    const sessionInfo = {
      ...this.focusSession,
      endTime,
      isActive: false,
      actualDuration
    };

    // Clear session
    this.focusSession = null;

    // Notify UI with a small delay to ensure state is updated
    if (mainWindow) {
      mainWindow.webContents.send('focus-mode-ended', {
        session: sessionInfo,
        actualDuration
      });
      
      // Send additional notification to ensure sync
      setTimeout(() => {
        mainWindow.webContents.send('focus-mode-ended', {
          session: sessionInfo,
          actualDuration
        });
      }, 100);
    }

    log.info('Focus session ended successfully:', sessionInfo.id);
  }

  private async startWindowTracking(): Promise<void> {
    if (this.isWindowTrackingActive) return;

    this.isWindowTrackingActive = true;
    
    // Import window tracking functions
    const { getCurrentActiveWindow } = await import('./windowTracking');
    
    // Check more frequently for better distraction detection
    this.windowTrackingInterval = setInterval(async () => {
      if (!this.focusSession || !this.focusSession.isActive) {
        this.stopWindowTracking();
        return;
      }

      try {
        const activeWindow = await getCurrentActiveWindow();
        if (activeWindow && activeWindow.title) {
          log.info('Focus mode: Checking active window:', {
            title: activeWindow.title,
            id: activeWindow.id || 'unknown'
          });
          
          // Check window title for distraction
          await this.checkForDistraction(activeWindow.title);
        } else {
          log.warn('No active window detected or window has no title');
        }
      } catch (error) {
        log.error('Error checking for distraction:', error);
      }
    }, 3000); // Check every 3 seconds instead of 5 for better responsiveness

    log.info('Focus mode window tracking started with 3-second intervals');
  }

  private stopWindowTracking(): void {
    if (this.windowTrackingInterval) {
      clearInterval(this.windowTrackingInterval);
      this.windowTrackingInterval = null;
    }
    this.isWindowTrackingActive = false;
    
    // Clear tracking state when stopping
    this.lastCheckedApp = null;
    
    log.info('Focus mode window tracking stopped');
  }

  private async checkForDistraction(appName: string): Promise<void> {
    if (!this.focusSession || !this.focusSession.isActive) return;

    // Skip if it's the same app we just checked (prevents spam)
    if (this.lastCheckedApp === appName) {
      log.info(`⏭️ Same app as last check (${appName}), skipping to prevent spam`);
      return;
    }
    
    // Update last checked app
    this.lastCheckedApp = appName;

    try {
      const categoryManager = CategoryManager.getInstance();
      // Get the original JSON category instead of the mapped one
      const originalCategory = categoryManager.getOriginalJsonCategory(appName);
      const jobRole = this.getUserJobRole();
      const nonFocusCategories = JOB_ROLE_NON_FOCUS_CATEGORIES[jobRole as keyof typeof JOB_ROLE_NON_FOCUS_CATEGORIES] || [];

      // Enhanced logging to debug the issue
      log.info('=== DISTRACTION CHECK DEBUG ===');
      log.info('App Name:', appName);
      log.info('Previous App:', this.lastCheckedApp);
      log.info('Original JSON Category:', originalCategory);
      log.info('Job Role:', jobRole);
      log.info('Non-focus categories for this role:', nonFocusCategories);
      log.info('Is category in non-focus list?', nonFocusCategories.includes(originalCategory));
      log.info('Should trigger distraction?', nonFocusCategories.includes(originalCategory));
      log.info('Focus session active?', this.focusSession?.isActive);
      log.info('Show distraction popup enabled?', this.settings.showDistractionPopup);
      log.info('=== END DEBUG ===');

      if (nonFocusCategories.includes(originalCategory)) {
        log.info(`🚨 DISTRACTION DETECTED: ${appName} categorized as ${originalCategory} - calling handleDistraction`);
        await this.handleDistraction(appName, originalCategory);
      } else {
        log.info(`✅ App ${appName} (${originalCategory}) is allowed for focus work for ${jobRole}`);
      }
    } catch (error) {
      log.error('Error checking for distraction:', error);
      log.error('Error stack:', error.stack);
    }
  }

  private async handleDistraction(appName: string, category: string): Promise<void> {
    if (!this.focusSession) {
      log.error('handleDistraction called but no focus session exists');
      return;
    }

    // Check if we've already shown an alert for this app in this session
    const alertKey = `${appName}:${category}`;
    if (this.sessionDistractionAlerts.has(alertKey)) {
      log.info(`⏭️ Already alerted about ${appName} in this session, skipping`);
      return;
    }

    // Add to session alerts
    this.sessionDistractionAlerts.add(alertKey);

    // Add time-based cooldown as backup (increased to 30 seconds)
    const now = Date.now();
    if (this.lastDistractionTime && 
        this.lastDistractionApp === appName && 
        now - this.lastDistractionTime < 30000) { // 30 seconds instead of 5
      log.info(`⏱️ Distraction cooldown active for ${appName}, skipping (${now - this.lastDistractionTime}ms ago)`);
      return;
    }
    
    this.lastDistractionTime = now;
    this.lastDistractionApp = appName;

    log.info(`🎯 HANDLING DISTRACTION: ${appName} (${category})`);

    // Record distraction in database
    if (db) {
      try {
        db.prepare(`
          INSERT INTO focus_distractions (session_id, app_name, category, timestamp)
          VALUES (?, ?, ?, ?)
        `).run(this.focusSession.id, appName, category, Date.now());

        // Update distraction count
        db.prepare(`
          UPDATE focus_sessions 
          SET distraction_count = distraction_count + 1
          WHERE id = ?
        `).run(this.focusSession.id);
        
        log.info('✅ Distraction recorded in database');
      } catch (error) {
        log.error('❌ Failed to record distraction in database:', error);
      }
    }

    this.focusSession.distractionCount++;
    log.info(`📊 Updated distraction count to: ${this.focusSession.distractionCount}`);

    // Show distraction popup if enabled
    if (this.settings.showDistractionPopup) {
      log.info('🔔 Showing distraction popup...');
      this.showDistractionPopup(appName, category);
    } else {
      log.info('🔕 Distraction popup disabled in settings');
    }

    // Notify UI
    if (mainWindow) {
      mainWindow.webContents.send('focus-distraction-detected', {
        appName,
        category,
        distractionCount: this.focusSession.distractionCount
      });
      log.info('📡 Sent distraction notification to UI');
    }

    log.info(`✅ Distraction handling complete for: ${appName} (${category})`);
  }

  private showDistractionPopup(appName: string, category: string): void {
    log.info(`🔔 SHOWING DISTRACTION POPUP: ${appName} (${category})`);
    
    // Close existing popup if it exists to prevent multiple popups
    if (this.distractionPopup && !this.distractionPopup.isDestroyed()) {
      log.info('� Closing existing distraction popup');
      this.distractionPopup.close();
      this.distractionPopup = null;
    }

    log.info('🆕 Creating new distraction popup window');
    this.distractionPopup = new BrowserWindow({
      width: 400,
      height: 300,
      modal: true,
      parent: mainWindow || undefined,
      show: false,
      frame: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: require('path').join(__dirname, 'preload.js')
      }
    });

    // Center the popup on screen
    this.distractionPopup.center();

    log.info('📝 Loading popup HTML from template');
    // Load HTML content from template file
    const htmlContent = loadHtmlTemplate('focus-distraction-popup.html', {
      'APP_NAME': appName,
      'CATEGORY': category
    });

    this.distractionPopup.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    log.info('📺 Loading popup HTML content');
    this.distractionPopup.show();
    log.info('✅ Distraction popup displayed successfully');

    // Auto-close after 10 seconds to prevent it from staying forever
    setTimeout(() => {
      if (this.distractionPopup && !this.distractionPopup.isDestroyed()) {
        log.info('⏰ Auto-closing distraction popup after 10 seconds');
        this.distractionPopup.close();
        this.distractionPopup = null;
      }
    }, 10000);
  }

  private showBreakReminder(): void {
    if (!this.settings.autoBreakReminder) return;

    const breakWindow = new BrowserWindow({
      width: 500,
      height: 350,
      modal: true,
      parent: mainWindow || undefined,
      show: false,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: require('path').join(__dirname, 'preload.js')
      }
    });

    const htmlContent = loadHtmlTemplate('focus-break-reminder.html', {
      'DURATION': Math.floor((this.focusSession?.duration || 0) / 60000).toString(),
      'DISTRACTION_COUNT': (this.focusSession?.distractionCount || 0).toString()
    });

    breakWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    breakWindow.show();
  }

  private showDurationSelectionPopup(): Promise<{duration: number, title: string} | null> {
    return new Promise((resolve) => {
      // Prevent multiple popups
      if (this.durationPopup && !this.durationPopup.isDestroyed()) {
        this.durationPopup.focus();
        return;
      }

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (this.durationPopup && !this.durationPopup.isDestroyed()) {
          this.durationPopup.close();
        }
        resolve(null);
      }, 30000); // 30 second timeout

      this.durationPopup = new BrowserWindow({
        width: 450,
        height: 600,
        modal: false, // Changed from true to false to prevent blocking
        parent: mainWindow || undefined,
        show: false,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: require('path').join(__dirname, 'preload.js')
        }
      });

      const htmlContent = loadHtmlTemplate('focus-duration-selection.html');

      this.durationPopup.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      // Show the popup only after it's ready to avoid blocking
      this.durationPopup.once('ready-to-show', () => {
        if (this.durationPopup && !this.durationPopup.isDestroyed()) {
          this.durationPopup.show();
          this.durationPopup.focus();
        }
      });

      // Handle window events
      this.durationPopup.on('closed', () => {
        clearTimeout(timeout);
        this.durationPopup = null;
        resolve(null);
      });

      // Add IPC handlers for this specific window
      const { ipcMain } = require('electron');
      
      const startHandler = (event: any, duration: number, title: string) => {
        if (event.sender === this.durationPopup?.webContents) {
          clearTimeout(timeout);
          resolve({ duration, title });
          this.durationPopup?.close();
        }
      };
      
      const cancelHandler = (event: any) => {
        if (event.sender === this.durationPopup?.webContents) {
          clearTimeout(timeout);
          resolve(null);
          this.durationPopup?.close();
        }
      };

      ipcMain.once('start-focus-mode-with-duration', startHandler);
      ipcMain.once('cancel-focus-mode', cancelHandler);
    });
  }

  public toggleFocusMode(): void {
    try {
      // Ensure main window is focused and visible before showing popups
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
      }
      
      if (this.focusSession && this.focusSession.isActive) {
        this.endFocusMode();
      } else {
        this.startFocusMode();
      }
    } catch (error) {
      log.error('Error toggling focus mode:', error);
    }
  }

  public updateSettings(newSettings: Partial<FocusSettings>): { success: boolean; message: string } {
    try {
      this.settings = { ...this.settings, ...newSettings };
      this.saveSettings();
      
      // Notify UI
      if (mainWindow) {
        mainWindow.webContents.send('focus-settings-updated', this.settings);
      }
      
      return { success: true, message: 'Settings updated successfully' };
    } catch (error) {
      log.error('Failed to update focus settings:', error);
      return { success: false, message: 'Failed to update settings' };
    }
  }

  public getSettings(): FocusSettings & { jobRole: string } {
    return { 
      ...this.settings,
      jobRole: this.getUserJobRole()
    };
  }

  public getCurrentSession(): FocusSession | null {
    const session = this.focusSession ? { ...this.focusSession } : null;
    log.info('getCurrentSession called, returning:', session);
    return session;
  }

  public getFocusHistory(days: number = 7): FocusSession[] {
    if (!db) return [];

    try {
      const since = Date.now() - (days * 24 * 60 * 60 * 1000);
      const sessions = db.prepare(`
        SELECT * FROM focus_sessions 
        WHERE start_time > ? 
        ORDER BY start_time DESC
      `).all(since);

      return sessions.map((session: any) => ({
        id: session.id,
        startTime: session.start_time,
        endTime: session.end_time,
        duration: session.duration,
        jobRole: session.job_role,
        isActive: Boolean(session.is_active),
        distractionCount: session.distraction_count,
        createdAt: session.created_at
      }));
    } catch (error) {
      log.error('Failed to get focus history:', error);
      return [];
    }
  }

  public getJobRoles(): string[] {
    return Object.keys(JOB_ROLE_NON_FOCUS_CATEGORIES);
  }

  public async createTestSession(testSession: { startTime: number; endTime: number; duration: number; jobRole: string; title: string }): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    try {
      const stmt = db.prepare(`
        INSERT INTO focus_sessions (start_time, end_time, duration, job_role, title, is_active, distraction_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        testSession.startTime,
        testSession.endTime,
        testSession.duration,
        testSession.jobRole,
        testSession.title,
        false, // is_active
        0  // distraction_count
      );
      
      log.info('Test focus session created successfully');
    } catch (error) {
      log.error('Failed to create test focus session:', error);
      throw error;
    }
  }

  // Add method to manually test distraction detection
  public async testDistractionDetection(appName: string): Promise<void> {
    log.info('Testing distraction detection for:', appName);
    await this.checkForDistraction(appName);
  }

  public cleanup(): void {
    try {
      // Unregister all global shortcuts
      globalShortcut.unregisterAll();
      log.info('Focus mode global shortcuts unregistered');
    } catch (error) {
      log.error('Failed to unregister global shortcuts:', error);
    }
  }
}

// Create singleton instance
const focusModeManager = new FocusModeManager();

export default focusModeManager;

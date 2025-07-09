import { db } from './database';
import { defaultCategories, AppCategories, UserCategorySettings, AppCategory, defaultCategoryDefinitions } from './app-categories';
import { getUserToken } from './auth';
import log from 'electron-log';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

/**
 * Category Manager - Handles user-customizable app categories with dynamic detection
 */
export class CategoryManager {
  private static instance: CategoryManager;
  private userSettings: UserCategorySettings;
  private settingsFilePath: string;
  private detectedAppsCache: string[] = [];
  private lastDetectedAppsUpdate: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  private constructor() {
    log.info('CategoryManager: Initializing category manager');
    this.userSettings = {
      customCategories: {},
      appCategoryOverrides: {}
    };
    this.settingsFilePath = this.getSettingsFilePath();
    this.loadUserSettings();
    
    // Attempt SQLite migration if needed (async, non-blocking)
    this.migrateFromSQLite().catch(error => {
      log.error('CategoryManager: Migration failed:', error);
    });
  }

  public static getInstance(): CategoryManager {
    if (!CategoryManager.instance) {
      CategoryManager.instance = new CategoryManager();
    }
    return CategoryManager.instance;
  }

  /**
   * Get the path to the user's category settings file
   */
  private getSettingsFilePath(): string {
    try {
      const { userData, isLoggedIn } = getUserToken();
      if (!isLoggedIn || !userData) {
        log.error('CategoryManager: User is not logged in, using default settings path');
        return path.join(app.getPath('userData'), 'category-settings.json');
      }

      const userDataDir = path.join(app.getPath('userData'), `userdata-${userData.id}`);
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
        log.info(`CategoryManager: Created user data directory: ${userDataDir}`);
      }

      const settingsPath = path.join(userDataDir, 'category-settings.json');
      log.info('CategoryManager: Settings file path:', settingsPath);
      return settingsPath;
    } catch (error) {
      log.error('CategoryManager: Failed to get settings file path:', error);
      return path.join(app.getPath('userData'), 'category-settings.json');
    }
  }

  /**
   * Load user settings from JSON file
   */
  private loadUserSettings(): void {
    try {
      log.info('CategoryManager: Loading user settings from JSON file');
      
      if (!fs.existsSync(this.settingsFilePath)) {
        log.info('CategoryManager: Settings file does not exist, using default settings');
        this.userSettings = {
          customCategories: {},
          appCategoryOverrides: {}
        };
        return;
      }

      const fileContent = fs.readFileSync(this.settingsFilePath, 'utf8');
      const parsedSettings = JSON.parse(fileContent);
      
      // Validate and sanitize the loaded settings
      this.userSettings = {
        customCategories: parsedSettings.customCategories || {},
        appCategoryOverrides: parsedSettings.appCategoryOverrides || {}
      };

      // Ensure custom categories have the correct structure
      Object.keys(this.userSettings.customCategories).forEach(categoryId => {
        const category = this.userSettings.customCategories[categoryId];
        if (!category.apps) {
          category.apps = [];
        }
        if (!category.isCustom) {
          category.isCustom = true;
        }
      });

      log.info('CategoryManager: User settings loaded successfully from JSON', {
        customCategories: Object.keys(this.userSettings.customCategories).length,
        appOverrides: Object.keys(this.userSettings.appCategoryOverrides).length
      });
    } catch (error) {
      log.error('CategoryManager: Failed to load user settings from JSON:', error);
      this.userSettings = {
        customCategories: {},
        appCategoryOverrides: {}
      };
    }
  }

  /**
   * Save user settings to JSON file
   */
  private saveUserSettings(): boolean {
    try {
      log.info('CategoryManager: Saving user settings to JSON file');
      
      const settingsToSave = {
        customCategories: this.userSettings.customCategories,
        appCategoryOverrides: this.userSettings.appCategoryOverrides,
        lastModified: new Date().toISOString()
      };

      const jsonString = JSON.stringify(settingsToSave, null, 2);
      fs.writeFileSync(this.settingsFilePath, jsonString, 'utf8');
      
      log.info('CategoryManager: User settings saved successfully to JSON');
      return true;
    } catch (error) {
      log.error('CategoryManager: Failed to save user settings to JSON:', error);
      return false;
    }
  }

  /**
   * Get all detected apps from the database (with caching)
   */
  public getDetectedApps(): string[] {
    try {
      const now = Date.now();
      
      // Use cache if it's still valid
      if (this.detectedAppsCache.length > 0 && (now - this.lastDetectedAppsUpdate) < this.CACHE_TTL) {
        return this.detectedAppsCache;
      }

      if (!db) {
        log.error('CategoryManager: Database not available');
        return [];
      }

      const stmt = db.prepare('SELECT DISTINCT title FROM active_windows WHERE title IS NOT NULL AND title != \'\' ORDER BY title ASC');
      const rows = stmt.all();
      const detectedApps = rows.map((row: any) => row.title);
      
      // Update cache
      this.detectedAppsCache = detectedApps;
      this.lastDetectedAppsUpdate = now;
      
      log.info('CategoryManager: Retrieved detected apps', { count: detectedApps.length });
      return detectedApps;
    } catch (error) {
      log.error('CategoryManager: Failed to get detected apps:', error);
      return [];
    }
  }

  /**
   * Smart categorization based on app name and keywords
   */
  private categorizeSingleApp(appName: string): string {
    const normalizedAppName = appName.toLowerCase();
    
    // Check user overrides first
    if (this.userSettings.appCategoryOverrides[appName]) {
      return this.userSettings.appCategoryOverrides[appName];
    }
    
    // Special handling for browser windows with content URLs
    // If it's a browser window (contains browser keywords) but also contains content-specific keywords,
    // prioritize the content category
    const browserKeywords = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'vivaldi'];
    const isBrowserWindow = browserKeywords.some(keyword => normalizedAppName.includes(keyword));
    
    if (isBrowserWindow) {
      // Check for content-specific keywords in priority order
      const contentCategories = ['social', 'entertainment', 'learning', 'development', 'work'];
      
      for (const categoryId of contentCategories) {
        if (defaultCategoryDefinitions[categoryId]) {
          for (const keyword of defaultCategoryDefinitions[categoryId].keywords) {
            if (normalizedAppName.includes(keyword.toLowerCase()) || 
                keyword.toLowerCase().includes(normalizedAppName)) {
              return categoryId;
            }
          }
        }
      }
    }
    
    // Check against category keywords in default order
    for (const [categoryId, categoryDef] of Object.entries(defaultCategoryDefinitions)) {
      for (const keyword of categoryDef.keywords) {
        if (normalizedAppName.includes(keyword.toLowerCase()) || 
            keyword.toLowerCase().includes(normalizedAppName)) {
          return categoryId;
        }
      }
    }
    
    // Check custom categories
    for (const [categoryId, categoryData] of Object.entries(this.userSettings.customCategories)) {
      if (categoryData.apps.includes(appName)) {
        return categoryId;
      }
    }
    
    return 'miscellaneous';
  }

  /**
   * Get final categories with user customizations applied and dynamic app detection
   */
  public getFinalCategories(): AppCategories {
    try {
      log.info('CategoryManager: Building final categories with dynamic detection');
      
      const detectedApps = this.getDetectedApps();
      const finalCategories: AppCategories = {
        detectedApps,
        categories: {}
      };

      // Initialize all default categories (empty initially)
      Object.keys(defaultCategories.categories).forEach(categoryId => {
        finalCategories.categories[categoryId] = {
          description: defaultCategories.categories[categoryId].description,
          color: defaultCategories.categories[categoryId].color,
          apps: []
        };
      });

      // Add custom categories
      Object.keys(this.userSettings.customCategories).forEach(categoryId => {
        finalCategories.categories[categoryId] = { 
          ...this.userSettings.customCategories[categoryId],
          apps: [] // Will be populated below
        };
      });

      // Categorize all detected apps
      detectedApps.forEach(appName => {
        const categoryId = this.categorizeSingleApp(appName);
        
        // Ensure the category exists
        if (!finalCategories.categories[categoryId]) {
          finalCategories.categories[categoryId] = {
            description: 'Custom category',
            color: '#808080',
            apps: [],
            isCustom: true
          };
        }
        
        // Add app to category
        if (!finalCategories.categories[categoryId].apps.includes(appName)) {
          finalCategories.categories[categoryId].apps.push(appName);
        }
      });

      // Remove empty categories (except miscellaneous)
      Object.keys(finalCategories.categories).forEach(categoryId => {
        if (categoryId !== 'miscellaneous' && finalCategories.categories[categoryId].apps.length === 0) {
          delete finalCategories.categories[categoryId];
        }
      });

      // Sort apps within each category
      Object.keys(finalCategories.categories).forEach(categoryId => {
        finalCategories.categories[categoryId].apps.sort();
      });

      log.info('CategoryManager: Final categories built successfully', {
        totalCategories: Object.keys(finalCategories.categories).length,
        detectedApps: detectedApps.length,
        categorizedApps: detectedApps.length
      });

      return finalCategories;
    } catch (error) {
      log.error('CategoryManager: Failed to build final categories:', error);
      return {
        detectedApps: this.getDetectedApps(),
        categories: { ...defaultCategories.categories }
      };
    }
  }

  /**
   * Generate a unique category ID from the category name
   */
  private generateCategoryId(name: string): string {
    // Convert name to lowercase, replace spaces and special chars with hyphens
    let baseId = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Ensure it's not empty
    if (!baseId) {
      baseId = 'custom-category';
    }

    // Check if this ID already exists, if so, add a number suffix
    let finalId = baseId;
    let counter = 1;
    
    while (defaultCategories.categories[finalId] || this.userSettings.customCategories[finalId]) {
      finalId = `${baseId}-${counter}`;
      counter++;
    }

    return finalId;
  }

  /**
   * Create a new custom category (auto-generates ID from name)
   */
  public createCustomCategory(name: string, description: string, color: string): { success: boolean; id?: string; error?: string } {
    try {
      log.info('CategoryManager: Creating custom category', { name, description, color });
      
      // Generate unique ID from name
      const id = this.generateCategoryId(name);
      
      // Double-check that ID doesn't exist (should not happen with our generation logic)
      if (defaultCategories.categories[id] || this.userSettings.customCategories[id]) {
        log.error('CategoryManager: Generated ID already exists (unexpected)', { id });
        return { success: false, error: 'Generated category ID already exists' };
      }

      // Add to in-memory settings
      this.userSettings.customCategories[id] = {
        description,
        color,
        apps: [],
        isCustom: true
      };

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Custom category created successfully', { id, name });
        return { success: true, id };
      } else {
        // Rollback in-memory changes if save failed
        delete this.userSettings.customCategories[id];
        return { success: false, error: 'Failed to save category settings' };
      }
    } catch (error) {
      log.error('CategoryManager: Failed to create custom category:', error);
      return { success: false, error: 'Failed to create category' };
    }
  }

  /**
   * Legacy method for backward compatibility (deprecated)
   */
  public createCustomCategoryLegacy(id: string, name: string, description: string, color: string): boolean {
    try {
      log.warn('CategoryManager: createCustomCategoryLegacy is deprecated, use createCustomCategory instead', { id, name });
      
      // Directly call the new method (will generate ID from name)
      const result = this.createCustomCategory(name, description, color);
      return result.success;
    } catch (error) {
      log.error('CategoryManager: Failed to create custom category (legacy):', error);
      return false;
    }
  }

  /**
   * Update an existing custom category
   */
  public updateCustomCategory(id: string, name: string, description: string, color: string): boolean {
    try {
      log.info('CategoryManager: Updating custom category', { id, name, description, color });
      
      // Check if it's a custom category
      if (!this.userSettings.customCategories[id]) {
        log.error('CategoryManager: Cannot update non-custom category', { id });
        return false;
      }

      // Store original values for rollback
      const originalCategory = { ...this.userSettings.customCategories[id] };
      
      // Update in-memory settings
      this.userSettings.customCategories[id] = {
        description,
        color,
        apps: this.userSettings.customCategories[id].apps,
        isCustom: true
      };

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Custom category updated successfully', { id });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings.customCategories[id] = originalCategory;
        log.error('CategoryManager: Failed to save updated custom category', { id });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to update custom category:', error);
      return false;
    }
  }

  /**
   * Delete a custom category
   */
  public deleteCustomCategory(id: string): boolean {
    try {
      log.info('CategoryManager: Deleting custom category', { id });
      
      // Check if it's a custom category
      if (!this.userSettings.customCategories[id]) {
        log.error('CategoryManager: Cannot delete non-custom category', { id });
        return false;
      }

      // Store original values for rollback
      const originalCategory = { ...this.userSettings.customCategories[id] };
      const originalOverrides = { ...this.userSettings.appCategoryOverrides };
      
      // Remove from in-memory settings
      delete this.userSettings.customCategories[id];
      
      // Remove app overrides that point to this category
      Object.keys(this.userSettings.appCategoryOverrides).forEach(appName => {
        if (this.userSettings.appCategoryOverrides[appName] === id) {
          delete this.userSettings.appCategoryOverrides[appName];
        }
      });

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Custom category deleted successfully', { id });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings.customCategories[id] = originalCategory;
        this.userSettings.appCategoryOverrides = originalOverrides;
        log.error('CategoryManager: Failed to save after deleting custom category', { id });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to delete custom category:', error);
      return false;
    }
  }

  /**
   * Assign an app to a category
   */
  public assignAppToCategory(appName: string, categoryId: string): boolean {
    try {
      log.info('CategoryManager: Assigning app to category', { appName, categoryId });
      
      // Check if category exists
      const finalCategories = this.getFinalCategories();
      if (!finalCategories.categories[categoryId]) {
        log.error('CategoryManager: Category does not exist', { categoryId });
        return false;
      }

      // Check if app is detected
      if (!finalCategories.detectedApps.includes(appName)) {
        log.error('CategoryManager: App not detected', { appName });
        return false;
      }

      // Store original value for rollback
      const originalAssignment = this.userSettings.appCategoryOverrides[appName];
      
      // Update in-memory settings
      this.userSettings.appCategoryOverrides[appName] = categoryId;

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: App assigned to category successfully', { appName, categoryId });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        if (originalAssignment) {
          this.userSettings.appCategoryOverrides[appName] = originalAssignment;
        } else {
          delete this.userSettings.appCategoryOverrides[appName];
        }
        log.error('CategoryManager: Failed to save app assignment', { appName, categoryId });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to assign app to category:', error);
      return false;
    }
  }

  /**
   * Remove app category assignment (will fall back to default or miscellaneous)
   */
  public removeAppCategoryAssignment(appName: string): boolean {
    try {
      log.info('CategoryManager: Removing app category assignment', { appName });
      
      // Check if there's an assignment to remove
      if (!this.userSettings.appCategoryOverrides[appName]) {
        log.info('CategoryManager: No assignment to remove', { appName });
        return true;
      }

      // Store original value for rollback
      const originalAssignment = this.userSettings.appCategoryOverrides[appName];
      
      // Remove from in-memory settings
      delete this.userSettings.appCategoryOverrides[appName];

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: App category assignment removed successfully', { appName });
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings.appCategoryOverrides[appName] = originalAssignment;
        log.error('CategoryManager: Failed to save after removing app assignment', { appName });
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to remove app category assignment:', error);
      return false;
    }
  }

  /**
   * Get user settings for API
   */
  public getUserSettings(): UserCategorySettings {
    return { ...this.userSettings };
  }

  /**
   * Reset all user customizations
   */
  public resetToDefaults(): boolean {
    try {
      log.info('CategoryManager: Resetting to defaults');
      
      // Store original values for rollback
      const originalSettings = {
        customCategories: { ...this.userSettings.customCategories },
        appCategoryOverrides: { ...this.userSettings.appCategoryOverrides }
      };
      
      // Clear in-memory settings
      this.userSettings = {
        customCategories: {},
        appCategoryOverrides: {}
      };

      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Reset to defaults completed');
        return true;
      } else {
        // Rollback in-memory changes if save failed
        this.userSettings = originalSettings;
        log.error('CategoryManager: Failed to save after reset to defaults');
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to reset to defaults:', error);
      return false;
    }
  }

  /**
   * Create a backup of the current category settings
   */
  public createBackup(): boolean {
    try {
      const backupFilePath = this.settingsFilePath.replace('.json', `.backup.${Date.now()}.json`);
      
      const backupData = {
        customCategories: this.userSettings.customCategories,
        appCategoryOverrides: this.userSettings.appCategoryOverrides,
        backupCreated: new Date().toISOString()
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      fs.writeFileSync(backupFilePath, jsonString, 'utf8');
      
      log.info('CategoryManager: Backup created successfully', { backupFilePath });
      return true;
    } catch (error) {
      log.error('CategoryManager: Failed to create backup:', error);
      return false;
    }
  }

  /**
   * Get the path to the settings file for external access
   */
  public getSettingsFilePathForExport(): string {
    return this.settingsFilePath;
  }

  /**
   * Export current settings to a JSON string
   */
  public exportSettings(): string {
    const exportData = {
      customCategories: this.userSettings.customCategories,
      appCategoryOverrides: this.userSettings.appCategoryOverrides,
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import settings from a JSON string
   */
  public importSettings(jsonString: string): boolean {
    try {
      const importData = JSON.parse(jsonString);
      
      // Validate the structure
      if (!importData.customCategories || !importData.appCategoryOverrides) {
        log.error('CategoryManager: Invalid import data structure');
        return false;
      }
      
      // Store backup for rollback
      const backup = {
        customCategories: { ...this.userSettings.customCategories },
        appCategoryOverrides: { ...this.userSettings.appCategoryOverrides }
      };
      
      // Import the settings
      this.userSettings = {
        customCategories: importData.customCategories,
        appCategoryOverrides: importData.appCategoryOverrides
      };
      
      // Ensure custom categories have correct structure
      Object.keys(this.userSettings.customCategories).forEach(categoryId => {
        const category = this.userSettings.customCategories[categoryId];
        if (!category.apps) {
          category.apps = [];
        }
        if (!category.isCustom) {
          category.isCustom = true;
        }
      });
      
      // Save to file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Settings imported successfully');
        return true;
      } else {
        // Rollback on save failure
        this.userSettings = backup;
        log.error('CategoryManager: Failed to save imported settings');
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Get statistics about the current category setup
   */
  public getStatistics(): {
    customCategories: number;
    appOverrides: number;
    totalDetectedApps: number;
    categorizedApps: number;
    miscellaneousApps: number;
  } {
    try {
      const finalCategories = this.getFinalCategories();
      const detectedApps = finalCategories.detectedApps.length;
      const miscellaneousApps = finalCategories.categories.miscellaneous?.apps.length || 0;
      const categorizedApps = detectedApps - miscellaneousApps;
      
      return {
        customCategories: Object.keys(this.userSettings.customCategories).length,
        appOverrides: Object.keys(this.userSettings.appCategoryOverrides).length,
        totalDetectedApps: detectedApps,
        categorizedApps: categorizedApps,
        miscellaneousApps: miscellaneousApps
      };
    } catch (error) {
      log.error('CategoryManager: Failed to get statistics:', error);
      return {
        customCategories: 0,
        appOverrides: 0,
        totalDetectedApps: 0,
        categorizedApps: 0,
        miscellaneousApps: 0
      };
    }
  }

  /**
   * Migrate from old SQLite-based category system to JSON (if needed)
   * This is a one-time migration utility
   */
  public async migrateFromSQLite(): Promise<boolean> {
    try {
      log.info('CategoryManager: Checking for SQLite migration');
      
      if (!db) {
        log.info('CategoryManager: No database available, skipping migration');
        return true;
      }
      
      // Check if we already have JSON settings
      if (fs.existsSync(this.settingsFilePath)) {
        const fileSize = fs.statSync(this.settingsFilePath).size;
        if (fileSize > 50) { // If file has substantial content
          log.info('CategoryManager: JSON settings already exist, skipping migration');
          return true;
        }
      }
      
      // Check for existing SQLite tables
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND (name='custom_categories' OR name='app_category_overrides')
      `).all();
      
      if (tables.length === 0) {
        log.info('CategoryManager: No SQLite category tables found, skipping migration');
        return true;
      }
      
      log.info('CategoryManager: Starting SQLite to JSON migration');
      
      const migrationSettings: UserCategorySettings = {
        customCategories: {},
        appCategoryOverrides: {}
      };
      
      // Migrate custom categories
      try {
        const customCategoriesRows = db.prepare('SELECT * FROM custom_categories').all();
        customCategoriesRows.forEach((row: any) => {
          migrationSettings.customCategories[row.id] = {
            description: row.description || '',
            color: row.color,
            apps: [],
            isCustom: true
          };
        });
        log.info(`CategoryManager: Migrated ${customCategoriesRows.length} custom categories`);
      } catch (error) {
        log.warn('CategoryManager: Failed to migrate custom categories:', error);
      }
      
      // Migrate app category overrides
      try {
        const overridesRows = db.prepare('SELECT * FROM app_category_overrides').all();
        overridesRows.forEach((row: any) => {
          migrationSettings.appCategoryOverrides[row.app_name] = row.category_id;
        });
        log.info(`CategoryManager: Migrated ${overridesRows.length} app overrides`);
      } catch (error) {
        log.warn('CategoryManager: Failed to migrate app overrides:', error);
      }
      
      // Update in-memory settings
      this.userSettings = migrationSettings;
      
      // Save to JSON file
      if (this.saveUserSettings()) {
        log.info('CategoryManager: Migration to JSON completed successfully');
        
        // Optional: Clean up old SQLite tables
        try {
          db.prepare('DROP TABLE IF EXISTS custom_categories').run();
          db.prepare('DROP TABLE IF EXISTS app_category_overrides').run();
          log.info('CategoryManager: Old SQLite tables cleaned up');
        } catch (error) {
          log.warn('CategoryManager: Failed to clean up old SQLite tables:', error);
        }
        
        return true;
      } else {
        log.error('CategoryManager: Failed to save migrated settings');
        return false;
      }
    } catch (error) {
      log.error('CategoryManager: Migration from SQLite failed:', error);
      return false;
    }
  }

  /**
   * Categorize a domain or app name using the same logic as categorizeSingleApp
   * This is a public wrapper that can be used by external modules
   */
  public categorizeItem(itemName: string): string {
    return this.categorizeSingleApp(itemName);
  }
}

export default CategoryManager;
